import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import {
  textResult,
  formatErrorForLLM,
  classifyResponseResultError,
  WikiNotFoundError
} from '../errors.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  id: z.number().int().positive(),
  versionId: z.number().int().positive()
})

async function getPagePathById(ctx: ToolContext, id: number): Promise<string> {
  const query = `
    query GetPagePathForRestore($id: Int!) {
      pages {
        single(id: $id) {
          path
        }
      }
    }
  `
  const data = await ctx.graphql<{
    pages: { single: { path: string } | null }
  }>(query, { id })

  if (!data.pages.single?.path) {
    throw new WikiNotFoundError(`Cannot resolve path for page id ${id}.`)
  }
  return data.pages.single.path
}

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)

    const targetPath = await getPagePathById(ctx, input.id)
    ctx.enforceMutationPath(targetPath)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'restore',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform restore operations.',
        target: {
          id: input.id,
          path: targetPath,
          versionId: input.versionId
        }
      }
      ctx.auditMutation('restore', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation RestorePage($pageId: Int!, $versionId: Int!) {
        pages {
          restore(pageId: $pageId, versionId: $versionId) {
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
        restore: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(mutation, { pageId: input.id, versionId: input.versionId }, { noRetry: true })

    ctx.auditMutation('restore', {
      dryRun: false,
      succeeded: data.pages.restore.responseResult.succeeded,
      id: input.id,
      path: targetPath,
      versionId: input.versionId,
      errorCode: data.pages.restore.responseResult.errorCode,
      message: data.pages.restore.responseResult.message
    })

    if (!data.pages.restore.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.restore.responseResult, 'restore page')
    }

    return textResult(JSON.stringify(data.pages.restore, null, 2))
  } catch (err) {
    ctx.auditMutation('restore', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'restore page')
  }
}

export const restorePageTool: ToolModule = {
  definition: {
    name: 'wikijs_restore_page',
    description:
      'Restore a page to a previous version. Requires WIKI_MUTATIONS_ENABLED=true and may need manage:pages permission. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Page ID to restore.' },
        versionId: { type: 'number', description: 'Version ID to restore to (from page history).' }
      },
      required: ['id', 'versionId'],
      additionalProperties: false
    }
  },
  handler
}
