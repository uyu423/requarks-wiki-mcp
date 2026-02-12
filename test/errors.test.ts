import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  WikiError,
  WikiAuthError,
  WikiForbiddenError,
  WikiTransientError,
  WikiRateLimitedError,
  classifyGraphQLError,
  classifyHttpStatus,
  formatErrorForLLM,
  textResult,
  errorResult
} from '../src/errors.js'

describe('classifyGraphQLError', () => {
  it('returns WikiForbiddenError for code 6013', () => {
    const err = classifyGraphQLError({
      message: 'PageViewForbidden',
      extensions: { exception: { code: 6013 } }
    })
    assert.ok(err instanceof WikiForbiddenError)
    assert.equal(err.code, 6013)
    assert.ok(err.message.includes('6013'))
  })

  it('returns WikiError for other codes', () => {
    const err = classifyGraphQLError({
      message: 'Something failed',
      extensions: { code: 5001 }
    })
    assert.ok(err instanceof WikiError)
    assert.equal(err.code, 5001)
  })

  it('returns WikiError for no code', () => {
    const err = classifyGraphQLError({ message: 'Generic error' })
    assert.ok(err instanceof WikiError)
    assert.equal(err.message, 'Generic error')
  })

  it('handles missing message', () => {
    const err = classifyGraphQLError({})
    assert.equal(err.message, 'Unknown GraphQL error')
  })
})

describe('classifyHttpStatus', () => {
  it('returns WikiAuthError for 401', () => {
    assert.ok(classifyHttpStatus(401) instanceof WikiAuthError)
  })

  it('returns WikiForbiddenError for 403', () => {
    assert.ok(classifyHttpStatus(403) instanceof WikiForbiddenError)
  })

  it('returns WikiRateLimitedError for 429', () => {
    assert.ok(classifyHttpStatus(429) instanceof WikiRateLimitedError)
  })

  it('returns WikiTransientError for 5xx', () => {
    for (const status of [500, 502, 503, 504]) {
      const err = classifyHttpStatus(status)
      assert.ok(err instanceof WikiTransientError, `Expected WikiTransientError for ${status}`)
    }
  })

  it('does not leak response body in 5xx error messages', () => {
    const err = classifyHttpStatus(500, '<html>secret stack trace</html>')
    assert.ok(!err.message.includes('secret'))
    assert.ok(!err.message.includes('<html>'))
  })

  it('returns generic WikiError for other status codes', () => {
    const err = classifyHttpStatus(400)
    assert.ok(err instanceof WikiError)
    assert.ok(!(err instanceof WikiAuthError))
  })
})

describe('formatErrorForLLM', () => {
  it('formats 6013 error with fix instructions', () => {
    const err = new WikiForbiddenError('test', 6013)
    const result = formatErrorForLLM(err, 'reading page')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('6013'))
    assert.ok(result.content[0].text.includes('read:pages'))
  })

  it('formats auth error', () => {
    const err = new WikiAuthError('bad token')
    const result = formatErrorForLLM(err, 'searching')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Authentication'))
  })

  it('formats rate limit error', () => {
    const err = new WikiRateLimitedError('slow down')
    const result = formatErrorForLLM(err, 'listing')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Rate Limited'))
  })

  it('formats transient error', () => {
    const err = new WikiTransientError('server down', 502)
    const result = formatErrorForLLM(err, 'fetching')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Server Error'))
  })

  it('formats generic error', () => {
    const result = formatErrorForLLM(new Error('oops'), 'doing stuff')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('oops'))
    assert.ok(result.content[0].text.includes('doing stuff'))
  })

  it('handles non-Error objects', () => {
    const result = formatErrorForLLM('string error', 'testing')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('string error'))
  })
})

describe('textResult', () => {
  it('wraps text in MCP TextContent array', () => {
    const r = textResult('hello')
    assert.equal(r.content.length, 1)
    assert.equal(r.content[0].type, 'text')
    assert.equal(r.content[0].text, 'hello')
    assert.equal(r.isError, undefined)
  })
})

describe('errorResult', () => {
  it('wraps message with Error prefix and isError flag', () => {
    const r = errorResult('bad thing')
    assert.equal(r.content.length, 1)
    assert.ok(r.content[0].text.startsWith('Error:'))
    assert.equal(r.isError, true)
  })
})
