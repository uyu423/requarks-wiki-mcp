import type { CallToolResult } from './types.js'
import { ZodError } from 'zod'

// ── Error taxonomy ────────────────────────────────────────────────────

export class WikiError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'WikiError'
  }
}

export class WikiAuthError extends WikiError {
  constructor(message: string) {
    super(message, 'AUTH', 401)
    this.name = 'WikiAuthError'
  }
}

export class WikiForbiddenError extends WikiError {
  constructor(message: string, code?: string | number) {
    super(message, code ?? 6013, 403)
    this.name = 'WikiForbiddenError'
  }
}

export class WikiNotFoundError extends WikiError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404)
    this.name = 'WikiNotFoundError'
  }
}

export class WikiTransientError extends WikiError {
  constructor(message: string, statusCode: number) {
    super(message, 'TRANSIENT', statusCode)
    this.name = 'WikiTransientError'
  }
}

export class WikiRateLimitedError extends WikiError {
  constructor(message: string) {
    super(message, 'RATE_LIMITED', 429)
    this.name = 'WikiRateLimitedError'
  }
}

export class WikiMutationDisabledError extends WikiError {
  constructor() {
    super('Mutation tools are disabled. Set WIKI_MUTATIONS_ENABLED=true to allow write operations.')
    this.name = 'WikiMutationDisabledError'
  }
}

export class WikiInvalidTokenError extends WikiError {
  constructor() {
    super('Invalid confirm token for mutation tool.')
    this.name = 'WikiInvalidTokenError'
  }
}

export class WikiPathNotAllowedError extends WikiError {
  constructor(path: string, allowedPrefixes: string[]) {
    super(
      `Path '${path}' is not allowed for mutation. Allowed prefixes: ${allowedPrefixes.join(', ')}`
    )
    this.name = 'WikiPathNotAllowedError'
  }
}

// ── Error classification from GraphQL response ────────────────────────

export function classifyGraphQLError(error: {
  message?: string
  extensions?: {
    code?: string | number
    exception?: { code?: number }
  }
}): WikiError {
  const message = error.message ?? 'Unknown GraphQL error'
  const code = error.extensions?.exception?.code ?? error.extensions?.code

  if (String(code) === '6003') {
    return new WikiNotFoundError(`${message} (Wiki.js code 6003: page does not exist)`)
  }

  if (String(code) === '6013') {
    return new WikiForbiddenError(
      `${message} (code 6013: PageViewForbidden). Verify page rules and API-key group permissions for read:pages/read:source.`,
      6013
    )
  }

  if (code !== undefined) {
    return new WikiError(`${message} (Wiki.js code: ${String(code)})`, code)
  }

  return new WikiError(message)
}

export function classifyHttpStatus(status: number, body?: string): WikiError {
  void body

  if (status === 401) {
    return new WikiAuthError('Authentication failed. Check WIKI_API_TOKEN.')
  }
  if (status === 403) {
    return new WikiForbiddenError('Access forbidden. Check API key permissions.')
  }
  if (status === 429) {
    return new WikiRateLimitedError('Rate limited by Wiki.js. Try again later.')
  }
  if (status >= 500 && status < 600) {
    return new WikiTransientError(
      `Wiki.js server error (${status}). The server encountered an internal error.`,
      status
    )
  }
  return new WikiError(`Wiki.js request failed with status ${status}`, undefined, status)
}

// ── LLM-friendly error formatting for MCP responses ───────────────────

export function formatErrorForLLM(err: unknown, context: string): CallToolResult {
  if (err instanceof WikiForbiddenError && String(err.code) === '6013') {
    return errorResult([
      `Permission Denied (Wiki.js Error 6013) while ${context}`,
      '',
      'What happened: The API token lacks permission to access this page.',
      '',
      'How to fix:',
      '1. Verify the API key group has read:pages permission',
      '2. Check page rules for read:source permission',
      '3. Confirm the page path is not restricted for this group'
    ].join('\n'))
  }

  if (err instanceof WikiAuthError) {
    return errorResult([
      `Authentication Failed while ${context}`,
      '',
      'The API token is invalid or expired. Check WIKI_API_TOKEN in your .env file.'
    ].join('\n'))
  }

  if (err instanceof WikiNotFoundError) {
    return errorResult([
      `Not Found while ${context}`,
      '',
      err.message,
      '',
      'Verify the page path/ID exists and is accessible with your API key permissions.'
    ].join('\n'))
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    return errorResult([
      `Invalid Input while ${context}`,
      '',
      'The provided arguments failed validation:',
      issues,
      '',
      'Check the tool input schema for required fields and types.'
    ].join('\n'))
  }

  if (err instanceof WikiRateLimitedError) {
    return errorResult([
      `Rate Limited while ${context}`,
      '',
      'Wiki.js is throttling requests. Wait a moment and try again.'
    ].join('\n'))
  }

  if (err instanceof WikiTransientError) {
    return errorResult([
      `Wiki.js Server Error while ${context}`,
      '',
      `${err.message}`,
      '',
      'This is a temporary server-side issue. Retry the operation.'
    ].join('\n'))
  }

  if (err instanceof WikiMutationDisabledError) {
    return errorResult([
      `Mutation Disabled: ${err.message}`,
      '',
      'To enable mutations:',
      '1. Set WIKI_MUTATIONS_ENABLED=true in .env',
      '2. Set WIKI_MUTATION_DRY_RUN=false for real writes',
      '3. Provide the correct confirm token matching WIKI_MUTATION_CONFIRM_TOKEN'
    ].join('\n'))
  }

  if (err instanceof WikiPathNotAllowedError) {
    return errorResult(err.message)
  }

  if (err instanceof WikiInvalidTokenError) {
    return errorResult(err.message)
  }

  const message = err instanceof Error ? err.message : String(err)
  return errorResult(`Failed to ${context}: ${message}`)
}

// ── Result helpers ────────────────────────────────────────────────────

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] }
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
}
