import { z } from 'zod'
import type { ToolModule, ToolContext, PageHistoryEntry } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  id: z.number().int().positive(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().positive().max(100).optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const offsetPage = input.offset ?? 0
    const offsetSize = input.limit ?? 25

    const query = `
      query GetPageHistory($id: Int!, $offsetPage: Int, $offsetSize: Int) {
        pages {
          history(id: $id, offsetPage: $offsetPage, offsetSize: $offsetSize) {
            trail {
              versionId
              versionDate
              authorId
              authorName
              actionType
              valueBefore
              valueAfter
            }
            total
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        history: {
          trail: PageHistoryEntry[]
          total: number
        }
      }
    }>(query, { id: input.id, offsetPage, offsetSize })

    return textResult(JSON.stringify(data.pages.history, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page history')
  }
}

export const getPageHistoryTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_history',
    description:
      'Get edit history trail for a page by ID. Returns version dates, authors, and change types.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID.' },
        offset: { type: 'number', description: 'Page offset for pagination. Default 0.' },
        limit: { type: 'number', description: 'Number of history entries. Default 25, max 100.' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
