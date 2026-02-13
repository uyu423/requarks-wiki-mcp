import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, classifyResponseResultError } from '../errors.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  id: z.number().int().positive(),
  content: z.string()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)
    // Comments are ID-based entities — enforceMutationPath is not applicable
    // because comments cannot be resolved to a page path without additional queries

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'update_comment',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform comment operations.',
        target: {
          id: input.id,
          contentPreview: input.content.substring(0, 100)
        }
      }
      ctx.auditMutation('update_comment', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation UpdateComment($id: Int!, $content: String!) {
        comments {
          update(id: $id, content: $content) {
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
        update: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(mutation, { id: input.id, content: input.content }, { noRetry: true })

    ctx.auditMutation('update_comment', {
      dryRun: false,
      succeeded: data.comments.update.responseResult.succeeded,
      id: input.id,
      errorCode: data.comments.update.responseResult.errorCode,
      message: data.comments.update.responseResult.message
    })

    if (!data.comments.update.responseResult.succeeded) {
      return classifyResponseResultError(data.comments.update.responseResult, 'update comment')
    }

    return textResult(JSON.stringify(data.comments.update, null, 2))
  } catch (err) {
    ctx.auditMutation('update_comment', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'update comment')
  }
}

export const updateCommentTool: ToolModule = {
  definition: {
    name: 'wikijs_update_comment',
    description:
      'Update an existing comment by ID. Requires WIKI_MUTATIONS_ENABLED=true and comment management permissions. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Comment ID to update.' },
        content: { type: 'string', description: 'New comment content.' }
      },
      required: ['id', 'content'],
      additionalProperties: false
    }
  },
  handler
}
