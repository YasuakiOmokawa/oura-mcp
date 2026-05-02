---
'@yasuakiomokawa/oura-mcp': patch
---

Re-frame env-var credentials as a CI/Docker fallback, not the recommended path. README now leads with the `configure` wizard + `~/.config/oura-mcp/*.json` (0600) and explains why env (`/proc/<pid>/environ`, child-process inheritance, crash dumps, shell history) leaks more easily. The startup warning rename `config.deprecated_env` → `config.env_credentials` carries a more actionable hint.
