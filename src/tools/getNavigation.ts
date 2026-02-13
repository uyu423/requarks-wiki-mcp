import { z } from 'zod'
import type { ToolModule, ToolContext, NavigationTree } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    inputSchema.parse(raw)

    const query = `
      query GetNavigation {
        navigation {
          tree {
            locale
            items {
              id
              kind
              label
              icon
              targetType
              target
              visibilityMode
              visibilityGroups
            }
          }
        }
      }
    `

    const data = await ctx.graphql<{
      navigation: { tree: NavigationTree[] }
    }>(query, {})

    return textResult(JSON.stringify(data.navigation.tree, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get navigation')
  }
}

export const getNavigationTool: ToolModule = {
  definition: {
    name: 'wikijs_get_navigation',
    description:
      'Retrieve the navigation tree for all locales. Returns configured navigation items including links, headers, and dividers with their visibility settings.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  handler
}
