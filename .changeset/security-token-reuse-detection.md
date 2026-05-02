---
'@yasuakiomokawa/oura-mcp': patch
---

Wipe local tokens when the upstream rejects a refresh with `invalid_grant` (OAuth 2.1 refresh-token reuse detection). The next tool call now triggers a clean re-authorization instead of repeatedly retrying a revoked refresh_token.
