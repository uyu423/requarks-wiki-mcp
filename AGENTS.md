# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-12
**Commit:** 4a08ebe
**Version:** 0.2.3
**Branch:** main

## OVERVIEW

MCP server (stdio transport) bridging AI agents to Wiki.js via GraphQL. Modular TypeScript architecture with 10 tools, retry-capable GraphQL client, typed error taxonomy. Deps: `@modelcontextprotocol/sdk`, `zod`.

## STRUCTURE

```
requarks-wiki-mcp/
├── src/
│   ├── index.ts              # Thin bootstrap: config → ctx → register tools → connect
│   ├── types.ts              # Shared types: WikiConfig, ToolContext, ToolModule, domain types
│   ├── config.ts             # Env parsing: loadConfig() → WikiConfig
│   ├── errors.ts             # Error taxonomy (WikiError hierarchy) + LLM-friendly formatting
│   ├── graphql.ts            # GraphQL client factory with timeout + retry
│   ├── safety.ts             # Mutation guards + path normalization + audit logging
│   └── tools/
│       ├── registry.ts       # Exports allTools[] (single import for bootstrap)
│       ├── searchPages.ts    # wikijs_search_pages
│       ├── listPages.ts      # wikijs_list_pages
│       ├── getPageByPath.ts  # wikijs_get_page_by_path
│       ├── getPageById.ts    # wikijs_get_page_by_id
│       ├── getPageTree.ts    # wikijs_get_page_tree (site hierarchy)
│       ├── getPageHistory.ts # wikijs_get_page_history (version trail)
│       ├── listTags.ts       # wikijs_list_tags
│       ├── createPage.ts     # wikijs_create_page (mutation)
│       ├── updatePage.ts     # wikijs_update_page (mutation)
│       └── deletePage.ts     # wikijs_delete_page (mutation)
├── test/                     # node:test suite (54 tests)
│   ├── config.test.ts
│   ├── errors.test.ts
│   ├── safety.test.ts
│   ├── tools.test.ts
│   └── integration.ts        # Manual integration test (not in npm test glob)
├── dist/                     # Build output (generated)
├── .github/workflows/ci.yml  # CI: check + build + test on Node 20/22
├── .env.example              # Required env vars template
├── package.json              # ESM ("type": "module"), Node >=20
└── tsconfig.json             # Strict mode, ES2022, NodeNext
```

## WHERE TO LOOK

| Task                        | Location                               | Notes                                                   |
| --------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Add a new tool              | `src/tools/` + `src/tools/registry.ts` | Create file exporting `ToolModule`, add to registry     |
| Tool definitions + handlers | `src/tools/*.ts`                       | Each exports `{ definition, handler }`                  |
| Tool dispatch (Map-based)   | `src/index.ts`                         | `toolMap.get(name)` — no switch statement               |
| Shared types                | `src/types.ts`                         | WikiConfig, ToolContext, ToolModule, domain types       |
| Config / env vars           | `src/config.ts`                        | `loadConfig()` — all env parsing centralized            |
| GraphQL client + retry      | `src/graphql.ts`                       | `createGraphQLClient()` — timeout, retry, request ID    |
| Error taxonomy              | `src/errors.ts`                        | WikiError hierarchy + `classifyGraphQLError/HttpStatus` |
| LLM-friendly errors         | `src/errors.ts`                        | `formatErrorForLLM()` — structured fix instructions     |
| Mutation safety             | `src/safety.ts`                        | `enforceMutationSafety/Path()`, `auditMutation()`       |
| Tests                       | `test/*.test.ts`                       | `npm test` — node:test, 54 tests                        |

## CODE MAP

| Symbol                       | Type     | File              | Role                                                                                                                         |
| ---------------------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `loadConfig`                 | function | config.ts         | Parses all `WIKI_*` env vars → `WikiConfig`                                                                                  |
| `createGraphQLClient`        | function | graphql.ts        | Factory: returns `wikiGraphQL()` closure with retry                                                                          |
| `WikiError`                  | class    | errors.ts         | Base error (8 subclasses: Auth, Forbidden, NotFound, Transient, RateLimited, MutationDisabled, InvalidToken, PathNotAllowed) |
| `classifyGraphQLError`       | function | errors.ts         | GraphQL response → typed WikiError (special-cases 6013)                                                                      |
| `classifyHttpStatus`         | function | errors.ts         | HTTP status → typed WikiError (never leaks response body)                                                                    |
| `formatErrorForLLM`          | function | errors.ts         | Any error → MCP `CallToolResult` with fix instructions                                                                       |
| `textResult` / `errorResult` | function | errors.ts         | MCP response helpers (`{ content: [{ type: 'text', text }] }`)                                                               |
| `enforceMutationSafety`      | function | safety.ts         | Checks `mutationsEnabled` + confirm token                                                                                    |
| `enforceMutationPath`        | function | safety.ts         | Validates path against allowed prefixes                                                                                      |
| `auditMutation`              | function | safety.ts         | Structured JSON to stderr (redacts `apiToken`/`token`)                                                                       |
| `normalizeWikiPath`          | function | safety.ts         | Strips leading/trailing slashes + whitespace                                                                                 |
| `allTools`                   | const    | tools/registry.ts | `ToolModule[]` — single import for bootstrap                                                                                 |
| `WikiConfig`                 | type     | types.ts          | 11-field config shape (baseUrl through httpMaxRetries)                                                                       |
| `ToolContext`                | type     | types.ts          | DI container: config + graphql + safety functions                                                                            |
| `ToolModule`                 | type     | types.ts          | `{ definition: Tool, handler: (ctx, args) => CallToolResult }`                                                               |
| `GraphQLClient`              | type     | types.ts          | `<T>(query, variables, options?) => Promise<T>`                                                                              |

## GIT RULES

- **Commit per work unit** — commit automatically after each logical task completes.
- **NEVER push** — only humans push. No `git push` under any circumstances.
- **Format**: `type: summary that explains why, not just what` — future AI agents read these to understand context.
- **Prefixes**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`.
- **Before committing** — run `npm run lint:fix && npm run format && npm run check`. If any errors remain after auto-fix, read the output and fix manually.

## CONVENTIONS

- **One tool per file** — `src/tools/{name}.ts` exports `ToolModule = { definition, handler }`.
- **ToolContext DI** — handlers receive `(ctx, args)` where ctx has config, graphql, safety functions. Pure functions, testable.
- **Zod for runtime validation** — every handler parses args through Zod schema before execution.
- **Inline GraphQL** — query strings as template literals inside handlers. No codegen.
- **Full handler try/catch** — entire handler body (including Zod parse, mutation safety, path resolution) wrapped in single try/catch calling `formatErrorForLLM()`.
- **Mutations use `noRetry: true`** — writes are never retried by the GraphQL client. Auto-detected: queries starting with `mutation` also skip retry.
- **Null → WikiNotFoundError** — `getPageById`/`getPageByPath` throw `WikiNotFoundError` when page is null, not stringify `null`.
- **ESLint + Prettier enforced** — 2-space indent, single quotes, no semicolons. Run `npm run lint` and `npm run format:check` before committing.
- **ESM only** — `"type": "module"`. Use `.js` extensions in all relative imports.
- **Audit logging** — mutations log structured JSON to stderr. Token/secret redaction in `auditMutation()`.

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER expose `WIKI_API_TOKEN`** — server-side only, never in tool responses or error messages.
- **NEVER bypass mutation safety** — all writes must pass `enforceMutationSafety()` + `enforceMutationPath()`.
- **NEVER remove dry-run support** — `WIKI_MUTATION_DRY_RUN=true` must short-circuit before GraphQL mutation.
- **NEVER skip audit logging** — every mutation (including dry-run) must call `auditMutation()`.
- **NEVER retry mutations** — pass `{ noRetry: true }` for all write GraphQL calls.
- **NEVER add tools without registering** — every tool must be in `src/tools/registry.ts`.

## WIKI.JS API QUIRKS

- **GraphQL API docs** — https://github.com/requarks/wiki-docs/blob/master/dev/api.md
- **Error code 6013** = `PageViewForbidden`. Fix: verify group permissions + page rules for `read:pages`/`read:source`.
- **Error code 6003** = page does not exist. Classified as `WikiNotFoundError`.
- **Reading `content` field** may require `read:source` permission (not just `read:pages`).
- **Delete/move ops** need `manage:pages` or `delete:pages` at page-rule level.
- **`pages.tree`** mode enum: `FOLDERS`, `PAGES`, `ALL` — must pass as GraphQL enum, not string.
- **`pages.history`** uses `offsetPage`/`offsetSize` for pagination (not `offset`/`limit`).
- **Mutation response `locale` field** returns null — do NOT request `locale` in create/update response selection sets.
- **Update mutation `tags`** — Wiki.js crashes with `.map()` error if `tags` is undefined. Always pass `tags: input.tags ?? []`.
- **Update mutation `description`** — Wiki.js rejects null; pass undefined to omit or a string value.

## GRAPHQL CLIENT

```
Request flow:
  fetch(endpoint) with AbortController timeout (WIKI_HTTP_TIMEOUT_MS, default 15s)
    │
    ▼ on failure
  Classify error (classifyHttpStatus / classifyGraphQLError)
    │
    ▼ if retryable (408, 502-504, network errors) AND reads (not mutations)
  Retry up to WIKI_HTTP_MAX_RETRIES (default 2)
  Exponential backoff: 250ms base, 2x factor, ±20% jitter, cap 2s
    │
    ▼ on success
  Return typed data
```

## MUTATION SAFETY MODEL

```
WIKI_MUTATIONS_ENABLED=false  (default: OFF)
         │
         ▼ (if true)
confirm token matches WIKI_MUTATION_CONFIRM_TOKEN?
         │
         ▼ (if yes)
path allowed by WIKI_ALLOWED_MUTATION_PATH_PREFIXES?
         │
         ▼ (if yes)
WIKI_MUTATION_DRY_RUN=true → return preview only
WIKI_MUTATION_DRY_RUN=false → execute mutation (noRetry)
         │
         ▼ (always)
auditMutation() → stderr JSON log (secrets redacted)
```

## COMMANDS

```bash
npm run dev      # Development (tsx, hot reload)
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled server (node dist/index.js)
npm run check    # Type check without emitting
npm test         # Run 54 unit tests (node:test)
npm run lint     # ESLint check (lint:fix to auto-fix)
npm run format:check  # Prettier check (format to auto-fix)
```

## NOTES

- **10 MCP tools**: 7 read (search, list, getByPath, getById, getPageTree, getPageHistory, listTags) + 3 write (create, update, delete).
- **MCP transport is stdio** — not HTTP. Server communicates via stdin/stdout.
- **CI runs on push/PR** to main branch, Node 20 + 22.
- **Tests cover**: config parsing (incl. NaN fallbacks, graphPath normalization), safety guards, path normalization, error classification (incl. 5xx body non-leak), error formatting (ZodError, WikiNotFoundError, WikiMutationDisabledError). No integration tests (would need live Wiki.js).
