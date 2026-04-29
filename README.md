# oura-mcp

[![CI](https://github.com/YasuakiOmokawa/oura-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/YasuakiOmokawa/oura-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@yasuakiomokawa/oura-mcp.svg)](https://www.npmjs.com/package/@yasuakiomokawa/oura-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Model Context Protocol server for the [Oura Ring API v2](https://cloud.ouraring.com/v2/docs). Exposes sleep, activity, readiness, heart rate, and workout data to MCP-compatible clients (Claude Desktop, Claude Code, Cursor, ...) via OAuth.

## Quick start

```bash
npx @yasuakiomokawa/oura-mcp configure
```

The wizard collects your Oura Client ID/Secret, walks through browser OAuth, saves tokens to `~/.config/oura-mcp/`, and adds an `mcpServers.oura` entry to any detected MCP client config. Restart the client and the tools below are available.

Re-running `configure` pre-fills the saved Client ID / port so you only need to press Enter to keep them. Type `--force` to wipe saved state and start from scratch:

```bash
npx @yasuakiomokawa/oura-mcp configure --force
```

## Prerequisites

1. Register an Oura developer app at https://cloud.ouraring.com/oauth/applications
2. **Redirect URI must be exactly**: `http://localhost:54321/callback`
   (or `http://localhost:<port>/callback` if you customize `OURA_CALLBACK_PORT`)
3. Enable the read scopes you need (Email, Personal info, Daily activity, Heart rate, Workout, Tag, Session, SpO2, Ring configuration, Stress, Heart health)
4. Note the Client ID and Client Secret — you'll enter them in `npx @yasuakiomokawa/oura-mcp configure`

## Installation

Three paths depending on your client:

**1. MCP Registry (auto-discovery clients)**

Once published to the [official MCP Registry](https://github.com/modelcontextprotocol/registry), supported clients can install `io.github.YasuakiOmokawa/oura-mcp` from their UI. The wizard step still has to run once to obtain OAuth tokens.

**2. Manual config (Claude Desktop / Claude Code / Cursor)**

Run `npx @yasuakiomokawa/oura-mcp configure` — Step 4 of the wizard auto-detects:

- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- Claude Code (user): `~/.claude.json`
- Claude Code (project): `./.mcp.json`
- Cursor (user): `~/.cursor/mcp.json`
- Cursor (project): `./.cursor/mcp.json`

Each detected file is backed up to `<file>.bak.<ISO-timestamp>` before an atomic write.

To configure manually, add to your client config:

```json
{
  "mcpServers": {
    "oura": {
      "command": "npx",
      "args": ["-y", "@yasuakiomokawa/oura-mcp"]
    }
  }
}
```

**3. Skill (optional)**

The companion [`oura-api-skill`](skills/oura-api-skill/SKILL.md) ships per-endpoint reference and three workflow recipes (weekly review / sleep trend / recovery check). Bundle it as a Claude Code plugin or import into your skills directory.

## Tools provided

| Tool | Purpose |
|---|---|
| `oura_authenticate` | Start OAuth flow in browser; returns the URL. Used after `refresh_token` expires. |
| `oura_auth_status` | Check current token validity and expiry. |
| `oura_clear_auth` | Wipe stored tokens. |
| `oura_api_list_paths` | List every supported `GET` endpoint with summaries. |
| `oura_api_get` | Generic `GET` to `/v2/...`. Auto-paginates via `max_pages` (1-20) or accepts `next_token` in `params`. |

`oura_api_get` returns `structuredContent` with `{ status, data, next_token, pages_fetched, has_more }`.

## Configuration

Two ways, env vars take precedence over the config file:

```bash
# Option A — env vars (set both together)
OURA_CLIENT_ID=...
OURA_CLIENT_SECRET=...
OURA_CALLBACK_PORT=54321  # optional

# Option B — config file (managed by the wizard)
~/.config/oura-mcp/config.json   # 0600
~/.config/oura-mcp/tokens.json   # 0600
```

`config.json` schema:

```json
{
  "schemaVersion": 1,
  "clientId": "...",
  "clientSecret": "...",
  "callbackPort": 54321
}
```

## Troubleshooting

- **"refresh_token expired"** — run `oura_authenticate` (in chat) or `npx @yasuakiomokawa/oura-mcp configure` (in terminal).
- **Port 54321 already in use** — set `OURA_CALLBACK_PORT=<other port>` and update the redirect URI in your Oura developer app to match.
- **"Path not found"** — verify the path with `oura_api_list_paths`. Common slips: missing `/v2/` prefix, typo in `daily_sleep`.
- **Setup hangs at "Waiting for authorization"** — you haven't approved in the browser yet, or the authorize page was opened in a different browser session than the one with localhost reachability.
- **No log output** — set `OURA_LOG_LEVEL=debug` for verbose stderr logging.

## Security

- PKCE (S256) + cryptographic `state` validation on the OAuth flow.
- Tokens stored at `~/.config/oura-mcp/tokens.json` with `0600` permissions, written atomically.
- Secrets (`access_token`, `refresh_token`, `client_secret`, `code`, `code_verifier`) are redacted from logs via `utils/redact.ts`.
- Network: `User-Agent: oura-mcp/<version>`, all requests use `AbortSignal.timeout` (30 s API / 10 s OAuth).
- Local callback listener binds `127.0.0.1:54321` only; redirect URI uses the loopback name `localhost` for Oura compatibility.
- Released to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).

## Development

```bash
git clone https://github.com/YasuakiOmokawa/oura-mcp.git
cd oura-mcp
npm install
npm test
npm run build
```

Useful scripts:

- `npm run lint` / `npm run typecheck` — Biome + TypeScript checks
- `npm run test:coverage` — Vitest with V8 coverage
- `npm run update:docs` — re-fetch the Oura OpenAPI schema and regenerate `skills/oura-api-skill/references/`

## License

[MIT](LICENSE)

## 日本語の方へ

Oura Ring の API v2 を MCP 経由で扱うためのサーバーです。`npx @yasuakiomokawa/oura-mcp configure` 一発で OAuth 認可からクライアント設定追記まで完了します。Claude Desktop / Claude Code / Cursor を自動検出するので、対応クライアントを使っていれば手動編集は不要です。トークンは `~/.config/oura-mcp/` に `0600` で保存され、`refresh_token` 失効時はチャットから `oura_authenticate` を呼べば再認可できます。詳しくは上記 Troubleshooting を参照してください。
