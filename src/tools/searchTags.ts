import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  query: z.string().min(1)
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    const query = `
      query SearchTags($query: String!) {
        pages {
          searchTags(query: $query)
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        searchTags: string[]
      }
    }>(query, { query: input.query })

    return textResult(JSON.stringify(data.pages.searchTags, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'search tags')
  }
}

export const searchTagsTool: ToolModule = {
  definition: {
    name: 'wikijs_search_tags',
    description:
      'Search for tags matching a query string. Returns tag names and associated page information.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for tag names.' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  handler
}
