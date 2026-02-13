import { z } from 'zod'
import type { ToolModule, ToolContext, CommentItem } from '../types.js'
import { textResult, formatErrorForLLM, WikiNotFoundError } from '../errors.js'

const inputSchema = z.object({
  id: z.number().int().positive()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    const query = `
      query GetComment($id: Int!) {
        comments {
          single(id: $id) {
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
        single: CommentItem | null
      }
    }>(query, { id: input.id })

    if (!data.comments.single) {
      throw new WikiNotFoundError(`Comment with id ${input.id} not found.`)
    }

    return textResult(JSON.stringify(data.comments.single, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get comment')
  }
}

export const getCommentTool: ToolModule = {
  definition: {
    name: 'wikijs_get_comment',
    description:
      'Get a single comment by ID. Returns full comment details including content and author information.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Comment ID.' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
