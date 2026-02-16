# requarks-wiki-mcp

MCP server for a [Wiki.js](https://js.wiki/) instance that lets agents use it like a knowledge base.

Features:

- **29 tools** (19 read + 10 write) covering pages, comments, tags, assets, users, navigation, and system info.
- Search, list, and browse pages for retrieval workflows (RAG-like usage).
- Fetch page content by path or page ID, view version history and restore previous versions.
- Browse site hierarchy with page tree, page links graph, and navigation structure.
- Full comment system: list, read, create, update, and delete comments on pages.
- Asset and folder browsing for media file discovery.
- User context: current user profile and user search.
- System diagnostics: version info, site config, and navigation tree.
- Tag management: list, search, update, and delete tags.
- Optional page create/update/delete/move/restore tools with explicit safety gates.
- Built-in resources: markdown syntax guide, Mermaid diagram guide, and API permissions guide.
- Typed error taxonomy with LLM-friendly error messages.
- GraphQL client with timeout, exponential-backoff retry, and request correlation.
- Security hardening: sensitive field filtering, URL validation, input length limits.

## Requirements

- Node.js 20+
- A reachable Wiki.js hostname
- Wiki.js API key (JWT) with proper permissions

## Setup

```bash
cp .env.example .env
npm install
```

Configure `.env`:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# Mutating operations are disabled by default
WIKI_MUTATIONS_ENABLED=false
# Optional extra safety gate for writes. If set, write tools must pass matching confirm.
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# Comma-separated path prefixes without leading slash (empty = no prefix restriction)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# HTTP resilience
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

Environment variable reference:

| Variable                              | Required | Default    | Description                                                                                                     |
| ------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | Yes      | -          | Base Wiki.js URL (for example, `https://wiki.example.com`).                                                     |
| `WIKI_API_TOKEN`                      | Yes      | -          | Wiki.js API key JWT used in `Authorization: Bearer ...`.                                                        |
| `WIKI_GRAPHQL_PATH`                   | No       | `/graphql` | GraphQL endpoint path appended to `WIKI_BASE_URL`.                                                              |
| `WIKI_DEFAULT_LOCALE`                 | No       | `en`       | Default locale used when tool input does not provide locale.                                                    |
| `WIKI_DEFAULT_EDITOR`                 | No       | `markdown` | Default editor used for page creation when not specified.                                                       |
| `WIKI_MUTATIONS_ENABLED`              | No       | `false`    | Enables all write tools (page, comment, and tag mutations) when set to `true`.                                  |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | No       | `` (empty) | Optional extra safety gate. When set, write tool calls must provide matching `confirm`.                         |
| `WIKI_MUTATION_DRY_RUN`               | No       | `true`     | When `true`, mutation tools return preview only and do not write to Wiki.js.                                    |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | No       | `` (empty) | Comma-separated path prefixes (without leading slash) allowed for mutations. Empty means no prefix restriction. |
| `WIKI_HTTP_TIMEOUT_MS`                | No       | `15000`    | HTTP request timeout in milliseconds (including body reads). Minimum 1.                                         |
| `WIKI_HTTP_MAX_RETRIES`               | No       | `2`        | Max retries for transient read failures (408, 502-504). Mutations are never retried. Minimum 0.                 |

Wiki.js prerequisite (GraphQL + API key):

- This MCP uses Wiki.js GraphQL internally.
- In Wiki.js admin, go to `Administration -> API` and enable API access.
- Create an API key and set it as `WIKI_API_TOKEN`.

## MCP Client Config Example (`~/.mcp.json`)

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "@yowu-dev/requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

## Register MCP Via Local Path (Without npm Publish)

You can register this MCP server directly from your local project path without publishing/installing from npm.

1. Build in this repository

```bash
npm install
npm run build
```

2. Register local absolute path in `~/.mcp.json`

```json
{
  "mcpServers": {
    "requarks-wiki-local": {
      "command": "node",
      "args": ["/absolute/path/to/requarks-wiki-mcp/dist/index.js"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

Notes:

- Always use an absolute path.
- Re-run `npm run build` after code changes so `dist/index.js` stays up to date.

## Run

Development:

```bash
npm run dev
```

Build + run:

```bash
npm run build
npm start
```

## MCP Tools

### Read Tools (19)

**Pages:**

| Tool | Description |
| --- | --- |
| `wikijs_search_pages` | Full-text search across wiki pages. |
| `wikijs_list_pages` | List pages with optional locale filter and limit. |
| `wikijs_get_page_by_path` | Get full page content by path + locale. |
| `wikijs_get_page_by_id` | Get full page content by numeric ID. |
| `wikijs_get_page_tree` | Browse site hierarchy (folders, pages, or both). |
| `wikijs_get_page_history` | View edit history trail for a page. |
| `wikijs_get_page_version` | Get a specific version's full content. |
| `wikijs_get_page_links` | Get page link relationships (knowledge graph). |

**Tags:**

| Tool | Description |
| --- | --- |
| `wikijs_list_tags` | List all tags for content taxonomy discovery. |
| `wikijs_search_tags` | Search for tags matching a query string. |

**Comments:**

| Tool | Description |
| --- | --- |
| `wikijs_list_comments` | List all comments for a page by path and locale. |
| `wikijs_get_comment` | Get a single comment by ID. |

**System & Navigation:**

| Tool | Description |
| --- | --- |
| `wikijs_get_system_info` | Wiki.js version, database type, and usage statistics. |
| `wikijs_get_navigation` | Navigation tree structure. |
| `wikijs_get_site_config` | Site configuration (non-sensitive fields). |

**Assets:**

| Tool | Description |
| --- | --- |
| `wikijs_list_assets` | List assets with optional folder and kind filter. |
| `wikijs_list_asset_folders` | List asset folders. |

**Users:**

| Tool | Description |
| --- | --- |
| `wikijs_get_current_user` | Get the currently authenticated API user's profile. |
| `wikijs_search_users` | Search users by name or email. |

### Write Tools (10, disabled unless `WIKI_MUTATIONS_ENABLED=true`)

**Page Mutations:**

| Tool | Description |
| --- | --- |
| `wikijs_create_page` | Create a new page with content, tags, and metadata. |
| `wikijs_update_page` | Update an existing page by ID. |
| `wikijs_delete_page` | Delete a page by ID. May need `manage:pages` or `delete:pages`. |
| `wikijs_move_page` | Move/rename a page to a new path or locale. |
| `wikijs_restore_page` | Restore a page to a previous version. |

**Comment Mutations:**

| Tool | Description |
| --- | --- |
| `wikijs_create_comment` | Create a comment on a page. |
| `wikijs_update_comment` | Update an existing comment by ID. |
| `wikijs_delete_comment` | Delete a comment by ID. |

**Tag Mutations:**

| Tool | Description |
| --- | --- |
| `wikijs_update_tag` | Update a tag's slug and title. |
| `wikijs_delete_tag` | Delete a tag from all pages. |

### Mutation Safety

- When `WIKI_MUTATION_CONFIRM_TOKEN` is set, mutation tools require a matching `confirm` argument.
- When `WIKI_MUTATION_DRY_RUN=true`, write tools return a preview and do not mutate Wiki.js.
- If `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` is set, page and comment-create mutations are limited to those path prefixes.
- All mutation attempts write a structured audit line to stderr.

## MCP Resources

| Resource URI                       | Description                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide`          | Wiki.js markdown syntax guide (CommonMark/GFM + Wiki.js-specific extensions) intended for page authoring and updates. |
| `wikijs://mermaid-guide`           | Mermaid 8.8.2 diagram syntax guide for Wiki.js (9 supported diagram types, unsupported feature warnings, version restrictions). |
| `wikijs://api-permissions-guide`   | Wiki.js API permission model, error codes, and API key configuration guide for self-diagnosing permission errors.     |

## Permission Notes (Wiki.js)

Wiki.js permission behavior can be surprising for API keys. In particular:

- Some operations may require `manage:pages`/`delete:pages` rules at page-rule level.
- Reading `content` may require `read:source` depending on schema/field-level checks.
- Comment operations require `read:comments`, `write:comments`, or `manage:comments`.
- System info and navigation require admin-level API key permissions.

Common error codes:

| Code | Meaning |
| --- | --- |
| 6013 | `PageViewForbidden` — check group permissions + page rules for `read:pages`/`read:source` |
| 6003 | Page does not exist |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

For more details, read the `wikijs://api-permissions-guide` resource.

## Suggested Minimum API Key Permissions

For read-heavy KB use:

- `read:pages`, `read:source`
- `read:comments` (for comment browsing)
- Page rules allowing those permissions for intended paths/locales

For write workflows:

- `write:pages` (create and update)
- `manage:pages` or `delete:pages` (for delete/move operations)
- `write:comments`, `manage:comments` (for comment mutations)
- `manage:system` (for tag management)

## Security Guidance

- Keep API token server-side only.
- Start with read-only permissions.
- Keep `WIKI_MUTATIONS_ENABLED=false` unless updates are needed.
- Optional hardening: set a strong random `WIKI_MUTATION_CONFIRM_TOKEN` and pass matching `confirm` for write calls.
- Keep `WIKI_MUTATION_DRY_RUN=true` until you are ready for real writes.
- Use `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` to constrain write scope.
- `wikijs_get_system_info` filters sensitive infrastructure fields (dbHost, configFile, etc.) by default.
- `scriptJs`/`scriptCss` fields in page create/update are length-limited (10,000 chars) and include browser execution warnings.
