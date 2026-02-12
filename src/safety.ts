import { timingSafeEqual } from 'node:crypto'
import type { WikiConfig } from './types.js'
import {
  WikiMutationDisabledError,
  WikiInvalidTokenError,
  WikiPathNotAllowedError
} from './errors.js'

export function normalizeWikiPath(path: string): string {
  return path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

function safeTokenCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function enforceMutationSafety(config: WikiConfig, confirm: string): void {
  if (!config.mutationsEnabled) {
    throw new WikiMutationDisabledError()
  }
  if (config.mutationConfirmToken && !safeTokenCompare(confirm, config.mutationConfirmToken)) {
    throw new WikiInvalidTokenError()
  }
}

export function enforceMutationPath(config: WikiConfig, path: string): void {
  if (config.allowedMutationPathPrefixes.length === 0) {
    return
  }

  const normalizedPath = normalizeWikiPath(path)
  const isAllowed = config.allowedMutationPathPrefixes.some((prefix) => {
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  })

  if (!isAllowed) {
    throw new WikiPathNotAllowedError(path, config.allowedMutationPathPrefixes)
  }
}

const SENSITIVE_KEYS = new Set([
  'apitoken',
  'token',
  'authorization',
  'bearertoken',
  'password',
  'secret',
  'credential',
  'key'
])

function sanitizeDetails(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED]'
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeDetails(item as Record<string, unknown>)
          : item
      )
    } else if (v !== null && typeof v === 'object') {
      result[k] = sanitizeDetails(v as Record<string, unknown>)
    } else {
      result[k] = v
    }
  }
  return result
}

export function auditMutation(operation: string, details: Record<string, unknown>): void {
  const sanitized = sanitizeDetails(details)

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    source: '@yowu-dev/requarks-wiki-mcp',
    operation,
    details: sanitized
  })
  process.stderr.write(`[@yowu-dev/requarks-wiki-mcp] mutation_audit ${line}\n`)
}
