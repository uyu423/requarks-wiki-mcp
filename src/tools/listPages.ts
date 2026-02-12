import { z } from 'zod'
import type { ToolModule, ToolContext, PageListItem } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  locale: z.string().optional(),
  limit: z.number().int().positive().max(200).optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const limit = input.limit ?? 50
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `
      query ListPages($limit: Int, $locale: String) {
        pages {
          list(limit: $limit, orderBy: UPDATED, orderByDirection: DESC, locale: $locale) {
            id
            path
            locale
            title
            description
            contentType
            isPublished
            isPrivate
            tags
            updatedAt
          }
        }
      }
    `

    const data = await ctx.graphql<{ pages: { list: PageListItem[] } }>(query, { limit, locale })
    return textResult(JSON.stringify(data.pages.list, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'list pages')
  }
}

export const listPagesTool: ToolModule = {
  definition: {
    name: 'wikijs_list_pages',
    description: 'List pages for crawling/indexing with optional locale and limit.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: { type: 'string', description: 'Optional locale code.' },
        limit: { type: 'number', description: 'Optional item limit. Default 50, max 200.' }
      },
      additionalProperties: false
    }
  },
  handler
}
