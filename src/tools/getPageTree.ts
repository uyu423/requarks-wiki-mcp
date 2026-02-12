import { z } from 'zod'
import type { ToolModule, ToolContext, PageTreeItem } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  path: z.string().optional(),
  parentId: z.number().int().positive().optional(),
  mode: z.enum(['FOLDERS', 'PAGES', 'ALL']).optional(),
  locale: z.string().optional(),
  includeAncestors: z.boolean().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale
    const mode = input.mode ?? 'ALL'

    const query = `
      query GetPageTree(
        $path: String
        $parent: Int
        $mode: PageTreeMode!
        $locale: String!
        $includeAncestors: Boolean
      ) {
        pages {
          tree(
            path: $path
            parent: $parent
            mode: $mode
            locale: $locale
            includeAncestors: $includeAncestors
          ) {
            id
            path
            depth
            title
            isFolder
            pageId
            parent
            locale
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: { tree: PageTreeItem[] }
    }>(query, {
      path: input.path,
      parent: input.parentId,
      mode,
      locale,
      includeAncestors: input.includeAncestors ?? false
    })

    return textResult(JSON.stringify(data.pages.tree, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page tree')
  }
}

export const getPageTreeTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_tree',
    description: 'Get the page tree hierarchy for site navigation and structure discovery. Returns folders and/or pages with depth info.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Optional path prefix to scope the tree.' },
        parentId: { type: 'number', description: 'Optional parent page ID to get children of.' },
        mode: { type: 'string', enum: ['FOLDERS', 'PAGES', 'ALL'], description: 'Tree mode. Default ALL.' },
        locale: { type: 'string', description: 'Locale code. Defaults to WIKI_DEFAULT_LOCALE.' },
        includeAncestors: { type: 'boolean', description: 'Include ancestor pages. Default false.' }
      },
      additionalProperties: false
    }
  },
  handler
}
