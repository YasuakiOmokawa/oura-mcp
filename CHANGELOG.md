# @yasuakiomokawa/oura-mcp

## 0.2.1

### Patch Changes

- 0216fdf: `/simplify` レビューでの一括修正。

  - exchangeCode に 10s timeout 追加
  - OAuth callback timer の clearTimeout
  - auth-manager で toTokenData 利用
  - log level をモジュール init で cache
  - tail-call only な async 除去
  - 不要 Promise.resolve wrapper 削除
  - buildEntry を defaultMcpEntry 集約
  - ハードコード 127.0.0.1 を定数化
  - What コメント整理

## 0.2.0

### Minor Changes

- 7b94f3a: `configure` ウィザードを再入力負担なく回せるよう改善。

  - 保存済み Client ID / Callback port を Step 1 でプリフィルし、Enter だけで確定可能に。Client Secret は Enter で「現在値を保持」、新しい値を打つと差し替え。
  - 完了後に `npx skills add YasuakiOmokawa/oura-mcp` で oura-api-skill (API リファレンス + recipes) を入れる手順を案内。
  - `--force` フラグで保存済み config / tokens を消してゼロから設定し直すモードを追加。`npx @yasuakiomokawa/oura-mcp configure --force` で起動。

  参考実装: `freee/freee-mcp` の cli ウィザード。

## 0.1.4

### Patch Changes

- 1799161: CI: switch the `changesets/action` step to use a Personal Access Token
  (`CHANGESETS_PAT`) instead of the default `GITHUB_TOKEN`. PAT-authored
  commits/PRs trigger downstream `pull_request` workflows, so `ci.yml` now
  runs automatically on the bot-created "chore: release packages" PR. This
  removes the manual empty-commit workaround that branch protection
  previously made necessary.

## 0.1.3

### Patch Changes

- 3b7832a: Migrate the release pipeline to `changesets/action`. Tag pushes are no
  longer required: merging a PR that contains `.changeset/*.md` to `main`
  makes the action open (or update) a "chore: release packages" PR with
  the version bump and CHANGELOG entry. Merging that PR triggers the
  action to run `npx changeset publish`, which performs `npm publish`
  with provenance and creates the matching git tag automatically. The
  workflow then publishes the same version to the MCP Registry via OIDC.

## 0.1.2

### Patch Changes

- `npx oura-mcp configure` now writes `mcpServers.oura` to `~/.claude.json`
  (the file Claude Code actually reads) instead of `~/.claude/settings.json`,
  and uses `<project>/.mcp.json` for project-level configuration. Earlier
  versions reported a successful integration but the server never appeared
  in `/mcp`.
- `release.yml` now calls `mcp-publisher login github-oidc`, removing the
  GitHub device-flow approval that previously blocked every tag push for
  several minutes.

## 0.1.1

### Patch Changes

- Switch the build hook from `prepare` to `prepublishOnly`. The previous setup
  invoked `tsc` (a devDependency) during every install, including registry
  installs from `npx`, which silently failed and prevented the bin link from
  being created. Symptom: `npx -y @yasuakiomokawa/oura-mcp configure` reported
  `sh: 1: oura-mcp: not found`. Tarball contents and runtime behavior are
  unchanged for users who already have a working install.

## 0.1.0

Initial release.

### Tools

- `oura_authenticate` — start the OAuth authorization flow in the user's browser.
- `oura_auth_status` — report current token state and expiry.
- `oura_clear_auth` — wipe stored tokens.
- `oura_api_list_paths` — list every supported `GET` endpoint with summaries.
- `oura_api_get` — generic `GET` to `/v2/...` with pagination via `max_pages` (1-20) or
  manual `next_token`.

### CLI

- `npx @yasuakiomokawa/oura-mcp configure` four-step wizard:
  credentials → browser OAuth → atomic save → MCP client integration.
- Auto-detects Claude Desktop, Claude Code (user / project), Cursor (user / project) and
  writes `mcpServers.oura` after backing the existing config up to `<file>.bak.<ISO-timestamp>`.
- Pre-flight write-permission check to avoid `EACCES` crashes.
- Idempotent re-runs save tokens only when credentials are unchanged.

### Security

- PKCE (S256) + cryptographic `state` validation on OAuth.
- Loopback HTTP listener bound to `127.0.0.1` only, redirect URI uses the `localhost`
  hostname to satisfy Oura's policy.
- Tokens and config persisted at `~/.config/oura-mcp/` with `0600` permissions, written
  atomically via tmp + rename.
- Secrets (`access_token`, `refresh_token`, `client_secret`, `code`, `code_verifier`)
  redacted from logs.
- All HTTP requests bounded by `AbortSignal.timeout` (30 s API, 10 s OAuth).
- Released to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).

### Skill

- `oura-api-skill` ships a per-endpoint reference (16 categories) generated from
  the Oura OpenAPI schema, plus three workflow recipes:
  - `weekly-review` — last 7 days summary.
  - `sleep-trend` — sleep score / structure analysis.
  - `recovery-check` — readiness verdict for training decisions.

### Infrastructure

- CI matrix: `ubuntu-latest`, `macos-latest` × Node 20, 22 with lint, typecheck,
  coverage thresholds (`src/auth/**` 100 %, `src/openapi/**` 100 %, `redact` 100 %,
  overall 87 %, branches 91 %), and `npm audit --audit-level=high`.
- Weekly cron + manual `workflow_dispatch` to refresh `references/*.md` from the
  upstream OpenAPI schema and open a PR.
- Tag-push release workflow: npm publish with provenance, npm propagation wait,
  then `mcp-publisher publish` for the MCP Registry.
- Dependabot enabled for npm and GitHub Actions.
