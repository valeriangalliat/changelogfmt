const fs = require('fs')
const path = require('path')
const { docopt } = require('docopt')
const formatChangelog = require('.')
const { version } = require('./package')

const doc = `
Usage:
  changelogfmt
  changelogfmt init
  changelogfmt -h | --help
  changelogfmt --version

Options:
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

function cli (argv) {
  const args = docopt(doc, { argv, version })

  if (args.init) {
    return init()
  }

  const input = process.stdin.isTTY ? fs.createReadStream('CHANGELOG.md') : process.stdin

  formatChangelog(input)
}

module.exports = cli
