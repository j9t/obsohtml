import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { stripVTControlCharacters } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, 'obsohtml.js');

function run(args) {
  const result = spawnSync('node', [scriptPath, ...args], { encoding: 'utf-8' });
  return {
    stdout: stripVTControlCharacters(result.stdout),
    stderr: stripVTControlCharacters(result.stderr),
    status: result.status,
  };
}

describe('ObsoHTML', () => {
  const tempDir = path.join(__dirname, 'temp_test_dir');
  const tempFile = path.join(tempDir, 'test.html');
  const tempFileWithAttributes = path.join(tempDir, 'test_with_attributes.html');
  const tempFileWithMidTagAttribute = path.join(tempDir, 'test_mid_tag_attribute.html');
  const tempFileWithMinimizedAttributes = path.join(tempDir, 'test_with_minimized_attributes.html');
  const tempTwigFile = path.join(tempDir, 'test.twig');
  const tempJsxFile = path.join(tempDir, 'test.jsx');
  const tempTsxFile = path.join(tempDir, 'test.tsx');

  before(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(tempFile, '<!DOCTYPE html><html><title>Test</title><body><center>Test</center></body></html>');
    fs.writeFileSync(tempFileWithAttributes, '<!DOCTYPE html><html><title>Test</title><body><img src=test.jpg alt=Test align=left></body></html>');
    fs.writeFileSync(tempFileWithMidTagAttribute, '<!DOCTYPE html><html><title>Test</title><body><img align=left src=test.jpg></body></html>');
    fs.writeFileSync(tempFileWithMinimizedAttributes, '<!DOCTYPE html><html><title>Test</title><hr noshade><table><tr><th class=nowrap></table>');
    fs.writeFileSync(tempTwigFile, '<!DOCTYPE html><html><title>Test</title><isindex>');
    fs.writeFileSync(tempJsxFile, 'export default () => <center>Hello</center>;');
    fs.writeFileSync(tempTsxFile, 'export default (): JSX.Element => <marquee>Hello</marquee>;');
  });

  after(() => {
    fs.unlinkSync(tempFile);
    fs.unlinkSync(tempFileWithAttributes);
    fs.unlinkSync(tempFileWithMidTagAttribute);
    fs.unlinkSync(tempFileWithMinimizedAttributes);
    fs.unlinkSync(tempTwigFile);
    fs.unlinkSync(tempJsxFile);
    fs.unlinkSync(tempTsxFile);
    fs.rmdirSync(tempDir);
  });

  test('Detect obsolete elements', () => {
    const { stdout } = run(['-f', tempDir]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
  });

  test('Detect obsolete attributes', () => {
    const { stdout } = run(['-f', tempDir]);
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete elements and attributes using absolute path', () => {
    const { stdout } = run(['-f', path.resolve(tempDir)]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete elements and attributes using relative path', () => {
    const { stdout } = run(['--folder', path.relative(process.cwd(), tempDir)]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete minimized attributes', () => {
    const { stdout } = run(['-f', tempDir]);
    assert.ok(stdout.includes("Found obsolete attribute 'noshade'"));
    assert.ok(!stdout.includes("Found obsolete attribute 'nowrap'"));
  });

  test('Detect obsolete elements in Twig file', () => {
    const { stdout } = run(['-f', tempDir]);
    assert.ok(stdout.includes("Found obsolete element 'isindex'"));
  });

  test('Detect obsolete attribute when it is not the last attribute in a tag', () => {
    const { stdout } = run(['-f', tempFileWithMidTagAttribute]);
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detect obsolete elements in JSX file', () => {
    const { stdout } = run(['-f', tempJsxFile]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
  });

  test('Detect obsolete elements in TSX file', () => {
    const { stdout } = run(['-f', tempTsxFile]);
    assert.ok(stdout.includes("Found obsolete element 'marquee'"));
  });

  test('Exit with code 1 when obsolete HTML is found', () => {
    const { status } = run(['-f', tempDir]);
    assert.strictEqual(status, 1);
  });

  test('Exit with code 0 when no obsolete HTML is found', () => {
    const cleanFile = path.join(tempDir, 'clean.html');
    fs.writeFileSync(cleanFile, '<!DOCTYPE html><html><title>Clean</title><body><p>No issues here.</p></body></html>');
    try {
      const { status } = run(['-f', cleanFile]);
      assert.strictEqual(status, 0);
    } finally {
      fs.unlinkSync(cleanFile);
    }
  });

  test('Verbose mode reports skipped non-existent directory', () => {
    const { stderr } = run(['-f', path.join(tempDir, 'nonexistent'), '-v']);
    assert.ok(stderr.includes('Skipping non-existent directory'));
  });
});