# TOOLS DIRECTORY

10 MCP tools: 7 read + 3 write. One file per tool, barrel-exported via `registry.ts`.

## TOOL CATALOG

| File | Tool Name | Type | GraphQL Op | Key Input |
|------|-----------|------|------------|-----------|
| searchPages.ts | `wikijs_search_pages` | read | `pages.search` | `query` (string) |
| listPages.ts | `wikijs_list_pages` | read | `pages.list` | `locale?`, `limit?` |
| getPageByPath.ts | `wikijs_get_page_by_path` | read | `pages.singleByPath` | `path`, `locale?` |
| getPageById.ts | `wikijs_get_page_by_id` | read | `pages.single` | `id` (int) |
| getPageTree.ts | `wikijs_get_page_tree` | read | `pages.tree` | `mode?` (enum), `path?` |
| getPageHistory.ts | `wikijs_get_page_history` | read | `pages.history` | `id`, `offset?`, `limit?` |
| listTags.ts | `wikijs_list_tags` | read | `pages.tags` | (none) |
| createPage.ts | `wikijs_create_page` | write | `pages.create` | `confirm`, `path`, `title`, `content` |
| updatePage.ts | `wikijs_update_page` | write | `pages.update` | `confirm`, `id` |
| deletePage.ts | `wikijs_delete_page` | write | `pages.delete` | `confirm`, `id` |

## READ TOOL PATTERN

```typescript
import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({ /* Zod schema */ })

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `query ... { pages { ... } }`

    const data = await ctx.graphql<{ pages: { ... } }>(query, { ... })

    // null check → WikiNotFoundError for single-page queries
    if (!page) throw new WikiNotFoundError('...')

    return textResult(JSON.stringify(data, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'operation name')
  }
}

export const myTool: ToolModule = {
  definition: { name: 'wikijs_...', description: '...', inputSchema: { ... } },
  handler
}
```

## WRITE TOOL PATTERN

Mutations add 4 steps before the GraphQL call:

```typescript
async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    // 1. Safety gate (throws if disabled or token mismatch)
    ctx.enforceMutationSafety(input.confirm)

    // 2. Path enforcement (throws if path not in allowed prefixes)
    ctx.enforceMutationPath(targetPath)

    // 3. Dry-run short-circuit
    if (ctx.config.mutationDryRun) {
      const dryRunResult = { dryRun: true, operation: '...', target: { ... } }
      ctx.auditMutation('op', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    // 4. Execute mutation (noRetry: true — NEVER retry writes)
    const data = await ctx.graphql<{ ... }>(mutation, { ... }, { noRetry: true })

    // 5. Audit log (always, even on failure)
    ctx.auditMutation('op', { dryRun: false, succeeded: ..., ... })

    return textResult(JSON.stringify(data, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'operation name')
  }
}
```

Note: `updatePage.ts` and `deletePage.ts` both define a local `getPagePathById()` helper to resolve page path from ID for path enforcement.

## ADDING A NEW TOOL

1. Create `src/tools/{name}.ts` exporting a `ToolModule`
2. Follow read or write pattern above
3. Import and add to `allTools[]` in `src/tools/registry.ts`
4. Duplicate name check in `src/index.ts` will catch registration errors at startup

## CONVENTIONS (TOOLS-SPECIFIC)

- **Zod schema** at module top — `inputSchema` parsed as first line in handler
- **Locale fallback** — `input.locale ?? ctx.config.defaultLocale` (reads)
- **Editor fallback** — `input.editor ?? ctx.config.defaultEditor` (createPage only)
- **Inline GraphQL** — template literal in handler, no external files
- **Response format** — always `JSON.stringify(data, null, 2)` through `textResult()`
- **Null pages** — `getPageById`/`getPageByPath` throw `WikiNotFoundError`, not stringify null
- **inputSchema definition** — `additionalProperties: false` on every tool's JSON Schema
