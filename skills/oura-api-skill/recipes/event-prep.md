# event-prep

The user has an important event ahead (presentation, flight, race, exam). Maximize that day's readiness with concrete actions, grounded in their historical pattern.

## Step 1 — Frame the event

Confirm or assume:

- **Event date and time**. If unstated, assume and announce it (e.g., "09:00 JST と仮定").
- **Lead time** (today → event):
  - **E=0** (event tomorrow): tonight = E-1 night.
  - **E=1–7** (within a week): the protocol anchors to the **night before the event (E-1)**, not literal tonight. Tonight is taper-week management only.
  - **E=8+**: too far for acute prep. Decline this recipe and suggest `weekly-review` or `intervention-experiment`.
- **Event class** — this changes the protocol substantially:
  - **Cognitive** (presentation, exam, interview): caffeine 60–90 min after wake, light + hydration first hour.
  - **Physical-endurance** (race, long hike): caffeine **30–45 min before start time** (ergogenic timing), glycogen-loaded dinner E-1 night, race-morning breakfast 3h pre-start.
  - **Travel / time-zone shift** (flight): bedtime anchored to **destination** morning, not departure local clock. Caffeine timed to destination wake.

State all three explicitly in the deliverable so the user can correct.

## Step 2 — Pull historical baseline (90 days)

```
oura_api_get
  path: "/v2/usercollection/daily_readiness"
  params: { start_date: "<today-90d>", end_date: "<today>" }
  max_pages: 7
```

If the response has `next_token != null` after 7 pages, raise `max_pages` (up to 20) until covered. If `data.length < 30`, switch to the **<30-day fallback** at the bottom of this recipe.

## Step 3 — Identify top-10 readiness days (single criterion)

Take the **top 10 days by `score`** from the 90-day distribution. (Do not mix with percentile thresholds — top-10 by score is the canonical rule for this recipe.)

**Call shape**: pull each endpoint **once over the full 90-day window** (not per-day), then filter client-side to the prior-day records of the top-10. This is 4 ranged calls total, not ~40.

```
oura_api_get  path: "/v2/usercollection/sleep"           params: { start_date: "<today-90d>", end_date: "<today>" }, max_pages: 7
oura_api_get  path: "/v2/usercollection/daily_activity"  params: { start_date: "<today-90d>", end_date: "<today>" }, max_pages: 7
oura_api_get  path: "/v2/usercollection/workout"         params: { start_date: "<today-90d>", end_date: "<today>" }, max_pages: 7
oura_api_get  path: "/v2/usercollection/enhanced_tag"    params: { start_date: "<today-90d>", end_date: "<today>" }, max_pages: 7
```

**Prior-day anchoring**: a `daily_readiness` record with `day = D` reflects the night that **ended on D** (i.e., the sleep that produced it has `sleep.day = D`). So "prior-day pattern" = the records whose `day = D - 1` for `daily_activity` / `workout` / `enhanced_tag` (the day **before** the night that produced the score), and the `sleep` record with `day = D` (the night itself, since `sleep.day` already represents the end of that sleep period).

For each of the top-10 D values, capture:

- Bedtime: `sleep` record with `day = D` → `bedtime_start`
- Activity: `daily_activity` record with `day = D - 1` → `steps`, `active_calories`
- Workout: `workout` records with `day = D - 1` → presence, intensity
- Caffeine / alcohol / gel tags: `enhanced_tag` records with `day = D - 1` (if logged)

If the event class is **physical-endurance** and the user logs gels/carbs as tags, those will already be in the `enhanced_tag` pull above.

**Distribution-shift caveat**: top-10 nights are typically low-stressor. If the E-1 night has a known stressor (race anxiety, jet lag, illness recovery), label the personalization as weaker and supplement with class-specific guidance.

## Step 4 — Pull current state (last 7 days)

```
oura_api_get
  path: "/v2/usercollection/daily_readiness"
  params: { start_date: "<today-7d>", end_date: "<today>" }
oura_api_get
  path: "/v2/usercollection/daily_sleep"
  params: { start_date: "<today-7d>", end_date: "<today>" }
```

Compute:
- Sleep debt: sum of last 7 nights' duration vs target (target = top-10 median duration).
- HRV trend: 7d mean of `contributors.hrv_balance` vs 30d mean.
- Illness signal: any night with `temperature_deviation` > 0.3°C above the user's 30-day baseline.

## Step 5 — E-1 night protocol (the night before the event)

Be specific, not generic. Everything here is data-derived; if data does not support a rule, drop it rather than fall back to textbook.

Common to all classes:
- **Bedtime**: median of top-10 `bedtime_start`. Do **not** push earlier than usual just because of the event — early bed when not tired increases sleep latency, especially under pre-event anxiety.
- **One pre-bed avoidance**, only if their tag data shows it correlates with readiness drops (e.g., alcohol).
- **Lay out gear / materials** the night before to reduce next-morning cognitive load.

Class-specific:
- **Cognitive**: light dinner, no experiments with new food.
- **Physical-endurance**: carb-loaded dinner ~3h before bed (familiar foods only, no experiments). Hydration steady through evening, taper 2h before bed to reduce wake-ups.
- **Travel**: anchor bedtime to destination's overnight. May involve melatonin (out of scope of Oura data — note but do not prescribe).

## Step 6 — E-day morning protocol

- **Wake**: event time minus class-specific lead.
  - Cognitive: lead = personal "feel-ready" lag from top-10 (often 90–120 min).
  - Physical-endurance: lead = 3h (digestion + transit + warm-up).
  - Travel: lead = check-in window plus airport transit.
- **First hour**: light exposure, hydration, light movement.
- **Caffeine**:
  - Cognitive: at the time their best-readiness mornings show their first caffeine tag, not earlier.
  - Physical-endurance: 30–45 min before event start (ergogenic).
  - Travel: timed to destination wake, not departure-local wake.
- Class-specific add-ons:
  - Physical-endurance: breakfast 3h pre-start, carb-heavy + low fat/fiber, familiar only. Last hydration cutoff 60 min pre-start. Warm-up 10–15 min pre-start.

## Step 7 — Fallback when E-day morning readiness reads low

Threshold: `score < 70` on E-day's `daily_readiness`.

Class-specific decision tree:
- **Cognitive**: extra coffee + 5–10 min walk + accept slightly degraded performance. Do not panic.
- **Physical-endurance**: **do not skip the start.** A single low-readiness reading after pre-event anxiety is weakly predictive of race outcome. Adjust pacing instead — start 10–15 sec/km slower than goal pace through the first quarter, reassess at halfway. Add one extra caffeine dose mid-event if class-appropriate. The only "consider DNS" signal is multi-signal: `temperature_deviation` elevated **AND** HRV crashed **AND** the user reports symptoms.
- **Travel**: if low and a flight: hydrate aggressively, walk during boarding queue, accept reduced sleep at destination night 1; circadian recovery typically takes 2–3 nights.

## Notes

- Avoid generic sleep-hygiene advice. Everything should be derived from the user's own top-10 vs current state. If their data contradicts a textbook rule, follow their data.
- Frame as "tomorrow の readiness を最大化する確率を上げる", not guaranteed.
- For physical-endurance events, the **2 nights before** sleep is more predictive of performance than the night-immediately-before. Use this to reduce E-1 night anxiety if the user reports it.

## <30-day data fallback

If the 90-day pull returned <30 entries, you cannot personalize. Fall back to:
- Class-specific generic timing (caffeine, breakfast, warm-up per Step 6).
- Standard sleep hygiene (consistent bedtime, no alcohol, dim light 2h pre-bed).
- Do not claim any "your data shows..." statements.
