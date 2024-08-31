#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { Chalk } from 'chalk';

const program = new Command();

// List of obsolete or proprietary HTML elements
const obsoleteElements: string[] = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'command', 'content', 'dir', 'element', 'font', 'frame', 'frameset', 'image', 'isindex', 'keygen', 'listing', 'marquee', 'menuitem', 'multicol', 'nextid', 'nobr', 'noembed', 'noframes', 'plaintext', 'shadow', 'spacer', 'strike', 'tt', 'xmp'
];

// List of obsolete or proprietary HTML attributes
const obsoleteAttributes: string[] = [
  'align', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'valign', 'hspace', 'vspace', 'noshade', 'nowrap'
];

// Default project directory (user’s home directory)
const defaultProjectDirectory: string = os.homedir();

// Function to find obsolete elements and attributes in a file
async function findObsolete(filePath: string): Promise<void> {
  const chalk: typeof Chalk = await import('chalk');
  const content: string = fs.readFileSync(filePath, 'utf8');

  // Check for obsolete elements
  obsoleteElements.forEach(element => {
    const elementRegex = new RegExp(`<\\s*${element}\\b`, 'i');
    if (elementRegex.test(content)) {
      console.log(chalk.blue(`Found obsolete element ${chalk.bold(`'${element}'`)} in ${filePath}`));
    }
  });

  // Check for obsolete attributes
  obsoleteAttributes.forEach(attribute => {
    const attributeRegex = new RegExp(`<[^>]*\\s${attribute}\\b(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^"'\\s>]+))?\\s*(?=/?>)`, 'i');
    if (attributeRegex.test(content)) {
      console.log(chalk.green(`Found obsolete attribute ${chalk.bold(`'${attribute}'`)} in ${filePath}`));
    }
  });
}

// Function to walk through the project directory, excluding node_modules directories
function walkDirectory(directory: string, verbose: boolean): void {
  const MAX_PATH_LENGTH = 255; // Adjust this value based on your OS limits
  let files: string[];

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
      if (fs.statSync(fullPath).isDirectory()) {
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
async function main(projectDirectory: string = defaultProjectDirectory, verbose: boolean = false): Promise<void> {
  await walkDirectory(projectDirectory, verbose);
}

// Define command line options
program
  .option('-f, --folder <path>', 'specify the project directory', defaultProjectDirectory)
  .option('-v, --verbose', 'enable verbose output')
  .parse(process.argv);

// Get the project directory and verbose flag from command line arguments or use the default
const options = program.opts();
const projectDirectory: string = options.folder;
const verbose: boolean = options.verbose;
main(projectDirectory, verbose);