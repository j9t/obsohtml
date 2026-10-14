#!/usr/bin/env node

// Working-tree benchmark for ObsoHTML.
//
// Times ObsoHTML’s CPU-bound entry points against a generated corpus
// (benchmark/input; see corpus.js): `locateMarkup` (a line/column position
// for every obsolete element and attribute found) and `checkMarkup`
// (presence only).
//
// Usage (from the repo root):
//   npm run benchmark: Run; if a baseline exists, show deltas
//   npm run benchmark -- --save: Run and save the result as the baseline
//   npm run benchmark -- --iterations=10
//   npm run benchmark -- --task=locate: Run a single task (repeatable)
//
// Timing follows benchmark.js in hihtml: Warm-up runs (discarded), then the
// fastest of N iterations per file, with the difference between the two
// iteration halves as the noise band. A delta smaller than that band reads
// as “within noise” rather than as a win or a regression.

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkMarkup, locateMarkup } from '../src/index.js';
import { write as writeCorpus } from './corpus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Warm-up runs (discarded), followed by this many timed iterations; scans take
// well under a millisecond, so one run would leave V8 timing unoptimized code
const BENCH_WARMUP = 10;
const DEFAULT_ITERATIONS = 5;

const DIR_INPUT = 'input';
const FILE_BASELINE = 'baseline.json';

// Which iteration a saved `time` stands for; a baseline naming another one is not comparable
const METRIC = 'fastest';

// Above this much spread between the fastest and slowest iteration, a run cannot
// resolve the kind of change this benchmark is usually used to check
const NOISE_WARN_PCT = 15;

// A failure to report as is, without a stack
class UsageError extends Error {}

const TASKS = {
  locate: { label: 'Locate (positions for every finding)', run: locateMarkup },
  check: { label: 'Check (presence only)', run: checkMarkup },
};

// A small per-file figure that characterizes the run’s output, so a baseline
// comparison can tell a real change from an accident
function summarize(result) {
  return `${result.elements.length} elements, ${result.attributes.length} attributes`;
}

function parseArgs(argv) {
  const args = { save: false, iterations: DEFAULT_ITERATIONS, tasks: [] };
  for (const arg of argv) {
    if (arg === '--save') {
      args.save = true;
    } else if (arg.startsWith('--iterations=')) {
      const n = parseInt(arg.slice('--iterations='.length), 10);
      args.iterations = Number.isNaN(n) ? DEFAULT_ITERATIONS : Math.max(1, n);
    } else if (arg.startsWith('--task=')) {
      const name = arg.slice('--task='.length);
      if (!Object.hasOwn(TASKS, name)) {
        throw new UsageError(`Unknown task “${name}”; available tasks: ${Object.keys(TASKS).join(', ')}`);
      }
      if (!args.tasks.includes(name)) args.tasks.push(name);
    } else {
      console.error(`Warning: Unrecognized argument “${arg}”`);
    }
  }
  if (args.tasks.length === 0) args.tasks = Object.keys(TASKS);
  return args;
}

// Interference can only ever make a run slower, so the fastest iteration is the most
// stable estimate of the code’s cost and the one deltas are computed from
function fastest(values) {
  return Math.min(...values);
}

// How reproducible the reported figure is: Split the iterations in half and compare
// what each half would have reported. This answers the question a delta actually
// depends on—“how much would this number move if I ran it again?”—and, unlike the
// spread between fastest and slowest, it tightens rather than inflates as iterations
// are added, because it does not chase the single worst outlier. One iteration has no
// halves to compare, and reports nothing rather than a zero that would read as a
// perfectly reproducible run.
function reproducibility(values) {
  if (values.length < 2) return null;
  const half = Math.floor(values.length / 2);
  const lowFirst = Math.min(...values.slice(0, half));
  const lowSecond = Math.min(...values.slice(half));
  const low = Math.min(lowFirst, lowSecond);
  return low === 0 ? 0 : (Math.abs(lowFirst - lowSecond) / low) * 100;
}

// Spread between the fastest and slowest iteration—reported for diagnosis only, since
// one descheduled run is enough to blow it up
function spread(values) {
  const low = Math.min(...values);
  return low === 0 ? 0 : ((Math.max(...values) - low) / low) * 100;
}

// Milliseconds with enough digits to resolve sub-millisecond runs
function formatMs(ms) {
  return `${ms.toFixed(ms < 1 ? 3 : 1)} ms`;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// A baseline entry fit for comparison, or undefined
function baselineEntry(entry) {
  if (!Number.isFinite(entry?.time) || entry.time <= 0) return undefined;
  return { ...entry, spread: Number.isFinite(entry.spread) && entry.spread >= 0 ? entry.spread : null };
}

// Render a delta that is smaller than the run’s own noise as “~”, so a difference the
// measurement cannot actually resolve never reads as a win or a regression
function formatTimeDelta(curr, prev, noisePct) {
  if (prev == null || prev === 0) return '';
  const pct = ((curr - prev) / prev) * 100;
  if (Math.abs(pct) <= noisePct) {
    return ` (~${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%, within noise)`;
  }
  return ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`;
}

// Current Git branch and short commit, or null when unavailable
function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
    return { branch, commit };
  } catch {
    return null;
  }
}

/**
 * @param {{ argv?: string[], dirWork?: string }} [options]
 */
async function main({ argv = process.argv.slice(2), dirWork = __dirname } = {}) {
  const args = parseArgs(argv);
  const pathInput = path.join(dirWork, DIR_INPUT);
  const pathBaseline = path.join(dirWork, FILE_BASELINE);

  // The corpus is generated, not downloaded: rewriting it keeps it in sync with
  // the generator and costs less than one timed iteration
  const files = await writeCorpus(pathInput);

  // Load an existing baseline for delta reporting (skipped when saving a new one)
  let baseline = null;
  if (!args.save) {
    try {
      baseline = JSON.parse(await fs.readFile(pathBaseline, 'utf8'));
      if (baseline.metric && baseline.metric !== METRIC) {
        console.log(`Warning: Ignoring baseline saved with timing metric “${baseline.metric}”—re-run with \`--save\` to compare against ${METRIC} times`);
        baseline = null;
      }
    } catch (err) {
      // A missing baseline is normal (first run reports absolute numbers only);
      // anything else (corrupt JSON, permissions) is worth surfacing
      baseline = null;
      if (err.code !== 'ENOENT') {
        console.error(`Warning: Ignoring unreadable baseline (${pathBaseline}): ${err.message}`);
      }
    }
  }

  console.log(`Benchmarking ${args.tasks.length} task(s) × ${files.length} file(s), fastest of ${args.iterations} iteration(s)`);
  console.log('* “legacy” is dense with obsolete markup; the other documents are clean');

  if (baseline) {
    const origin = baseline.git ? `${baseline.git.branch} @ ${baseline.git.commit}` : '(unknown revision)';
    const when = baseline.created ? new Date(baseline.created).toLocaleString() : 'unknown date';
    console.log(`Comparing against baseline: ${origin} (saved ${when})`);
    if (baseline.iterations !== undefined && baseline.iterations !== args.iterations) {
      console.log(`* Warning: Baseline used ${baseline.iterations} iteration(s); deltas may not be comparable`);
    }
  }
  console.log('');

  const results = {};
  const noises = [];
  let processed = 0;

  for (const taskName of args.tasks) {
    const task = TASKS[taskName];
    const taskNoises = [];
    let timeTotal = 0, timeTotalBase = 0, noiseWeightedBase = 0, matched = 0;
    console.log(`${task.label} (${taskName})`);

    for (const file of files) {
      for (let i = 0; i < BENCH_WARMUP; i++) task.run(file.content);
      const times = [];
      let output;
      for (let i = 0; i < args.iterations; i++) {
        const t0 = performance.now();
        output = task.run(file.content);
        times.push(performance.now() - t0);
      }
      const time = fastest(times);
      const noise = reproducibility(times);
      const worst = spread(times);

      const detail = summarize(output);
      (results[taskName] ??= {})[file.name] = {
        time: Math.round(time * 1000) / 1000,
        spread: noise === null ? null : Math.round(noise * 10) / 10,
        detail,
      };
      taskNoises.push({ noise, worst, time });
      noises.push({ noise, worst, time });
      timeTotal += time;
      processed++;

      const prev = baselineEntry(baseline?.files?.[taskName]?.[file.name]);
      const spreadPrev = prev?.spread ?? 0;
      if (prev) {
        timeTotalBase += prev.time;
        noiseWeightedBase += spreadPrev * prev.time;
        matched++;
      }
      // A delta has to clear both runs’ noise, so widen the band by the baseline’s own spread
      const band = (noise ?? 0) + spreadPrev;
      const detailStr = prev && prev.detail !== undefined && prev.detail !== detail
        ? `${detail} (was: ${prev.detail})`
        : detail;
      const timeStr = `${formatMs(time)}${prev ? formatTimeDelta(time, prev.time, band) : ''}${noise === null ? '' : ` ±${noise.toFixed(0)}%`}`;
      console.log(`  ${file.name.padEnd(10)} ${detailStr.padEnd(44)} @ ${timeStr}`);
    }

    // Only show a total delta when every processed file has a baseline entry, so the
    // current and baseline totals cover the same files (an apples-to-apples comparison)
    const compareTotals = baseline && matched === files.length;
    const noiseTotal = taskNoises.reduce((sum, n) => sum + (n.noise ?? 0) * n.time, 0) / timeTotal;
    const noiseTotalBase = timeTotalBase > 0 ? noiseWeightedBase / timeTotalBase : 0;
    const timeStrTotal = `${formatMs(timeTotal)}${compareTotals ? formatTimeDelta(timeTotal, timeTotalBase, noiseTotal + noiseTotalBase) : ''}`;
    console.log(`  ${'Total'.padEnd(10)} ${''.padEnd(44)} @ ${timeStrTotal}`);
    if (baseline && matched !== files.length) {
      console.log(`  Note: Total delta omitted—only ${matched} of ${files.length} file(s) have a baseline entry`);
    }
    console.log('');
  }

  // Deltas below the machine’s own noise floor mean nothing, so say what that floor is
  const noiseMeasured = noises.every(n => n.noise !== null);
  if (!noiseMeasured) {
    console.log('Noise: Unmeasured—a single iteration cannot say how much the times above would move on a re-run, so no delta is qualified as noise. Raise `--iterations` to get a band.');
  } else {
    const noiseTypical = median(noises.map(n => n.noise));
    const noiseWorst = noises.length ? Math.max(...noises.map(n => n.worst)) : 0;
    const timeAll = noises.reduce((sum, n) => sum + n.time, 0);
    const noiseAll = noises.reduce((sum, n) => sum + n.noise * n.time, 0) / timeAll;
    console.log(`Noise: ${noiseAll.toFixed(1)}% overall, ${noiseTypical.toFixed(1)}% typical per file (how much the reported figure moves between iteration halves; worst fastest-to-slowest spread was ${noiseWorst.toFixed(0)}%)`);
    if (noiseAll > NOISE_WARN_PCT) {
      console.log(`Warning: This machine is too noisy to resolve changes under ~${noiseAll.toFixed(0)}%. Close other applications, or raise \`--iterations\`.`);
    }
  }

  if (args.save) {
    const payload = {
      created: new Date().toISOString(),
      git: getGitInfo(),
      metric: METRIC,
      iterations: args.iterations,
      files: results,
    };
    await fs.writeFile(pathBaseline, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`\nBaseline saved to ${path.relative(process.cwd(), pathBaseline)} (${processed} measurement(s))`);
  }

  return { files: results };
}

// Run when executed as a script (not when imported by tests)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err instanceof UsageError ? err.message : err);
    process.exit(1);
  });
}

export {
  BENCH_WARMUP,
  DEFAULT_ITERATIONS,
  TASKS,
  baselineEntry,
  fastest,
  formatMs,
  formatTimeDelta,
  main,
  median,
  parseArgs,
  reproducibility,
  spread,
  summarize,
};