# Changelog

As of version 1.10.0, all notable changes to ObsoHTML are documented in this file, which is (mostly) AI-generated and (always) human-edited. Dependency updates may or may not be called out specifically.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-04-11

### Added

- Added programmatic API: `checkMarkup(html)` returns `{ elements, attributes }` arrays for use in other tools; `obsoleteElements` and `obsoleteAttributes` are now exported directly