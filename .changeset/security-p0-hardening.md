---
'@yasuakiomokawa/oura-mcp': patch
---

Harden security: enforce Oura host allowlist on every API request (defense against token passthrough), redact secrets in `OuraOAuthError.body`, remove the unused `apiUrl` config field, and pin CI workflow `permissions: contents: read`.
