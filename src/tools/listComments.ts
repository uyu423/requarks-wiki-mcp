import { z } from 'zod'
import type { ToolModule, ToolContext, CommentItem } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  path: z.string(),
  locale: z.string().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `
      query ListComments($locale: String!, $path: String!) {
        comments {
          list(locale: $locale, path: $path) {
            id
            authorId
            authorName
            authorEmail
            authorIP
            content
            render
            createdAt
            updatedAt
          }
        }
      }
    `

    const data = await ctx.graphql<{
      comments: {
        list: CommentItem[]
      }
    }>(query, { locale, path: input.path })

    return textResult(JSON.stringify(data.comments.list, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'list comments')
  }
}

export const listCommentsTool: ToolModule = {
  definition: {
    name: 'wikijs_list_comments',
    description:
      'List all comments for a specific page by path and locale. Returns comment details including author info and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Page path to get comments for.' },
        locale: {
          type: 'string',
          description: 'Locale code (e.g., "en", "fr"). Defaults to WIKI_DEFAULT_LOCALE.'
        }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  handler
}
