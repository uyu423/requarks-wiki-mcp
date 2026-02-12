import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWikiPath, enforceMutationSafety, enforceMutationPath } from '../src/safety.js'
import {
  WikiMutationDisabledError,
  WikiInvalidTokenError,
  WikiPathNotAllowedError
} from '../src/errors.js'
import type { WikiConfig } from '../src/types.js'

function makeConfig(overrides: Partial<WikiConfig> = {}): WikiConfig {
  return {
    baseUrl: 'https://wiki.test',
    graphPath: '/graphql',
    apiToken: 'test-token',
    defaultLocale: 'en',
    defaultEditor: 'markdown',
    mutationsEnabled: true,
    mutationConfirmToken: 'SECRET',
    mutationDryRun: false,
    allowedMutationPathPrefixes: [],
    httpTimeoutMs: 15000,
    httpMaxRetries: 2,
    ...overrides
  }
}

describe('normalizeWikiPath', () => {
  it('strips leading slashes', () => {
    assert.equal(normalizeWikiPath('/docs/intro'), 'docs/intro')
  })

  it('strips trailing slashes', () => {
    assert.equal(normalizeWikiPath('docs/intro/'), 'docs/intro')
  })

  it('strips both leading and trailing slashes', () => {
    assert.equal(normalizeWikiPath('///docs///'), 'docs')
  })

  it('trims whitespace', () => {
    assert.equal(normalizeWikiPath('  docs/intro  '), 'docs/intro')
  })

  it('returns empty for root-only slashes', () => {
    assert.equal(normalizeWikiPath('///'), '')
  })

  it('handles empty string', () => {
    assert.equal(normalizeWikiPath(''), '')
  })

  it('preserves internal slashes', () => {
    assert.equal(normalizeWikiPath('docs/api/v2/endpoints'), 'docs/api/v2/endpoints')
  })
})

describe('enforceMutationSafety', () => {
  it('throws WikiMutationDisabledError when mutations disabled', () => {
    const config = makeConfig({ mutationsEnabled: false })
    assert.throws(() => enforceMutationSafety(config, 'SECRET'), WikiMutationDisabledError)
  })

  it('throws WikiInvalidTokenError on wrong token', () => {
    const config = makeConfig({ mutationsEnabled: true, mutationConfirmToken: 'SECRET' })
    assert.throws(() => enforceMutationSafety(config, 'WRONG'), WikiInvalidTokenError)
  })

  it('passes with correct token and mutations enabled', () => {
    const config = makeConfig({ mutationsEnabled: true, mutationConfirmToken: 'SECRET' })
    assert.doesNotThrow(() => enforceMutationSafety(config, 'SECRET'))
  })

  it('passes without confirm token when token is not configured', () => {
    const config = makeConfig({ mutationsEnabled: true, mutationConfirmToken: '' })
    assert.doesNotThrow(() => enforceMutationSafety(config, ''))
  })
})

describe('enforceMutationPath', () => {
  it('allows any path when no prefixes configured', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: [] })
    assert.doesNotThrow(() => enforceMutationPath(config, 'anything/goes'))
  })

  it('allows exact prefix match', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs'] })
    assert.doesNotThrow(() => enforceMutationPath(config, 'docs'))
  })

  it('allows subpath of allowed prefix', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs'] })
    assert.doesNotThrow(() => enforceMutationPath(config, 'docs/intro'))
  })

  it('rejects path outside allowed prefixes', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs'] })
    assert.throws(() => enforceMutationPath(config, 'admin/settings'), WikiPathNotAllowedError)
  })

  it('rejects path that starts with prefix but is not a subpath', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs'] })
    assert.throws(() => enforceMutationPath(config, 'docs-archive/old'), WikiPathNotAllowedError)
  })

  it('allows path matching any of multiple prefixes', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs', 'guides'] })
    assert.doesNotThrow(() => enforceMutationPath(config, 'guides/setup'))
  })

  it('normalizes path before checking', () => {
    const config = makeConfig({ allowedMutationPathPrefixes: ['docs'] })
    assert.doesNotThrow(() => enforceMutationPath(config, '/docs/intro/'))
  })
})
