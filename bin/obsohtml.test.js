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

describe('`obsoleteElements`', () => {
  test('Export as a non-empty array of strings', () => {
    assert.ok(Array.isArray(obsoleteElements));
    assert.ok(obsoleteElements.length > 0);
    assert.ok(obsoleteElements.every(e => typeof e === 'string'));
  });
});

describe('`obsoleteAttributes`', () => {
  test('Export as a non-empty array of strings', () => {
    assert.ok(Array.isArray(obsoleteAttributes));
    assert.ok(obsoleteAttributes.length > 0);
    assert.ok(obsoleteAttributes.every(a => typeof a === 'string'));
  });
});

describe('`checkMarkup`', () => {
  test('Return empty arrays for clean HTML', () => {
    const result = checkMarkup('<p>Hello <strong>world</strong></p>');
    assert.deepEqual(result, { elements: [], attributes: [] });
  });

  test('Return empty arrays for an empty string', () => {
    const result = checkMarkup('');
    assert.deepEqual(result, { elements: [], attributes: [] });
  });

  test('Throw a TypeError for non-string input', () => {
    assert.throws(() => checkMarkup(null), TypeError);
    assert.throws(() => checkMarkup(42), TypeError);
  });

  test('Detect an obsolete element', () => {
    const { elements, attributes } = checkMarkup('<center>Hello</center>');
    assert.ok(elements.includes('center'));
    assert.deepEqual(attributes, []);
  });

  test('Detect an obsolete attribute', () => {
    const { elements, attributes } = checkMarkup('<img src="x.jpg" align="left">');
    assert.deepEqual(elements, []);
    assert.ok(attributes.includes('align'));
  });

  test('Detect multiple obsolete elements in one string', () => {
    const { elements } = checkMarkup('<marquee><blink>Hello</blink></marquee>');
    assert.ok(elements.includes('marquee'));
    assert.ok(elements.includes('blink'));
  });

  test('Detect multiple obsolete attributes in one string', () => {
    const { attributes } = checkMarkup('<table border="1" bgcolor="#fff"><tr valign="top"></tr></table>');
    assert.ok(attributes.includes('border'));
    assert.ok(attributes.includes('bgcolor'));
    assert.ok(attributes.includes('valign'));
  });

  test('Detect both obsolete elements and attributes in one string', () => {
    const { elements, attributes } = checkMarkup('<center><img align="left"></center>');
    assert.ok(elements.includes('center'));
    assert.ok(attributes.includes('align'));
  });

  test('Detect obsolete elements case-insensitively', () => {
    const { elements } = checkMarkup('<CENTER>Hello</CENTER>');
    assert.ok(elements.includes('center'));
  });

  test('Do not detect partial tag name matches', () => {
    const { elements } = checkMarkup('<centers>Hello</centers>');
    assert.deepEqual(elements, []);
  });

  test('Do not flag an obsolete attribute name appearing inside a quoted attribute value', () => {
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