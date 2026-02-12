# requarks-wiki-mcp

[Wiki.js](https://js.wiki/) インスタンスをナレッジベースのように扱える MCP サーバーです。

主な機能:

- RAG 風ワークフロー向けのページ検索/一覧
- パスまたはページ ID で本文取得
- 明示的な安全ガード付きのページ作成/更新（任意）

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

# 変更系はデフォルト無効
WIKI_MUTATIONS_ENABLED=false
WIKI_MUTATION_CONFIRM_TOKEN=CONFIRM_UPDATE
WIKI_MUTATION_DRY_RUN=true
# カンマ区切りのパスプレフィックス（先頭 / なし、空なら制限なし）
WIKI_ALLOWED_MUTATION_PATH_PREFIXES=
```

環境変数リファレンス:

| 変数                                  | 必須   | デフォルト       | 説明                                                   |
| ------------------------------------- | ------ | ---------------- | ------------------------------------------------------ |
| `WIKI_BASE_URL`                       | はい   | -                | Wiki.js のベース URL（例: `https://wiki.example.com`） |
| `WIKI_API_TOKEN`                      | はい   | -                | `Authorization: Bearer ...` で使う API キー JWT        |
| `WIKI_GRAPHQL_PATH`                   | いいえ | `/graphql`       | `WIKI_BASE_URL` に連結される GraphQL パス              |
| `WIKI_DEFAULT_LOCALE`                 | いいえ | `en`             | 入力で locale 未指定時に使うデフォルト locale          |
| `WIKI_DEFAULT_EDITOR`                 | いいえ | `markdown`       | ページ作成時のデフォルト editor                        |
| `WIKI_MUTATIONS_ENABLED`              | いいえ | `false`          | `true` で書き込みツールを有効化                        |
| `WIKI_MUTATION_CONFIRM_TOKEN`         | いいえ | `CONFIRM_UPDATE` | 変更系呼び出しで必要な `confirm` 値                    |
| `WIKI_MUTATION_DRY_RUN`               | いいえ | `true`           | `true` の場合はプレビューのみ返却し実書き込みしない    |
| `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` | いいえ | `` (空)          | 変更を許可するパスプレフィックス（カンマ区切り）       |

Wiki.js の前提条件（GraphQL + API キー）:

- この MCP は内部で Wiki.js GraphQL を利用します。
- Wiki.js 管理画面の `Administration -> API` で API を有効化してください。
- API キーを発行し、`WIKI_API_TOKEN` に設定してください。

## クイックスタート（チェックリスト）

- Wiki.js: `Administration -> API` -> API を有効化
- API キーを作成して `WIKI_API_TOKEN` を用意
- このプロジェクトで `npm install` -> `npm run build`
- MCP クライアントに `~/.mcp.json` を追加
- 初回テスト: `wikijs_search_pages` -> 返ってきた `path` を `wikijs_get_page_by_path` に渡す

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
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

ローカル/開発向け（パッケージをインストールせず dist を直接実行）:

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
        "WIKI_ALLOWED_MUTATION_PATH_PREFIXES": ""
      }
    }
  }
}
```

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

読み取りツール:

- `wikijs_search_pages`
- `wikijs_list_pages`
- `wikijs_get_page_by_path`
- `wikijs_get_page_by_id`

書き込みツール（`WIKI_MUTATIONS_ENABLED=true` のときのみ）:

- `wikijs_create_page`
- `wikijs_update_page`

変更系ツールは `confirm` が `WIKI_MUTATION_CONFIRM_TOKEN` と一致する必要があります。
`WIKI_MUTATION_DRY_RUN=true` の場合はプレビューのみで更新しません。
`WIKI_ALLOWED_MUTATION_PATH_PREFIXES` を設定すると、その範囲にのみ書き込みを制限します。

## 利用シナリオ（ユーザー行動シミュレーション）

シナリオ 1) エラー原因の調査（RAG スタイル）

- ユーザー依頼: 「Kotlin の `CancellationException` 関連ドキュメントを探して要点をまとめて」
- MCP 呼び出し順: `wikijs_search_pages(query="kotlin cancellationexception")` -> `wikijs_get_page_by_path(path=検索結果.path)`
- 結果: 関連ページを検索し、本文を取得して原因/対処を要約できる。

シナリオ 2) 最近更新された文書の確認

- ユーザー依頼: 「最近更新された文書を上位 20 件見せて」
- MCP 呼び出し順: `wikijs_list_pages(limit=20, locale="en")`
- 結果: `path/title/updatedAt` をもとに更新レポートを作成できる。

シナリオ 3) ページ ID 指定の直接参照

- ユーザー依頼: 「ページ ID 7283 を読んで TODO だけ抽出して」
- MCP 呼び出し順: `wikijs_get_page_by_id(id=7283)`
- 結果: 特定ページの本文を直接取得し、必要情報のみ抽出できる。

シナリオ 4) 安全な事前確認つきページ作成

- ユーザー依頼: 「`sandbox` にデプロイチェックリストを作って」
- MCP 呼び出し順（確認）: `wikijs_create_page(..., confirm=token)` with `WIKI_MUTATION_DRY_RUN=true`
- MCP 呼び出し順（反映）: 同じ呼び出し with `WIKI_MUTATION_DRY_RUN=false`
- 結果: まずプレビュー確認し、その後 `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` の範囲内で本番作成。

## 運用のヒント

- RAG では `id` より `path` ベースの取得（`wikijs_get_page_by_path`）を優先してください。（検索結果の `id` がページ ID と一致しない場合があります）
- 書き込みは `WIKI_MUTATIONS_ENABLED=false` と `WIKI_MUTATION_DRY_RUN=true` から始めるのがおすすめです。
- 実書き込みが必要になったら、まず `WIKI_ALLOWED_MUTATION_PATH_PREFIXES` で範囲を絞り、その後 `WIKI_MUTATION_DRY_RUN=false` に切り替えてください。
- 変更系の試行は stderr に audit ログが出るため、運用ではログ収集（例: systemd/journald, docker logs）を有効にしておくと安全です。

## トラブルシューティング

- `Missing required environment variable: WIKI_*`: `.env` または MCP クライアント設定の `env` が不足しています。
- `PageViewForbidden 6013`: API キーグループ権限とページルールで `read:pages`/`read:source` が許可されているか確認してください。
- リストは取れるのに `content` だけ失敗: 多くの場合 `read:source` の権限/ページルール不足です。
- GraphQL が `/graphql` 以外: `WIKI_GRAPHQL_PATH` を環境に合わせて変更してください。

## 権限メモ（Wiki.js）

- 一部操作ではページルール側で `manage:pages`/`delete:pages` が必要になる場合があります。
- `content` の読み取りには `read:source` が必要な場合があります。
- 6013（`PageViewForbidden`）が出る場合は API キーグループ権限とページルールを確認してください。
