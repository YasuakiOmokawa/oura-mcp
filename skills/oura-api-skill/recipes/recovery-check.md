# recovery-check

Tell the user how recovered they are right now and whether they should push or rest.

## Steps

1. Call `oura_api_get` with `path: "/v2/usercollection/daily_readiness"`, `params: { start_date: today - 1, end_date: today }`.
2. Read the latest `data[]` entry: `score`, `temperature_deviation`, `contributors.hrv_balance`, `contributors.recovery_index`, `contributors.resting_heart_rate`.
3. Cross-check sleep with `path: "/v2/usercollection/daily_sleep"` for the same day.
4. Combine into a verdict:
   - `score >= 85`: green light, push if planned.
   - `70 <= score < 85`: moderate, prefer aerobic over high-intensity.
   - `score < 70`: rest or active recovery; flag elevated `temperature_deviation` (>0.4°C above baseline) as a possible illness signal.
5. If the user asks "why", quote the lowest contributor and the matching sleep metric. Mapping:
   - `contributors.recovery_index` ↔ `daily_sleep.contributors.restfulness` and `total_sleep_duration`
   - `contributors.hrv_balance` ↔ `sleep.average_hrv` (raw) or `daily_sleep.contributors.deep_sleep` / `rem_sleep`
   - `contributors.resting_heart_rate` ↔ `daily_sleep.contributors.efficiency`
   - `contributors.sleep_balance` ↔ `daily_sleep.score` directly
   - `contributors.body_temperature` ↔ `daily_sleep.temperature_deviation` if present
6. "Push" tier means: endorse the session the user is asking about (gym / run / etc.). If the user has not stated a session, propose a moderate one matching their recent training pattern.

## Notes

- `daily_readiness` is published shortly after waking; if today's entry is missing, fall back to yesterday's.
- HRV balance and recovery index are the most actionable contributors for training decisions.
