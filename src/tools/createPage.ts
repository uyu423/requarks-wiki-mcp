import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  confirm: z.string(),
  path: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  description: z.string().optional(),
  locale: z.string().optional(),
  editor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)
    ctx.enforceMutationPath(input.path)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'create',
        message: 'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform write operations.',
        target: {
          path: input.path,
          locale: input.locale ?? ctx.config.defaultLocale,
          title: input.title
        }
      }
      ctx.auditMutation('create', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    const mutation = `
      mutation CreatePage(
        $content: String!
        $description: String!
        $editor: String!
        $isPublished: Boolean!
        $isPrivate: Boolean!
        $locale: String!
        $path: String!
        $tags: [String]!
        $title: String!
      ) {
        pages {
          create(
            content: $content
            description: $description
            editor: $editor
            isPublished: $isPublished
            isPrivate: $isPrivate
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
        create: {
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
      content: input.content,
      description: input.description ?? '',
      editor: input.editor ?? ctx.config.defaultEditor,
      isPublished: input.isPublished ?? true,
      isPrivate: input.isPrivate ?? false,
      locale: input.locale ?? ctx.config.defaultLocale,
      path: input.path,
      tags: input.tags ?? [],
      title: input.title
    }, { noRetry: true })

    ctx.auditMutation('create', {
      dryRun: false,
      succeeded: data.pages.create.responseResult.succeeded,
      path: data.pages.create.page?.path ?? input.path,
      id: data.pages.create.page?.id ?? null,
      errorCode: data.pages.create.responseResult.errorCode,
      message: data.pages.create.responseResult.message
    })

    return textResult(JSON.stringify(data.pages.create, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'create page')
  }
}

export const createPageTool: ToolModule = {
  definition: {
    name: 'wikijs_create_page',
    description: 'Create a new page. Requires WIKI_MUTATIONS_ENABLED=true and confirm token.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Must match WIKI_MUTATION_CONFIRM_TOKEN.' },
        path: { type: 'string', description: 'Target page path.' },
        title: { type: 'string', description: 'Page title.' },
        content: { type: 'string', description: 'Raw source content.' },
        description: { type: 'string', description: 'Short page description.' },
        locale: { type: 'string', description: 'Locale code.' },
        editor: { type: 'string', description: 'Editor key (markdown, asciidoc, html, etc).' },
        tags: {
          type: 'array',
          description: 'Optional string tags.',
          items: { type: 'string' }
        },
        isPublished: { type: 'boolean', description: 'Defaults true.' },
        isPrivate: { type: 'boolean', description: 'Defaults false.' }
      },
      required: ['confirm', 'path', 'title', 'content'],
      additionalProperties: false
    }
  },
  handler
}
