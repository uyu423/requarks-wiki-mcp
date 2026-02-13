import { z } from 'zod'
import type { ToolModule, ToolContext, AssetItem } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  folderId: z.number().int().min(0).optional(),
  kind: z.enum(['IMAGE', 'BINARY', 'ALL']).optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const folderId = input.folderId ?? 0
    const kind = input.kind ?? 'ALL'

    const query = `
      query ListAssets($folderId: Int!, $kind: AssetKind!) {
        assets {
          list(folderId: $folderId, kind: $kind) {
            id
            filename
            ext
            kind
            mime
            fileSize
            metadata
            createdAt
            updatedAt
            folder {
              id
              slug
            }
            author {
              id
              name
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      assets: { list: AssetItem[] }
    }>(query, { folderId, kind })

    return textResult(JSON.stringify(data.assets.list, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'list assets')
  }
}

export const listAssetsTool: ToolModule = {
  definition: {
    name: 'wikijs_list_assets',
    description:
      'List assets (files, images) in a specific folder. Returns asset metadata including filename, type, size, and upload date.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'number', description: 'Folder ID to list assets from. Default 0 (root folder).' },
        kind: { type: 'string', enum: ['IMAGE', 'BINARY', 'ALL'], description: 'Asset type filter. Default ALL.' }
      },
      additionalProperties: false
    }
  },
  handler
}
