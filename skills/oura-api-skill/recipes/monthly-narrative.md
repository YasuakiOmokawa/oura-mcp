# monthly-narrative

At the start of a new month (or any 4-week boundary), produce a short narrative review of the previous month and a single-theme plan for the next.

## Steps

1. Determine ranges:
   - **Last month**: `start_date = first_of_previous_month`, `end_date = last_of_previous_month`
   - **The month before** (for context): same shape, one month earlier
2. Fetch with `oura_api_get` and `max_pages: 3`:
   - `/v2/usercollection/daily_sleep` for both ranges
   - `/v2/usercollection/daily_readiness` for both ranges
   - `/v2/usercollection/daily_activity` for both ranges
3. Compute, for each range:
   - Mean sleep score, mean readiness, mean steps
   - Standard deviation of sleep score (consistency proxy)
   - Number of days with score <70 (rough nights count)
4. Identify the **single biggest shift** vs the prior month: largest delta in mean or in variance. Ignore changes <5% — likely noise.
5. Build the narrative in 3 paragraphs:
   - **What happened**: the dominant pattern of last month, expressed as a story arc (stable, declining, recovering, volatile, etc.) — not a list of numbers.
   - **Why probably**: 1-2 hypotheses tied to known life context (season, travel, project crunch, training cycle) the user mentioned in conversation. If no context, mark as "probable cause unclear".
   - **Next month theme**: one focus area (e.g., "consistency before performance", "sleep timing", "active recovery"). Not a checklist of 5 items — one theme.
6. Output a **4-week rough plan** for the new month: Week 1 baseline, Week 2 introduce one change, Week 3 maintain, Week 4 review. Tie the change to the chosen theme.

## Notes

- A month is ~30 data points; differences in mean of 3-5 score points are within noise. Only call out shifts that are visually clear in the raw series.
- Keep the narrative short. 3 paragraphs total, not 3 paragraphs per metric.
- The "theme" should be testable: at month-end, the user should be able to say "did I improve consistency?" with a clear yes/no.
- Do not pad with every metric Oura offers. Sleep + readiness + activity is the spine; pull others (stress, HRV detail) only if they materially explain the headline shift.
