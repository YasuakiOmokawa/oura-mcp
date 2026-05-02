# oura-mcp プロジェクトルール

詳細ルールは `.claude/rules/*.md` に paths-scoped で分離。該当ファイルを編集する時に自動で読み込まれる。

| rule | 発火条件 |
|---|---|
| `no-class-syntax.md` | `src/` `test/` `scripts/` の `*.ts` 編集時 |
| `mcp-sdk.md` | `src/index.ts` `src/mcp/` 編集時 |
| `release.md` | `.changeset/` `CHANGELOG.md` `package.json` 編集時 |

## 言語

コメント・ドキュメントは **英語** で書く。例外: `CLAUDE.md` と `.claude/rules/*.md` のみ日本語可（人間が読みやすさ優先）。changeset 本文も英語。

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

### 自分の PR を merge する時は `--admin --squash`
- main の branch protection は `required_approving_review_count: 1` + `enforce_admins: false`
- 自分の PR は self-approve 不可なので、`gh pr merge --auto --squash` で予約しても `mergeStateStatus: BLOCKED` で fire しない（**auto-merge は admin bypass しない**仕様）
- 自分の PR は **CI 通過を確認してから `gh pr merge --admin --squash <num>`** で merge する（admin bypass で要件無視）
- bot PR の扱い:
  - **release PR**（changesets/action）: `release.yml` 内で `github-actions[bot]` が auto-approve するため止まらない
  - **Dependabot PR / その他**: 手動で `gh pr review --approve <num>` してから merge
