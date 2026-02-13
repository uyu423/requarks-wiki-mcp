import { z } from 'zod'
import type { ToolModule, ToolContext, PageVersion } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  id: z.number().int().positive(),
  versionId: z.number().int().positive()
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    const query = `
      query GetPageVersion($pageId: Int!, $versionId: Int!) {
        pages {
          version(pageId: $pageId, versionId: $versionId) {
            action
            authorId
            authorName
            content
            contentType
            createdAt
            description
            editor
            isPrivate
            isPublished
            locale
            pageId
            path
            publishEndDate
            publishStartDate
            tags
            title
            versionDate
            versionId
          }
        }
      }
    `

    const data = await ctx.graphql<{
      pages: {
        version: PageVersion
      }
    }>(query, { pageId: input.id, versionId: input.versionId })

    return textResult(JSON.stringify(data.pages.version, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get page version')
  }
}

export const getPageVersionTool: ToolModule = {
  definition: {
    name: 'wikijs_get_page_version',
    description:
      'Get a specific version of a page by page ID and version ID. Returns full page content and metadata for that version.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Page ID.' },
        versionId: { type: 'number', description: 'Version ID from page history.' }
      },
      required: ['id', 'versionId'],
      additionalProperties: false
    }
  },
  handler
}
