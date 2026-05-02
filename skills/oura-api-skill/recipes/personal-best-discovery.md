# personal-best-discovery

Mine the user's own historical data for their **best** sleep / readiness / activity and reverse-engineer the conditions, then turn that into a checklist for this week.

## Steps

1. Choose the target metric (default: `daily_sleep.score`). Honor user's explicit choice (HRV, deep sleep minutes, readiness, etc.).
2. Pull 90 days of the relevant daily endpoint with `oura_api_get` and `max_pages: 7`.
3. Identify the top 5 days by the chosen metric. Reject days with obvious confounders (e.g., illness — `temperature_deviation` >0.5°C).
4. For each top-5 day, fetch the **same-day and prior-day** detail:
   - Prior-day `daily_activity` (steps, active calories, training load)
   - Prior-day workout sessions if any (`/v2/usercollection/workout`)
   - Same-night `sleep` detail (bedtime, wake time, REM/deep duration)
   - Tags around that day (`/v2/usercollection/enhanced_tag`) — alcohol, caffeine, late meal markers if the user logs them
5. Find common patterns across the top 5:
   - Bedtime range (e.g., "all 5 nights, lights out between 22:30-23:15")
   - Activity range ("8000-12000 steps the prior day")
   - Tag presence/absence ("no `alcohol` tag in any of the top 5")
6. Contrast with the **bottom 5** days for the same period to validate the signal — patterns must differ between top and bottom, not just be common in top.
7. Output a **3-item this-week checklist** based on the most contrastive 3 patterns. Phrase as concrete actions, not insights ("today: 8000 歩以上、22:45 までに消灯、coffee は 14:00 以降なし").
8. Set a re-evaluation date (1 week out): re-run this recipe and see whether following the checklist reproduced top-quartile days.

## Notes

- Need ≥30 days of data for the contrast to be meaningful. Below that, downgrade to "your best week" instead of "your best day".
- Some users tag rarely. If `enhanced_tag` is sparse, lean on activity and bedtime patterns instead of tags.
- Do not over-interpret n=5. Frame patterns as hypotheses worth testing, not laws.
- Skip days from <30 days ago when looking at "this week's checklist" — too recent to be a robust historical reference.
