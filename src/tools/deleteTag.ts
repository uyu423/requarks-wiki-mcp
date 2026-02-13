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
        operation: 'deleteTag',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform tag delete operations.',
        target: { id: input.id }
      }
      ctx.auditMutation('deleteTag', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation DeleteTag($id: Int!) {
        pages {
          deleteTag(id: $id) {
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
      pages: {
        deleteTag: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(mutation, { id: input.id }, { noRetry: true })

    ctx.auditMutation('deleteTag', {
      dryRun: false,
      succeeded: data.pages.deleteTag.responseResult.succeeded,
      id: input.id,
      errorCode: data.pages.deleteTag.responseResult.errorCode,
      message: data.pages.deleteTag.responseResult.message
    })

    if (!data.pages.deleteTag.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.deleteTag.responseResult, 'delete tag')
    }

    return textResult(JSON.stringify(data.pages.deleteTag, null, 2))
  } catch (err) {
    ctx.auditMutation('deleteTag', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'delete tag')
  }
}

export const deleteTagTool: ToolModule = {
  definition: {
    name: 'wikijs_delete_tag',
    description:
      'Delete a tag by ID. Removes the tag from all pages and the tag registry. Requires WIKI_MUTATIONS_ENABLED=true and may need manage:system permission. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Tag ID to delete.' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
