import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, errorResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  confirm: z.string(),
  id: z.number().int().positive(),
  title: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  path: z.string().optional(),
  locale: z.string().optional(),
  editor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional()
})

async function getPagePathById(ctx: ToolContext, id: number): Promise<string> {
  const query = `
    query GetPagePathForUpdate($id: Int!) {
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
    throw new Error(`Cannot resolve path for page id ${id}.`)
  }
  return data.pages.single.path
}

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)

    const currentPath = await getPagePathById(ctx, input.id)
    ctx.enforceMutationPath(currentPath)
    if (input.path && input.path !== currentPath) {
      ctx.enforceMutationPath(input.path)
    }
    const targetPath = input.path ?? currentPath

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'update',
        message: 'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform write operations.',
        target: {
          id: input.id,
          path: targetPath,
          locale: input.locale ?? null
        }
      }
      ctx.auditMutation('update', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation UpdatePage(
        $id: Int!
        $content: String
        $description: String
        $editor: String
        $isPrivate: Boolean
        $isPublished: Boolean
        $locale: String
        $path: String
        $tags: [String]
        $title: String
      ) {
        pages {
          update(
            id: $id
            content: $content
            description: $description
            editor: $editor
            isPrivate: $isPrivate
            isPublished: $isPublished
            locale: $locale
            path: $path
            tags: $tags
            title: $title
          ) {
            responseResult {
              succeeded
              errorCode
              slug
              message
            }
            page {
              id
              path
              title
              updatedAt
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        update: {
          responseResult: {
            succeeded: boolean
            errorCode: number
            slug: string
            message: string
          }
          page: {
            id: number
            path: string
            title: string
            updatedAt: string
          } | null
        }
      }
    }>(mutation, {
      id: input.id,
      content: input.content,
      description: input.description,
      editor: input.editor,
      isPrivate: input.isPrivate,
      isPublished: input.isPublished,
      locale: input.locale,
      path: input.path,
      tags: input.tags,
      title: input.title
    }, { noRetry: true })

    ctx.auditMutation('update', {
      dryRun: false,
      succeeded: data.pages.update.responseResult.succeeded,
      id: data.pages.update.page?.id ?? input.id,
      path: data.pages.update.page?.path ?? targetPath,
      errorCode: data.pages.update.responseResult.errorCode,
      message: data.pages.update.responseResult.message
    })

    if (!data.pages.update.responseResult.succeeded) {
      return errorResult(
        `Wiki.js update failed: ${data.pages.update.responseResult.message} (code ${data.pages.update.responseResult.errorCode})`
      )
    }

    return textResult(JSON.stringify(data.pages.update, null, 2))
  } catch (err) {
    ctx.auditMutation('update', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'update page')
  }
}

export const updatePageTool: ToolModule = {
  definition: {
    name: 'wikijs_update_page',
    description: 'Update an existing page by ID. Requires WIKI_MUTATIONS_ENABLED=true and confirm token.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Must match WIKI_MUTATION_CONFIRM_TOKEN.' },
        id: { type: 'number', description: 'Page ID to update.' },
        title: { type: 'string' },
        content: { type: 'string' },
        description: { type: 'string' },
        path: { type: 'string' },
        locale: { type: 'string' },
        editor: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isPublished: { type: 'boolean' },
        isPrivate: { type: 'boolean' }
      },
      required: ['confirm', 'id'],
      additionalProperties: false
    }
  },
  handler
}
