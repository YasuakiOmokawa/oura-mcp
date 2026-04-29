---
name: oura-api-skill
description: Reference and recipes for Oura Ring API v2 via oura-mcp. Use when user asks about sleep, activity, readiness, heart rate, workouts, or other Oura data.
license: MIT
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
- Time-series (`heartrate`): `start_datetime` / `end_datetime` in ISO 8601 UTC.

## Pagination

Most endpoints return `{ data: [...], next_token: "..." | null }`. By default `oura_api_get` fetches one page. Pass `max_pages: N` (1-20) for auto-follow, or pass `params: { next_token: "..." }` manually.

## Categories

- **Daily metrics**: `daily-sleep`, `daily-activity`, `daily-readiness`, `daily-stress`, `daily-spo2`, `daily-resilience`, `daily-cardiovascular-age`
- **Detail / time-series**: `sleep`, `sleep-time`, `heartrate`, `workout`, `session`, `vo2-max`
- **Meta**: `personal-info`, `ring-configuration`, `rest-mode-period`, `enhanced-tag`

See `references/` for per-endpoint detail and `recipes/` for common workflows.

## Recipes

- `recipes/weekly-review.md` — review last 7 days
- `recipes/sleep-trend.md` — sleep trend analysis
- `recipes/recovery-check.md` — recovery state check

## Common errors

- "refresh_token expired" → run `oura_authenticate` (in chat) or `npx @yasuakiomokawa/oura-mcp configure` (in terminal).
- "Path not found" → verify with `oura_api_list_paths`.
