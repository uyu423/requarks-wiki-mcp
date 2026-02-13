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

// ── Phase 1: Page version & links ────────────────────────────────────

export type PageVersion = {
  action: string
  authorId: string
  authorName: string
  content: string
  contentType: string
  createdAt: string
  description: string
  editor: string
  isPrivate: boolean
  isPublished: boolean
  locale: string
  pageId: number
  path: string
  publishEndDate: string
  publishStartDate: string
  tags: string[]
  title: string
  versionDate: string
  versionId: number
}

export type PageLink = {
  id: number
  path: string
  title: string
  links: string[]
}

// ── Phase 2: Comments ────────────────────────────────────────────────

export type CommentItem = {
  id: number
  authorId: number
  authorName: string
  authorEmail: string
  authorIP: string
  content: string
  render: string
  createdAt: string
  updatedAt: string
}

// ── Phase 3: System & Navigation ─────────────────────────────────────

export type SystemInfo = {
  configFile: string
  cpuCores: number
  currentVersion: string
  dbHost: string
  dbType: string
  dbVersion: string
  groupsTotal: number
  hostname: string
  httpPort: number
  httpRedirection: boolean
  httpsPort: number
  latestVersion: string
  latestVersionReleaseDate: string
  nodeVersion: string
  operatingSystem: string
  pagesTotal: number
  platform: string
  ramTotal: string
  sslDomain: string
  sslExpirationDate: string
  sslProvider: string
  sslStatus: string
  sslSubscriberEmail: string
  telemetry: boolean
  telemetryClientId: string
  upgradeCapable: boolean
  usersTotal: number
  workingDirectory: string
}

export type NavigationItem = {
  id: string
  kind: string
  label: string
  icon: string
  targetType: string
  target: string
  visibilityMode: string
  visibilityGroups: number[]
}

export type NavigationTree = {
  locale: string
  items: NavigationItem[]
}

// ── Phase 4: Assets ──────────────────────────────────────────────────

export type AssetItem = {
  id: number
  filename: string
  ext: string
  kind: string
  mime: string
  fileSize: number
  metadata: string
  createdAt: string
  updatedAt: string
  folder: { id: number; slug: string } | null
  author: { id: number; name: string } | null
}

export type AssetFolder = {
  id: number
  slug: string
  name: string
}

// ── Phase 5: Users ───────────────────────────────────────────────────

export type UserProfile = {
  id: number
  name: string
  email: string
  providerKey: string
  providerName: string | null
  isSystem: boolean
  isVerified: boolean
  location: string
  jobTitle: string
  timezone: string
  dateFormat: string
  appearance: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  groups: number[]
  pagesTotal: number
}

export type UserSearchResult = {
  id: number
  name: string
  email: string
  providerKey: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
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
