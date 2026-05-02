---
name: oura-api-skill
description: Reference and recipes for Oura Ring API v2 via oura-mcp. Use when user asks about sleep, activity, readiness, heart rate, workouts, or other Oura data.
---

# Oura API Skill

This skill documents how to use `oura-mcp` (a Model Context Protocol server for Oura Ring API v2).

## Setup

Run `npx @yasuakiomokawa/oura-mcp configure` once to set up OAuth credentials. After that, MCP clients (Claude Desktop, Claude Code, Cursor) can call the tools below.

## Tools

- `oura_authenticate` — re-authenticate via browser (after refresh_token expiry).
- `oura_auth_status` — check token state.
- `oura_clear_auth` — wipe stored tokens.
- `oura_api_get` — generic GET, e.g. `path: "/v2/usercollection/daily_sleep"`. Use `max_pages` for large time-series.
- `oura_api_list_paths` — see all available endpoints.

## Date conventions

- Daily endpoints (`/daily_*`): `start_date` / `end_date` in `YYYY-MM-DD`. Default to last 7 days when user is vague.
- Time-series (`heartrate`): `start_datetime` / `end_datetime` in ISO 8601 UTC, e.g. `2026-05-01T00:00:00Z`.
- Time-of-day phrases (「朝」「夜」 etc.) are user-local. When the prompt is Japanese, assume JST (UTC+9) for the conversion to UTC unless the user states otherwise; otherwise infer from `personal-info` or ask.
- Natural-language phrases (treat as inclusive of today unless user contradicts):
  - 「先週」「last week」 → last 7 days ending today
  - 「今週」「this week」 → Monday of this week → today
  - 「先月」「last month」 → previous calendar month (1st → last day)
  - 「今月」「this month」 → 1st of this month → today
  - 「Nヶ月」「last N months」 → last N×30 days ending today (treat as approximate, not calendar-exact)
  - These phrase-resolved windows count as **explicit user intent** — recipes that say "honor user's explicit range" must use the resolved window, not their own default.
- **Recipe-level windows override the vague-default (last 7 days).** If a recipe specifies a window (e.g., 14 days for diagnostic, 90 days for personal-best mining) AND the user did not give a phrase, follow the recipe.

## Pagination

Most endpoints return `{ data: [...], next_token: "..." | null }`. By default `oura_api_get` fetches one page. Pass `max_pages: N` (1-20) for auto-follow, or pass `params: { next_token: "..." }` manually.

## Categories

- **Daily metrics**: `daily-sleep`, `daily-activity`, `daily-readiness`, `daily-stress`, `daily-spo2`, `daily-resilience`, `daily-cardiovascular-age`
- **Detail / time-series**: `sleep`, `sleep-time`, `heartrate`, `workout`, `session`, `vo2-max`
- **Meta**: `personal-info`, `ring-configuration`, `rest-mode-period`, `enhanced-tag`

See `references/` for per-endpoint detail and `recipes/` for common workflows.

## Recipes

Each recipe is a workflow guide for a specific user intent, not a hard-coded function. Pick the one that matches the user's real question.

**When a question fits multiple recipes (e.g., topic + timeframe), topic-specific wins.** "先週の睡眠" is sleep-specific (sleep-trend), not a general weekly review (weekly-review). "先月の活動" is activity-specific, not monthly-narrative.

### Status / review (descriptive)

- `recipes/weekly-review.md` — broad 7-day review across sleep / activity / readiness. Use when user asks generally about "last week".
- `recipes/sleep-trend.md` — sleep-only deep dive (stages, efficiency, trend). Use when the question is sleep-specific, not weekly-review.
- `recipes/recovery-check.md` — point-in-time "am I recovered right now?". Today only, not a trend.
- `recipes/monthly-narrative.md` — narrative monthly retrospective + next-month theme. Use for month-scale reflection, not week-scale.

### Diagnostic (why is something off?)

- `recipes/symptom-investigator.md` — vague complaint ("最近疲れる") → hypothesis-driven multi-endpoint check
- `recipes/recovery-debt-tracker.md` — quantify accumulated load and project recovery time

### Forward-looking (what should I do?)

- `recipes/event-prep.md` — maximize tomorrow's readiness for an important event
- `recipes/intervention-experiment.md` — design and run a 2-week A/B self-experiment

### Discovery / learning

- `recipes/personal-best-discovery.md` — mine your own best days for a personalized this-week checklist

## Common errors

- "refresh_token expired" → run `oura_authenticate` (in chat) or `npx @yasuakiomokawa/oura-mcp configure` (in terminal).
- "Path not found" → verify with `oura_api_list_paths`.

## Credits

The diagnostic and discovery recipes draw inspiration from analytical tools in [mitchhankins01/oura-ring-mcp](https://github.com/mitchhankins01/oura-ring-mcp) (MIT, separate implementation). The recipes here are reframed as LLM workflow guides rather than fixed functions, and are written from scratch.
