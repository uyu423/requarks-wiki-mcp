#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ReadResourceRequest
} from '@modelcontextprotocol/sdk/types.js'

import { loadConfig } from './config.js'
import { createGraphQLClient } from './graphql.js'
import { enforceMutationSafety, enforceMutationPath, auditMutation } from './safety.js'
import { errorResult } from './errors.js'
import { allTools } from './tools/registry.js'
import {
  markdownGuideResource,
  markdownGuideContent,
  MARKDOWN_GUIDE_URI
} from './resources/markdownGuide.js'
import {
  permissionsGuideResource,
  permissionsGuideContent,
  PERMISSIONS_GUIDE_URI
} from './resources/permissionsGuide.js'
import type { ToolContext } from './types.js'

const config = loadConfig()
const graphql = createGraphQLClient(config)

const ctx: ToolContext = {
  config,
  graphql,
  enforceMutationSafety: (confirm: string) => enforceMutationSafety(config, confirm),
  enforceMutationPath: (path: string) => enforceMutationPath(config, path),
  auditMutation
}

const toolMap = new Map(allTools.map((t) => [t.definition.name, t]))

if (toolMap.size !== allTools.length) {
  const names = allTools.map((t) => t.definition.name)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  throw new Error(`Duplicate tool names detected: ${dupes.join(', ')}`)
}

const server = new Server(
  { name: '@yowu-dev/requarks-wiki-mcp', version: '0.2.3' },
  { capabilities: { tools: {}, resources: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools.map((t) => t.definition) }
})

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [markdownGuideResource, permissionsGuideResource] }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
  const uri = request.params.uri
  if (uri === MARKDOWN_GUIDE_URI) {
    return {
      contents: [
        {
          uri: MARKDOWN_GUIDE_URI,
          mimeType: 'text/markdown',
          text: markdownGuideContent
        }
      ]
    }
  }
  if (uri === PERMISSIONS_GUIDE_URI) {
    return {
      contents: [
        {
          uri: PERMISSIONS_GUIDE_URI,
          mimeType: 'text/markdown',
          text: permissionsGuideContent
        }
      ]
    }
  }
  return { contents: [], isError: true }
})

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const name = request.params.name
  const args = (request.params.arguments ?? {}) as Record<string, unknown>

  const tool = toolMap.get(name)
  if (!tool) {
    return errorResult(`Unknown tool: ${name}`)
  }

  try {
    return await tool.handler(ctx, args)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResult(message)
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[@yowu-dev/requarks-wiki-mcp] startup failed: ${msg}\n`)
  process.exit(1)
})
