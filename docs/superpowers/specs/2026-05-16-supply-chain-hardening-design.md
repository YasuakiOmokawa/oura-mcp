# Supply Chain Hardening Design

Date: 2026-05-16
Status: Approved (brainstorming) — pending implementation plan
Reference: [taimei-auth#37](https://github.com/taimei-code/taimei-auth/pull/37)

## Context

`oura-mcp` publishes `@yasuakiomokawa/oura-mcp` to the public npm registry and to the MCP Registry. The 2026-05-11 Mini Shai-Hulud worm against `@tanstack/*` (84 malicious versions, propagated to 169 npm packages) has reignited concern about install-time supply chain attacks. The repository already has several mitigations in place:

- GitHub Actions pinned to commit SHA with version comment
- `npm audit --audit-level=high` and `npm audit signatures` in CI
- `mcp-publisher` binary pinned by version + SHA-256
- npm Trusted Publishing via OIDC for release path

Three preventive controls from the reference PR are not yet applied here:

1. Cooldown on freshly published versions (bun's `minimumReleaseAge` equivalent)
2. Dependabot configuration for both `npm` and `github-actions` ecosystems
3. Explicit `--ignore-scripts` to neutralize install lifecycle scripts

Scope-out (decided during brainstorming): ADR documentation, IoC scan procedure, and `package.json` `overrides` (no current `audit high` findings).

## Decision

Adopt a three-layer defense aligned with the reference PR but adapted for the npm toolchain and a single-package repository.

### Layer 1 — Cooldown: refuse versions younger than 7 days

Add `.npmrc` at the repository root:

```
min-release-age=7
ignore-scripts=true
```

`min-release-age` is a native npm 11 configuration option. Versions younger than the threshold are excluded when resolving the dependency tree; if no candidate satisfies the constraint, `npm install` errors out (fail-fast). This single layer mitigates the entire class of malicious versions that get yanked within hours of publish.

Because `min-release-age` is npm 11 only, every workflow that runs `npm ci` must explicitly upgrade npm before installing:

- `.github/workflows/ci.yml` — add `npm install -g npm@latest` before `npm ci`
- `.github/workflows/update-references.yml` — add `npm install -g npm@latest` before `npm ci`
- `.github/workflows/release.yml` — already upgrades npm; no change

If the upgrade is omitted from any workflow, the bundled npm 10 silently ignores `min-release-age`, removing the cooldown protection without warning.

### Layer 2 — Dependabot: weekly updates aligned with cooldown

Add `.github/dependabot.yml`:

```yaml
version: 2

updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      github-actions:
        patterns: ["*"]

  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    cooldown:
      default-days: 7
    groups:
      dev-dependencies:
        dependency-type: "development"
```

`cooldown.default-days: 7` is set so Dependabot itself avoids proposing day-0 versions. Without this, Dependabot would open PRs that CI immediately rejects via `min-release-age=7`, wasting triage cycles. Grouping reduces weekly PR noise to at most three (one Actions group, one dev-deps group, plus individual prod-deps PRs).

Production dependencies (4 packages: `@inquirer/prompts`, `@modelcontextprotocol/sdk`, `open`, `zod`) are left ungrouped so each major bump receives an isolated review.

### Layer 3 — Install lifecycle scripts: declarative + CLI defense-in-depth

`.npmrc` already declares `ignore-scripts=true`, which applies to local development and any CI runner that respects the file. Additionally, every workflow `npm ci` call gains an explicit `--ignore-scripts` flag:

- `ci.yml`
- `release.yml`
- `update-references.yml`

The CLI flag is redundant with the `.npmrc` setting on purpose. If `.npmrc` is accidentally removed in a future PR, the workflow-level flag still blocks lifecycle scripts. This mirrors the reference PR's `trustedDependencies: []` + `--ignore-scripts` belt-and-suspenders pattern.

Dependency audit (Layer 2 in the reference PR) is treated as already-installed and is unchanged: `npm audit --audit-level=high` and `npm audit signatures` already run in `ci.yml`.

## Why

### Why cooldown is the highest-leverage control

The 2025–2026 major incidents (axios, Solana `web3.js`, `ua-parser-js`, TanStack Mini Shai-Hulud) shared one trait: the malicious version's lifetime before being yanked was 4 to 6 hours. A 7-day cooldown closes the entire class for the cost of "fresh releases install one week late." Bun's `minimumReleaseAge` and npm 11's `min-release-age` are functionally equivalent.

### Why npm 11 upgrade is mandatory in every workflow

npm 10 silently ignores `min-release-age`. Partial adoption (e.g., only `release.yml`) creates the worst outcome: the team believes cooldown is in effect, but `ci.yml` continues to install day-0 versions. Defense layers must be uniformly applied or not applied at all.

### Why Dependabot cooldown must match `.npmrc`

If the two values diverge, Dependabot proposes a version that CI install rejects. The PR sits red, requiring manual intervention or close. Matching `default-days: 7` keeps the proposed-version surface inside the installable surface.

### Why `--ignore-scripts` is duplicated in `.npmrc` and CLI

Install-time RCE is the primary delivery mechanism for the worm class (TanStack postinstall, ua-parser-js postinstall). The reference PR justified the same redundancy because (a) the implicit default could change in a future toolchain version, and (b) a single-source declaration is one PR away from being removed. Two independent layers survive either failure mode.

### Why prod-deps are not grouped

There are only four production dependencies and each carries non-trivial runtime impact (MCP SDK, prompts, CLI URL opener, schema validator). Reviewing them individually is cheap and forces explicit judgment on majors. Grouping is reserved for dev-deps where individual review yields diminishing returns.

## Consequences

- `.npmrc min-release-age=7` and Dependabot cooldown together delay every new version by one week. For emergency CVE response, the operator must remove or override the constraint manually (no native bypass list in npm 11; bun has `minimumReleaseAgeExcludes` but npm does not). This trade-off is accepted: the existing `npm audit` gate catches known CVEs in already-installed versions.
- The npm 11 upgrade step adds approximately 10–15 seconds per workflow run. Acceptable.
- Dependabot will create 2–3 PRs per week on average (Actions group + dev-deps group + 0–1 prod-deps). Existing weekly triage capacity absorbs this.
- `--ignore-scripts` could break installation if a future dependency requires postinstall to function. All current direct dependencies are pure JavaScript with no install scripts; `@biomejs/biome` uses the `optionalDependencies` pattern, not postinstall. Re-evaluation is needed when adding any dependency with native bindings (e.g., `better-sqlite3`, `sharp`).
- No ADR is written. The decision record lives in this spec, the resulting plan, and the PR description. Future revisits should refer back to this file.

## Files Changed

| Path | Change |
|---|---|
| `.npmrc` | New |
| `.github/dependabot.yml` | New |
| `.github/workflows/ci.yml` | Add `npm install -g npm@latest`; change `npm ci` to `npm ci --ignore-scripts` |
| `.github/workflows/release.yml` | Change `npm ci` to `npm ci --ignore-scripts` |
| `.github/workflows/update-references.yml` | Add `npm install -g npm@latest`; change `npm ci` to `npm ci --ignore-scripts` |

## Verification

1. Local: `npm ci --ignore-scripts` followed by `npm test`, `npm run lint`, `npm run build` all pass.
2. PR CI: all four matrix combinations (ubuntu-latest, macos-latest) × (Node 20, Node 22) green.
3. `npm audit --audit-level=high` continues to exit 0.
4. After merge, observe that the next Dependabot run produces the expected grouped PRs and that none of them request a version younger than 7 days.

## Out of Scope

- ADR creation under `docs/adr/`
- IoC scan script or runbook for Mini Shai-Hulud detection
- `package.json` `overrides` (no current `audit high` finding to fix)
- Migration to Renovate
- Hardening of release workflow beyond what already exists (Trusted Publishing OIDC, SHA-pinned `mcp-publisher`)
