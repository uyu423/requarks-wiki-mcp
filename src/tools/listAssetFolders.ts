import { z } from 'zod'
import type { ToolModule, ToolContext, AssetFolder } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  parentFolderId: z.number().int().min(0).optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const parentFolderId = input.parentFolderId ?? 0

    const query = `
      query ListAssetFolders($parentFolderId: Int!) {
        assets {
          folders(parentFolderId: $parentFolderId) {
            id
            slug
            name
          }
        }
      }
    `

    const data = await ctx.graphql<{
      assets: { folders: AssetFolder[] }
    }>(query, { parentFolderId })

    return textResult(JSON.stringify(data.assets.folders, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'list asset folders')
  }
}

export const listAssetFoldersTool: ToolModule = {
  definition: {
    name: 'wikijs_list_asset_folders',
    description:
      'List asset folders within a parent folder. Returns folder structure for navigating the asset hierarchy.',
    inputSchema: {
      type: 'object',
      properties: {
        parentFolderId: { type: 'number', description: 'Parent folder ID. Default 0 (root level).' }
      },
      additionalProperties: false
    }
  },
  handler
}
