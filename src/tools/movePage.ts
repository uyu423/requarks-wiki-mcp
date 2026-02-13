import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import {
  textResult,
  formatErrorForLLM,
  classifyResponseResultError,
  WikiNotFoundError
} from '../errors.js'
import { normalizeWikiPath } from '../safety.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  id: z.number().int().positive(),
  destinationPath: z.string().min(1),
  destinationLocale: z.string().optional()
})

async function getPagePathById(ctx: ToolContext, id: number): Promise<string> {
  const query = `
    query GetPagePathForMove($id: Int!) {
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

    const sourcePath = await getPagePathById(ctx, input.id)
    ctx.enforceMutationPath(sourcePath)

    const normalizedDestPath = normalizeWikiPath(input.destinationPath)
    ctx.enforceMutationPath(normalizedDestPath)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'move',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform move operations.',
        target: {
          id: input.id,
          sourcePath,
          destinationPath: normalizedDestPath,
          destinationLocale: input.destinationLocale ?? null
        }
      }
      ctx.auditMutation('move', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation MovePage($id: Int!, $destinationPath: String!, $destinationLocale: String!) {
        pages {
          move(id: $id, destinationPath: $destinationPath, destinationLocale: $destinationLocale) {
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
        move: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
        }
      }
    }>(
      mutation,
      {
        id: input.id,
        destinationPath: normalizedDestPath,
        destinationLocale: input.destinationLocale ?? ctx.config.defaultLocale
      },
      { noRetry: true }
    )

    ctx.auditMutation('move', {
      dryRun: false,
      succeeded: data.pages.move.responseResult.succeeded,
      id: input.id,
      sourcePath,
      destinationPath: normalizedDestPath,
      errorCode: data.pages.move.responseResult.errorCode,
      message: data.pages.move.responseResult.message
    })

    if (!data.pages.move.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.move.responseResult, 'move page')
    }

    return textResult(JSON.stringify(data.pages.move, null, 2))
  } catch (err) {
    ctx.auditMutation('move', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'move page')
  }
}

export const movePageTool: ToolModule = {
  definition: {
    name: 'wikijs_move_page',
    description:
      'Move a page to a new path or locale. Requires WIKI_MUTATIONS_ENABLED=true and may need manage:pages permission. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Page ID to move.' },
        destinationPath: { type: 'string', description: 'New path for the page.' },
        destinationLocale: { type: 'string', description: 'New locale. Defaults to current locale.' }
      },
      required: ['id', 'destinationPath'],
      additionalProperties: false
    }
  },
  handler
}
