const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('ObsoHTML', () => {
  const tempDir = path.join(__dirname, 'temp_test_dir');
  const tempFile = path.join(tempDir, 'test.html');
  const tempFileWithAttributes = path.join(tempDir, 'test_with_attribute.html');

  beforeAll(() => {
    // Create a temporary directory and files
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(tempFile, '<!DOCTYPE html><html><title>Test</title><body><center>Test</center></body></html>');
    fs.writeFileSync(tempFileWithAttributes, '<!DOCTYPE html><html><title>Test</title><body><img src=test.jpg alt=Test align=left></body></html>');
  });

  afterAll(() => {
    // Clean up the temporary directory and files
    fs.unlinkSync(tempFile);
    fs.unlinkSync(tempFileWithAttributes);
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
});