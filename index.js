const stream = require('stream')
const split2 = require('split2')
const inferRepoUrl = require('infer-repo-url')
const fetch = require('node-fetch')

function compareIssues (a, b) {
  const [aRepo, aNumber] = a.split('#')
  const [bRepo, bNumber] = b.split('#')

  return aRepo.localeCompare(bRepo) || (aNumber - bNumber)
}

function splitCommit (ref) {
  return ref.includes('@') ? ref.split('@') : ['', ref]
}

function compareCommits (a, b) {
  const [aRepo] = splitCommit(a)
  const [bRepo] = splitCommit(b)

  return aRepo.localeCompare(bRepo)
}

function * printVersions (repoUrl, versions) {
  versions = Object.keys(versions)

  for (let i = 0; i < versions.length - 1; i++) {
    const target = versions[i] === 'Unreleased' ? 'HEAD' : `v${versions[i]}`
    yield `[${versions[i]}]: ${repoUrl}/compare/v${versions[i + 1]}...${target}\n`
  }

  const firstVersion = versions[versions.length - 1]
  yield `[${firstVersion}]: ${repoUrl}/tree/v${firstVersion}\n`
}

async function resolveIssue (repoUrl, ref) {
  let link

  if (ref.startsWith('#')) {
    // Issue or PR number.
    link = `${repoUrl}/issues/${ref.slice(1)}`
  } else {
    // Other repo issue or PR.
    const [repo, number] = ref.split('#')
    link = `https://github.com/${repo}/issues/${number}`
  }

  // Leverage the fact that if calling GitHub `/issues/` with a PR number,
  // it redirects to `/pull/` to make sure we're properly linking new
  // references.
  const res = await fetch(link, { redirect: 'manual' })

  return res.headers.get('location') || link
}

async function resolveCommit (repoUrl, ref) {
  let repo, commit

  if (ref.startsWith('`')) {
    // Commit in the same repo.
    repo = new URL(repoUrl).pathname.slice(1)
    commit = ref.slice(1, -1)
  } else {
    // Commit in other repo.
    [repo, commit] = ref.split('@')
    commit = commit.slice(1, -1)
  }

  if (commit.length < 40) {
    // Resolve full commit hash.
    const body = await fetch(`https://api.github.com/repos/${repo}/commits/${commit}`)
      .then(res => res.json())

    commit = body.sha
  }

  return `https://github.com/${repo}/commit/${commit}`
}

async function * printRefs (repoUrl, refs, compare, resolve) {
  if (Object.keys(refs).length) {
    yield '\n'
  }

  const existingRefs = []
  const promises = []

  for (const [ref, link] of Object.entries(refs)) {
    if (!link) {
      promises.push(resolve(repoUrl, ref).then(link => [ref, link]))
    } else {
      existingRefs.push([ref, link])
    }
  }

  const resolvedRefs = await Promise.all(promises)

  for (const [ref, link] of existingRefs.concat(resolvedRefs).sort(([a], [b]) => compare(a, b))) {
    yield `[${ref}]: ${link}\n`
  }
}

async function * formatChangelogImpl (source) {
  const refs = { versions: {}, issues: {}, commits: {} }
  let repoUrl

  for await (let line of source) {
    if (line.startsWith('## [')) {
      const version = line.split(' ')[1].slice(1, -1)
      refs.versions[version] = null
      yield line
      yield '\n'
      continue
    }

    if (line.startsWith('[Unreleased]:')) {
      repoUrl = line.split(' ')[1].replace(/\/compare\/.*$/, '')
      // yield * printVersions(repoUrl, refs.versions)
      continue
    }

    if (line.startsWith('[')) {
      const ref = line.split(']')[0].slice(1)

      if (ref in refs.versions) {
        continue
      }

      if (ref.match(/^([\w_-]+\/[\w_-]+)?#\d+$/)) {
        refs.issues[ref] = line.slice(line.indexOf(':') + 2)
        continue
      }

      if (ref.match(/^([\w_-]+\/[\w_-]+@)?`[a-f\d]{7,}`$/)) {
        refs.commits[ref] = line.slice(line.indexOf(':') + 2)
        continue
      }
    }

    for (const match of line.match(/\[([\w_-]+\/[\w_-]+)?#\d+\]/g) || []) {
      refs.issues[match.slice(1, -1)] ||= null
    }

    line = line.replace(/\[([\w_-]+\/[\w_-]+@)?`([a-f\d]{7,})`\]/g, (_, prefix, commit) => {
      commit = commit.slice(0, 7)
      const ref = (prefix || '') + '`' + commit + '`'
      refs.commits[ref] ||= null
      return `[${ref}]`
    })

    if (repoUrl && line === '') {
      continue
    }

    yield line
    yield '\n'
  }

  if (!repoUrl) {
    repoUrl = await inferRepoUrl()
    yield '\n'
  }

  yield * printVersions(repoUrl, refs.versions)
  yield * printRefs(repoUrl, refs.issues, compareIssues, resolveIssue)
  yield * printRefs(repoUrl, refs.commits, compareCommits, resolveCommit)
}

async function * formatChangelog (source) {
  const split = split2()
  const promise = stream.promises.pipeline(source, split)

  yield * formatChangelogImpl(split)

  await promise
}

module.exports = formatChangelog
