const fs = require('fs')
const readline = require('readline')
const https = require('https')
const inferRepoUrl = require('infer-repo-url')

function formatChangelog (input) {
  if (typeof input === 'string') {
    input = fs.createReadStream(input)
  }

  const rl = readline.createInterface({ input })
  const versions = []
  const references = {}
  let repoUrl

  function printVersions () {
    for (let i = 0; i < versions.length - 1; i++) {
      const target = versions[i] === 'Unreleased' ? 'HEAD' : `v${versions[i]}`
      console.log(`[${versions[i]}]: ${repoUrl}/compare/v${versions[i + 1]}...${target}`)
    }

    const firstVersion = versions[versions.length - 1]
    console.log(`[${firstVersion}]: ${repoUrl}/tree/v${firstVersion}`)
  }

  rl.on('line', line => {
    if (line.startsWith('## [')) {
      const version = line.split(' ')[1].slice(1, -1)
      versions.push(version)
      console.log(line)
      return
    }

    if (line.startsWith('[Unreleased]:')) {
      repoUrl = line.split(' ')[1].replace(/\/compare\/.*$/, '')
      printVersions()
      return
    }

    if (line.startsWith('[')) {
      const reference = line.split(']')[0].slice(1)

      if (versions.includes(reference)) {
        return
      }

      if (reference.startsWith('#') && (reference.slice(1) in references)) {
        references[reference] = line.slice(line.indexOf(':') + 2)
        return
      }

      if (reference.match(/^([\w_-]+\/[\w_-]+)?#\d+$/)) {
        references[reference] = line.slice(line.indexOf(':') + 2)
        return
      }
    }

    const matches = line.match(/\[([\w_-]+\/[\w_-]+)?#\d+\]/g)

    if (matches) {
      for (const match of matches) {
        references[match.slice(1, -1)] = null
      }
    }

    console.log(line)
  })

  rl.on('close', async () => {
    if (!repoUrl) {
      repoUrl = await inferRepoUrl()
      console.log()
      printVersions()
    }

    // No references previously, add space.
    if (Object.values(references).length && Object.values(references).every(reference => !reference)) {
      console.log()
    }

    for (let [reference, link] of Object.entries(references)) {
      if (link) {
        // Reference was already there, print as is.
        console.log(`[${reference}]: ${link}`)
        continue
      }

      if (reference.startsWith('#')) {
        // Issue or PR number.
        link = `${repoUrl}/issues/${reference.slice(1)}`
      } else {
        // Other repo issue or PR.
        const [path, number] = reference.split('#')
        link = `https://github.com/${path}/issues/${number}`
      }

      // Leverage the fact that if calling GitHub `/issues/` with a PR number,
      // it redirects to `/pull/` to make sure we're properly linking new
      // references.
      await new Promise(resolve => {
        https.get(link, res => {
          if (res.headers.location) {
            link = res.headers.location
          }

          resolve()
        })
      })

      console.log(`[${reference}]: ${link}`)
    }
  })
}

module.exports = formatChangelog
