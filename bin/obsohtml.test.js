import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Strip ANSI escape codes from output
// Using the same regex pattern as Node.js util.stripVTControlCharacters
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

describe('ObsoHTML', () => {
  const tempDir = path.join(__dirname, 'temp_test_dir');
  const tempFile = path.join(tempDir, 'test.html');
  const tempFileWithAttributes = path.join(tempDir, 'test_with_attributes.html');
  const tempFileWithMinimizedAttributes = path.join(tempDir, 'test_with_minimized_attributes.html');
  const tempTwigFile = path.join(tempDir, 'test.twig');

  before(() => {
    // Create a temporary directory and files
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(tempFile, '<!DOCTYPE html><html><title>Test</title><body><center>Test</center></body></html>');
    fs.writeFileSync(tempFileWithAttributes, '<!DOCTYPE html><html><title>Test</title><body><img src=test.jpg alt=Test align=left></body></html>');
    fs.writeFileSync(tempFileWithMinimizedAttributes, '<!DOCTYPE html><html><title>Test</title><hr noshade><table><tr><th class=nowrap></table>');
    fs.writeFileSync(tempTwigFile, '<!DOCTYPE html><html><title>Test</title><isindex>');
  });

  after(() => {
    // Clean up the temporary directory and files
    fs.unlinkSync(tempFile);
    fs.unlinkSync(tempFileWithAttributes);
    fs.unlinkSync(tempFileWithMinimizedAttributes);
    fs.unlinkSync(tempTwigFile);
    fs.rmdirSync(tempDir);
  });

  test('Detect obsolete elements', () => {
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '-f', tempDir], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete element 'center'"));
  });

  test('Detect obsolete attributes', () => {
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '-f', tempDir], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete elements and attributes using absolute path', () => {
    const absolutePath = path.resolve(tempDir);
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '-f', absolutePath], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete element 'center'"));
    assert.ok(output.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete elements and attributes using relative path', () => {
    const relativePath = path.relative(process.cwd(), tempDir);
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '--folder', relativePath], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete element 'center'"));
    assert.ok(output.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete minimized attributes', () => {
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '-f', tempDir], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete attribute 'noshade'"));
    assert.ok(!output.includes("Found obsolete attribute 'nowrap'"));
  });

  test('Detect obsolete elements in Twig file', () => {
    const scriptPath = path.join(__dirname, 'obsohtml.js');
    const result = spawnSync('node', [scriptPath, '-f', tempDir], { encoding: 'utf-8' });
    const output = stripAnsi(result.stdout);
    assert.ok(output.includes("Found obsolete element 'isindex'"));
  });
});
