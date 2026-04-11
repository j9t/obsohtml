# ObsoHTML, the Obsolete HTML Checker

[![npm version](https://img.shields.io/npm/v/obsohtml.svg)](https://www.npmjs.com/package/obsohtml) [![Build status](https://github.com/j9t/obsohtml/workflows/Tests/badge.svg)](https://github.com/j9t/obsohtml/actions) [![Socket](https://badge.socket.dev/npm/package/obsohtml)](https://socket.dev/npm/package/obsohtml)

ObsoHTML is a Node.js tool designed to scan HTML, PHP, Nunjucks, Twig, JavaScript, and TypeScript files for obsolete and proprietary HTML elements and attributes. It helps you identify and update deprecated HTML code to be sure to use web standards.

ObsoHTML has inherent limitations and may not find all obsolete elements and attributes. If you run into a problem, please [file an issue](https://github.com/j9t/obsohtml/issues).

## Usage

### 1. Via CLI

#### Installation

```console
npm i obsohtml
```

(To install ObsoHTML globally, use the `-g` flag, as in `npm i -g obsohtml`.)

#### Execution

ObsoHTML accepts a folder or file path as a command line option, which can be specified in both short form (`-f`) and long form (`--folder`). The path can be either absolute or relative.

ObsoHTML can be run in “verbose” mode by appending `-v` or `--verbose` to the command. This will show information about files and directories that were skipped.

##### Example Commands

Use the default directory (user home directory):

```console
npx obsohtml
```

Specify a folder using an absolute path (easiest and most common use case):

```console
npx obsohtml -f /path/to/folder
```

Specify a folder using a relative path:

```console
npx obsohtml -f ../path/to/folder
```

### 2. As a Standalone Script

#### Installation

Download or fork [the source repository](https://github.com/j9t/obsohtml).

#### Execution

As mentioned above, ObsoHTML accepts a folder (`-f`, `--folder`) and can be run in “verbose” mode (`-v`, `--verbose`).

##### Example Commands

(All commands as run from the root directory of the downloaded repository.)

Use the default directory (user home directory):

```console
node bin/obsohtml.js
```

Specify a folder using an absolute path (easiest and most common use case):

```console
node bin/obsohtml.js -f /path/to/folder
```

Specify a folder using a relative path:

```console
node bin/obsohtml.js -f ../path/to/folder
```

### 3. Programmatic API

ObsoHTML can be imported as a module to check HTML strings in your own tooling:

```js
import { checkMarkup, obsoleteElements, obsoleteAttributes } from 'obsohtml';

const { elements, attributes } = checkMarkup('<center>Hello</center>');
// elements: ['center']
// attributes: []
```

#### `checkMarkup(html)`

Checks an HTML string for obsolete or proprietary elements and attributes.

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