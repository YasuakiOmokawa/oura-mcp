# oura-mcp プロジェクトルール

詳細ルールは `.claude/rules/*.md` に paths-scoped で分離。該当ファイルを編集する時に自動で読み込まれる。

| rule | 発火条件 |
|---|---|
| `no-class-syntax.md` | `src/` `test/` `scripts/` の `*.ts` 編集時 |
| `mcp-sdk.md` | `src/index.ts` `src/mcp/` 編集時 |
| `security.md` | `src/auth/` `src/server/` `src/api/` `src/utils/redact.ts` `src/utils/atomic-write.ts` 編集時 |
| `release.md` | `.changeset/` `CHANGELOG.md` `package.json` 編集時 |

## 命名

- factory 関数: `create*`（例: `createAuthManager`, `createFileTokenStore`）
- ステートレス処理: 動詞ベース（例: `buildAuthorizeUrl`, `exchangeCode`, `refreshTokens`）
- 型: PascalCase の `type`（`interface` ではなく `type` 統一）

## TypeScript 編集後のチェック

lint は biome (`npm run lint:fix`)。user global rule の `yarn eslint` は適用外（biome を使うため）。

## ハマりどころメモ

### bot 作成 PR は CI が走らない（GITHUB_TOKEN の anti-recursion）
- `changesets/action` / `peter-evans/create-pull-request` 等が GITHUB_TOKEN で作る PR には `pull_request` トリガーの ci.yml が fire しない
- 回避策:
  - 暫定: bot PR ブランチに空コミットを手動 push（`git commit --allow-empty -m "trigger ci" && git push`）
  - 恒久: secrets に PAT を登録、action の env で `GITHUB_TOKEN: ${{ secrets.PAT }}` を上書き
- 理由: GitHub の anti-recursion 仕様で default 無効、設定で変えられない。branch protection で必須 status checks が設定済みだと bot PR がマージできず詰まる
