# weekly-review

Summarize the user's last 7 days of Oura data.

## Steps

1. Compute date range: `end_date = today`, `start_date = today - 6 days` (YYYY-MM-DD).
2. Call `oura_api_get` with:
   - `path: "/v2/usercollection/daily_sleep"`, `params: { start_date, end_date }`
   - `path: "/v2/usercollection/daily_activity"`, `params: { start_date, end_date }`
   - `path: "/v2/usercollection/daily_readiness"`, `params: { start_date, end_date }`
3. From each response's `data` array, summarize:
   - Average of `data[].score` per category (sleep / activity / readiness)
   - Total of `data[].active_calories` from the activity response
   - Min and max of `data[].score` from the readiness response
4. Identify the readiness day with min `score`, then look up the `daily_sleep` entry with the same `day` value and inspect its `contributors` (deep_sleep, rem_sleep, efficiency, restfulness).
5. Present a short narrative: trend direction, stand-out days, any concerning drops.

## Notes

- Daily endpoints return at most ~14 days per page; for 7 days a single page suffices (`max_pages: 1`).
- If `data` is empty, the user has no synced data for that range — ask whether they wore the ring.
