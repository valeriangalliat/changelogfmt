# changelogfmt [![npm version](http://img.shields.io/npm/v/changelogfmt?style=flat-square)](https://www.npmjs.org/package/changelogfmt)

> Formats the reference links of [Keep a Changelog] style files.

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/

## Overview

When maintaining a changelog file in the [Keep a Changelog] format, you
need to manually add links to compare each version with the previous one.

You might also reference issues and pull requests, and unlike in GitHub
comments, you need to explicitly add the Markdown link for those in your
changelog.

This can be a bit cumbersome and error-prone. To ease that, let me
introduce **changelogfmt**.

This tool takes your changelog as stdin, makes sure that each version
has the proper GitHub compare URL (or adds it otherwise), identifies all
`#` links to add the issue or PR link reference for all the missing
ones, and outputs the new version to `stdout`.

## Installation

```sh
npm install -g changelogfmt
```

## Usage

Format given file, `stdin` or `CHANGELOG.md` otherwise, and print it to
`stdout`:

```sh
changelogfmt whatever.md
changelogfmt < whatever.md
changelogfmt
```

Format given file or `CHANGELOG.md` otherwise, and overwrite it:

```sh
changelogfmt --write whatever.md
changelogfmt --write
```

My favorite way is from inside Vim, while editing the changelog file:

```
:%!changelogfmt
```

## Development

```sh
# Lint the code.
npm run lint
```

## Possible improvements

Pull requests are welcome!

* Automatically fetch version dates from Git tags if missing (or
  validate existing ones too).
* Add missing version entries based on Git tags.
