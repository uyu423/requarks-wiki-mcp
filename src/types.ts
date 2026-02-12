import type { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js'

// ── Wiki.js domain types ──────────────────────────────────────────────

export type PageListItem = {
  id: number
  path: string
  locale: string
  title: string | null
  description: string | null
  contentType: string
  isPublished: boolean
  isPrivate: boolean
  tags: string[] | null
  updatedAt: string
}

export type PageSearchResult = {
  id: string
  title: string
  description: string
  path: string
  locale: string
}

export type PageTreeItem = {
  id: number
  path: string
  depth: number
  title: string
  isFolder: boolean
  pageId: number | null
  parent: number | null
  locale: string
}

export type PageHistoryEntry = {
  versionId: number
  versionDate: string
  authorId: number
  authorName: string
  actionType: string
  valueBefore: string | null
  valueAfter: string | null
}

export type TagItem = {
  id: number
  tag: string
  title: string | null
  createdAt: string
  updatedAt: string
}

// ── Configuration ─────────────────────────────────────────────────────

export type WikiConfig = {
  baseUrl: string
  graphPath: string
  apiToken: string
  defaultLocale: string
  defaultEditor: string
  mutationsEnabled: boolean
  mutationConfirmToken: string
  mutationDryRun: boolean
  allowedMutationPathPrefixes: string[]
  httpTimeoutMs: number
  httpMaxRetries: number
}

// ── GraphQL client ────────────────────────────────────────────────────

export type GraphQLOptions = {
  /** Override default timeout for this request */
  timeoutMs?: number
  /** Disable retry even for reads (e.g. when called inside retry logic) */
  noRetry?: boolean
  /** Request ID for correlation */
  requestId?: string
}

export type GraphQLClient = <T>(
  query: string,
  variables: Record<string, unknown>,
  options?: GraphQLOptions
) => Promise<T>

// ── Tool context (dependency injection for handlers) ──────────────────

export type ToolContext = {
  config: WikiConfig
  graphql: GraphQLClient
  enforceMutationSafety: (confirm: string) => void
  enforceMutationPath: (path: string) => void
  auditMutation: (operation: string, details: Record<string, unknown>) => void
}

// ── Tool module (each tool exports this) ──────────────────────────────

export type CallToolResult = {
  content: TextContent[]
  isError?: boolean
}

export type ToolModule = {
  definition: Tool
  handler: (ctx: ToolContext, args: Record<string, unknown>) => Promise<CallToolResult>
}
