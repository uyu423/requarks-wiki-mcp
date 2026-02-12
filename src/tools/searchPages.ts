import { z } from 'zod'
import type { ToolModule, ToolContext, PageSearchResult } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  query: z.string().min(1),
  locale: z.string().optional(),
  path: z.string().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `
      query SearchPages($query: String!, $path: String, $locale: String) {
        pages {
          search(query: $query, path: $path, locale: $locale) {
            totalHits
            suggestions
            results {
              id
              title
              description
              path
              locale
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        search: {
          totalHits: number
          suggestions: string[]
          results: PageSearchResult[]
        }
      }
    }>(query, { query: input.query, path: input.path, locale })

    return textResult(JSON.stringify(data.pages.search, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'search pages')
  }
}

export const searchPagesTool: ToolModule = {
  definition: {
    name: 'wikijs_search_pages',
    description: 'Search pages by keyword and return path/title summary for knowledge lookup.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword.' },
        locale: {
          type: 'string',
          description: 'Optional locale code. Defaults to WIKI_DEFAULT_LOCALE.'
        },
        path: { type: 'string', description: 'Optional path prefix to scope search.' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  handler
}
