# requarks-wiki-mcp

用于 [Wiki.js](https://js.wiki/) 的 MCP 服务器，可将 Wiki.js 实例作为知识库使用。

功能：

- **29 个工具**（19 个读取 + 10 个写入），覆盖页面、评论、标签、资源、用户、导航和系统信息。
- 搜索、列表和浏览页面，用于检索工作流（类 RAG 使用）。
- 按路径或页面 ID 获取页面内容，查看版本历史并恢复到先前版本。
- 通过页面树、页面链接图和导航结构浏览站点层次结构。
- 完整的评论系统：列表、读取、创建、更新和删除页面上的评论。
- 资源和文件夹浏览，用于媒体文件发现。
- 用户上下文：当前用户配置文件和用户搜索。
- 系统诊断：版本信息、站点配置和导航树。
- 标签管理：列表、搜索、更新和删除标签。
- 可选的页面创建/更新/删除/移动/恢复工具，带显式安全保护。
- 内置资源：markdown 语法指南、Mermaid 图表指南和 API 权限指南。
- 类型化错误分类，提供 LLM 友好的错误消息。
- GraphQL 客户端，具有超时、指数退避重试和请求关联功能。
- 安全加固：敏感字段过滤、URL 验证、输入长度限制。

## 要求

- Node.js 20+
- 可访问的 Wiki.js 主机
- 具有适当权限的 Wiki.js API Key（JWT）

## 配置

```bash
cp .env.example .env
npm install
```

配置 `.env`：

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# 变更操作默认禁用
WIKI_MUTATIONS_ENABLED=false
# 可选的额外安全保护。如果设置，写入工具必须传递匹配的 confirm 参数。
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# 逗号分隔的路径前缀（不带前导斜杠），空值表示无前缀限制
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# HTTP 弹性
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

环境变量参考：

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `WIKI_BASE_URL` | 是 | - | Wiki.js 基础 URL（例如 `https://wiki.example.com`）。 |
| `WIKI_API_TOKEN` | 是 | - | 用于 `Authorization: Bearer ...` 的 Wiki.js API Key JWT。 |
| `WIKI_GRAPHQL_PATH` | 否 | `/graphql` | 附加到 `WIKI_BASE_URL` 的 GraphQL 端点路径。 |
| `WIKI_DEFAULT_LOCALE` | 否 | `en` | 工具输入未提供 locale 时使用的默认 locale。 |
| `WIKI_DEFAULT_EDITOR` | 否 | `markdown` | 创建页面时未指定时使用的默认编辑器。 |
| `WIKI_MUTATIONS_ENABLED` | 否 | `false` | 设置为 `true` 时启用所有写入工具（页面、评论和标签变更）。 |
| `WIKI_MUTATION_CONFIRM_TOKEN` | 否 | ``（空） | 可选的额外安全保护。设置后，写入工具调用必须提供匹配的 `confirm` 参数。 |
| `WIKI_MUTATION_DRY_RUN` | 否 | `true` | 为 `true` 时，变更工具仅返回预览，不写入 Wiki.js。 |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | 否 | ``（空） | 允许变更的路径前缀（不带前导斜杠），逗号分隔。空值表示无前缀限制。 |
| `WIKI_HTTP_TIMEOUT_MS` | 否 | `15000` | HTTP 请求超时（毫秒，包括读取响应体）。最小值 1。 |
| `WIKI_HTTP_MAX_RETRIES` | 否 | `2` | 瞬态读取失败（408, 502-504）的最大重试次数。变更操作不会重试。最小值 0。 |

Wiki.js 前置条件（GraphQL + API Key）：

- 该 MCP 在内部使用 Wiki.js GraphQL。
- 在 Wiki.js 管理后台，进入 `Administration -> API` 并启用 API 访问。
- 创建 API Key 并将其设置为 `WIKI_API_TOKEN`。

## MCP 客户端配置示例（`~/.mcp.json`）

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "@yowu-dev/requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

## 本地路径注册 MCP（无需发布到 npm）

你可以直接从本地项目路径注册此 MCP 服务器，无需从 npm 发布/安装。

1. 在此仓库中构建

```bash
npm install
npm run build
```

2. 在 `~/.mcp.json` 中注册本地绝对路径

```json
{
  "mcpServers": {
    "requarks-wiki-local": {
      "command": "node",
      "args": ["/absolute/path/to/requarks-wiki-mcp/dist/index.js"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "true",
        "WIKI_MUTATION_CONFIRM_TOKEN": "",
        "WIKI_MUTATION_DRY_RUN": "false",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": "",
        "WIKI_HTTP_TIMEOUT_MS": "15000",
        "WIKI_HTTP_MAX_RETRIES": "2"
      }
    }
  }
}
```

注意事项：

- 始终使用绝对路径。
- 代码更改后重新运行 `npm run build`，以保持 `dist/index.js` 为最新。

## 运行

开发模式：

```bash
npm run dev
```

构建 + 运行：

```bash
npm run build
npm start
```

## MCP 工具

### 读取工具（19 个）

**页面：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_search_pages` | 跨 Wiki 页面的全文搜索。 |
| `wikijs_list_pages` | 列出页面，支持可选的 locale 过滤和限制。 |
| `wikijs_get_page_by_path` | 按路径 + locale 获取完整页面内容。 |
| `wikijs_get_page_by_id` | 按数字 ID 获取完整页面内容。 |
| `wikijs_get_page_tree` | 浏览站点层次结构（文件夹、页面或两者）。 |
| `wikijs_get_page_history` | 查看页面的编辑历史记录。 |
| `wikijs_get_page_version` | 获取特定版本的完整内容。 |
| `wikijs_get_page_links` | 获取页面链接关系（知识图谱）。 |

**标签：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_list_tags` | 列出所有标签，用于内容分类发现。 |
| `wikijs_search_tags` | 搜索匹配查询字符串的标签。 |

**评论：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_list_comments` | 按路径和 locale 列出页面的所有评论。 |
| `wikijs_get_comment` | 按 ID 获取单个评论。 |

**系统与导航：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_get_system_info` | Wiki.js 版本、数据库类型和使用统计。 |
| `wikijs_get_navigation` | 导航树结构。 |
| `wikijs_get_site_config` | 站点配置（非敏感字段）。 |

**资源：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_list_assets` | 列出资源，支持可选的文件夹和类型过滤。 |
| `wikijs_list_asset_folders` | 列出资源文件夹。 |

**用户：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_get_current_user` | 获取当前已认证的 API 用户配置文件。 |
| `wikijs_search_users` | 按名称或邮箱搜索用户。 |

### 写入工具（10 个，除非 `WIKI_MUTATIONS_ENABLED=true` 否则禁用）

**页面变更：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_create_page` | 创建包含内容、标签和元数据的新页面。 |
| `wikijs_update_page` | 按 ID 更新现有页面。 |
| `wikijs_delete_page` | 按 ID 删除页面。可能需要 `manage:pages` 或 `delete:pages` 权限。 |
| `wikijs_move_page` | 将页面移动/重命名到新路径或 locale。 |
| `wikijs_restore_page` | 将页面恢复到先前版本。 |

**评论变更：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_create_comment` | 在页面上创建评论。 |
| `wikijs_update_comment` | 按 ID 更新现有评论。 |
| `wikijs_delete_comment` | 按 ID 删除评论。 |

**标签变更：**

| 工具 | 说明 |
| --- | --- |
| `wikijs_update_tag` | 更新标签的 slug 和标题。 |
| `wikijs_delete_tag` | 从所有页面删除标签。 |

### 变更安全

- 当设置了 `WIKI_MUTATION_CONFIRM_TOKEN` 时，变更工具需要匹配的 `confirm` 参数。
- 当 `WIKI_MUTATION_DRY_RUN=true` 时，写入工具返回预览，不会变更 Wiki.js。
- 如果设置了 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES`，页面和评论创建变更将限制在这些路径前缀内。
- 所有变更尝试都会向 stderr 写入结构化的审计日志行。

## MCP 资源

| 资源 URI | 说明 |
| --- | --- |
| `wikijs://markdown-guide` | Wiki.js markdown 语法指南（CommonMark/GFM + Wiki.js 特定扩展），用于页面创作和更新。 |
| `wikijs://mermaid-guide` | Wiki.js 内置 Mermaid 8.8.2 图表语法指南（支持9种图表类型、不支持功能警告、版本限制说明）。 |
| `wikijs://api-permissions-guide` | Wiki.js API 权限模型、错误代码和 API Key 配置指南，用于自行诊断权限错误。 |

## 权限说明（Wiki.js）

Wiki.js 的权限行为对于 API Key 来说可能会令人意外。特别是：

- 某些操作可能需要页面规则级别的 `manage:pages`/`delete:pages` 规则。
- 读取 `content` 字段可能需要 `read:source`，具体取决于架构/字段级检查。
- 评论操作需要 `read:comments`、`write:comments` 或 `manage:comments` 权限。
- 系统信息和导航需要管理员级别的 API Key 权限。

常见错误代码：

| 代码 | 含义 |
| --- | --- |
| 6013 | `PageViewForbidden` — 检查组权限 + 页面规则是否允许 `read:pages`/`read:source` |
| 6003 | 页面不存在 |
| 8002 | `CommentPostForbidden` |
| 8003 | `CommentNotFound` |
| 8004 | `CommentViewForbidden` |
| 8005 | `CommentManageForbidden` |

更多详细信息，请阅读 `wikijs://api-permissions-guide` 资源。

## 建议的最小 API Key 权限

对于以读取为主的知识库使用：

- `read:pages`、`read:source`
- `read:comments`（用于浏览评论）
- 页面规则允许对目标路径/locale 使用这些权限

对于写入工作流：

- `write:pages`（创建和更新）
- `manage:pages` 或 `delete:pages`（用于删除/移动操作）
- `write:comments`、`manage:comments`（用于评论变更）
- `manage:system`（用于标签管理）

## 安全指南

- 仅在服务器端保存 API Token。
- 从只读权限开始。
- 除非需要更新，否则保持 `WIKI_MUTATIONS_ENABLED=false`。
- 可选加固：设置强随机的 `WIKI_MUTATION_CONFIRM_TOKEN`，并在写入调用时传递匹配的 `confirm` 参数。
- 在准备好进行真实写入之前，保持 `WIKI_MUTATION_DRY_RUN=true`。
- 使用 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` 限制写入范围。
- `wikijs_get_system_info` 默认过滤敏感的基础设施字段（dbHost、configFile 等）。
- 页面创建/更新中的 `scriptJs`/`scriptCss` 字段受长度限制（10,000 字符），并包含浏览器执行警告。
