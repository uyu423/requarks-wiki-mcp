import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, classifyResponseResultError } from '../errors.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  id: z.number().int().positive(),
  tag: z.string().min(1),
  title: z.string().min(1)
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)
    // Tags are global entities, not page-scoped — enforceMutationPath is not applicable

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'updateTag',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform tag update operations.',
        target: { id: input.id, tag: input.tag, title: input.title }
      }
      ctx.auditMutation('updateTag', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation UpdateTag($id: Int!, $tag: String!, $title: String!) {
        pages {
          updateTag(id: $id, tag: $tag, title: $title) {
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
        updateTag: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(mutation, { id: input.id, tag: input.tag, title: input.title }, { noRetry: true })

    ctx.auditMutation('updateTag', {
      dryRun: false,
      succeeded: data.pages.updateTag.responseResult.succeeded,
      id: input.id,
      tag: input.tag,
      title: input.title,
      errorCode: data.pages.updateTag.responseResult.errorCode,
      message: data.pages.updateTag.responseResult.message
    })

    if (!data.pages.updateTag.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.updateTag.responseResult, 'update tag')
    }

    return textResult(JSON.stringify(data.pages.updateTag, null, 2))
  } catch (err) {
    ctx.auditMutation('updateTag', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'update tag')
  }
}

export const updateTagTool: ToolModule = {
  definition: {
    name: 'wikijs_update_tag',
    description:
      'Update an existing tag by ID. Changes the tag slug and/or title. Requires WIKI_MUTATIONS_ENABLED=true and may need manage:system permission. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Tag ID to update.' },
        tag: { type: 'string', description: 'New tag slug (e.g., "backend").' },
        title: { type: 'string', description: 'New tag title (e.g., "Backend Development").' }
      },
      required: ['id', 'tag', 'title'],
      additionalProperties: false
    }
  },
  handler
}
