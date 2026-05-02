---
'@yasuakiomokawa/oura-mcp': patch
---

Migrate to npm Trusted Publishing. Releases now exchange the GitHub Actions OIDC token for a short-lived npm publish token instead of using a long-lived `NPM_TOKEN`. Provenance is auto-attested by the npm CLI (no `--provenance` flag needed).
