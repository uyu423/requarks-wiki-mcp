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
  title: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  path: z.string().optional(),
  locale: z.string().optional(),
  editor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  publishStartDate: z.string().optional(),
  publishEndDate: z.string().optional(),
  scriptCss: z.string().max(10000).optional(),
  scriptJs: z.string().max(10000).optional()
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
    throw new WikiNotFoundError(`Cannot resolve path for page id ${id}.`)
  }
  return data.pages.single.path
}

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    ctx.enforceMutationSafety(input.confirm)

    const currentPath = await getPagePathById(ctx, input.id)
    ctx.enforceMutationPath(currentPath)
    const normalizedInputPath = input.path ? normalizeWikiPath(input.path) : undefined
    if (normalizedInputPath && normalizedInputPath !== currentPath) {
      ctx.enforceMutationPath(normalizedInputPath)
    }
    const targetPath = normalizedInputPath ?? currentPath

    if (ctx.config.mutationDryRun) {
      const dryRunResult = {
        dryRun: true,
        operation: 'update',
        message:
          'Mutation dry-run is enabled. Set WIKI_MUTATION_DRY_RUN=false to perform write operations.',
        target: {
          id: input.id,
          path: targetPath,
          locale: input.locale ?? null
        }
      }
      ctx.auditMutation('update', dryRunResult)
      return textResult(JSON.stringify(dryRunResult, null, 2))
    }

    // Wiki.js server crashes on tags: undefined (calls .map() on undefined),
    // so we ALWAYS include tags in the mutation, defaulting to empty array.
    // See: https://github.com/requarks/wiki-docs/blob/master/dev/api.md
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
        $publishStartDate: Date
        $publishEndDate: Date
        $scriptCss: String
        $scriptJs: String
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

    const variables: Record<string, unknown> = {
      id: input.id,
      content: input.content,
      description: input.description,
      editor: input.editor,
      isPrivate: input.isPrivate,
      isPublished: input.isPublished,
      locale: input.locale,
      path: normalizedInputPath,
      tags: input.tags ?? [],
      title: input.title,
      publishStartDate: input.publishStartDate,
      publishEndDate: input.publishEndDate,
      scriptCss: input.scriptCss,
      scriptJs: input.scriptJs
    }

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
    }>(mutation, variables, { noRetry: true })

    ctx.auditMutation('update', {
      dryRun: false,
      succeeded: data.pages.update.responseResult.succeeded,
      id: data.pages.update.page?.id ?? input.id,
      path: data.pages.update.page?.path ?? targetPath,
      errorCode: data.pages.update.responseResult.errorCode,
      message: data.pages.update.responseResult.message
    })

    if (!data.pages.update.responseResult.succeeded) {
      return classifyResponseResultError(data.pages.update.responseResult, 'update page')
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
    description:
      'Update an existing page by ID. Requires WIKI_MUTATIONS_ENABLED=true. confirm is only checked when WIKI_MUTATION_CONFIRM_TOKEN is set.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description:
            'Must match WIKI_MUTATION_CONFIRM_TOKEN if set. Optional when token is not configured.'
        },
        id: { type: 'number', description: 'Page ID to update.' },
        title: { type: 'string' },
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
        description: { type: 'string' },
        path: { type: 'string' },
        locale: { type: 'string' },
        editor: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isPublished: { type: 'boolean' },
        isPrivate: { type: 'boolean' },
        publishStartDate: { type: 'string', description: 'Publication start date (ISO 8601 format).' },
        publishEndDate: { type: 'string', description: 'Publication end date (ISO 8601 format).' },
        scriptCss: { type: 'string', description: 'Custom CSS for the page. Max 10,000 chars.' },
        scriptJs: {
          type: 'string',
          description:
            'Custom JavaScript for the page. WARNING: executes in every visitor\'s browser. Only use trusted code. Max 10,000 chars.'
        }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  handler
}
