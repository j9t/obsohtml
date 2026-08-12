#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { checkMarkup } from '../src/index.js';

const program = new Command();

// Directories to skip during traversal
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'vendor']);

// Default project directory (the working directory)
const defaultProjectDirectory = '.';

// Track whether any obsolete HTML was found
let foundObsolete = false;

// Function to find obsolete elements and attributes in a file
function findObsolete(filePath) {
  const { elements, attributes } = checkMarkup(fs.readFileSync(filePath, 'utf8'));

  for (const element of elements) {
    foundObsolete = true;
    console.log(styleText('blue', `Found obsolete element ${styleText('bold', `'${element}'`)} in ${filePath}`));
  }

  for (const attribute of attributes) {
    foundObsolete = true;
    console.log(styleText('green', `Found obsolete attribute ${styleText('bold', `'${attribute}'`)} in ${filePath}`));
  }
}

// Function to walk through the project directory, excluding common build/VCS directories
function walkDirectory(directory, verbose) {
  const MAX_PATH_LENGTH = 255;
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

  for (const file of files) {
    const fullPath = path.join(directory, file);

    if (fullPath.length > MAX_PATH_LENGTH) {
      if (verbose) console.warn(`Skipping file or directory with path too long: ${fullPath}`);
      continue;
    }

    try {
      const stats = fs.lstatSync(fullPath);
      if (stats.isSymbolicLink()) {
        if (verbose) console.warn(`Skipping symbolic link: ${fullPath}`);
        continue;
      }
      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.has(file)) {
          walkDirectory(fullPath, verbose);
        }
      } else if (
        fullPath.endsWith('.html') || fullPath.endsWith('.htm') ||
        fullPath.endsWith('.php') ||
        fullPath.endsWith('.njk') || fullPath.endsWith('.twig') ||
        fullPath.endsWith('.js') || fullPath.endsWith('.jsx') ||
        fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')
      ) {
        findObsolete(fullPath);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        if (verbose) console.warn(`Skipping non-existent file or directory: ${fullPath}`);
      } else {
        throw err;
      }
    }
  }
}

// Main function to execute the script
function main(projectDirectory = defaultProjectDirectory, verbose = false) {
  let stats;
  try {
    stats = fs.lstatSync(projectDirectory);
  } catch (err) {
    // ENOTDIR is a path below an existing file—unresolvable the same way a
    // missing one is, so it gets the same message rather than a stack trace
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') throw err;
  }

  // A named target that isn’t there is the user’s to fix
  if (!stats) {
    console.error(styleText('red', `No such file or directory: ${projectDirectory}`));
    process.exit(1);
  }

  if (stats.isFile()) {
    findObsolete(projectDirectory);
  } else {
    walkDirectory(projectDirectory, verbose);
  }

  if (foundObsolete) process.exit(1);
}

// Define command line arguments and options
program
  .argument('[path]', 'folder or file to check (default: current directory)')
  .option('-v, --verbose', 'enable verbose output')
  .parse(process.argv);

// Get the project directory and verbose flag from command line arguments or use the default
const options = program.opts();
const [positional] = program.args;

const projectDirectory = positional || defaultProjectDirectory;
const verbose = options.verbose;
main(projectDirectory, verbose);