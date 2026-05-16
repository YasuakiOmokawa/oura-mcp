---
"@yasuakiomokawa/oura-mcp": patch
---

Harden against npm supply chain attacks: refuse installing versions younger than 7 days via npm `min-release-age=7`, disable install lifecycle scripts via `.npmrc` and explicit `--ignore-scripts` in workflows, and add Dependabot configuration for `npm` and `github-actions` with matching 7-day cooldown.
