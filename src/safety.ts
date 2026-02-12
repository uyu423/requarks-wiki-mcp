import type { WikiConfig } from './types.js'
import { WikiMutationDisabledError, WikiInvalidTokenError, WikiPathNotAllowedError } from './errors.js'

export function normalizeWikiPath(path: string): string {
  return path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

export function enforceMutationSafety(config: WikiConfig, confirm: string): void {
  if (!config.mutationsEnabled) {
    throw new WikiMutationDisabledError()
  }
  if (confirm !== config.mutationConfirmToken) {
    throw new WikiInvalidTokenError()
  }
}

export function enforceMutationPath(config: WikiConfig, path: string): void {
  if (config.allowedMutationPathPrefixes.length === 0) {
    return
  }

  const normalizedPath = normalizeWikiPath(path)
  const isAllowed = config.allowedMutationPathPrefixes.some(prefix => {
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  })

  if (!isAllowed) {
    throw new WikiPathNotAllowedError(path, config.allowedMutationPathPrefixes)
  }
}

export function auditMutation(operation: string, details: Record<string, unknown>): void {
  const sanitized = { ...details }
  delete sanitized['apiToken']
  delete sanitized['token']

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    source: 'requarks-wiki-mcp',
    operation,
    details: sanitized
  })
  process.stderr.write(`[requarks-wiki-mcp] mutation_audit ${line}\n`)
}
