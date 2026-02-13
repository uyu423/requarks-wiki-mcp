import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, classifyResponseResultError } from '../errors.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  id: z.number().int().positive()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'delete_comment',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform delete operations.',
        target: { id: input.id }
      }
      ctx.auditMutation('delete_comment', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation DeleteComment($id: Int!) {
        comments {
          delete(id: $id) {
            responseResult {
              succeeded
              errorCode
              slug
              message
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      comments: {
        delete: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(mutation, { id: input.id }, { noRetry: true })

    ctx.auditMutation('delete_comment', {
      dryRun: false,
      succeeded: data.comments.delete.responseResult.succeeded,
      id: input.id,
      errorCode: data.comments.delete.responseResult.errorCode,
      message: data.comments.delete.responseResult.message
    })

    if (!data.comments.delete.responseResult.succeeded) {
      return classifyResponseResultError(data.comments.delete.responseResult, 'delete comment')
    }

    return textResult(JSON.stringify(data.comments.delete, null, 2))
  } catch (err) {
    ctx.auditMutation('delete_comment', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'delete comment')
  }
}

export const deleteCommentTool: ToolModule = {
  definition: {
    name: 'wikijs_delete_comment',
    description:
      'Delete a comment by ID. Requires WIKI_MUTATIONS_ENABLED=true and comment management permissions. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Comment ID to delete.' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
