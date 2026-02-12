# requarks-wiki-mcp

MCP server for Wiki.js that lets agents use a Wiki.js instance like a knowledge base.

Features:
- Search and list pages for retrieval workflows (RAG-like usage).
- Fetch page content by path or page ID.
- Optional page create/update tools with explicit safety gates.

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
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
# Comma-separated path prefixes without leading slash (empty = no prefix restriction)
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
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

Read tools:
- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

Write tools (disabled unless `WIKI_MUTATIONS_ENABLED=true`):
- `wikijs_create_page`
- `wikijs_update_page`

Mutation tools require an explicit `confirm` argument that must match `WIKI_MUTATION_CONFIRM_TOKEN`.
When `WIKI_MUTATION_DRY_RUN=true`, write tools return a preview and do not mutate Wiki.js.
If `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` is set, mutations are limited to those path prefixes.
Mutation attempts write a structured audit line to stderr.

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
- `write:pages` (and possibly `manage:pages` depending on operation)

## Security Guidance

- Keep API token server-side only.
- Start with read-only permissions.
- Keep `WIKI_MUTATIONS_ENABLED=false` unless updates are needed.
- Use a non-default `WIKI_MUTATION_CONFIRM_TOKEN`.
- Keep `WIKI_MUTATION_DRY_RUN=true` until you are ready for real writes.
- Use `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` to constrain write scope.
