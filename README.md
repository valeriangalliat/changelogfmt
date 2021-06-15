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
ones, and outputs the new version to stdout.

**Sidenote:** ironically, this project doesn't have a changelog (yet).
I'll add one if I ever make changes to it.

## Installation

```sh
npm install -g changelogfmt
```

Or without npm, as long as you have Node.js:

```sh
git clone https://github.com/valeriangalliat/changelogfmt.git
export PATH=$PWD/changelogfmt:$PATH
```

## Usage

```sh
changelogfmt < CHANGELOG.md > CHANGELOG.md.new
mv CHANGELOG.md.new CHANGELOG.md
```

Note that we can't directly write to the same file while reading from
it, hence the temporary file.

Alternatively, you can use moreutils' [**sponge**(1)](https://manpages.debian.org/testing/moreutils/sponge.1.en.html):

```sh
changelogfmt < CHANGELOG.md | sponge CHANGELOG.md
```

But my favorite way is from inside Vim, while editing the changelog file:

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

* Add tests.
* Support something like `changelogfmt -w CHANGELOG.md` to read and
  write from the given file.
* Automatically fetch version dates from Git tags if missing (or
  validate existing ones too).
* Add missing version entries based on Git tags.
