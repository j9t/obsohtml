#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const program = new Command();

// List of obsolete or proprietary HTML attributes
const obsoleteAttributes = [
  'align', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'valign', 'hspace', 'vspace', 'noshade', 'nowrap'
];

// List of obsolete or proprietary HTML elements
const obsoleteElements = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'plaintext', 'shadow', 'spacer', 'strike', 'tt', 'xmp'
];

// Default project directory (user’s home directory)
const defaultProjectDirectory = os.homedir();

// Function to find obsolete elements and attributes in a file
async function findObsolete(filePath) {
  const chalk = await import('chalk');
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for obsolete elements
  obsoleteElements.forEach(element => {
    const elementRegex = new RegExp(`<\\s*${element}\\b`, 'i');
    if (elementRegex.test(content)) {
      console.log(chalk.default.blue(`Found obsolete element ${chalk.default.bold(`'${element}'`)} in ${filePath}`));
    }
  });

  // Check for obsolete attributes
  obsoleteAttributes.forEach(attribute => {
    const attributeRegex = new RegExp(`<[^>]*\\b${attribute}\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\"'\\s>]+)`, 'i');
    if (attributeRegex.test(content)) {
      console.log(chalk.default.green(`Found obsolete attribute ${chalk.default.bold(`'${attribute}'`)} in ${filePath}`));
    }
  });
}

// Function to walk through the project directory, excluding node_modules directories
function walkDirectory(directory) {
  let files;
  try {
    files = fs.readdirSync(directory);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      console.warn(`Skipping directory due to permissions: ${directory}`);
      return;
    } else if (err.code === 'ENOENT') {
      console.warn(`Skipping non-existent directory: ${directory}`);
      return;
    } else {
      throw err;
    }
  }

  files.forEach(file => {
    const fullPath = path.join(directory, file);

    try {
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules') {
          walkDirectory(fullPath);
        }
      } else if (fullPath.endsWith('.htm') || fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.php')) {
        findObsolete(fullPath);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`Skipping non-existent file or directory: ${fullPath}`);
      } else {
        throw err;
      }
    }
  });
}

// Main function to execute the script
async function main(projectDirectory = defaultProjectDirectory) {
  await walkDirectory(projectDirectory);
}

// Define command line options
program
  .option('-f, --folder <path>', 'specify the project directory', defaultProjectDirectory)
  .parse(process.argv);

// Get the project directory from command line arguments or use the default
const options = program.opts();
const projectDirectory = options.folder;
main(projectDirectory);