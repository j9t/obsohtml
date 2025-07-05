#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { styleText } from 'node:util';

const program = new Command();

// List of obsolete or proprietary HTML elements
const obsoleteElements = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'param', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp'
];

// List of obsolete or proprietary HTML attributes
const obsoleteAttributes = [
  'align', 'background', 'bgcolor', 'border', 'frameborder', 'hspace', 'marginheight', 'marginwidth', 'noshade', 'nowrap', 'scrolling', 'valign', 'vspace'
];

// Default project directory (user’s home directory)
const defaultProjectDirectory = os.homedir();

// Function to find obsolete elements and attributes in a file
async function findObsolete(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for obsolete elements
  obsoleteElements.forEach(element => {
    const elementRegex = new RegExp(`<\\s*${element}\\b`, 'i');
    if (elementRegex.test(content)) {
      const message = styleText('blue', `Found obsolete element ${styleText('bold', `'${element}'`)} in ${filePath}`);
      console.log(message);
    }
  });

  // Check for obsolete attributes
  obsoleteAttributes.forEach(attribute => {
    const attributeRegex = new RegExp(`<[^>]*\\s${attribute}\\b(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^"'\\s>]+))?\\s*(?=/?>)`, 'i');
    if (attributeRegex.test(content)) {
      const message = styleText('green', `Found obsolete attribute ${styleText('bold', `'${attribute}'`)} in ${filePath}`);
      console.log(message);
    }
  });
}

// Function to walk through the project directory, excluding node_modules directories
function walkDirectory(directory, verbose) {
  const MAX_PATH_LENGTH = 255; // Adjust this value based on your OS limits
  let files;

  try {
    files = fs.readdirSync(directory);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      if (verbose) console.warn(`Skipping directory due to permissions: ${directory}`);
      return;
    } else if (err.code === 'ENOENT') {
      if (verbose) console.warn(`Skipping non-existent directory: ${directory}`);
      return;
    } else {
      throw err;
    }
  }

  files.forEach(file => {
    const fullPath = path.join(directory, file);

    if (fullPath.length > MAX_PATH_LENGTH) {
      if (verbose) console.warn(`Skipping file or directory with path too long: ${fullPath}`);
      return;
    }

    try {
      const stats = fs.lstatSync(fullPath);
      if (stats.isSymbolicLink()) {
        if (verbose) console.warn(`Skipping symbolic link: ${fullPath}`);
        return;
      }
      if (stats.isDirectory()) {
        if (file !== 'node_modules') {
          walkDirectory(fullPath, verbose);
        }
      } else if (fullPath.endsWith('.html') || fullPath.endsWith('.htm') || fullPath.endsWith('.php') || fullPath.endsWith('.njk') || fullPath.endsWith('.twig') || fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
        findObsolete(fullPath);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        if (verbose) console.warn(`Skipping non-existent file or directory: ${fullPath}`);
      } else {
        throw err;
      }
    }
  });
}

// Main function to execute the script
async function main(projectDirectory = defaultProjectDirectory, verbose = false) {
  await walkDirectory(projectDirectory, verbose);
}

// Define command line options
program
  .option('-f, --folder <path>', 'specify the project directory', defaultProjectDirectory)
  .option('-v, --verbose', 'enable verbose output')
  .parse(process.argv);

// Get the project directory and verbose flag from command line arguments or use the default
const options = program.opts();
const projectDirectory = options.folder;
const verbose = options.verbose;
main(projectDirectory, verbose);