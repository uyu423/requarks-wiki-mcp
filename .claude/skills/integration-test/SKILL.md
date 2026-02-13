---
name: integration-test
description: Run a live integration test against a real Wiki.js instance to verify all 29 MCP tools work correctly. Use when the user wants to test the MCP server against a real Wiki.js, validate tool functionality, or run end-to-end verification.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Wiki.js MCP Integration Test

Run a full end-to-end integration test against a live Wiki.js instance. Tests all 29 MCP tools (19 read + 10 write) and validates error handling.

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
| 8 | `wikijs_get_page_version` | Returns specific page version content (uses versionId from history) |
| 9 | `wikijs_get_page_links` | Returns array of page link relationships |
| 10 | `wikijs_search_tags` | Returns tag search results |
| 11 | `wikijs_list_comments` | Returns array of comments for a page (may be empty) |
| 12 | `wikijs_get_comment` | Returns single comment by ID (skipped if no comments found) |
| 13 | `wikijs_get_system_info` | Returns object with `currentVersion` |
| 14 | `wikijs_get_navigation` | Returns array of navigation trees |
| 15 | `wikijs_get_site_config` | Returns site configuration (non-sensitive fields) |
| 16 | `wikijs_list_assets` | Returns array of assets (folderId=0, kind=ALL) |
| 17 | `wikijs_list_asset_folders` | Returns array of asset folders |
| 18 | `wikijs_get_current_user` | Returns current user profile with `id`, `name`, `email` |
| 19 | `wikijs_search_users` | Returns array of user search results |

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

**Page mutations:**

| # | Tool | What to check |
|---|------|---------------|
| 20a | `wikijs_create_page` (disabled) | Blocks when `WIKI_MUTATIONS_ENABLED=false` |
| 20b | `wikijs_create_page` (wrong token) | Rejects invalid confirm token |
| 20c | `wikijs_create_page` (dry-run) | Returns `dryRun: true` preview |
| 20d | `wikijs_create_page` (live) | Creates page, returns `succeeded: true` with page ID |
| 21 | `wikijs_move_page` (dry-run) | Returns `dryRun: true` for page move |
| 22 | `wikijs_restore_page` (dry-run) | Returns `dryRun: true` for version restore |
| 28a | `wikijs_update_page` (dry-run) | Returns `dryRun: true` preview |
| 28b | `wikijs_update_page` (live) | Updates page, returns `succeeded: true` |
| 29a | `wikijs_delete_page` (dry-run) | Returns `dryRun: true` preview |
| 29b | `wikijs_delete_page` (live) | Deletes page, returns `succeeded: true` |

**Comment mutations (dry-run only):**

| # | Tool | What to check |
|---|------|---------------|
| 23 | `wikijs_create_comment` (dry-run) | Returns `dryRun: true` for comment creation |
| 24 | `wikijs_update_comment` (dry-run) | Returns `dryRun: true` for comment update |
| 25 | `wikijs_delete_comment` (dry-run) | Returns `dryRun: true` for comment deletion |

**Tag mutations (dry-run only):**

| # | Tool | What to check |
|---|------|---------------|
| 26 | `wikijs_update_tag` (dry-run) | Returns `dryRun: true` for tag update |
| 27 | `wikijs_delete_tag` (dry-run) | Returns `dryRun: true` for tag deletion |

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
  - Comment operations need `read:comments`, `write:comments`, or `manage:comments`
  - Error 8002 = `CommentPostForbidden`, 8003 = `CommentNotFound`, 8004 = `CommentViewForbidden`, 8005 = `CommentManageForbidden`

## Important

- **NEVER** log or display the API token in output. Refer to it as `<redacted>` in any summaries.
- **NEVER** leave test pages behind. If a create succeeded but delete failed, warn the user to manually clean up `mcp-test/integration-*` pages.
- If the Wiki.js instance has no pages at all, read tests may show warnings (not failures). This is expected.
