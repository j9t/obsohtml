# ObsoHTML, the Obsolete HTML Checker

ObsoHTML is a Node.js script designed to scan HTML, PHP, Nunjucks, Twig, JavaScript, and TypeScript files for obsolete or proprietary HTML attributes and elements (in scripts, it would catch JSX syntax). It helps you identify and update deprecated HTML code to be more sure to use web standards.

ObsoHTML has inherent limitations and may not find all obsolete attributes and elements. If you run into a problem, please [file an issue](https://github.com/j9t/obsohtml/issues).

## Usage

### 1. As a Node Module

#### Installation

```console
npm i @j9t/obsohtml
```

(To install ObsoHTML globally, use the `-g` flag, as in `npm i -g @j9t/obsohtml`.)

#### Execution

The script accepts a folder path as a command line option, which can be specified in both short form (`-f`) and long form (`--folder`). The folder path can be either absolute or relative.

The script can be run in “verbose” mode by appending `-v` or `--verbose` to the command. This will show information about files and directories that were skipped.

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

As mentioned above, the script accepts a folder (`-f`, `--folder`) and can be run in “verbose” mode (`-v`, `--verbose`).

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

This started as an experiment, in which I used AI to produce this little HTML quality helper, its tests, and its documentation. While it’s pretty straightforward, I’m sure to have missed something. Please [file an issue](https://github.com/j9t/obsohtml/issues) or contact me directly if you spot a problem or have a suggestion.

## Acknowledgments

Thanks to [@mattbrundage](https://github.com/mattbrundage), [@FabianBeiner](https://github.com/FabianBeiner), and [@AndrewMac](https://github.com/AndrewMac) for helping to make ObsoHTML better!