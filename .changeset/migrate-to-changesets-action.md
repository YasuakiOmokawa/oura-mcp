---
"@yasuakiomokawa/oura-mcp": patch
---

Migrate the release pipeline to `changesets/action`. Tag pushes are no
longer required: merging a PR that contains `.changeset/*.md` to `main`
makes the action open (or update) a "chore: release packages" PR with
the version bump and CHANGELOG entry. Merging that PR triggers the
action to run `npx changeset publish`, which performs `npm publish`
with provenance and creates the matching git tag automatically. The
workflow then publishes the same version to the MCP Registry via OIDC.
