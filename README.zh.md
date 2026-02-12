# requarks-wiki-mcp

用于 [Wiki.js](https://js.wiki/) 的 MCP 服务器，可将 Wiki.js 实例作为知识库使用。

功能：
- 页面搜索与列表（适用于 RAG 检索流程）
- 按路径或页面 ID 获取内容
- 可选的页面创建/更新（带显式安全保护）

## 要求

- Node.js 20+
- 可访问的 Wiki.js 主机
- 具有适当权限的 Wiki.js API Key（JWT）

## 配置

```bash
cp .env.example .env
npm install
```

`.env` 示例：

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

环境变量说明：

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `WIKI_BASE_URL` | 是 | - | Wiki.js 基础 URL |
| `WIKI_API_TOKEN` | 是 | - | 用于 `Authorization: Bearer ...` 的 JWT |
| `WIKI_GRAPHQL_PATH` | 否 | `/graphql` | 拼接到基础 URL 的 GraphQL 路径 |
| `WIKI_DEFAULT_LOCALE` | 否 | `en` | 未传 locale 时使用的默认 locale |
| `WIKI_DEFAULT_EDITOR` | 否 | `markdown` | 创建页面时默认 editor |
| `WIKI_MUTATIONS_ENABLED` | 否 | `false` | 设为 `true` 时启用写入工具 |
| `WIKI_MUTATION_CONFIRM_TOKEN` | 否 | `CONFIRM_UPDATE` | 写入时必须匹配的 `confirm` 值 |
| `WIKI_MUTATION_DRY_RUN` | 否 | `true` | `true` 时仅返回预览，不执行写入 |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | 否 | ``（空） | 允许写入的路径前缀（逗号分隔） |

Wiki.js 前置条件（GraphQL + API Key）：
- 该 MCP 在内部使用 Wiki.js GraphQL。
- 在 Wiki.js 管理后台进入 `Administration -> API` 并启用 API。
- 创建 API Key，并设置到 `WIKI_API_TOKEN`。

## 快速开始（清单）

- 在 Wiki.js：`Administration -> API` -> 启用 API
- 创建 API Key 并准备 `WIKI_API_TOKEN`
- 在本项目：`npm install` -> `npm run build`
- 在 MCP 客户端添加 `~/.mcp.json` 配置
- 首次测试：先 `wikijs_search_pages`，再用返回的 `path` 调用 `wikijs_get_page_by_path`

## MCP 客户端配置示例（`~/.mcp.json`）

```json
{
  "mcpServers": {
    "requarks-wiki": {
      "command": "npx",
      "args": ["-y", "requarks-wiki-mcp@latest"],
      "env": {
        "WIKI_BASE_URL": "https://wiki.your-domain.dev",
        "WIKI_API_TOKEN": "your_wikijs_api_key_jwt",
        "WIKI_GRAPHQL_PATH": "/graphql",
        "WIKI_DEFAULT_LOCALE": "en",
        "WIKI_DEFAULT_EDITOR": "markdown",
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

本地/开发示例（不安装包，直接运行 dist）：

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
        "WIKI_MUTATIONS_ENABLED": "false",
        "WIKI_MUTATION_CONFIRM_TOKEN": "CONFIRM_UPDATE",
        "WIKI_MUTATION_DRY_RUN": "true",
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

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

读取工具：
- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

写入工具（仅当 `WIKI_MUTATIONS_ENABLED=true`）：
- `wikijs_create_page`
- `wikijs_update_page`

写入调用要求 `confirm` 与 `WIKI_MUTATION_CONFIRM_TOKEN` 一致。

## 使用场景（用户行为模拟）

场景 1）排查错误原因（RAG 风格）
- 用户请求："帮我找 Kotlin `CancellationException` 相关文档并做简要总结"
- MCP 调用顺序：`wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=搜索结果.path)`
- 结果：先定位相关页面，再取回正文用于总结原因与处理方式。

场景 2）查看最近更新的文档
- 用户请求："给我最近更新的 20 个页面"
- MCP 调用顺序：`wikijs_list_pages(limit=20, locale="en")`
- 结果：返回 `path/title/updatedAt`，可直接生成变更速览。

场景 3）按页面 ID 精确读取
- 用户请求："读取页面 ID 7283，并只提取 TODO"
- MCP 调用顺序：`wikijs_get_page_by_id(id=7283)`
- 结果：直接获取目标页面内容并提取所需信息。

场景 4）先预演再正式写入
- 用户请求："在 `sandbox` 下创建一份部署检查清单"
- MCP 调用顺序（预演）：`wikijs_create_page(..., confirm=token)` with `WIKI_MUTATION_DRY_RUN=true`
- MCP 调用顺序（执行）：相同调用 with `WIKI_MUTATION_DRY_RUN=false`
- 结果：先看预览，再在 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` 允许的路径内正式写入。

## 运行建议

- 在 RAG 流程中，优先按 `path` 读取（`wikijs_get_page_by_path`）。（搜索结果里的 `id` 可能不等于真实页面 ID）
- 写入建议从 `WIKI_MUTATIONS_ENABLED=false` + `WIKI_MUTATION_DRY_RUN=true` 开始。
- 需要真实写入时：先用 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` 收紧范围，再设置 `WIKI_MUTATION_DRY_RUN=false`。
- 写入会向 stderr 输出 audit 日志，建议在生产环境接入日志采集。

## 常见问题

- `Missing required environment variable: WIKI_*`：`.env` 或 MCP 客户端 `env` 配置缺失。
- `PageViewForbidden 6013`：检查 API Key 组权限与页面规则是否允许 `read:pages`/`read:source`。
- 能列出但 `content` 失败：通常缺少 `read:source` 权限/页面规则。
- GraphQL 不在 `/graphql`：按实际环境调整 `WIKI_GRAPHQL_PATH`。

## 权限说明（Wiki.js）

- 某些操作可能需要页面规则级别的 `manage:pages`/`delete:pages`。
- 读取 `content` 字段可能需要 `read:source`。
- 若出现 6013（`PageViewForbidden`），请检查 API key 所在组权限与页面规则。
