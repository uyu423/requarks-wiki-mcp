import { z } from 'zod'
import type { ToolModule, ToolContext, PageLink } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  locale: z.string().optional()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)
    const locale = input.locale ?? ctx.config.defaultLocale

    const query = `
      query GetPageLinks($locale: String!) {
        pages {
          links(locale: $locale) {
            id
            path
            title
            links
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        links: PageLink[]
      }
    }>(query, { locale })

    return textResult(JSON.stringify(data.pages.links, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page links')
  }
}

export const getPageLinksTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_links',
    description:
      'Get all pages and their outbound links for a locale. Returns an array of pages with their link relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: {
          type: 'string',
          description: 'Locale code. Defaults to configured default locale.'
        }
      },
      additionalProperties: false
    }
  },
  handler
}
