import { z } from 'zod'
import type { ToolModule, ToolContext, TagItem } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    inputSchema.parse(raw)

    const query = `
      query ListTags {
        pages {
          tags {
            id
            tag
            title
            createdAt
            updatedAt
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: { tags: TagItem[] }
    }>(query, {})

    return textResult(JSON.stringify(data.pages.tags, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'list tags')
  }
}

export const listTagsTool: ToolModule = {
  definition: {
    name: 'wikijs_list_tags',
    description:
      'List all tags used across wiki pages. Useful for discovering content categories and taxonomy.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  handler
}
