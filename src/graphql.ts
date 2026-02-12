import type { WikiConfig, GraphQLClient, GraphQLOptions } from './types.js'
import {
  WikiError,
  WikiTransientError,
  classifyGraphQLError,
  classifyHttpStatus
} from './errors.js'

type GraphQLResponseBody<T> = {
  data?: T
  errors?: Array<{
    message?: string
    extensions?: {
      code?: string | number
      exception?: { code?: number }
    }
  }>
}

const RETRYABLE_STATUS_CODES = new Set([408, 502, 503, 504])

function isRetryable(err: unknown): boolean {
  if (err instanceof WikiTransientError) return true
  if (err instanceof WikiError && err.statusCode !== undefined) {
    return RETRYABLE_STATUS_CODES.has(err.statusCode)
  }
  if (err instanceof TypeError && err.message.includes('fetch')) return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryDelay(attempt: number): number {
  const base = 250
  const factor = Math.pow(2, attempt)
  const jitter = 1 + (Math.random() - 0.5) * 0.4
  return Math.min(base * factor * jitter, 2000)
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function createGraphQLClient(config: WikiConfig): GraphQLClient {
  const endpoint = `${config.baseUrl}${config.graphPath}`

  return async function wikiGraphQL<T>(
    query: string,
    variables: Record<string, unknown>,
    options?: GraphQLOptions
  ): Promise<T> {
    const timeoutMs = options?.timeoutMs ?? config.httpTimeoutMs
    const isMutation = query.trimStart().startsWith('mutation')
    const maxRetries = options?.noRetry || isMutation ? 0 : config.httpMaxRetries
    const requestId = options?.requestId ?? generateRequestId()

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(retryDelay(attempt - 1))
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiToken}`,
            'x-request-id': requestId
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal
        })

        if (!response.ok) {
          const bodyText = await response.text().catch(() => '')
          throw classifyHttpStatus(response.status, bodyText)
        }

        const body = (await response.json()) as GraphQLResponseBody<T>

        if (body.errors && body.errors.length > 0) {
          throw classifyGraphQLError(body.errors[0])
        }

        if (!body.data) {
          throw new WikiError('Wiki.js returned no data.')
        }

        return body.data
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new WikiTransientError(
            `Request timed out after ${timeoutMs}ms (${requestId})`,
            408
          )
        } else {
          lastError = err
        }

        if (attempt < maxRetries && isRetryable(lastError)) {
          continue
        }

        throw lastError
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError
  }
}
