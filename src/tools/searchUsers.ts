import { z } from 'zod'
import type { ToolModule, ToolContext, UserSearchResult } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({
  query: z.string().min(1)
})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    const input = inputSchema.parse(raw)

    const query = `
      query SearchUsers($query: String!) {
        users {
          search(query: $query) {
            id
            name
            email
            providerKey
            isActive
            createdAt
            lastLoginAt
          }
        }
      }
    `

    const data = await ctx.graphql<{
      users: { search: UserSearchResult[] }
    }>(query, { query: input.query })

    return textResult(JSON.stringify(data.users.search, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'search users')
  }
}

export const searchUsersTool: ToolModule = {
  definition: {
    name: 'wikijs_search_users',
    description:
      'Search for users by name or email. Returns matching user profiles for collaboration context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for user name or email.' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  handler
}
