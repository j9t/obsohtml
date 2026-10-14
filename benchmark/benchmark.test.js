import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { checkMarkup, locateMarkup } from '../src/index.js';
import { generate } from './corpus.js';
import {
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
} from './benchmark.js';

describe('Benchmark', () => {
  describe('`parseArgs`', () => {
    test('Defaults to all tasks and the default iteration count', () => {
      assert.deepStrictEqual(parseArgs([]), {
        save: false,
        iterations: DEFAULT_ITERATIONS,
        tasks: Object.keys(TASKS),
      });
    });

    test('Reads flags and values', () => {
      assert.deepStrictEqual(parseArgs(['--save', '--iterations=10']), {
        save: true,
        iterations: 10,
        tasks: Object.keys(TASKS),
      });
    });

    test('`--iterations` falls back to the default when not a number, and to 1 when lower', () => {
      assert.strictEqual(parseArgs(['--iterations=many']).iterations, DEFAULT_ITERATIONS);
      assert.strictEqual(parseArgs(['--iterations=0']).iterations, 1);
    });

    test('`--task` selects tasks and deduplicates them', () => {
      assert.deepStrictEqual(parseArgs(['--task=locate', '--task=check', '--task=locate']).tasks, ['locate', 'check']);
    });

    test('`parseArgs` rejects an unknown task, naming the available ones', () => {
      assert.throws(() => parseArgs(['--task=nope']), { message: /Unknown task “nope”; available tasks: / });
    });
  });

  describe('Timing helpers', () => {
    test('`fastest` returns the minimum', () => {
      assert.strictEqual(fastest([3, 1, 2]), 1);
    });

    test('`median` averages the two middle values on an even count', () => {
      assert.strictEqual(median([1, 2, 3, 4]), 2.5);
      assert.strictEqual(median([1, 2, 3]), 2);
    });

    test('`reproducibility` compares the minima of both iteration halves', () => {
      assert.strictEqual(reproducibility([10, 10, 10, 10]), 0);
      assert.strictEqual(reproducibility([10, 10, 11, 11]), 10);
      assert.strictEqual(reproducibility([10, 10, 20, 20]), 100);
      assert.strictEqual(reproducibility([10]), null);
    });

    test('`spread` measures fastest-to-slowest', () => {
      assert.strictEqual(spread([10, 20]), 100);
      assert.strictEqual(spread([10, 10]), 0);
    });
  });

  describe('`baselineEntry`', () => {
    test('Rejects entries without a positive finite `time`', () => {
      for (const entry of [undefined, {}, { time: 0 }, { time: -1 }, { time: 'fast' }, { time: Infinity }]) {
        assert.strictEqual(baselineEntry(entry), undefined);
      }
    });

    test('Keeps a non-negative finite `spread` and drops any other', () => {
      assert.deepStrictEqual(baselineEntry({ time: 1, spread: 5, detail: 'd' }), { time: 1, spread: 5, detail: 'd' });
      assert.strictEqual(baselineEntry({ time: 1, spread: 0 }).spread, 0);
      for (const spread of [-1, 'x', null, undefined, NaN]) {
        assert.strictEqual(baselineEntry({ time: 1, spread }).spread, null);
      }
    });
  });

  describe('Time formatting', () => {
    test('`formatMs` resolves sub-millisecond times', () => {
      assert.strictEqual(formatMs(0.0184), '0.018 ms');
      assert.strictEqual(formatMs(4.4567), '4.5 ms');
    });
  });

  describe('Delta formatting', () => {
    test('`formatTimeDelta` reads small deltas as within noise', () => {
      assert.strictEqual(formatTimeDelta(105, 100, 10), ' (~+5.0%, within noise)');
      assert.strictEqual(formatTimeDelta(115, 100, 10), ' (+15.0%)');
      assert.strictEqual(formatTimeDelta(100, 100, 10), ' (~+0.0%, within noise)');
    });
  });

  describe('Corpus', () => {
    test('`generate` is deterministic', () => {
      const a = generate();
      const b = generate();
      assert.deepStrictEqual(a, b);
    });

    test('Documents cover the range from small to large', () => {
      const sizes = generate().map(file => file.content.length);
      assert.ok(Math.min(...sizes) > 1_000, 'smallest document should be at least 1 KB');
      assert.ok(Math.max(...sizes) > 100_000, 'largest document should exceed 100 KB');
    });

    test('Clean documents stay clean; “legacy” is dense with findings', () => {
      for (const file of generate()) {
        const { elements, attributes } = locateMarkup(file.content);
        const found = elements.length + attributes.length;
        if (file.name === 'legacy') {
          assert.ok(found > 100, `expected “legacy” to be dense with findings, got ${found}`);
        } else {
          assert.strictEqual(found, 0, `expected “${file.name}” to be clean, got ${found}`);
        }
      }
    });

    test('`locateMarkup` and `checkMarkup` agree on every document', () => {
      for (const file of generate()) {
        const located = locateMarkup(file.content);
        const checked = checkMarkup(file.content);
        assert.deepStrictEqual(
          [...new Set(located.elements.map(e => e.name))].sort(),
          [...checked.elements].sort(),
          `elements disagree on “${file.name}”`
        );
        assert.deepStrictEqual(
          [...new Set(located.attributes.map(a => a.name))].sort(),
          [...checked.attributes].sort(),
          `attributes disagree on “${file.name}”`
        );
      }
    });
  });

  describe('`summarize`', () => {
    test('Characterizes a task’s output', () => {
      assert.strictEqual(summarize({ elements: ['center'], attributes: ['align', 'border'] }), '1 elements, 2 attributes');
      assert.strictEqual(summarize({ elements: [], attributes: [] }), '0 elements, 0 attributes');
    });
  });

  describe('`main`', () => {
    test('Runs all tasks against the generated corpus and reports per-file times', async () => {
      const dirWork = await fs.mkdtemp(path.join(os.tmpdir(), 'obsohtml-benchmark-'));
      try {
        const { files } = await main({ argv: ['--iterations=2'], dirWork });
        for (const taskName of Object.keys(TASKS)) {
          for (const name of ['small', 'article', 'markup', 'legacy']) {
            const entry = files[taskName]?.[name];
            assert.ok(entry, `${taskName}/${name} missing from results`);
            assert.strictEqual(typeof entry.time, 'number');
            assert.ok(entry.time > 0, `${taskName}/${name} has no measured time`);
            assert.ok(typeof entry.detail === 'string' && entry.detail.length > 0);
          }
        }
      } finally {
        await fs.rm(dirWork, { recursive: true, force: true });
      }
    });

    test('`--save` writes a baseline that a later run compares against', async () => {
      const dirWork = await fs.mkdtemp(path.join(os.tmpdir(), 'obsohtml-benchmark-'));
      try {
        await main({ argv: ['--iterations=2', '--save'], dirWork });
        const baseline = JSON.parse(await fs.readFile(path.join(dirWork, 'baseline.json'), 'utf8'));
        assert.strictEqual(baseline.metric, 'fastest');
        assert.ok(baseline.files.locate.small.time > 0);
        assert.ok(typeof baseline.files.check.small.detail === 'string');

        // A second run loads the baseline and keeps identical details
        const { files } = await main({ argv: ['--iterations=2'], dirWork });
        assert.strictEqual(files.check.small.detail, baseline.files.check.small.detail);
      } finally {
        await fs.rm(dirWork, { recursive: true, force: true });
      }
    });

    test('Ignores baseline entries without a positive finite `time`', async () => {
      const dirWork = await fs.mkdtemp(path.join(os.tmpdir(), 'obsohtml-benchmark-'));
      const log = console.log;
      const lines = [];
      try {
        const entries = { small: { time: 0 }, article: { time: 'fast', spread: 'x' }, markup: { spread: 5 }, legacy: { time: 1, spread: 'x' } };
        await fs.writeFile(path.join(dirWork, 'baseline.json'), JSON.stringify({ metric: 'fastest', files: { locate: entries } }));
        console.log = (...args) => lines.push(args.join(' '));
        await main({ argv: ['--iterations=2', '--task=locate'], dirWork });
      } finally {
        console.log = log;
        await fs.rm(dirWork, { recursive: true, force: true });
      }
      const output = lines.join('\n');
      assert.doesNotMatch(output, /NaN|Infinity|x%/);
      assert.match(output, /only 1 of 4 file\(s\) have a baseline entry/);
    });
  });
});