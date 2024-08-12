# ObsoHTML, the Obsolete HTML Checker

ObsoHTML is a Node.js script designed to scan HTML, PHP, JavaScript, and TypeScript files within a specified directory for obsolete or proprietary HTML attributes and elements. It helps you identify and update deprecated HTML code to be more sure to use web standards.

## Usage

### 1. As a Node Module

#### Installation

```console
npm i @j9t/obsohtml
```

(To install ObsoHTML globally, use the `-g` flag, as in `npm i -g @j9t/obsohtml`.)

#### Execution

The script accepts a folder path as a command line option, which can be specified in both short form (`-f`) and long form (`--folder`). The folder path can be either absolute or relative.

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

The script accepts a folder path as a command line option, which can be specified in both short form (`-f`) and long form (`--folder`). The folder path can be either absolute or relative.

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

## Output

The script will output messages to the console indicating any obsolete attributes or elements found in the scanned files, along with the file paths where they were detected.

## Background

This started as an experiment, in which I used AI to produce this little HTML quality helper, its tests, and its documentation. While it’s pretty straightforward, I might have missed something. Please [file an issue](https://github.com/j9t/obsohtml/issues) or contact me directly if you spot a problem or have a suggestion.