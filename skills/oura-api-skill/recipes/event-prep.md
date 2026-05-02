# event-prep

The user has an important event tomorrow (presentation, flight, race, exam). Maximize tomorrow's readiness with concrete tonight-and-tomorrow-morning actions, grounded in their historical pattern.

## Steps

1. Confirm the event time and the target window for peak readiness ("明日 09:00 のプレゼン" → 翌朝の readiness を最大化).
2. Pull the user's last 90 days from `oura_api_get` `path: "/v2/usercollection/daily_readiness"`, `max_pages: 7`.
3. Identify their **top 10** historical readiness days (>=80 percentile of their own distribution). For each, capture the prior-day pattern:
   - Bedtime (from `/v2/usercollection/sleep`'s `bedtime_start`)
   - Activity volume (`daily_activity.steps`, `active_calories`)
   - Whether the prior day had a workout (`/v2/usercollection/workout`)
   - Caffeine/alcohol tags if logged
4. Pull the **last 7 days** as the user's current state. Compare:
   - Are they in a sleep debt? (sum of last 7 nights' duration vs target)
   - Is HRV trending down? (last 7d mean readiness HRV contributor vs 30d mean)
   - Any recent illness signal? (`temperature_deviation` elevated)
5. Build tonight's protocol (be specific, not generic):
   - **Bedtime**: pick a time that matches their top-10 pattern, not a generic "8 hours" rule
   - **Pre-bed**: 1 concrete avoidance based on their data (e.g., "alcohol を抜く" only if the data shows alcohol tags hurt their readiness)
   - **Activity**: light only if they're in debt; allow normal load if they're rested
6. Build tomorrow morning's protocol:
   - Wake-up time matched to event time minus their typical "feel-ready" lag (often 90-120 min of light + caffeine)
   - First-hour: light exposure, hydration, light movement
   - Caffeine timing: their first coffee at the time their best-readiness mornings show, not earlier
7. Add one **fallback**: if tomorrow's morning readiness reads <70, what to do (extra coffee + 5-10 min walk + acknowledge slightly degraded performance, do not panic).

## Notes

- Avoid generic sleep-hygiene advice. Everything should be derived from the user's own top-10 vs current state. If their data contradicts a textbook rule, follow their data.
- Do not over-promise. Frame as "tomorrow の readiness を最大化する確率を上げる" rather than "guaranteed".
- For night-shift / time-zone-shifted events (flights), the bedtime advice has to anchor to the destination's morning, not the local clock — be explicit.
- If <30 days of data, fall back to general sleep-hygiene + caffeine timing only, without claiming personalization.
