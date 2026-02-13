import { z } from 'zod'
import type { ToolModule, ToolContext, SystemInfo } from '../types.js'
import { textResult, formatErrorForLLM } from '../errors.js'

const inputSchema = z.object({})

async function handler(ctx: ToolContext, raw: Record<string, unknown>) {
  try {
    inputSchema.parse(raw)

    const query = `
      query GetSystemInfo {
        system {
          info {
            configFile
            cpuCores
            currentVersion
            dbHost
            dbType
            dbVersion
            groupsTotal
            hostname
            httpPort
            httpRedirection
            httpsPort
            latestVersion
            latestVersionReleaseDate
            nodeVersion
            operatingSystem
            pagesTotal
            platform
            ramTotal
            sslDomain
            sslExpirationDate
            sslProvider
            sslStatus
            sslSubscriberEmail
            telemetry
            telemetryClientId
            upgradeCapable
            usersTotal
            workingDirectory
          }
        }
      }
    `

    const data = await ctx.graphql<{
      system: { info: SystemInfo }
    }>(query, {})

    return textResult(JSON.stringify(data.system.info, null, 2))
  } catch (err) {
    return formatErrorForLLM(err, 'get system info')
  }
}

export const getSystemInfoTool: ToolModule = {
  definition: {
    name: 'wikijs_get_system_info',
    description:
      'Retrieve Wiki.js system information including version, database, host config, and usage statistics. Useful for diagnostics and understanding the wiki instance configuration.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  handler
}
