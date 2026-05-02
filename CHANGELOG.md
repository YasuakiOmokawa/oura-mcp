# @yasuakiomokawa/oura-mcp

## 0.2.2

### Patch Changes

- 6aa264d: devDep: bump typescript from 5.9 to 6.0.3

## 0.2.1

### Patch Changes

- 0216fdf: Batch fixes from `/simplify` review.

  - Added 10s timeout to exchangeCode
  - clearTimeout for OAuth callback timer
  - auth-manager now uses toTokenData
  - Cache log level at module init
  - Remove tail-call-only async functions
  - Drop unnecessary Promise.resolve wrappers
  - Consolidate buildEntry into defaultMcpEntry
  - Extract hardcoded 127.0.0.1 into a constant
  - Clean up What-style comments

## 0.2.0

### Minor Changes

- 7b94f3a: Streamline the `configure` wizard so it can be re-run without re-entering everything.

  - Step 1 now pre-fills the saved Client ID and callback port, so a bare Enter is enough to keep them. For Client Secret, Enter keeps the current value; typing a new one replaces it.
  - On completion, the wizard suggests `npx skills add YasuakiOmokawa/oura-mcp` to install oura-api-skill (API reference + recipes).
  - Added a `--force` flag that wipes saved config / tokens and starts the wizard from scratch. Invoke with `npx @yasuakiomokawa/oura-mcp configure --force`.

  Reference implementation: the CLI wizard in `freee/freee-mcp`.

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
