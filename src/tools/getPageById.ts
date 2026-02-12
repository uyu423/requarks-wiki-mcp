import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, WikiNotFoundError } from '../errors.js'

const inputSchema = z.object({
  id: z.number().int().positive()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    const query = `
      query GetPageById($id: Int!) {
        pages {
          single(id: $id) {
            id
            path
            locale
            title
            description
            contentType
            content
            updatedAt
            tags {
              tag
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        single: {
          id: number
          path: string
          locale: string
          title: string
          description: string
          contentType: string
          content: string
          updatedAt: string
          tags: Array<{ tag: string }>
        } | null
      }
    }>(query, { id: input.id })

    const page = data.pages.single
    if (!page) {
      throw new WikiNotFoundError(`Page with id=${input.id} not found.`)
    }

    return textResult(JSON.stringify(page, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page by id')
  }
}

export const getPageByIdTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_by_id',
    description: 'Get a single page body/content by numeric page ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Wiki page ID.' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
