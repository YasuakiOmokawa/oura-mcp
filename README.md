# oura-mcp

Personal MCP server for Oura Ring API v2.

A Model Context Protocol server that exposes Oura Ring data (sleep, activity, readiness, heart rate, workouts) as tools, resources, and prompts so it can be used from MCP-compatible clients such as Claude Code.

## Status

Scaffolding only. Implementation in progress.

## Planned tools

- `get_daily_sleep` — daily sleep score and stages
- `get_daily_activity` — daily activity, steps, calories
- `get_daily_readiness` — daily readiness score
- `get_heartrate_range` — heart rate samples for a time range
- `list_workouts` — workouts list
- `get_personal_info` — profile info

## Planned resources

- Latest weekly summary (auto-refresh)
- Last 7 days readiness trend

## Planned prompts

- Weekly review
- Sleep advice
- Stress / recovery check

## Stack

- TypeScript MCP SDK (`@modelcontextprotocol/sdk`)
- Transport: stdio
- Auth: Personal Access Token (Bearer)
- Oura API: v2 (`https://api.ouraring.com/v2/...`)

## License

MIT
