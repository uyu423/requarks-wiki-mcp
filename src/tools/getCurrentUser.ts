import { z } from 'zod'
import type { ToolModule, ToolContext, UserProfile } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    inputSchema.parse(raw)

    const query = `
      query GetCurrentUser {
        users {
          profile {
            id
            name
            email
            providerKey
            providerName
            isSystem
            isVerified
            location
            jobTitle
            timezone
            dateFormat
            appearance
            createdAt
            updatedAt
            lastLoginAt
            groups
            pagesTotal
          }
        }
      }
    `

    const data = await ctx.graphql<{
      users: { profile: UserProfile }
    }>(query, {})

    return textResult(JSON.stringify(data.users.profile, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get current user')
  }
}

export const getCurrentUserTool: ToolModule = {
  definition: {
    name: 'wikijs_get_current_user',
    description:
      'Get the profile of the currently authenticated API user. Returns identity, permissions context, and activity info.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  handler
}
