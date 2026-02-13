---
name: release-ready
description: Prepare a new patch release - version bump, README documentation verification, integration test, publish readiness check, git commit & tag. Analyzes code changes to ensure README reflects actual features/config. Push is intentionally omitted (human's domain).
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Grep, Glob, AskUserQuestion
---

# Release Ready

Prepare a new patch version release. This skill:

1. Bumps the version in all project files
2. Runs lint, format, build, and test checks
3. Executes live integration tests
4. Verifies npm package contents
5. **Analyzes code changes since last tag** (new tools, resources, env vars)
6. **Verifies README documentation is up-to-date**
7. **Offers to auto-update multilingual READMEs** if needed
8. Creates git commit and tag

**Push is intentionally omitted** — that is the human's domain.

## Key Feature: Smart README Verification

This skill **does NOT add a changelog section**. Instead, it:

- Compares actual code changes with README documentation
- Detects missing tool descriptions, env vars, or features
- **Automatically updates README.ko.md first** (no approval needed)
- Shows user the changes and asks for review
- **After user approval**, propagates updates to other languages (en, ja, zh, es, pt, vi)

### Workflow

```
1. Analyze code changes → Detect what's missing from README
2. Auto-update README.ko.md → No asking, just do it
3. Show diff to user → "I updated README.ko.md, here's what changed"
4. User reviews → Approve/Revise/Skip/Revert
5. If approved → Update all other READMEs
6. Stage files → Proceed to commit
```

## Step 1: Determine next version

Read the current version from `package.json` and auto-increment the patch number.

```
Current: 0.2.2 → Next: 0.2.3
```

Announce the next version to the user before proceeding.

## Step 2: Update version in all files

The version string appears in **4 locations**. Update all of them:

| File                | Location                                 | Example                                                  |
| ------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `package.json`      | `"version": "X.Y.Z"`                     | Line 3                                                   |
| `src/index.ts`      | `version: 'X.Y.Z'` in Server constructor | Search for `version:` near `@yowu-dev/requarks-wiki-mcp` |
| `AGENTS.md`         | `**Version:** X.Y.Z`                     | Near the top of the file                                 |
| `package-lock.json` | Two occurrences of `"version": "X.Y.Z"`  | Lines 3 and 9 (root + packages)                          |

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

## Step 6.5: Verify and Update README Documentation

**This step runs after pack check, before git commit.**

The goal is to **verify README reflects actual code changes**, not to add a changelog section.

### 6.5.1: Analyze changes since last tag

Identify what changed that needs documentation updates:

```bash
LAST_TAG=$(git tag --sort=-version:refname | head -1)

# Count tools in registry
CURRENT_TOOLS=$(grep -c "Tool:" src/tools/registry.ts)

# Find new tool files
git diff ${LAST_TAG}..HEAD --diff-filter=A --name-only src/tools/ | grep -c "\.ts$"

# Find new resource files
git diff ${LAST_TAG}..HEAD --diff-filter=A --name-only src/resources/ | grep -c "\.ts$"

# Check for new env vars
git diff ${LAST_TAG}..HEAD src/config.ts | grep "^+.*WIKI_"

# Check for API signature changes
git diff ${LAST_TAG}..HEAD src/tools/*.ts | grep "inputSchema"
```

**Categorize changes:**

1. **New tools added** → README tool count and table need updates
2. **New resources added** → README resources section needs updates
3. **New env vars** → README env var table needs updates
4. **Security/permission changes** → README security/permission sections need updates
5. **No significant changes** → README update not needed

### 6.5.2: Verify README is up-to-date

Check if README already reflects the changes:

**Tool count verification:**

```bash
# Check README.md for tool count
grep "MCP Tools" README.md -A 2

# Example: Should show "**29 tools** (19 read + 10 write)"
# Compare with actual: src/tools/registry.ts allTools.length
```

**Tool table verification:**

- Read all tool names from `src/tools/registry.ts`
- Check each tool appears in README.md tool table
- Flag any missing tools

**Resource verification:**

- Read all resources from `src/resources/*.ts`
- Check each resource appears in README.md resources table
- Flag any missing resources

**Env var verification:**

- Extract all `WIKI_*` vars from `src/config.ts`
- Check each appears in README.md env var table
- Flag any missing vars

### 6.5.3: Auto-update README.ko.md (without approval)

**If updates are needed, directly update README.ko.md:**

1. **Update tool count in Features section**:

   ```markdown
   주요 기능:

   - **{N}개 도구** ({read}개 읽기 + {write}개 쓰기) covering pages, comments, tags, assets, users, navigation, and system info.
   ```

2. **Add missing tools to MCP Tools table**:
   - Organize by category (Pages, Tags, Comments, System, Assets, Users)
   - Use Korean descriptions for each tool
   - Follow existing table format

3. **Add missing resources to MCP Resources table**:
   - Add new resource URI and Korean description

4. **Update env var table** (if new vars detected):
   - Add new variables with Korean descriptions

5. **Update security/permission sections** (if changes detected):
   - Add new security features
   - Update permission notes

**This step happens AUTOMATICALLY without asking first.**

### 6.5.4: Show changes and ask for review

After updating README.ko.md, show the diff to the user:

```bash
git diff README.ko.md
```

Display the changes and ask for approval:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  README.ko.md Updated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I've automatically updated README.ko.md with the following changes:

{show git diff output or summary}

Changes made:
  - Tool count: {old} → {new}
  - Added {N} new tools to table:
    * {tool1}
    * {tool2}
    * ...
  - Added {N} new resources:
    * {resource1}
  - Updated sections:
    * {section1}
    * {section2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please review README.ko.md and choose:

  1. ✅ Approve - Apply same updates to other READMEs (en, ja, zh, es, pt, vi)
  2. ✏️  Revise - I'll manually edit README.ko.md, then re-run this skill
  3. ⏭️  Skip - Keep README.ko.md changes, but don't update other languages
  4. ❌ Revert - Undo README.ko.md changes completely

Your choice? (1/2/3/4)
```

Use `AskUserQuestion` to get the response.

### 6.5.5: Handle user response

**If choice = 1 (Approve)**:

1. **Update README.md** (English):
   - Same structure updates as Korean version
   - Use English descriptions
   - Keep technical terms consistent

2. **Update other README files** (ja, zh, es, pt, vi):
   - Update tool counts and tables
   - Use English descriptions (full translation beyond scope)
   - Add note recommending manual translation

3. **Stage all README files**:

   ```bash
   git add README.md README.ko.md README.ja.md README.zh.md README.es.md README.pt.md README.vi.md
   ```

4. Report: "All README files updated and staged."

**If choice = 2 (Revise)**:

- Report: "Please manually edit README.ko.md now."
- Report: "Run this skill again when you're done editing."
- Exit the skill (do not proceed to commit)

**If choice = 3 (Skip)**:

- Stage only README.ko.md:
  ```bash
  git add README.ko.md
  ```
- Report: "Only README.ko.md staged. Other languages skipped."
- Proceed to next step

**If choice = 4 (Revert)**:

- Revert README.ko.md changes:
  ```bash
  git checkout README.ko.md
  ```
- Report: "README.ko.md changes reverted."
- Proceed to next step without staging any README files

**If no updates needed** (from 6.5.2):

- Report: "✅ README is up-to-date! No documentation updates needed."
- Proceed to next step without staging README files

### 6.5.6: Verify updates were applied

**If user approved (choice = 1)**, verify all README files were updated correctly:

```bash
# Verify tool count matches across all files
for readme in README.md README.ko.md README.ja.md README.zh.md README.es.md README.pt.md README.vi.md; do
  echo "=== $readme ==="
  grep -E "tools|도구|ツール|工具|herramientas|ferramentas" "$readme" | head -1
done

# Verify new tools appear in main READMEs
grep "wikijs_get_page_version" README.md
grep "wikijs_get_page_version" README.ko.md

# Check which files were actually modified
git status --short README*.md
```

**If user chose option 3 (Skip)**, verify only README.ko.md was staged:

```bash
git status --short README*.md
# Should show: M  README.ko.md (staged)
#              M  README.md (not staged)
#              M  README.ja.md (not staged)
#              ...
```

**If user chose option 4 (Revert)**, verify README.ko.md was restored:

```bash
git status README.ko.md
# Should show: nothing to commit (working tree clean)
```

Report any verification failures and offer to retry.

## Step 7: Git commit & tag

Create a release commit and tag. **Do NOT push.**

**Files to stage** (varies based on Step 6.5 outcome):

```bash
# Always stage version files
git add package.json package-lock.json src/index.ts AGENTS.md

# README staging depends on user choice in Step 6.5:
# - Choice 1 (Approve): All READMEs already staged → no action needed
# - Choice 3 (Skip): Only README.ko.md staged → no action needed
# - Choice 4 (Revert) or no updates: No READMEs staged → no action needed

# Verify what's staged
git status --short

# Create commit and tag
git commit -m "chore(release): vX.Y.Z"
git tag vX.Y.Z
```

Commit message format: `chore(release): v{version}` (Conventional Commits standard).

**Note**: README files are already staged (or not) by Step 6.5 based on user choice. This step just verifies and commits.

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

  README verification: {status}
    - Code changes analyzed: {count} commits since v{last_version}
    - New tools detected: {count}
    - New resources detected: {count}
    - New env vars detected: {count}
    - README.ko.md: {UPDATED | UP-TO-DATE | REVERTED}
    - Other languages: {ALL UPDATED | SKIPPED | N/A}
    - Files staged: {list}

  Git commit:        {sha}
  Git tag:           v{version}
------------------------------------------------------------
  Next steps:
    git push origin develop
    git push origin v{version}
    npm publish

  Optional:
    {if other languages skipped}
    - Manually translate README.ko.md changes to ja/zh/es/pt/vi
    {endif}
    - Review README for accuracy
    - Update CHANGELOG.md if project maintains one separately
============================================================
```

## Important

- **NEVER** push to remote. This is explicitly the human's domain.
- **NEVER** run `npm publish` — only check readiness.
- **NEVER** display API tokens in output.
- **ALWAYS** update README.ko.md first, THEN ask user to review (not the other way around).
- **ALWAYS** show git diff of README.ko.md changes to the user before asking for approval.
- **ALWAYS** provide revert option if user doesn't like the changes.
- If any step fails, stop immediately and report the failure with actionable guidance.
- This skill **verifies documentation matches code**, not adds a changelog section.
- README updates are based on **actual code changes** (new tools, resources, env vars), not git commit messages.
- Full translation to all languages (ja, zh, es, pt, vi) is beyond this skill's scope — English descriptions used as fallback, recommend manual translation.
- If README is already up-to-date, skip the update step entirely.
- User's approval is for "propagate to other languages", not for "update README.ko.md" (that happens automatically).
