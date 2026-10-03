import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { stripVTControlCharacters } from 'node:util';
import { checkMarkup, obsoleteElements, obsoleteAttributes } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, 'obsohtml.js');

function run(args, options = {}) {
  const result = spawnSync('node', [scriptPath, ...args], { encoding: 'utf-8', ...options });
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

  test('Detects obsolete elements', () => {
    const { stdout } = run([tempDir]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
  });

  test('Detects obsolete attributes', () => {
    const { stdout } = run([tempDir]);
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detects obsolete elements and attributes using absolute path', () => {
    const { stdout } = run([path.resolve(tempDir)]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detects obsolete elements and attributes using relative path', () => {
    const { stdout } = run([path.relative(process.cwd(), tempDir)]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detects obsolete minimized attributes', () => {
    const { stdout } = run([tempDir]);
    assert.ok(stdout.includes("Found obsolete attribute 'noshade'"));
    assert.ok(!stdout.includes("Found obsolete attribute 'nowrap'"));
  });

  test('Detects obsolete elements in Twig file', () => {
    const { stdout } = run([tempDir]);
    assert.ok(stdout.includes("Found obsolete element 'isindex'"));
  });

  test('Detects obsolete attribute when it is not the last attribute in a tag', () => {
    const { stdout } = run([tempFileWithMidTagAttribute]);
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Detects obsolete elements in JSX file', () => {
    const { stdout } = run([tempJsxFile]);
    assert.ok(stdout.includes("Found obsolete element 'center'"));
  });

  test('Detects obsolete elements in TSX file', () => {
    const { stdout } = run([tempTsxFile]);
    assert.ok(stdout.includes("Found obsolete element 'marquee'"));
  });

  test('Exits with code 1 when obsolete HTML is found', () => {
    const { status } = run([tempDir]);
    assert.strictEqual(status, 1);
  });

  test('Exits with code 0 when no obsolete HTML is found', () => {
    const cleanFile = path.join(tempDir, 'clean.html');
    fs.writeFileSync(cleanFile, '<!DOCTYPE html><html><title>Clean</title><body><p>No issues here.</p></body></html>');
    try {
      const { status } = run([cleanFile]);
      assert.strictEqual(status, 0);
    } finally {
      fs.unlinkSync(cleanFile);
    }
  });

  test('Fails on a target that does not exist', () => {
    const { stderr, status } = run([path.join(tempDir, 'nonexistent')]);
    assert.ok(stderr.includes('No such file or directory'));
    assert.strictEqual(status, 1);
  });

  // `lstat()` reports a path below an existing file as ENOTDIR, not ENOENT
  test('Fails on a target whose parent is a file', () => {
    const { stderr, status } = run([path.join(tempFile, 'nested')]);
    assert.ok(stderr.includes('No such file or directory'));
    assert.ok(!stderr.includes('ENOTDIR'), 'Should not surface a raw stack trace');
    assert.strictEqual(status, 1);
  });

  test('Checks the working directory when no path is given', () => {
    const { stdout } = run([], { cwd: tempDir });
    assert.ok(stdout.includes("Found obsolete element 'center'"));
    assert.ok(stdout.includes("Found obsolete attribute 'align'"));
  });

  test('Rejects the removed `--folder` option', () => {
    const { stderr, status } = run(['--folder', tempDir]);
    assert.ok(stderr.includes('Unknown option'));
    assert.strictEqual(status, 1);
  });

  test('Rejects more than one path', () => {
    const { stderr, status } = run([tempDir, tempFile]);
    assert.ok(stderr.includes('Too many arguments'));
    assert.strictEqual(status, 1);
  });
});

describe('`obsoleteElements`', () => {
  test('Is a non-empty array of strings', () => {
    assert.ok(Array.isArray(obsoleteElements));
    assert.ok(obsoleteElements.length > 0);
    assert.ok(obsoleteElements.every(e => typeof e === 'string'));
  });
});

describe('`obsoleteAttributes`', () => {
  test('Is a non-empty array of strings', () => {
    assert.ok(Array.isArray(obsoleteAttributes));
    assert.ok(obsoleteAttributes.length > 0);
    assert.ok(obsoleteAttributes.every(a => typeof a === 'string'));
  });
});

describe('`checkMarkup`', () => {
  test('Returns empty arrays for clean HTML', () => {
    const result = checkMarkup('<p>Hello <strong>world</strong></p>');
    assert.deepEqual(result, { elements: [], attributes: [] });
  });

  test('Returns empty arrays for an empty string', () => {
    const result = checkMarkup('');
    assert.deepEqual(result, { elements: [], attributes: [] });
  });

  test('Throws a TypeError for non-string input', () => {
    assert.throws(() => checkMarkup(null), TypeError);
    assert.throws(() => checkMarkup(42), TypeError);
  });

  test('Detects an obsolete element', () => {
    const { elements, attributes } = checkMarkup('<center>Hello</center>');
    assert.ok(elements.includes('center'));
    assert.deepEqual(attributes, []);
  });

  test('Detects an obsolete attribute', () => {
    const { elements, attributes } = checkMarkup('<img src="x.jpg" align="left">');
    assert.deepEqual(elements, []);
    assert.ok(attributes.includes('align'));
  });

  test('Detects multiple obsolete elements in one string', () => {
    const { elements } = checkMarkup('<marquee><blink>Hello</blink></marquee>');
    assert.ok(elements.includes('marquee'));
    assert.ok(elements.includes('blink'));
  });

  test('Detects multiple obsolete attributes in one string', () => {
    const { attributes } = checkMarkup('<table border="1" bgcolor="#fff"><tr valign="top"></tr></table>');
    assert.ok(attributes.includes('border'));
    assert.ok(attributes.includes('bgcolor'));
    assert.ok(attributes.includes('valign'));
  });

  test('Detects both obsolete elements and attributes in one string', () => {
    const { elements, attributes } = checkMarkup('<center><img align="left"></center>');
    assert.ok(elements.includes('center'));
    assert.ok(attributes.includes('align'));
  });

  test('Detects obsolete elements case-insensitively', () => {
    const { elements } = checkMarkup('<CENTER>Hello</CENTER>');
    assert.ok(elements.includes('center'));
  });

  test('Does not detect partial tag name matches', () => {
    const { elements } = checkMarkup('<centers>Hello</centers>');
    assert.deepEqual(elements, []);
  });

  test('Does not flag an obsolete attribute name appearing inside a quoted attribute value', () => {
    // “scrolling” inside `content="…"`, “background” inside `content="…"`, and
    // “border” inside `alt="…"` are all text—not actual HTML attributes
    const cases = [
      '<meta property="og:title" content="Infinite scrolling on the web">',
      '<meta content="Busyness and Background Noise on Websites">',
      '<img alt="A graphic indicating a border between regions.">',
      "<img alt='A graphic indicating a border between regions.'>",
    ];
    for (const html of cases) {
      const { attributes } = checkMarkup(html);
      assert.deepEqual(attributes, [], `Expected no attributes for: ${html}`);
    }
  });
});