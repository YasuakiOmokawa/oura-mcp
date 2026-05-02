---
paths: ["src/auth/**/*.ts", "src/server/**/*.ts", "src/api/**/*.ts", "src/utils/redact.ts", "src/utils/atomic-write.ts"]
---

# セキュリティ規約（MCP / OAuth 2.1 ベストプラクティス準拠）

設計書（`~/.claude/plans/oura-mcp-design.md`）の「セキュリティ」セクションと同期。違反は PR ブロック対象。

## 認証
- **PKCE S256 必須**。`code_verifier` は `crypto.randomBytes(32)` の base64url、`code_challenge` は SHA-256
- **`state` 必須**。`crypto.randomUUID()` で生成、callback 受信時に `crypto.timingSafeEqual` で完全一致検証
- redirect URI は **完全一致** で `http://127.0.0.1:54321/callback` 固定（`localhost` ではなく `127.0.0.1`）

## トークン保管
- ファイル `0600` パーミッション必須
- 書き込みは atomic（一時ファイル → rename）
- メモリ上は closure 内、グローバル変数禁止
- `expires_at - 60s` で自動 refresh、inflight Promise キャッシュで二重発行防止

## 機密情報
- **`access_token` / `refresh_token` / `client_secret` / `code` / `code_verifier` をログ出力禁止**
- `utils/redact.ts` ヘルパで `***` に置換してからログ
- error message も redact 経由

## ネットワーク
- API base URL は **定数固定** (`https://api.ouraring.com`)、caller 指定ホスト不許可
- 全 `fetch` に `AbortSignal.timeout(30_000)`（OAuth トークン交換は 10 秒）
- `User-Agent: oura-mcp/<version> (MCP Server; stdio; +<repo URL>)` を付与

## 入力
- 外部入力 path / URI は regex 一致 + `..` / `\\` / null byte / 改行を拒否
- params は string / number のみ許可
- スキーマ違反は throw（protocol error にラップ）、API 失敗は `isError: true`

## Supply chain
- `npm publish --provenance` で sigstore 署名
- `prepare` script で build しない（`prepublishOnly` で build）
  - 理由: `prepare` は registry install / `npx` でも条件付きで発火し、tsc などの devDep が本番 install で入らないため silent fail。bin link が作られず "command not found" になる
- `npm audit --audit-level=high` を CI でゲート
