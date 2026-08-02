# ObsoHTML, the Obsolete HTML Checker

[![npm version](https://img.shields.io/npm/v/obsohtml.svg)](https://www.npmjs.com/package/obsohtml) [![Build status](https://github.com/j9t/obsohtml/workflows/Tests/badge.svg)](https://github.com/j9t/obsohtml/actions) [![Socket](https://badge.socket.dev/npm/package/obsohtml)](https://socket.dev/npm/package/obsohtml) [![GitHub Sponsors](https://badgen.net/static/Support/Open%20Source/cyan)](https://github.com/sponsors/j9t)

ObsoHTML is a Node.js tool designed to scan HTML, PHP, Nunjucks, Twig, JavaScript, and TypeScript files for obsolete and proprietary HTML elements and attributes. It helps you identify and update deprecated HTML code to be sure to use web standards.

ObsoHTML has inherent limitations and may not find all obsolete elements and attributes. If you run into a problem, please [file an issue](https://github.com/j9t/obsohtml/issues).

## Usage

### 1. CLI

#### Installation

Consider using ObsoHTML via npx:

```shell
npx obsohtml
```

#### Execution

ObsoHTML accepts a folder or file path as a command line option, which can be specified in both short form (`-f`) and long form (`--folder`). The path can be either absolute or relative.

ObsoHTML can be run in “verbose” mode by appending `-v` or `--verbose` to the command. This will show information about files and directories that were skipped.

##### Example Commands

Use the default directory (user home directory):

```shell
npx obsohtml
```

Specify a folder using an absolute path (easiest and most common use case):

```shell
npx obsohtml -f /path/to/folder
```

Specify a folder using a relative path:

```shell
npx obsohtml -f ../path/to/folder
```

### 2. Programmatic Use

Install ObsoHTML in your project, e.g., via `npm i -D obsohtml`, then import and use what you need:

```js
import { checkMarkup, obsoleteElements, obsoleteAttributes } from 'obsohtml';

const { elements, attributes } = checkMarkup('<center>Hello</center>');
// elements: ['center']
// attributes: []
```

#### `checkMarkup(html)`

Checks an HTML string for obsolete and proprietary elements and attributes.

* **Parameter**: `html` (string)—the HTML content to check
* **Returns**: `{ elements: string[], attributes: string[] }`—arrays of found obsolete element and attribute names

#### `obsoleteElements`

Array of obsolete or proprietary HTML element names checked by ObsoHTML.

#### `obsoleteAttributes`

Array of obsolete or proprietary HTML attribute names checked by ObsoHTML.

## Output

The script will output messages to the console indicating any obsolete elements or attributes found in the scanned files, along with the file paths where they were detected.

The script exits with code `1` if any obsolete HTML is found, and `0` if none is found, making it suitable for use in CI pipelines.

## Background

This started as an experiment, in which I used AI to produce this little HTML quality helper, its tests, and its documentation. While it’s pretty straightforward, I’m sure to have missed something. Please [file an issue](https://github.com/j9t/obsohtml/issues) or contact me directly if you spot a problem or have a suggestion.

## Acknowledgments

Thanks to [@mattbrundage](https://github.com/mattbrundage), [@FabianBeiner](https://github.com/FabianBeiner), and [@AndrewMac](https://github.com/AndrewMac) for helping to make ObsoHTML better!

***

You might like some of my other work:

* Optimization tools: [hihtml](https://github.com/j9t/hihtml) · [HTML Minifier Next](https://github.com/j9t/html-minifier-next) · ObsoHTML · [CSS Dedup](https://github.com/j9t/css-dedup) · [Image Guard](https://github.com/j9t/image-guard) · [Compressor.js Next](https://github.com/j9t/compressorjs-next) · [.htaccess Punk](https://github.com/j9t/htaccess-punk)
* Defense tools: [IA Defensa](https://iadefensa.com/solutions/)
* Resources for quality web development: [Articles](https://meiert.com/topics/development/) · [Books](https://meiert.com/topics/books/) (including [_On Web Development_](https://meiert.com/blog/on-web-development-2/)) · [News](https://frontenddogma.com/) · [Terminology](https://webglossary.info/)