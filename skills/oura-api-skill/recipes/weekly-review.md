# weekly-review

Summarize the user's last 7 days of Oura data.

## Steps

1. Compute date range: `end_date = today`, `start_date = today - 6 days` (YYYY-MM-DD).
2. Call `oura_api_get` with:
   - `path: "/v2/usercollection/daily_sleep"`, `params: { start_date, end_date }`
   - `path: "/v2/usercollection/daily_activity"`, `params: { start_date, end_date }`
   - `path: "/v2/usercollection/daily_readiness"`, `params: { start_date, end_date }`
3. From each response's `data`, summarize:
   - Average `score` per category
   - Total `active_calories` for the week
   - Range of `readiness.score` (min / max)
4. Identify the lowest-readiness day and inspect that night's sleep.summary in the daily_sleep result.
5. Present a short narrative: trend direction, stand-out days, any concerning drops.

## Notes

- Daily endpoints return at most ~14 days per page; for 7 days a single page suffices (`max_pages: 1`).
- If `data` is empty, the user has no synced data for that range — ask whether they wore the ring.
