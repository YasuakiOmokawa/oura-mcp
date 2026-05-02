---
'@yasuakiomokawa/oura-mcp': patch
---

Supply chain hardening: enable Dependabot for npm and GitHub Actions, run `npm audit signatures` in CI to verify Sigstore provenance, and document `env` (not `args`) as the required way to pass `OURA_CLIENT_SECRET` to MCP clients (process args are visible via `ps`).
