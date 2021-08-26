const stream = require('stream')
const https = require('https')
const split2 = require('split2')
const inferRepoUrl = require('infer-repo-url')

function compareReferences (a, b) {
  const [aRepo, aNumber] = a.split('#')
  const [bRepo, bNumber] = b.split('#')

  return aRepo.localeCompare(bRepo) || (aNumber - bNumber)
}

function * printVersions (repoUrl, versions) {
  for (let i = 0; i < versions.length - 1; i++) {
    const target = versions[i] === 'Unreleased' ? 'HEAD' : `v${versions[i]}`
    yield `[${versions[i]}]: ${repoUrl}/compare/v${versions[i + 1]}...${target}\n`
  }

  const firstVersion = versions[versions.length - 1]
  yield `[${firstVersion}]: ${repoUrl}/tree/v${firstVersion}\n`
}

async function * formatChangelogImpl (source) {
  const versions = []
  const references = {}
  let repoUrl

  for await (const line of source) {
    if (line.startsWith('## [')) {
      const version = line.split(' ')[1].slice(1, -1)
      versions.push(version)
      yield line
      yield '\n'
      continue
    }

    if (line.startsWith('[Unreleased]:')) {
      repoUrl = line.split(' ')[1].replace(/\/compare\/.*$/, '')
      yield * printVersions(repoUrl, versions)
      continue
    }

    if (line.startsWith('[')) {
      const reference = line.split(']')[0].slice(1)

      if (versions.includes(reference)) {
        continue
      }

      if (reference.startsWith('#') && (reference.slice(1) in references)) {
        references[reference] = line.slice(line.indexOf(':') + 2)
        continue
      }

      if (reference.match(/^([\w_-]+\/[\w_-]+)?#\d+$/)) {
        references[reference] = line.slice(line.indexOf(':') + 2)
        continue
      }
    }

    const matches = line.match(/\[([\w_-]+\/[\w_-]+)?#\d+\]/g)

    if (matches) {
      for (const match of matches) {
        references[match.slice(1, -1)] = null
      }
    }

    yield line
    yield '\n'
  }

  if (!repoUrl) {
    repoUrl = await inferRepoUrl()
    yield '\n'
    yield * printVersions(repoUrl, versions)
  }

  // No references previously, add space.
  if (Object.values(references).length && Object.values(references).every(reference => !reference)) {
    yield '\n'
  }

  for (let [reference, link] of Object.entries(references).sort(([a], [b]) => compareReferences(a, b))) {
    if (link) {
      // Reference was already there, print as is.
      yield `[${reference}]: ${link}\n`
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

    yield `[${reference}]: ${link}\n`
  }
}

async function * formatChangelog (source) {
  const split = split2()
  const promise = stream.promises.pipeline(source, split)

  yield * formatChangelogImpl(split)

  await promise
}

module.exports = formatChangelog
