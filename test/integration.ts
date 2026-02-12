/**
 * Integration test — runs all 10 MCP tools against a live Wiki.js instance.
 *
 * Usage:
 *   WIKI_BASE_URL=... WIKI_API_TOKEN=... npx tsx test/integration.ts
 *
 * This file is NOT part of the unit test suite (not in test/*.test.ts glob).
 */

import { loadConfig } from '../src/config.js'
import { createGraphQLClient } from '../src/graphql.js'
import { enforceMutationSafety, enforceMutationPath, auditMutation } from '../src/safety.js'
import { allTools } from '../src/tools/registry.js'
import type { ToolContext, CallToolResult } from '../src/types.js'

// ── helpers ────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

function ok(label: string, detail?: string) {
  console.log(`  ${GREEN}✔${RESET} ${label}${detail ? `  ${CYAN}${detail}${RESET}` : ''}`)
}
function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  console.log(`  ${RED}✘${RESET} ${label}: ${msg}`)
}
function warn(label: string, detail: string) {
  console.log(`  ${YELLOW}⚠${RESET} ${label}: ${detail}`)
}

function textOf(result: CallToolResult): string {
  return result.content.map(c => c.text).join('\n')
}

function parseJson(result: CallToolResult): unknown {
  const raw = textOf(result)
  // Strip "Error: " prefix if present
  if (result.isError) return raw
  return JSON.parse(raw)
}

const toolMap = new Map(allTools.map(t => [t.definition.name, t]))

async function call(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const tool = toolMap.get(name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  return tool.handler(ctx, args)
}

// ── main ───────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig()
  const graphql = createGraphQLClient(config)
  const ctx: ToolContext = {
    config,
    graphql,
    enforceMutationSafety: (confirm: string) => enforceMutationSafety(config, confirm),
    enforceMutationPath: (path: string) => enforceMutationPath(config, path),
    auditMutation
  }

  let passed = 0
  let failed = 0
  let warnings = 0

  // Track state across tests
  let anyPageId: number | null = null
  let anyPagePath: string | null = null
  let createdPageId: number | null = null
  const testPagePath = `mcp-test/integration-${Date.now()}`

  // ── 1. wikijs_list_pages ─────────────────────────────────────────
  console.log(`\n${CYAN}[1/10] wikijs_list_pages${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_list_pages', { limit: 5 })
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as Array<{ id: number; path: string; title: string }>
    if (!Array.isArray(data)) throw new Error('Expected array')
    if (data.length === 0) {
      warn('wikijs_list_pages', 'Wiki has no pages — some subsequent tests may fail')
      warnings++
    } else {
      anyPageId = data[0].id
      anyPagePath = data[0].path
      ok('wikijs_list_pages', `${data.length} pages returned, first: id=${anyPageId} path="${anyPagePath}"`)
      passed++
    }
  } catch (err) {
    fail('wikijs_list_pages', err)
    failed++
  }

  // ── 2. wikijs_search_pages ───────────────────────────────────────
  console.log(`\n${CYAN}[2/10] wikijs_search_pages${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_search_pages', { query: 'test' })
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as { totalHits: number; results: unknown[] }
    ok('wikijs_search_pages', `${data.totalHits} hits, ${data.results.length} results`)
    passed++
  } catch (err) {
    fail('wikijs_search_pages', err)
    failed++
  }

  // ── 3. wikijs_get_page_by_id ─────────────────────────────────────
  console.log(`\n${CYAN}[3/10] wikijs_get_page_by_id${RESET}`)
  if (anyPageId) {
    try {
      const result = await call(ctx, 'wikijs_get_page_by_id', { id: anyPageId })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as { id: number; title: string; content: string }
      ok('wikijs_get_page_by_id', `id=${data.id} title="${data.title}" content=${data.content.length} chars`)
      passed++
    } catch (err) {
      fail('wikijs_get_page_by_id', err)
      failed++
    }
  } else {
    warn('wikijs_get_page_by_id', 'Skipped — no page found in list_pages')
    warnings++
  }

  // ── 3b. wikijs_get_page_by_id (not found) ────────────────────────
  console.log(`\n${CYAN}[3b] wikijs_get_page_by_id (not found)${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_get_page_by_id', { id: 999999 })
    if (result.isError && textOf(result).includes('Not Found')) {
      ok('wikijs_get_page_by_id (not found)', 'Correctly returns WikiNotFoundError')
      passed++
    } else {
      warn('wikijs_get_page_by_id (not found)', 'Expected NotFound error but got: ' + textOf(result).slice(0, 100))
      warnings++
    }
  } catch (err) {
    fail('wikijs_get_page_by_id (not found)', err)
    failed++
  }

  // ── 4. wikijs_get_page_by_path ───────────────────────────────────
  console.log(`\n${CYAN}[4/10] wikijs_get_page_by_path${RESET}`)
  if (anyPagePath) {
    try {
      const result = await call(ctx, 'wikijs_get_page_by_path', { path: anyPagePath })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as { title: string; path: string }
      ok('wikijs_get_page_by_path', `path="${data.path}" title="${data.title}"`)
      passed++
    } catch (err) {
      fail('wikijs_get_page_by_path', err)
      failed++
    }
  } else {
    warn('wikijs_get_page_by_path', 'Skipped — no page path available')
    warnings++
  }

  // ── 4b. wikijs_get_page_by_path (not found) ──────────────────────
  console.log(`\n${CYAN}[4b] wikijs_get_page_by_path (not found)${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_get_page_by_path', { path: 'nonexistent/path/xyz123' })
    if (result.isError && textOf(result).includes('Not Found')) {
      ok('wikijs_get_page_by_path (not found)', 'Correctly returns WikiNotFoundError')
      passed++
    } else {
      warn('wikijs_get_page_by_path (not found)', 'Expected NotFound but got: ' + textOf(result).slice(0, 100))
      warnings++
    }
  } catch (err) {
    fail('wikijs_get_page_by_path (not found)', err)
    failed++
  }

  // ── 5. wikijs_get_page_tree ──────────────────────────────────────
  console.log(`\n${CYAN}[5/10] wikijs_get_page_tree${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_get_page_tree', { mode: 'ALL' })
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as Array<{ id: number; path: string; isFolder: boolean }>
    ok('wikijs_get_page_tree', `${data.length} tree items`)
    passed++
  } catch (err) {
    fail('wikijs_get_page_tree', err)
    failed++
  }

  // ── 6. wikijs_get_page_history ───────────────────────────────────
  console.log(`\n${CYAN}[6/10] wikijs_get_page_history${RESET}`)
  if (anyPageId) {
    try {
      const result = await call(ctx, 'wikijs_get_page_history', { id: anyPageId, limit: 5 })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as { trail: unknown[]; total: number }
      ok('wikijs_get_page_history', `${data.total} total versions, ${data.trail.length} returned`)
      passed++
    } catch (err) {
      fail('wikijs_get_page_history', err)
      failed++
    }
  } else {
    warn('wikijs_get_page_history', 'Skipped — no page found')
    warnings++
  }

  // ── 7. wikijs_list_tags ──────────────────────────────────────────
  console.log(`\n${CYAN}[7/10] wikijs_list_tags${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_list_tags', {})
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as Array<{ id: number; tag: string }>
    ok('wikijs_list_tags', `${data.length} tags`)
    passed++
  } catch (err) {
    fail('wikijs_list_tags', err)
    failed++
  }

  // ── 8. wikijs_create_page (dry-run first, then live) ─────────────
  console.log(`\n${CYAN}[8/10] wikijs_create_page${RESET}`)

  // 8a. Test mutation disabled
  const origMutations = config.mutationsEnabled
  config.mutationsEnabled = false
  try {
    const result = await call(ctx, 'wikijs_create_page', {
      confirm: config.mutationConfirmToken,
      path: testPagePath,
      title: 'MCP Integration Test Page',
      content: '# Test\n\nThis page was created by the MCP integration test.'
    })
    if (result.isError && textOf(result).includes('Mutation Disabled')) {
      ok('wikijs_create_page (mutations disabled)', 'Correctly blocks when disabled')
      passed++
    } else {
      warn('wikijs_create_page (mutations disabled)', 'Expected MutationDisabled error')
      warnings++
    }
  } catch (err) {
    fail('wikijs_create_page (mutations disabled)', err)
    failed++
  }
  config.mutationsEnabled = origMutations

  // 8b. Test invalid confirm token
  config.mutationsEnabled = true
  try {
    const result = await call(ctx, 'wikijs_create_page', {
      confirm: 'WRONG_TOKEN',
      path: testPagePath,
      title: 'MCP Integration Test Page',
      content: '# Test'
    })
    if (result.isError && textOf(result).includes('Invalid confirm token')) {
      ok('wikijs_create_page (wrong token)', 'Correctly rejects invalid token')
      passed++
    } else {
      warn('wikijs_create_page (wrong token)', 'Expected InvalidToken error')
      warnings++
    }
  } catch (err) {
    fail('wikijs_create_page (wrong token)', err)
    failed++
  }

  // 8c. Dry-run create
  config.mutationDryRun = true
  try {
    const result = await call(ctx, 'wikijs_create_page', {
      confirm: config.mutationConfirmToken,
      path: testPagePath,
      title: 'MCP Integration Test Page',
      content: '# Test\n\nThis page was created by the MCP integration test.'
    })
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as { dryRun: boolean; operation: string }
    if (data.dryRun === true) {
      ok('wikijs_create_page (dry-run)', `operation="${data.operation}" dryRun=true`)
      passed++
    } else {
      warn('wikijs_create_page (dry-run)', 'Expected dryRun=true')
      warnings++
    }
  } catch (err) {
    fail('wikijs_create_page (dry-run)', err)
    failed++
  }

  // 8d. Live create
  config.mutationDryRun = false
  try {
    const result = await call(ctx, 'wikijs_create_page', {
      confirm: config.mutationConfirmToken,
      path: testPagePath,
      title: 'MCP Integration Test Page',
      content: '# MCP Integration Test\n\nThis page was created by the integration test runner.\n\nTimestamp: ' + new Date().toISOString(),
      tags: ['mcp-test', 'integration'],
      description: 'Auto-generated test page'
    })
    if (result.isError) throw new Error(textOf(result))
    const data = parseJson(result) as {
      responseResult: { succeeded: boolean; message: string }
      page: { id: number; path: string } | null
    }
    if (data.responseResult.succeeded && data.page) {
      createdPageId = data.page.id
      ok('wikijs_create_page (live)', `created id=${data.page.id} path="${data.page.path}"`)
      passed++
    } else {
      warn('wikijs_create_page (live)', `succeeded=${data.responseResult.succeeded} message="${data.responseResult.message}"`)
      warnings++
    }
  } catch (err) {
    fail('wikijs_create_page (live)', err)
    failed++
  }

  // ── 9. wikijs_update_page ────────────────────────────────────────
  console.log(`\n${CYAN}[9/10] wikijs_update_page${RESET}`)
  if (createdPageId) {
    // 9a. Dry-run update
    config.mutationDryRun = true
    try {
      const result = await call(ctx, 'wikijs_update_page', {
        confirm: config.mutationConfirmToken,
        id: createdPageId,
        content: '# Updated\n\nUpdated by dry-run.'
      })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as { dryRun: boolean }
      if (data.dryRun === true) {
        ok('wikijs_update_page (dry-run)', 'dryRun=true')
        passed++
      } else {
        warn('wikijs_update_page (dry-run)', 'Expected dryRun=true')
        warnings++
      }
    } catch (err) {
      fail('wikijs_update_page (dry-run)', err)
      failed++
    }

    // 9b. Live update
    config.mutationDryRun = false
    try {
      const result = await call(ctx, 'wikijs_update_page', {
        confirm: config.mutationConfirmToken,
        id: createdPageId,
        title: 'MCP Integration Test Page (Updated)',
        content: '# MCP Integration Test (Updated)\n\nThis page was updated by the integration test runner.\n\nUpdated at: ' + new Date().toISOString()
      })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as {
        responseResult: { succeeded: boolean; message: string }
        page: { id: number; title: string } | null
      }
      if (data.responseResult.succeeded) {
        ok('wikijs_update_page (live)', `updated id=${data.page?.id} title="${data.page?.title}"`)
        passed++
      } else {
        warn('wikijs_update_page (live)', `message="${data.responseResult.message}"`)
        warnings++
      }
    } catch (err) {
      fail('wikijs_update_page (live)', err)
      failed++
    }
  } else {
    warn('wikijs_update_page', 'Skipped — no page was created in step 8')
    warnings++
  }

  // ── 10. wikijs_delete_page ───────────────────────────────────────
  console.log(`\n${CYAN}[10/10] wikijs_delete_page${RESET}`)
  if (createdPageId) {
    // 10a. Dry-run delete
    config.mutationDryRun = true
    try {
      const result = await call(ctx, 'wikijs_delete_page', {
        confirm: config.mutationConfirmToken,
        id: createdPageId
      })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as { dryRun: boolean; operation: string }
      if (data.dryRun === true) {
        ok('wikijs_delete_page (dry-run)', `operation="${data.operation}" dryRun=true`)
        passed++
      } else {
        warn('wikijs_delete_page (dry-run)', 'Expected dryRun=true')
        warnings++
      }
    } catch (err) {
      fail('wikijs_delete_page (dry-run)', err)
      failed++
    }

    // 10b. Live delete
    config.mutationDryRun = false
    try {
      const result = await call(ctx, 'wikijs_delete_page', {
        confirm: config.mutationConfirmToken,
        id: createdPageId
      })
      if (result.isError) throw new Error(textOf(result))
      const data = parseJson(result) as {
        responseResult: { succeeded: boolean; message: string }
      }
      if (data.responseResult.succeeded) {
        ok('wikijs_delete_page (live)', `deleted id=${createdPageId}`)
        passed++
      } else {
        warn('wikijs_delete_page (live)', `message="${data.responseResult.message}"`)
        warnings++
      }
    } catch (err) {
      fail('wikijs_delete_page (live)', err)
      failed++
    }
  } else {
    warn('wikijs_delete_page', 'Skipped — no page was created in step 8')
    warnings++
  }

  // ── Input validation test ────────────────────────────────────────
  console.log(`\n${CYAN}[bonus] Input validation (ZodError)${RESET}`)
  try {
    const result = await call(ctx, 'wikijs_search_pages', {})
    if (result.isError && textOf(result).includes('Invalid Input')) {
      ok('ZodError formatting', 'Correctly returns structured validation error')
      passed++
    } else {
      warn('ZodError formatting', 'Expected Invalid Input error')
      warnings++
    }
  } catch (err) {
    fail('ZodError formatting', err)
    failed++
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${GREEN}Passed: ${passed}${RESET}  ${RED}Failed: ${failed}${RESET}  ${YELLOW}Warnings: ${warnings}${RESET}`)
  console.log(`${'─'.repeat(60)}\n`)

  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Integration test runner failed:', err)
  process.exit(1)
})
