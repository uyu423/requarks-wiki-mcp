import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, WikiNotFoundError } from '../errors.js'

const inputSchema = z.object({
  path: z.string().min(1),
  locale: z.string().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `
      query GetPageByPath($path: String!, $locale: String!) {
        pages {
          singleByPath(path: $path, locale: $locale) {
            id
            path
            locale
            title
            description
            contentType
            content
            createdAt
            updatedAt
            authorId
            authorName
            creatorId
            creatorName
            tags {
              tag
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        singleByPath: {
          id: number
          path: string
          locale: string
          title: string
          description: string
          contentType: string
          content: string
          createdAt: string
          updatedAt: string
          authorId: number | null
          authorName: string | null
          creatorId: number | null
          creatorName: string | null
          tags: Array<{ tag: string }>
        } | null
      }
    }>(query, { path: input.path, locale })

    const page = data.pages.singleByPath
    if (!page) {
      throw new WikiNotFoundError(`Page not found at path "${input.path}" (locale: ${locale}).`)
    }

    return textResult(JSON.stringify(page, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page by path')
  }
}

export const getPageByPathTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_by_path',
    description: 'Get a single page body/content using path + locale.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Wiki page path, without leading slash.' },
        locale: { type: 'string', description: 'Locale code.' }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  handler
}
