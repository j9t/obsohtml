const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('ObsoHTML', () => {
  const tempDir = path.join(__dirname, 'temp_test_dir');
  const tempFile = path.join(tempDir, 'test.html');
  const tempFileWithAttributes = path.join(tempDir, 'test_with_attributes.html');
  const tempFileWithMinimizedAttributes = path.join(tempDir, 'test_with_minimized_attributes.html');
  const tempTwigFile = path.join(tempDir, 'test.twig');

  beforeAll(() => {
    // Create a temporary directory and files
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(tempFile, '<!DOCTYPE html><html><title>Test</title><body><center>Test</center></body></html>');
    fs.writeFileSync(tempFileWithAttributes, '<!DOCTYPE html><html><title>Test</title><body><img src=test.jpg alt=Test align=left></body></html>');
    fs.writeFileSync(tempFileWithMinimizedAttributes, '<!DOCTYPE html><html><title>Test</title><hr noshade><table><tr><th class=nowrap></table>');
    fs.writeFileSync(tempTwigFile, '<!DOCTYPE html><html><title>Test</title><isindex>');
  });

  afterAll(() => {
    // Clean up the temporary directory and files
    fs.unlinkSync(tempFile);
    fs.unlinkSync(tempFileWithAttributes);
    fs.unlinkSync(tempFileWithMinimizedAttributes);
    fs.unlinkSync(tempTwigFile);
    fs.rmdirSync(tempDir);
  });

  test('Detect obsolete elements', () => {
    const result = spawnSync('node', ['bin/obsohtml.js', '-f', tempDir], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete element 'center'");
  });

  test('Detect obsolete attributes', () => {
    const result = spawnSync('node', ['bin/obsohtml.js', '-f', tempDir], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete attribute 'align'");
  });

  test('Detect obsolete elements and attributes using absolute path', () => {
    const absolutePath = path.resolve(tempDir);
    const result = spawnSync('node', ['bin/obsohtml.js', '-f', absolutePath], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete element 'center'");
    expect(result.stdout).toContain("Found obsolete attribute 'align'");
  });

  test('Detect obsolete elements and attributes using relative path', () => {
    const relativePath = path.relative(process.cwd(), tempDir);
    const result = spawnSync('node', ['bin/obsohtml.js', '--folder', relativePath], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete element 'center'");
    expect(result.stdout).toContain("Found obsolete attribute 'align'");
  });

  test('Detect obsolete minimized attributes', () => {
    const result = spawnSync('node', ['bin/obsohtml.js', '-f', tempDir], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete attribute 'noshade'");
    expect(result.stdout).not.toContain("Found obsolete attribute 'nowrap'");
  });

  test('Detect obsolete elements in Twig file', () => {
    const result = spawnSync('node', ['bin/obsohtml.js', '-f', tempDir], { encoding: 'utf-8' });
    expect(result.stdout).toContain("Found obsolete element 'isindex'");
  });
});