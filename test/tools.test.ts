import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import { WikiNotFoundError, WikiMutationDisabledError, formatErrorForLLM } from '../src/errors.js'

describe('formatErrorForLLM - ZodError', () => {
  it('formats ZodError with field paths', () => {
    const err = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['query'],
        message: 'Required'
      }
    ])
    const result = formatErrorForLLM(err, 'search pages')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Invalid Input'))
    assert.ok(result.content[0].text.includes('query'))
    assert.ok(result.content[0].text.includes('Required'))
  })

  it('formats ZodError with nested paths', () => {
    const err = new ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'number',
        inclusive: true,
        exact: false,
        path: ['id'],
        message: 'Number must be greater than or equal to 1'
      }
    ])
    const result = formatErrorForLLM(err, 'get page by id')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('id'))
  })
})

describe('formatErrorForLLM - WikiNotFoundError', () => {
  it('formats not-found with context', () => {
    const err = new WikiNotFoundError('Page with id=999 not found.')
    const result = formatErrorForLLM(err, 'get page by id')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Not Found'))
    assert.ok(result.content[0].text.includes('id=999'))
  })
})

describe('formatErrorForLLM - WikiMutationDisabledError', () => {
  it('formats mutation disabled with guidance', () => {
    const err = new WikiMutationDisabledError()
    const result = formatErrorForLLM(err, 'create page')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Mutation Disabled'))
    assert.ok(result.content[0].text.includes('WIKI_MUTATIONS_ENABLED=true'))
  })
})
