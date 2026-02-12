---
name: integration-test
description: Run a live integration test against a real Wiki.js instance to verify all 10 MCP tools work correctly. Use when the user wants to test the MCP server against a real Wiki.js, validate tool functionality, or run end-to-end verification.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Wiki.js MCP Integration Test

Run a full end-to-end integration test against a live Wiki.js instance. Tests all 10 MCP tools (7 read + 3 write) and validates error handling.

## Step 1: Collect connection details

Ask the user for the following values. Do NOT proceed until both required values are provided:

1. **Wiki.js URL** (required): The base URL of the Wiki.js instance (e.g., `https://wiki.example.com`)
2. **API Token** (required): A Wiki.js API key (JWT) with appropriate permissions

Optionally ask:

3. **Mutation test?** (default: no): Whether to test write operations (create/update/delete). Warn the user that this will create and delete a test page at `mcp-test/integration-<timestamp>`.

## Step 2: Build the project

```bash
npm run build
```

If the build fails, report the error and stop.

## Step 3: Run read-only tests

Set environment variables and run the integration test in **read-only mode** first:

```bash
WIKI_BASE_URL="<user-provided-url>" \
WIKI_API_TOKEN="<user-provided-token>" \
WIKI_GRAPHQL_PATH="/graphql" \
WIKI_DEFAULT_LOCALE="en" \
WIKI_DEFAULT_EDITOR="markdown" \
WIKI_MUTATIONS_ENABLED=false \
WIKI_MUTATION_CONFIRM_TOKEN="INTEGRATION_TEST" \
WIKI_MUTATION_DRY_RUN=true \
WIKI_HTTP_TIMEOUT_MS=15000 \
WIKI_HTTP_MAX_RETRIES=2 \
npx tsx test/integration.ts
```

### Read tool checklist

Verify these tools return successful results:

| # | Tool | What to check |
|---|------|---------------|
| 1 | `wikijs_list_pages` | Returns an array of pages |
| 2 | `wikijs_search_pages` | Returns search results with `totalHits` |
| 3 | `wikijs_get_page_by_id` | Returns page content for a valid ID |
| 3b | `wikijs_get_page_by_id` (not found) | Returns `WikiNotFoundError` for ID 999999 |
| 4 | `wikijs_get_page_by_path` | Returns page content for a valid path |
| 4b | `wikijs_get_page_by_path` (not found) | Returns `WikiNotFoundError` for invalid path |
| 5 | `wikijs_get_page_tree` | Returns tree items with `id`, `path`, `isFolder` |
| 6 | `wikijs_get_page_history` | Returns history trail with version entries |
| 7 | `wikijs_list_tags` | Returns array of tags |

### Error handling checklist

| Test | What to check |
|------|---------------|
| ZodError | Missing required args returns structured `Invalid Input` error |
| NotFound | Non-existent page returns `Not Found` with fix instructions |

## Step 4: Run mutation tests (only if user opted in)

If the user opted in to mutation testing, re-run with mutations enabled:

```bash
WIKI_BASE_URL="<user-provided-url>" \
WIKI_API_TOKEN="<user-provided-token>" \
WIKI_GRAPHQL_PATH="/graphql" \
WIKI_DEFAULT_LOCALE="en" \
WIKI_DEFAULT_EDITOR="markdown" \
WIKI_MUTATIONS_ENABLED=true \
WIKI_MUTATION_CONFIRM_TOKEN="INTEGRATION_TEST" \
WIKI_MUTATION_DRY_RUN=false \
WIKI_ALLOWED_MUTATION_PATH_PREFIXES="mcp-test" \
WIKI_HTTP_TIMEOUT_MS=15000 \
WIKI_HTTP_MAX_RETRIES=2 \
npx tsx test/integration.ts
```

### Mutation tool checklist

| # | Tool | What to check |
|---|------|---------------|
| 8a | `wikijs_create_page` (disabled) | Blocks when `WIKI_MUTATIONS_ENABLED=false` |
| 8b | `wikijs_create_page` (wrong token) | Rejects invalid confirm token |
| 8c | `wikijs_create_page` (dry-run) | Returns `dryRun: true` preview |
| 8d | `wikijs_create_page` (live) | Creates page, returns `succeeded: true` with page ID |
| 9a | `wikijs_update_page` (dry-run) | Returns `dryRun: true` preview |
| 9b | `wikijs_update_page` (live) | Updates page, returns `succeeded: true` |
| 10a | `wikijs_delete_page` (dry-run) | Returns `dryRun: true` preview |
| 10b | `wikijs_delete_page` (live) | Deletes page, returns `succeeded: true` |

## Step 5: Report results

Present a summary table to the user:

```
============================================================
  Wiki.js MCP Integration Test Results
============================================================
  Target:    <url>
  Mode:      read-only | full (with mutations)
------------------------------------------------------------
  Passed:    X
  Failed:    X
  Warnings:  X
============================================================
```

For any failures:
- Quote the exact error message from the test output
- Suggest likely causes (permissions, network, API token scope)
- Reference the Wiki.js permission notes:
  - Error 6013 = `PageViewForbidden` -> check group permissions + page rules for `read:pages`/`read:source`
  - Error 6003 = page does not exist
  - Reading `content` may need `read:source` permission
  - Delete/move needs `manage:pages` or `delete:pages`

## Important

- **NEVER** log or display the API token in output. Refer to it as `<redacted>` in any summaries.
- **NEVER** leave test pages behind. If a create succeeded but delete failed, warn the user to manually clean up `mcp-test/integration-*` pages.
- If the Wiki.js instance has no pages at all, read tests may show warnings (not failures). This is expected.
