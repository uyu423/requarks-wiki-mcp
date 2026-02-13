# requarks-wiki-mcp

[Wiki.js](https://js.wiki/) インスタンスをナレッジベースのように扱える MCP サーバーです。

主な機能:

- **29 個のツール**（読み取り 19 個 + 書き込み 10 個）で、ページ、コメント、タグ、アセット、ユーザー、ナビゲーション、システム情報をカバー
- RAG 風ワークフロー向けのページ検索、一覧、ブラウジング
- パスまたはページ ID で本文取得、バージョン履歴の閲覧と以前のバージョンへの復元
- ページツリー、ページリンクグラフ、ナビゲーション構造によるサイト階層のブラウジング
- 完全なコメントシステム: ページ上のコメントの一覧表示、読み取り、作成、更新、削除
- メディアファイル検索のためのアセットとフォルダーのブラウジング
- ユーザーコンテキスト: 現在のユーザープロフィールとユーザー検索
- システム診断: バージョン情報、サイト設定、ナビゲーションツリー
- タグ管理: タグの一覧表示、検索、更新、削除
- 明示的な安全ガード付きのページ作成/更新/削除/移動/復元ツール（任意）
- 組み込みリソース: Markdown 構文ガイドと API 権限ガイド
- LLM にとって分かりやすいエラーメッセージを持つ型付きエラー分類
- タイムアウト、指数バックオフリトライ、リクエスト相関を備えた GraphQL クライアント
- セキュリティ強化: 機密フィールドのフィルタリング、URL バリデーション、入力長制限

## 要件

- Node.js 20+
- 到達可能な Wiki.js ホスト
- 適切な権限を持つ Wiki.js API キー（JWT）

## セットアップ

```bash
cp .env.example .env
npm install
```

`.env` 設定例:

```env
WIKI_BASE_URL=https://your-wiki-hostname
WIKI_API_TOKEN=your_wikijs_api_key_jwt
WIKI_GRAPHQL_PATH=/graphql
WIKI_DEFAULT_LOCALE=en
WIKI_DEFAULT_EDITOR=markdown

# 変更系の操作はデフォルトで無効
WIKI_MUTATIONS_ENABLED=false
# 書き込みツール用の追加安全ゲート（任意）。設定時、書き込みツールは一致する confirm が必要
WIKI_MUTATION_CONFIRM_TOKEN=
WIKI_MUTATION_DRY_RUN=true
# カンマ区切りのパスプレフィックス（先頭 / なし、空なら制限なし）
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=

# HTTP 回復性
WIKI_HTTP_TIMEOUT_MS=15000
WIKI_HTTP_MAX_RETRIES=2
```

環境変数リファレンス:

| 変数                                  | 必須   | デフォルト | 説明                                                                                              |
| ------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `WIKI_BASE_URL`                       | はい   | -          | Wiki.js のベース URL（例: `https://wiki.example.com`）                                            |
| `WIKI_API_TOKEN`                      | はい   | -          | `Authorization: Bearer ...` で使用する Wiki.js API キー JWT                                        |
| `WIKI_GRAPHQL_PATH`                   | いいえ | `/graphql` | `WIKI_BASE_URL` に追加される GraphQL エンドポイントパス                                           |
| `WIKI_DEFAULT_LOCALE`                 | いいえ | `en`       | ツール入力で locale が指定されない場合に使用されるデフォルトロケール                              |
| `WIKI_DEFAULT_EDITOR`                 | いいえ | `markdown` | ページ作成時に指定されない場合に使用されるデフォルトエディター                                    |
| `WIKI_MUTATIONS_ENABLED`              | いいえ | `false`    | `true` に設定すると、すべての書き込みツール（ページ、コメント、タグの変更）が有効になります       |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | いいえ | `` (空)    | 追加の安全ゲート（任意）。設定時、書き込みツールの呼び出しで一致する `confirm` を提供する必要あり |
| `WIKI_MUTATION_DRY_RUN`               | いいえ | `true`     | `true` の場合、変更ツールはプレビューのみを返し、Wiki.js には書き込みません                       |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | いいえ | `` (空)    | 変更を許可するパスプレフィックス（先頭スラッシュなし）のカンマ区切り。空は制限なしを意味します    |
| `WIKI_HTTP_TIMEOUT_MS`                | いいえ | `15000`    | HTTP リクエストのタイムアウト（ミリ秒、本文読み込みを含む）。最小値 1                             |
| `WIKI_HTTP_MAX_RETRIES`               | いいえ | `2`        | 一時的な読み取り失敗（408, 502-504）の最大リトライ回数。変更操作はリトライされません。最小値 0    |

Wiki.js の前提条件（GraphQL + API キー）:

- この MCP は内部で Wiki.js GraphQL を使用します。
- Wiki.js 管理画面で `Administration -> API` に移動し、API アクセスを有効にしてください。
- API キーを作成し、`WIKI_API_TOKEN` として設定してください。

## MCP クライアント設定例 (`~/.mcp.json`)

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

## ローカルパス経由での MCP 登録（npm publish なし）

npm から公開/インストールせずに、ローカルプロジェクトパスから直接この MCP サーバーを登録できます。

1. このリポジトリでビルドする

```bash
npm install
npm run build
```

2. `~/.mcp.json` にローカルの絶対パスを登録する

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

注意:

- 常に絶対パスを使用してください。
- コード変更後は `npm run build` を再実行して `dist/index.js` を最新に保ってください。

## 実行

開発:

```bash
npm run dev
```

ビルド + 実行:

```bash
npm run build
npm start
```

## MCP ツール

### 読み取りツール（19 個）

**ページ:**

| ツール                    | 説明                                          |
| ------------------------- | --------------------------------------------- |
| `wikijs_search_pages`     | Wiki ページ全体でフルテキスト検索を実行       |
| `wikijs_list_pages`       | ロケールフィルターと制限付きでページを一覧表示 |
| `wikijs_get_page_by_path` | パス + ロケールで完全なページコンテンツを取得 |
| `wikijs_get_page_by_id`   | 数値 ID で完全なページコンテンツを取得        |
| `wikijs_get_page_tree`    | サイト階層をブラウズ（フォルダー、ページ、または両方） |
| `wikijs_get_page_history` | ページの編集履歴を表示                        |
| `wikijs_get_page_version` | 特定バージョンの完全なコンテンツを取得        |
| `wikijs_get_page_links`   | ページリンク関係を取得（ナレッジグラフ）      |

**タグ:**

| ツール                 | 説明                                           |
| ---------------------- | ---------------------------------------------- |
| `wikijs_list_tags`     | コンテンツ分類検索用のすべてのタグを一覧表示   |
| `wikijs_search_tags`   | クエリ文字列に一致するタグを検索               |

**コメント:**

| ツール                  | 説明                                      |
| ----------------------- | ----------------------------------------- |
| `wikijs_list_comments`  | パスとロケールでページのすべてのコメントを一覧表示 |
| `wikijs_get_comment`    | ID で単一のコメントを取得                 |

**システムとナビゲーション:**

| ツール                     | 説明                                           |
| -------------------------- | ---------------------------------------------- |
| `wikijs_get_system_info`   | Wiki.js バージョン、データベースタイプ、使用統計 |
| `wikijs_get_navigation`    | ナビゲーションツリー構造                       |
| `wikijs_get_site_config`   | サイト設定（機密フィールド以外）               |

**アセット:**

| ツール                       | 説明                                       |
| ---------------------------- | ------------------------------------------ |
| `wikijs_list_assets`         | フォルダーと種類フィルター付きでアセットを一覧表示 |
| `wikijs_list_asset_folders`  | アセットフォルダーを一覧表示               |

**ユーザー:**

| ツール                    | 説明                                   |
| ------------------------- | -------------------------------------- |
| `wikijs_get_current_user` | 現在認証されている API ユーザーのプロフィールを取得 |
| `wikijs_search_users`     | 名前またはメールでユーザーを検索       |

### 書き込みツール（10 個、`WIKI_MUTATIONS_ENABLED=true` でない限り無効）

**ページの変更:**

| ツール                 | 説明                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `wikijs_create_page`   | コンテンツ、タグ、メタデータを含む新しいページを作成                 |
| `wikijs_update_page`   | ID で既存のページを更新                                              |
| `wikijs_delete_page`   | ID でページを削除。`manage:pages` または `delete:pages` が必要な場合あり |
| `wikijs_move_page`     | ページを新しいパスまたはロケールに移動/名前変更                      |
| `wikijs_restore_page`  | ページを以前のバージョンに復元                                       |

**コメントの変更:**

| ツール                  | 説明                       |
| ----------------------- | -------------------------- |
| `wikijs_create_comment` | ページにコメントを作成     |
| `wikijs_update_comment` | ID で既存のコメントを更新  |
| `wikijs_delete_comment` | ID でコメントを削除        |

**タグの変更:**

| ツール              | 説明                           |
| ------------------- | ------------------------------ |
| `wikijs_update_tag` | タグのスラッグとタイトルを更新 |
| `wikijs_delete_tag` | すべてのページからタグを削除   |

### 変更の安全性

- `WIKI_MUTATION_CONFIRM_TOKEN` が設定されている場合、変更ツールには一致する `confirm` 引数が必要です。
- `WIKI_MUTATION_DRY_RUN=true` の場合、書き込みツールはプレビューを返し、Wiki.js を変更しません。
- `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` が設定されている場合、ページおよびコメント作成の変更はそれらのパスプレフィックスに制限されます。
- すべての変更試行は構造化された監査行を stderr に書き込みます。

## MCP リソース

| リソース URI                     | 説明                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `wikijs://markdown-guide`        | ページの作成と更新を目的とした Wiki.js Markdown 構文ガイド（CommonMark/GFM + Wiki.js 固有の拡張機能）          |
| `wikijs://api-permissions-guide` | 権限エラーを自己診断するための Wiki.js API 権限モデル、エラーコード、API キー設定ガイド                        |

## 権限メモ（Wiki.js）

Wiki.js の権限動作は API キーにとって意外な場合があります。特に:

- 一部の操作では、ページルールレベルで `manage:pages`/`delete:pages` ルールが必要な場合があります。
- `content` の読み取りには、スキーマ/フィールドレベルのチェックに応じて `read:source` が必要な場合があります。
- コメント操作には `read:comments`、`write:comments`、または `manage:comments` が必要です。
- システム情報とナビゲーションには管理者レベルの API キー権限が必要です。

一般的なエラーコード:

| コード | 意味                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| 6013   | `PageViewForbidden` — `read:pages`/`read:source` のグループ権限 + ページルールを確認   |
| 6003   | ページが存在しません                                                                   |
| 8002   | `CommentPostForbidden`                                                                 |
| 8003   | `CommentNotFound`                                                                      |
| 8004   | `CommentViewForbidden`                                                                 |
| 8005   | `CommentManageForbidden`                                                               |

詳細については、`wikijs://api-permissions-guide` リソースをお読みください。

## 推奨される最小 API キー権限

読み取り中心のナレッジベース用途の場合:

- `read:pages`、`read:source`
- `read:comments`（コメントのブラウジング用）
- 意図したパス/ロケールに対してこれらの権限を許可するページルール

書き込みワークフロー用の場合:

- `write:pages`（作成と更新）
- `manage:pages` または `delete:pages`（削除/移動操作用）
- `write:comments`、`manage:comments`（コメントの変更用）
- `manage:system`（タグ管理用）

## セキュリティガイダンス

- API トークンはサーバー側でのみ保管してください。
- 読み取り専用権限から始めてください。
- 更新が必要でない限り、`WIKI_MUTATIONS_ENABLED=false` のままにしてください。
- 追加の強化（任意）: 強力なランダムな `WIKI_MUTATION_CONFIRM_TOKEN` を設定し、書き込み呼び出しに一致する `confirm` を渡してください。
- 実際の書き込みの準備ができるまで、`WIKI_MUTATION_DRY_RUN=true` のままにしてください。
- `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` を使用して書き込み範囲を制限してください。
- `wikijs_get_system_info` はデフォルトで機密インフラストラクチャフィールド（dbHost、configFile など）をフィルタリングします。
- ページ作成/更新の `scriptJs`/`scriptCss` フィールドは長さ制限（10,000 文字）があり、ブラウザー実行警告が含まれます。
