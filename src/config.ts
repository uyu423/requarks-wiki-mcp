import type { WikiConfig } from './types.js'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    return fallback
  }
  return value
}

function csvEnv(name: string): string[] {
  const raw = optionalEnv(name, '')
  if (!raw) {
    return []
  }
  return raw
    .split(',')
    .map((item) => normalizePathValue(item))
    .filter((item) => item.length > 0)
}

function normalizePathValue(path: string): string {
  return path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

function normalizeGraphPath(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function intEnv(name: string, fallback: number, min: number): number {
  const raw = optionalEnv(name, String(fallback))
  const parsed = parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < min) {
    return fallback
  }
  return parsed
}

function validateBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`WIKI_BASE_URL is not a valid URL: ${trimmed}`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`WIKI_BASE_URL must use http or https protocol, got: ${url.protocol}`)
  }
  return trimmed
}

export function loadConfig(): WikiConfig {
  const mutationsEnabled = optionalEnv('WIKI_MUTATIONS_ENABLED', 'false').toLowerCase() === 'true'
  const mutationConfirmToken = optionalEnv('WIKI_MUTATION_CONFIRM_TOKEN', '')

  if (mutationsEnabled && !mutationConfirmToken) {
    process.stderr.write(
      '[@yowu-dev/requarks-wiki-mcp] WARNING: WIKI_MUTATION_CONFIRM_TOKEN is not set. ' +
        'Mutation token validation will be skipped. ' +
        "For production use, generate a random token: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n"
    )
  }

  return {
    baseUrl: validateBaseUrl(requiredEnv('WIKI_BASE_URL')),
    graphPath: normalizeGraphPath(optionalEnv('WIKI_GRAPHQL_PATH', '/graphql')),
    apiToken: requiredEnv('WIKI_API_TOKEN'),
    defaultLocale: optionalEnv('WIKI_DEFAULT_LOCALE', 'en'),
    defaultEditor: optionalEnv('WIKI_DEFAULT_EDITOR', 'markdown'),
    mutationsEnabled,
    mutationConfirmToken,
    mutationDryRun: optionalEnv('WIKI_MUTATION_DRY_RUN', 'true').toLowerCase() === 'true',
    allowedMutationPathPrefixes: csvEnv('WIKI_ALLOWED_MUTATION_PATH_PREFIXES'),
    httpTimeoutMs: intEnv('WIKI_HTTP_TIMEOUT_MS', 15000, 1),
    httpMaxRetries: intEnv('WIKI_HTTP_MAX_RETRIES', 2, 0)
  }
}
