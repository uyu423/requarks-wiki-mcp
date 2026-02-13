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
  pageId: z.number().int().positive(),
  content: z.string(),
  replyTo: z.number().int().positive().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional()
})

async function getPagePathById(ctx: ToolContext, id: number): Promise<string> {
  const query = `
    query GetPagePathForComment($id: Int!) {
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

    const pagePath = await getPagePathById(ctx, input.pageId)
    ctx.enforceMutationPath(pagePath)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'create_comment',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform comment operations.',
        target: {
          pageId: input.pageId,
          path: pagePath,
          contentPreview: input.content.substring(0, 100)
        }
      }
      ctx.auditMutation('create_comment', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation CreateComment($pageId: Int!, $replyTo: Int, $content: String!, $guestName: String, $guestEmail: String) {
        comments {
          create(pageId: $pageId, replyTo: $replyTo, content: $content, guestName: $guestName, guestEmail: $guestEmail) {
            responseResult {
              succeeded
              errorCode
              slug
              message
            }
            id
          }
        }
      }
    `

    const data = await ctx.graphql<{
      comments: {
        create: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
          id: number | null
        }
      }
    }>(
      mutation,
      {
        pageId: input.pageId,
        replyTo: input.replyTo,
        content: input.content,
        guestName: input.guestName,
        guestEmail: input.guestEmail
      },
      { noRetry: true }
    )

    ctx.auditMutation('create_comment', {
      dryRun: false,
      succeeded: data.comments.create.responseResult.succeeded,
      pageId: input.pageId,
      path: pagePath,
      commentId: data.comments.create.id,
      errorCode: data.comments.create.responseResult.errorCode,
      message: data.comments.create.responseResult.message
    })

    if (!data.comments.create.responseResult.succeeded) {
      return classifyResponseResultError(data.comments.create.responseResult, 'create comment')
    }

    return textResult(JSON.stringify(data.comments.create, null, 2))
  } catch (err) {
    ctx.auditMutation('create_comment', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'create comment')
  }
}

export const createCommentTool: ToolModule = {
  definition: {
    name: 'wikijs_create_comment',
    description:
      'Create a new comment on a page. Requires WIKI_MUTATIONS_ENABLED=true and may need comment posting permissions. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        pageId: { type: 'number', description: 'Page ID to comment on.' },
        content: { type: 'string', description: 'Comment content.' },
        replyTo: { type: 'number', description: 'Optional comment ID to reply to.' },
        guestName: { type: 'string', description: 'Guest name (if posting as guest).' },
        guestEmail: { type: 'string', description: 'Guest email (if posting as guest).' }
      },
      required: ['pageId', 'content'],
      additionalProperties: false
    }
  },
  handler
}
