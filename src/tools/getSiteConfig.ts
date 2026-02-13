import { z } from 'zod'
import type { ToolModule, ToolContext } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    inputSchema.parse(raw)

    const query = `
      query GetSiteConfig {
        site {
          config {
            host
            title
            description
            robots
            analyticsService
            analyticsId
            company
            contentLicense
            logoUrl
            featurePageRatings
            featurePageComments
            featurePersonalWikis
            authAutoLogin
            authEnforce2FA
            authHideLocal
            uploadMaxFileSize
            uploadMaxFiles
          }
        }
      }
    `

    const data = await ctx.graphql<{
      site: {
        config: {
          host: string
          title: string
          description: string
          robots: string[]
          analyticsService: string
          analyticsId: string
          company: string
          contentLicense: string
          logoUrl: string
          featurePageRatings: boolean
          featurePageComments: boolean
          featurePersonalWikis: boolean
          authAutoLogin: boolean
          authEnforce2FA: boolean
          authHideLocal: boolean
          uploadMaxFileSize: number
          uploadMaxFiles: number
        }
      }
    }>(query, {})

    return textResult(JSON.stringify(data.site.config, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get site config')
  }
}

export const getSiteConfigTool: ToolModule = {
  definition: {
    name: 'wikijs_get_site_config',
    description:
      'Retrieve safe (non-sensitive) site configuration including title, description, feature flags, and upload limits. Does not expose secrets or authentication keys.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  handler
}
