# sleep-trend

Analyze sleep score and structure trends over a period.

## Steps

1. Determine date range. Default: last 30 days. Honor user's explicit range.
2. Call `oura_api_get` with `path: "/v2/usercollection/daily_sleep"`, `params: { start_date, end_date }`, `max_pages: 3`.
3. From `data`, extract `day` and `score` and chart the trend (or describe the slope verbally).
4. For deeper structure, fetch detail with `path: "/v2/usercollection/sleep"` and read each entry's `total_sleep_duration`, `rem_sleep_duration`, `deep_sleep_duration`, `efficiency`.
5. Highlight: best night, worst night, and any week-over-week change in REM or deep sleep ratio.

## Notes

- `daily_sleep` gives the score; `sleep` gives stage-level data. Both share the same `day` field.
- Use `max_pages: 3` to cover ~42 days; raise to 5+ only when the user asks for >2 months.
