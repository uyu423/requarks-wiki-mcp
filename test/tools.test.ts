import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import {
  WikiNotFoundError,
  WikiMutationDisabledError,
  WikiPathNotAllowedError,
  WikiInvalidTokenError,
  WikiForbiddenError,
  WikiValidationError,
  classifyGraphQLError,
  formatErrorForLLM
} from '../src/errors.js'

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

describe('classifyGraphQLError - Comment error codes (8xxx)', () => {
  it('returns WikiNotFoundError for code 8003 (CommentNotFound)', () => {
    const err = classifyGraphQLError({
      message: 'Comment not found',
      extensions: { code: 8003 }
    })
    assert.ok(err instanceof WikiNotFoundError)
    assert.ok(err.message.includes('8003'))
    assert.ok(err.message.includes('CommentNotFound'))
  })

  it('returns WikiForbiddenError for code 8002 (CommentPostForbidden)', () => {
    const err = classifyGraphQLError({
      message: 'Cannot post comment',
      extensions: { code: 8002 }
    })
    assert.ok(err instanceof WikiForbiddenError)
    assert.equal(err.code, 8002)
    assert.ok(err.message.includes('8002'))
    assert.ok(err.message.includes('CommentPostForbidden'))
  })

  it('returns WikiForbiddenError for code 8004 (CommentViewForbidden)', () => {
    const err = classifyGraphQLError({
      message: 'Cannot view comments',
      extensions: { code: 8004 }
    })
    assert.ok(err instanceof WikiForbiddenError)
    assert.equal(err.code, 8004)
    assert.ok(err.message.includes('8004'))
    assert.ok(err.message.includes('CommentViewForbidden'))
  })

  it('returns WikiForbiddenError for code 8005 (CommentManageForbidden)', () => {
    const err = classifyGraphQLError({
      message: 'Cannot manage comment',
      extensions: { code: 8005 }
    })
    assert.ok(err instanceof WikiForbiddenError)
    assert.equal(err.code, 8005)
    assert.ok(err.message.includes('8005'))
    assert.ok(err.message.includes('CommentManageForbidden'))
  })

  it('returns WikiValidationError for code 8001 (CommentGenericError)', () => {
    const err = classifyGraphQLError({
      message: 'Generic comment error',
      extensions: { code: 8001 }
    })
    assert.ok(err instanceof WikiValidationError)
    assert.equal(err.code, 8001)
    assert.ok(err.message.includes('8001'))
    assert.ok(err.message.includes('CommentGenericError'))
  })
})

describe('formatErrorForLLM - WikiPathNotAllowedError', () => {
  it('formats path not allowed error', () => {
    const err = new WikiPathNotAllowedError('/restricted/path', ['/allowed/prefix'])
    const result = formatErrorForLLM(err, 'create page')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('/restricted/path'))
    assert.ok(result.content[0].text.includes('not within the allowed mutation paths'))
  })
})

describe('formatErrorForLLM - WikiInvalidTokenError', () => {
  it('formats invalid token error', () => {
    const err = new WikiInvalidTokenError()
    const result = formatErrorForLLM(err, 'update page')
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('Invalid confirm token'))
  })
})
