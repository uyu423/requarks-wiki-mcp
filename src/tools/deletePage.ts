import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import {
  textResult,
  formatErrorForLLM,
  classifyResponseResultError,
  WikiNotFoundError
} from '../errors.js'

const inputSchema = z.object({
  confirm: z.string(),
  id: z.number().int().positive()
})

async function getPagePathById(ctx: ToolContext, id: number): Promise<string> {
  const query = `
    query GetPagePathForDelete($id: Int!) {
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
        operation: 'delete',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform delete operations.',
        target: { id: input.id, path: targetPath }
      }
      ctx.auditMutation('delete', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation DeletePage($id: Int!) {
        pages {
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
      pages: {
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

    ctx.auditMutation('delete', {
      dryRun: false,
      succeeded: data.pages.delete.responseResult.succeeded,
      id: input.id,
      path: targetPath,
      errorCode: data.pages.delete.responseResult.errorCode,
      message: data.pages.delete.responseResult.message
    })

    if (!data.pages.delete.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.delete.responseResult, 'delete page')
    }

    return textResult(JSON.stringify(data.pages.delete, null, 2))
  } catch (err) {
    ctx.auditMutation('delete', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'delete page')
  }
}

export const deletePageTool: ToolModule = {
  definition: {
    name: 'wikijs_delete_page',
    description:
      'Delete a page by ID. Requires WIKI_MUTATIONS_ENABLED=true, confirm token, and may need manage:pages or delete:pages permission.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Must match WIKI_MUTATION_CONFIRM_TOKEN.' },
        id: { type: 'number', description: 'Page ID to delete.' }
      },
      required: ['confirm', 'id'],
      additionalProperties: false
    }
  },
  handler
}
