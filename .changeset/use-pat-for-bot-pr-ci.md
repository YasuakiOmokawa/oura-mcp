---
"@yasuakiomokawa/oura-mcp": patch
---

CI: switch the `changesets/action` step to use a Personal Access Token
(`CHANGESETS_PAT`) instead of the default `GITHUB_TOKEN`. PAT-authored
commits/PRs trigger downstream `pull_request` workflows, so `ci.yml` now
runs automatically on the bot-created "chore: release packages" PR. This
removes the manual empty-commit workaround that branch protection
previously made necessary.
