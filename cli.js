const fs = require('fs')
const stream = require('stream')
const path = require('path')
const { docopt } = require('docopt')
const sponge = require('sponge')
const formatChangelog = require('.')
const { version } = require('./package')

const doc = `
Usage:
  changelogfmt [--write] [<file>]
  changelogfmt init
  changelogfmt -h | --help
  changelogfmt --version

Arguments:
  <file>  File to process, defaults to \`CHANGELOG.md\` or \`stdin\` if piped.

Options:
  -w, --write  Update file in place (has no effect when piped).
  -h, --help   Show this screen.
  --version    Show version.
`.trim()

async function init () {
  try {
    await fs.promises.access('CHANGELOG.md')
    throw new Error('`CHANGELOG.md` already exists!')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }

  await fs.copyFile(path.join(__dirname, 'TEMPLATE_CHANGELOG.md'), 'CHANGELOG.md')
}

function format (input, output) {
  return stream.promises.pipeline(
    input,
    formatChangelog,
    output
  )
}

function formatFile (file, write, or) {
  format(fs.createReadStream(file), write ? sponge(file) : or)

  if (write) {
    console.error(`Wrote: ${file}`)
  }
}

function cli (argv) {
  const args = docopt(doc, { argv, version })

  if (args.init) {
    return init()
  }

  if (args['<file>']) {
    return formatFile(args['<file>'], args['--write'], process.stdout)
  }

  if (process.stdin.isTTY) {
    return formatFile('CHANGELOG.md', args['--write'], process.stdout)
  }

  return format(process.stdin, process.stdout)
}

module.exports = cli
