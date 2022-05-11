const fs = require('fs')
const path = require('path')
const cp = require('child_process')

function git (...args) {
  return cp.spawnSync('git', args)
}

async function fallback () {
  await fs.promises.copyFile(path.join(__dirname, 'TEMPLATE_CHANGELOG.md'), 'CHANGELOG.md')

  await fs.promises.appendFile('CHANGELOG.md', `
## [1.0.0] - DATE
* Initial release.
`)

  console.log('Created empty `CHANGELOG.md`')
}

async function init (formatFile) {
  if (fs.existsSync('CHANGELOG.md')) {
    throw new Error('`CHANGELOG.md` already exists!')
  }

  // Outputs tag (not full ref path), 4 spaces, and date string
  const tagOut = git('tag', '--format', '%(refname:strip=2)    %(creatordate)')

  if (tagOut.status > 0) {
    return await fallback()
  }

  const allTags = tagOut.stdout.toString().trim().split('\n').map(t => t.split('    '))
  const tags = allTags.filter(([tag, date]) => tag.match(/^v?\d+(\.\d+)*$/)).reverse()

  if (tags.length < 1) {
    return await fallback()
  }

  const history = tags.map(([tag, date]) => {
    const version = tag.replace(/^v/, '')

    // `sv` is nearly like ISO but will keep the local time
    const isoDate = new Date(date).toLocaleString('sv').split(' ')[0]

    return `## [${version}] - ${isoDate}\n`
  })

  history[history.length - 1] += '* Initial release.'

  await fs.promises.copyFile(path.join(__dirname, 'TEMPLATE_CHANGELOG.md'), 'CHANGELOG.md')
  await fs.promises.appendFile('CHANGELOG.md', '\n' + history.join('\n'))

  // Dogfooding process and write file to automatically add Git URLs
  await formatFile('CHANGELOG.md', true)

  console.log('Created `CHANGELOG.md` from Git tags')
}

module.exports = init
