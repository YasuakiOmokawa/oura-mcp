# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
During the `0.x` series, breaking changes are released as minor bumps.

## [0.1.2] - 2026-04-29

### Fixed

- `npx oura-mcp configure` now writes `mcpServers.oura` to `~/.claude.json`
  (the file Claude Code actually reads) instead of `~/.claude/settings.json`,
  and uses `<project>/.mcp.json` for project-level configuration. Earlier
  versions reported a successful integration but the server never appeared
  in `/mcp`.

### Changed

- `release.yml` now calls `mcp-publisher login github-oidc`, removing the
  GitHub device-flow approval that previously blocked every tag push for
  several minutes.

## [0.1.1] - 2026-04-29

### Fixed

- Switch the build hook from `prepare` to `prepublishOnly`. The previous setup
  invoked `tsc` (a devDependency) during every install, including registry
  installs from `npx`, which silently failed and prevented the bin link from
  being created. Symptom: `npx -y @yasuakiomokawa/oura-mcp configure` reported
  `sh: 1: oura-mcp: not found`. Tarball contents and runtime behavior are
  unchanged for users who already have a working install.

## [0.1.0] - 2026-04-29

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

[0.1.2]: https://github.com/YasuakiOmokawa/oura-mcp/releases/tag/v0.1.2
[0.1.1]: https://github.com/YasuakiOmokawa/oura-mcp/releases/tag/v0.1.1
[0.1.0]: https://github.com/YasuakiOmokawa/oura-mcp/releases/tag/v0.1.0
