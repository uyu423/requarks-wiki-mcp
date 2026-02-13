---
name: release-ready
description: Prepare a new patch release - version bump, integration test, publish readiness check, git commit & tag. Use when the user wants to release a new version. Push is intentionally omitted (human's domain).
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Grep, Glob, AskUserQuestion
---

# Release Ready

Prepare a new patch version release. This skill bumps the version, runs all checks, and creates a git commit + tag. **Push is intentionally omitted** — that is the human's domain.

## Step 1: Determine next version

Read the current version from `package.json` and auto-increment the patch number.

```
Current: 0.2.2 → Next: 0.2.3
```

Announce the next version to the user before proceeding.

## Step 2: Update version in all files

The version string appears in **4 locations**. Update all of them:

| File | Location | Example |
|------|----------|---------|
| `package.json` | `"version": "X.Y.Z"` | Line 3 |
| `src/index.ts` | `version: 'X.Y.Z'` in Server constructor | Search for `version:` near `@yowu-dev/requarks-wiki-mcp` |
| `AGENTS.md` | `**Version:** X.Y.Z` | Near the top of the file |
| `package-lock.json` | Two occurrences of `"version": "X.Y.Z"` | Lines 3 and 9 (root + packages) |

Use the `Edit` tool with `replace_all: false` for each file to ensure precise replacements. For `package-lock.json`, use `replace_all: true` since the old version string should only appear in our package entries.

**Verify** after editing: run `grep -r "OLD_VERSION" --include="*.json" --include="*.ts" --include="*.md" . --exclude-dir=node_modules` to confirm no stale version references remain.

## Step 3: Lint & format check

Run lint and format checks in parallel:

```bash
npm run lint
npm run format:check
```

If either fails, report the error and ask the user whether to auto-fix (`npm run lint:fix && npm run format`) or abort.

## Step 4: Build & unit tests

```bash
npm run build && npm test
```

Both must pass. If either fails, stop and report.

## Step 5: Integration test

Run a live integration test against the user's Wiki.js instance.

**Finding credentials (in order):**

1. Check `~/.claude/.mcp.json` for `requarks-wiki` server config → extract `WIKI_BASE_URL` and `WIKI_API_TOKEN` from `env`
2. Check `.env` in project root
3. If neither found, ask the user for URL and API token

Run the integration test in **full mode** (with mutations):

```bash
WIKI_BASE_URL="<url>" \
WIKI_API_TOKEN="<token>" \
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

All 18 tests must pass. If any fail, stop and report.

**NEVER** display the API token in output. Use `<redacted>` in summaries.

## Step 6: npm publish readiness check

Run `npm pack --dry-run` and display the output to the user. Verify:

- [ ] `dist/` directory is included
- [ ] `README.md` and `LICENSE` are included
- [ ] No source files (`src/`, `test/`) are leaked into the package
- [ ] No sensitive files (`.env`, `.claude/`) are leaked
- [ ] `package.json` fields are correct: `main`, `bin`, `files`, `name`, `version`
- [ ] Package size is reasonable (warn if > 500KB)

## Step 7: Git commit & tag

Create a release commit and tag. **Do NOT push.**

```bash
git add package.json package-lock.json src/index.ts AGENTS.md
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
```

Commit message format: `release: v{version}` (matches existing pattern).

## Step 8: Summary

Present the final summary:

```
============================================================
  Release Ready: v{version}
============================================================
  Version bump:      {old} -> {new}
  Lint:              PASS
  Format:            PASS
  Build:             PASS
  Unit tests:        PASS (N tests)
  Integration tests: PASS (18/18)
  Pack check:        PASS (size: XKB)
  Git commit:        {sha}
  Git tag:           v{version}
------------------------------------------------------------
  Next steps:
    git push origin develop
    git push origin v{version}
    npm publish
============================================================
```

## Important

- **NEVER** push to remote. This is explicitly the human's domain.
- **NEVER** run `npm publish` — only check readiness.
- **NEVER** display API tokens in output.
- If any step fails, stop immediately and report the failure with actionable guidance.
