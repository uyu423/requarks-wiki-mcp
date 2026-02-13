import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM, classifyResponseResultError } from '../errors.js'
import { normalizeWikiPath } from '../safety.js'

const inputSchema = z.object({
  confirm: z.string().optional().default(''),
  path: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  description: z.string().optional(),
  locale: z.string().optional(),
  editor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  publishStartDate: z.string().optional(),
  publishEndDate: z.string().optional(),
  scriptCss: z.string().optional(),
  scriptJs: z.string().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)
    const normalizedPath = normalizeWikiPath(input.path)
    ctx.enforceMutationPath(normalizedPath)

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'create',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform write operations.',
        target: {
          path: normalizedPath,
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
        $publishStartDate: Date
        $publishEndDate: Date
        $scriptCss: String
        $scriptJs: String
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
            publishStartDate: $publishStartDate
            publishEndDate: $publishEndDate
            scriptCss: $scriptCss
            scriptJs: $scriptJs
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
    }>(
      mutation,
      {
        content: input.content,
        description: input.description ?? '',
        editor: input.editor ?? ctx.config.defaultEditor,
        isPublished: input.isPublished ?? true,
        isPrivate: input.isPrivate ?? false,
        locale: input.locale ?? ctx.config.defaultLocale,
        path: normalizedPath,
        tags: input.tags ?? [],
        title: input.title,
        publishStartDate: input.publishStartDate,
        publishEndDate: input.publishEndDate,
        scriptCss: input.scriptCss,
        scriptJs: input.scriptJs
      },
      { noRetry: true }
    )

    ctx.auditMutation('create', {
      dryRun: false,
      succeeded: data.pages.create.responseResult.succeeded,
      path: data.pages.create.page?.path ?? input.path,
      id: data.pages.create.page?.id ?? null,
      errorCode: data.pages.create.responseResult.errorCode,
      message: data.pages.create.responseResult.message
    })

    if (!data.pages.create.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.create.responseResult, 'create page')
    }

    return textResult(JSON.stringify(data.pages.create, null, 2))
  } catch (err) {
    ctx.auditMutation('create', {
      succeeded: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return formatErrorForLLM(err, 'create page')
  }
}

export const createPageTool: ToolModule = {
  definition: {
    name: 'wikijs_create_page',
    description:
      'Create a new page. Requires WIKI_MUTATIONS_ENABLED=true. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        path: { type: 'string', description: 'Target page path.' },
        title: { type: 'string', description: 'Page title.' },
        content: {
          type: 'string',
          description: [
            'Page content in Wiki.js-flavored Markdown (when editor is "markdown").',
            'Supports CommonMark + GFM plus Wiki.js extensions:',
            '',
            'BLOCKQUOTE STYLES — colored callout boxes:',
            '  > Note text',
            '  {.is-info}       (blue)',
            '  {.is-success}    (green)',
            '  {.is-warning}    (yellow)',
            '  {.is-danger}     (red)',
            '',
            'CONTENT TABS — {.tabset} on parent heading, child headings become tabs:',
            '  ## Tabs {.tabset}',
            '  ### First Tab',
            '  Content...',
            '  ### Second Tab',
            '  Content...',
            '',
            'IMAGE DIMENSIONS — append =WIDTHxHEIGHT after URL:',
            '  ![alt](/img.jpg =300x200)  ![alt](/img.jpg =100%x)',
            '',
            'DIAGRAMS — mermaid or plantuml fenced code blocks.',
            'TABLE STYLE — {.dense} after table for compact rendering.',
            'LIST STYLES — {.grid-list} or {.links-list} after list.',
            'TEXT — ~sub~  ^super^  <kbd>Key</kbd>  ~~strike~~',
            'FOOTNOTES — [^1] inline, [^1]: definition at bottom.',
            'DECORATE — <!-- {element:.class} --> for ambiguous targets.',
            '',
            'For the full syntax reference, read the wikijs://markdown-guide resource.'
          ].join('\n')
        },
        description: { type: 'string', description: 'Short page description.' },
        locale: { type: 'string', description: 'Locale code.' },
        editor: { type: 'string', description: 'Editor key (markdown, asciidoc, html, etc).' },
        tags: {
          type: 'array',
          description: 'Optional string tags.',
          items: { type: 'string' }
        },
        isPublished: { type: 'boolean', description: 'Defaults true.' },
        isPrivate: { type: 'boolean', description: 'Defaults false.' },
        publishStartDate: { type: 'string', description: 'Publication start date (ISO 8601 format).' },
        publishEndDate: { type: 'string', description: 'Publication end date (ISO 8601 format).' },
        scriptCss: { type: 'string', description: 'Custom CSS for the page.' },
        scriptJs: { type: 'string', description: 'Custom JavaScript for the page.' }
      },
      required: ['path', 'title', 'content'],
      additionalProperties: false
    }
  },
  handler
}
