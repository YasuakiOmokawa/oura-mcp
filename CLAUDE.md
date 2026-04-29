# oura-mcp プロジェクトルール

## コーディングスタイル

### クラス構文の禁止（カスタムエラーのみ例外）

TypeScript で書くがクラス構文は **原則使わない**。理由は以下の通り。

- `this` バインド事故をなくすため（コールバック・MCP ハンドラ等で頻繁に発生）
- 状態は closure に閉じ込め、外部から触れない設計を強制するため
- factory 関数 + 純粋関数の方がツリーシェイクとテストしやすいため

#### 採用パターン

| 用途 | パターン |
|---|---|
| 状態を持つマネージャ（auth manager、callback server 等） | factory 関数 + closure |
| インターフェース実装の差し替え（TokenStore 等） | `type` で interface 定義 + `create*` factory |
| ステートレス処理 | named export の純粋関数 |
| カスタムエラー | **`class X extends Error` のみ許容**（後述） |

#### 例

```ts
// ✅ factory + closure
export function createAuthManager(deps: { tokenStore: TokenStore; oauth: OauthClient }) {
  let inflightRefresh: Promise<Tokens> | null = null;
  return {
    getValidToken: () => { /* ... */ },
    clear: () => deps.tokenStore.clear(),
  };
}

// ✅ type + factory
export type TokenStore = {
  load: () => Promise<Tokens | null>;
  save: (t: Tokens) => Promise<void>;
  clear: () => Promise<void>;
};
export function createFileTokenStore(filePath: string): TokenStore {
  return {
    load: () => fs.promises.readFile(filePath, 'utf-8').then(JSON.parse),
    save: (t) => fs.promises.writeFile(filePath, JSON.stringify(t), { mode: 0o600 }),
    clear: () => fs.promises.unlink(filePath),
  };
}

// ❌ 使わない
export class AuthManager {
  private inflightRefresh: Promise<Tokens> | null = null;
  // ...
}
```

#### 例外: カスタムエラーは class を使う

`Error` の stack trace を JS エンジンが正しく生成するのは class 経由のため。`instanceof` 判定の clean さもメリット。

```ts
export class OuraApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`Oura API ${status}: ${body}`);
    this.name = 'OuraApiError';
  }
}
```

## 命名

- factory 関数: `create*`（例: `createAuthManager`, `createFileTokenStore`）
- ステートレス処理: 動詞ベース（例: `buildAuthorizeUrl`, `exchangeCode`, `refreshTokens`）
- 型: PascalCase の `type`（`interface` ではなく `type` 統一）

## MCP TypeScript SDK 規約

`@modelcontextprotocol/sdk` を使う際の必須ルール。設計書（`~/.claude/plans/oura-mcp-design.md`）の「MCP TypeScript SDK 実装ルール」と同期。

### stdio ロギング
- **`console.log` 禁止**（stdout は JSON-RPC 専用）
- ログは `console.error`（stderr）に出す
- 将来構造化ロガーを入れる場合も destination は `process.stderr` 固定

### ツール登録
`server.registerTool(name, definition, handler)` で以下を必ず宣言:
- `title`（人間可読タイトル）
- `description`（LLM 向けの一文）
- `inputSchema`（Zod スキーマ。各フィールドに `.describe()` 必須）
- `outputSchema`（structuredContent を返す場合）
- `annotations`（`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`）

### 結果オブジェクト
- 成功: `{ content: [...], structuredContent?: <JSON>, isError?: false }`
- ツール実行エラー（API 失敗・認証切れ等）: `{ content: [...], isError: true }`（**throw しない**）
- protocol error（入力スキーマ違反等）: throw → SDK が JSON-RPC error にラップ

### セキュリティ
- 外部からの path / URI は必ずバリデート（regex 一致 + `..` 拒否）
- ホスト名はクライアント指定を受け付けず、定数固定

### graceful shutdown
SIGINT / SIGTERM で transport を close。

### 例外: SDK の class
SDK の `McpServer` / `StdioServerTransport` 等は class 名で使う（外部 API のため、プロジェクト「クラス禁止」ルールの対象外）。

## セキュリティ規約（MCP / OAuth 2.1 ベストプラクティス準拠）

設計書（`~/.claude/plans/oura-mcp-design.md`）の「セキュリティ」セクションと同期。違反は PR ブロック対象。

### 認証
- **PKCE S256 必須**。`code_verifier` は `crypto.randomBytes(32)` の base64url、`code_challenge` は SHA-256
- **`state` 必須**。`crypto.randomUUID()` で生成、callback 受信時に `crypto.timingSafeEqual` で完全一致検証
- redirect URI は **完全一致** で `http://127.0.0.1:54321/callback` 固定（`localhost` ではなく `127.0.0.1`）

### トークン保管
- ファイル `0600` パーミッション必須
- 書き込みは atomic（一時ファイル → rename）
- メモリ上は closure 内、グローバル変数禁止
- `expires_at - 60s` で自動 refresh、inflight Promise キャッシュで二重発行防止

### 機密情報
- **`access_token` / `refresh_token` / `client_secret` / `code` / `code_verifier` をログ出力禁止**
- `utils/redact.ts` ヘルパで `***` に置換してからログ
- error message も redact 経由

### ネットワーク
- API base URL は **定数固定** (`https://api.ouraring.com`)、caller 指定ホスト不許可
- 全 `fetch` に `AbortSignal.timeout(30_000)`（OAuth トークン交換は 10 秒）
- `User-Agent: oura-mcp/<version> (MCP Server; stdio; +<repo URL>)` を付与

### 入力
- 外部入力 path / URI は regex 一致 + `..` / `\\` / null byte / 改行を拒否
- params は string / number のみ許可
- スキーマ違反は throw（protocol error にラップ）、API 失敗は `isError: true`

### Supply chain
- `npm publish --provenance` で sigstore 署名
- `prepare` script で build しない（`prepublishOnly` で build）
- `npm audit --audit-level=high` を CI でゲート

## TypeScript 編集後のチェック

ユーザーグローバルルール（~/.claude/rules/typescript-coding.md）に従う。

- 編集後: `yarn eslint <file_name> --fix` 実行（または `bun run check`）
- `try-catch` 禁止、`then-catch` 使用
- `async/await` は必要最小限

## リリースフロー（changesets 必須）

**ユーザーに見える変更（バグ fix / feature / breaking change）を含む PR を作る時は必ず changeset を同梱する。**
docs only / CI only / 内部リファクタは除外可（その場合も判断つかなければ作る）。

### 手順

1. 変更ブランチで `npx changeset` を実行（または `.changeset/<name>.md` を手書き）
   - `@yasuakiomokawa/oura-mcp` を選択
   - `patch` / `minor` / `major` を選択（0.x 期間中は breaking でも minor）
   - 変更概要を 1〜2 段落で書く
2. 生成された `.changeset/<name>.md` を一緒にコミット
3. PR マージ後、リリース時は **main で** 以下を実行:

```bash
npx changeset version          # version bump + CHANGELOG 自動追記 + .changeset/*.md 消費
git add . && git commit -m "release: vX.Y.Z"
git push
git tag vX.Y.Z && git push origin vX.Y.Z   # release.yml が npm + MCP Registry に publish
```

### CHANGELOG.md フォーマット規約

- changesets-native 形式（`# @yasuakiomokawa/oura-mcp` → `## X.Y.Z` → `### Patch/Minor/Major Changes`）を維持する
- 手で intro paragraph や Keep a Changelog 形式の link references を入れない
  （`npx changeset version` の挿入位置が壊れて毎回手修正が必要になるため）

### バージョニング

- `0.x.y`: breaking change を **minor バンプで許容**（npm 慣習）
- `1.x.y`: breaking change は major バンプ必須

## Git 運用

- **`main` に直接 push 禁止**。`git push --force` は当然ダメ、通常の `git push` も含めて NG。
  - 例外なし。release commit / CHANGELOG 整形 / CLAUDE.md 更新といった "メタ系" でも feature branch + PR + squash merge を必ず通す。
  - 唯一の例外は `git tag vX.Y.Z && git push origin vX.Y.Z`（タグだけは main 上で打って push する）。
- 既に push 済みのコミットを書き換えたい場合は revert commit を積む（amend / rebase / force push 全部禁止）。
