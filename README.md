# requarks-wiki-mcp

MCP server for a [Wiki.js](https://js.wiki/) instance that lets agents use it like a knowledge base.

Features:

- Search, list, and browse pages for retrieval workflows (RAG-like usage).
- Fetch page content by path or page ID.
- Browse site hierarchy with page tree and view edit history.
- List all tags for content taxonomy discovery.
- Optional page create/update/delete tools with explicit safety gates.
- Built-in markdown reference resource (`wikijs://markdown-guide`) for Wiki.js-specific syntax.
- Typed error taxonomy with LLM-friendly error messages.
- GraphQL client with timeout, exponential-backoff retry, and request correlation.

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
| `WIKI_MUTATIONS_ENABLED`              | No       | `false`    | Enables write tools (`wikijs_create_page`, `wikijs_update_page`, `wikijs_delete_page`) when set to `true`.      |
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
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

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

Read tools (7):

| Tool                      | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `wikijs_search_pages`     | Full-text search across wiki pages.               |
| `wikijs_list_pages`       | List pages with optional locale filter and limit. |
| `wikijs_get_page_by_path` | Get full page content by path + locale.           |
| `wikijs_get_page_by_id`   | Get full page content by numeric ID.              |
| `wikijs_get_page_tree`    | Browse site hierarchy (folders, pages, or both).  |
| `wikijs_get_page_history` | View edit history trail for a page.               |
| `wikijs_list_tags`        | List all tags for content taxonomy discovery.     |

Write tools (3, disabled unless `WIKI_MUTATIONS_ENABLED=true`):

| Tool                 | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `wikijs_create_page` | Create a new page with content, tags, and metadata.             |
| `wikijs_update_page` | Update an existing page by ID.                                  |
| `wikijs_delete_page` | Delete a page by ID. May need `manage:pages` or `delete:pages`. |

When `WIKI_MUTATION_CONFIRM_TOKEN` is set, mutation tools require a matching `confirm` argument.
When `WIKI_MUTATION_DRY_RUN=true`, write tools return a preview and do not mutate Wiki.js.
If `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` is set, mutations are limited to those path prefixes.
Mutation attempts write a structured audit line to stderr.

## MCP Resources

| Resource URI              | Description                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide` | Wiki.js markdown syntax guide (CommonMark/GFM + Wiki.js-specific extensions) intended for page authoring and updates. |

## Permission Notes (Wiki.js)

Wiki.js permission behavior can be surprising for API keys. In particular:

- Some operations may require `manage:pages`/`delete:pages` rules at page-rule level.
- Reading `content` may require `read:source` depending on schema/field-level checks.

If reads fail with 6013 (`PageViewForbidden`), verify group permissions + page rules for the API key group.

## Suggested Minimum API Key Permissions

For read-heavy KB use:

- `read:pages`
- `read:source`
- page rules allowing those permissions for intended paths/locales

For write workflows:

- `write:pages` (create and update)
- `manage:pages` or `delete:pages` (for delete operations)

## Security Guidance

- Keep API token server-side only.
- Start with read-only permissions.
- Keep `WIKI_MUTATIONS_ENABLED=false` unless updates are needed.
- Optional hardening: set a strong random `WIKI_MUTATION_CONFIRM_TOKEN` and pass matching `confirm` for write calls.
- Keep `WIKI_MUTATION_DRY_RUN=true` until you are ready for real writes.
- Use `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` to constrain write scope.
