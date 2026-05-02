---
paths: ["src/index.ts", "src/mcp/**/*.ts"]
---

# MCP TypeScript SDK 規約

`@modelcontextprotocol/sdk` を使う際の必須ルール。設計書（`~/.claude/plans/oura-mcp-design.md`）の「MCP TypeScript SDK 実装ルール」と同期。

## stdio ロギング
- **`console.log` 禁止**（stdout は JSON-RPC 専用）
- ログは `console.error`（stderr）に出す
- 将来構造化ロガーを入れる場合も destination は `process.stderr` 固定

## ツール登録
`server.registerTool(name, definition, handler)` で以下を必ず宣言:
- `title`（人間可読タイトル）
- `description`（LLM 向けの一文）
- `inputSchema`（Zod スキーマ。各フィールドに `.describe()` 必須）
- `outputSchema`（structuredContent を返す場合）
- `annotations`（`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`）

## 結果オブジェクト
- 成功: `{ content: [...], structuredContent?: <JSON>, isError?: false }`
- ツール実行エラー（API 失敗・認証切れ等）: `{ content: [...], isError: true }`(**throw しない**)
- protocol error（入力スキーマ違反等）: throw → SDK が JSON-RPC error にラップ

## セキュリティ
- 外部からの path / URI は必ずバリデート（regex 一致 + `..` 拒否）
- ホスト名はクライアント指定を受け付けず、定数固定

## graceful shutdown
SIGINT / SIGTERM で transport を close。

## 例外: SDK の class
SDK の `McpServer` / `StdioServerTransport` 等は class 名で使う（外部 API のため、プロジェクト「クラス禁止」ルールの対象外）。
