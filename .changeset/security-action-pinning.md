---
'@yasuakiomokawa/oura-mcp': patch
---

Pin all third-party GitHub Actions to immutable commit SHAs and verify the `mcp-publisher` binary against a known SHA-256. Tag references are mutable and have been used as supply-chain attack vectors (e.g. tj-actions/changed-files in March 2025); commit-SHA pinning makes any swap visible in the diff. Dependabot (already configured) will keep the SHAs current.
