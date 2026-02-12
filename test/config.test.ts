import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.js'

const REQUIRED_ENV = {
  WIKI_BASE_URL: 'https://wiki.test',
  WIKI_API_TOKEN: 'jwt-token-here'
}

function setEnv(overrides: Record<string, string> = {}): void {
  for (const [k, v] of Object.entries({ ...REQUIRED_ENV, ...overrides })) {
    process.env[k] = v
  }
}

function clearWikiEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('WIKI_')) {
      delete process.env[key]
    }
  }
}

describe('loadConfig', () => {
  beforeEach(() => clearWikiEnv())
  afterEach(() => clearWikiEnv())

  it('loads required env vars', () => {
    setEnv()
    const cfg = loadConfig()
    assert.equal(cfg.baseUrl, 'https://wiki.test')
    assert.equal(cfg.apiToken, 'jwt-token-here')
  })

  it('throws on missing WIKI_BASE_URL', () => {
    process.env['WIKI_API_TOKEN'] = 'x'
    assert.throws(() => loadConfig(), /WIKI_BASE_URL/)
  })

  it('throws on missing WIKI_API_TOKEN', () => {
    process.env['WIKI_BASE_URL'] = 'https://wiki.test'
    assert.throws(() => loadConfig(), /WIKI_API_TOKEN/)
  })

  it('strips trailing slash from baseUrl', () => {
    setEnv({ WIKI_BASE_URL: 'https://wiki.test/' })
    const cfg = loadConfig()
    assert.equal(cfg.baseUrl, 'https://wiki.test')
  })

  it('applies defaults for optional vars', () => {
    setEnv()
    const cfg = loadConfig()
    assert.equal(cfg.graphPath, '/graphql')
    assert.equal(cfg.defaultLocale, 'en')
    assert.equal(cfg.defaultEditor, 'markdown')
    assert.equal(cfg.mutationsEnabled, false)
    assert.equal(cfg.mutationConfirmToken, '')
    assert.equal(cfg.mutationDryRun, true)
    assert.deepEqual(cfg.allowedMutationPathPrefixes, [])
    assert.equal(cfg.httpTimeoutMs, 15000)
    assert.equal(cfg.httpMaxRetries, 2)
  })

  it('parses WIKI_MUTATIONS_ENABLED=true', () => {
    setEnv({ WIKI_MUTATIONS_ENABLED: 'true', WIKI_MUTATION_CONFIRM_TOKEN: 'MY_SECRET' })
    assert.equal(loadConfig().mutationsEnabled, true)
  })

  it('parses WIKI_MUTATIONS_ENABLED=TRUE (case insensitive)', () => {
    setEnv({ WIKI_MUTATIONS_ENABLED: 'TRUE', WIKI_MUTATION_CONFIRM_TOKEN: 'MY_SECRET' })
    assert.equal(loadConfig().mutationsEnabled, true)
  })

  it('throws when mutations enabled without confirm token', () => {
    setEnv({ WIKI_MUTATIONS_ENABLED: 'true' })
    assert.throws(() => loadConfig(), /WIKI_MUTATION_CONFIRM_TOKEN/)
  })

  it('parses WIKI_MUTATION_DRY_RUN=false', () => {
    setEnv({ WIKI_MUTATION_DRY_RUN: 'false' })
    assert.equal(loadConfig().mutationDryRun, false)
  })

  it('parses CSV path prefixes', () => {
    setEnv({ WIKI_ALLOWED_MUTATION_PATH_PREFIXES: 'docs,guides/setup,/api/' })
    const cfg = loadConfig()
    assert.deepEqual(cfg.allowedMutationPathPrefixes, ['docs', 'guides/setup', 'api'])
  })

  it('parses HTTP timeout and retries', () => {
    setEnv({ WIKI_HTTP_TIMEOUT_MS: '5000', WIKI_HTTP_MAX_RETRIES: '0' })
    const cfg = loadConfig()
    assert.equal(cfg.httpTimeoutMs, 5000)
    assert.equal(cfg.httpMaxRetries, 0)
  })

  it('falls back to default for NaN timeout', () => {
    setEnv({ WIKI_HTTP_TIMEOUT_MS: 'not-a-number' })
    const cfg = loadConfig()
    assert.equal(cfg.httpTimeoutMs, 15000)
  })

  it('falls back to default for negative timeout', () => {
    setEnv({ WIKI_HTTP_TIMEOUT_MS: '-5' })
    const cfg = loadConfig()
    assert.equal(cfg.httpTimeoutMs, 15000)
  })

  it('falls back to default for NaN retries', () => {
    setEnv({ WIKI_HTTP_MAX_RETRIES: 'abc' })
    const cfg = loadConfig()
    assert.equal(cfg.httpMaxRetries, 2)
  })

  it('normalizes graphPath without leading slash', () => {
    setEnv({ WIKI_GRAPHQL_PATH: 'graphql' })
    const cfg = loadConfig()
    assert.equal(cfg.graphPath, '/graphql')
  })

  it('normalizes graphPath with trailing slashes', () => {
    setEnv({ WIKI_GRAPHQL_PATH: '/graphql///' })
    const cfg = loadConfig()
    assert.equal(cfg.graphPath, '/graphql')
  })
})
