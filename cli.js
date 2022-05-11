const fs = require('fs')
const stream = require('stream')
const { docopt } = require('docopt')
const sponge = require('sponge')
const formatChangelog = require('.')
const init = require('./init')
const { version } = require('./package')

const doc = `
Usage:
  changelogfmt init
  changelogfmt [--write] [<file>]
  changelogfmt -h | --help
  changelogfmt --version

Arguments:
  <file>  File to process, defaults to \`CHANGELOG.md\` or \`stdin\` if piped.

Options:
  -w, --write  Update file in place (has no effect when piped).
  -h, --help   Show this screen.
  --version    Show version.
`.trim()

function format (input, output) {
  return stream.promises.pipeline(
    input,
    formatChangelog,
    output
  )
}

function formatFile (file, write, or) {
  format(fs.createReadStream(file), write ? sponge(file) : or)
}

function formatFileLog (file, write, or) {
  formatFile(file, write, or)

  if (write) {
    console.error(`Wrote: ${file}`)
  }
}

function cli (argv) {
  const args = docopt(doc, { argv, version })

  if (args.init) {
    return init(formatFile)
  }

  if (args['<file>']) {
    return formatFileLog(args['<file>'], args['--write'], process.stdout)
  }

  if (!process.stdin.isTTY) {
    return format(process.stdin, process.stdout)
  }

  if (fs.existsSync('CHANGELOG.md')) {
    return formatFileLog('CHANGELOG.md', args['--write'], process.stdout)
  }

  console.error('No `CHANGELOG.md` in current directory. Maybe run `changelogfmt init`?')
  console.error()
  console.error(doc)
  process.exit(1)
}

module.exports = cli
