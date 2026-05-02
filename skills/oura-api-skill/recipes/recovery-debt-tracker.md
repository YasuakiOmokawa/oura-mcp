# recovery-debt-tracker

Quantify accumulated recovery debt from sleep + HRV + RHR signals and project when the user will be back to baseline. Then propose load adjustments for the next few days.

## Steps

1. Define baseline as the user's **last 30 days excluding the most recent 7 days** (so the recent stretch doesn't pollute the baseline).
2. Pull with `oura_api_get` (`max_pages: 3`):
   - `/v2/usercollection/daily_sleep` last 37 days
   - `/v2/usercollection/daily_readiness` last 37 days
3. Compute baseline means for: sleep_score, total_sleep_duration, readiness_score, contributors.hrv_balance (or HRV from sleep detail), contributors.resting_heart_rate.
4. Compute the user's last-7-days means for the same metrics. Express each as a delta from baseline.
5. Sleep debt: cumulative shortfall in `total_sleep_duration` over the last 7 days vs the user's typical nightly target (use the baseline mean as the target). Express in hours+minutes.
6. Autonomic load: a recent HRV ≥10% below baseline AND RHR ≥3 bpm above baseline is a strong "elevated load" signal. Flag if either hits its threshold; flag stronger if both.
7. Forecast recovery time:
   - If sleep debt only and <3 hours: 2 nights of normal sleep
   - If sleep debt 3-6 hours: 3-4 nights, ideally with 1 longer night
   - If autonomic markers also off: 3-5 days minimum, with at least one full rest day
   - If `temperature_deviation` is elevated alongside: pause guidance and recommend rest until temperature normalizes (possible illness)
8. Concrete load adjustment for the next 3 days:
   - **Today**: a single specific decision (rest / aerobic only / normal / push). Pick one.
   - **Tomorrow**: contingent on tonight's sleep — re-evaluate, don't promise.
   - **Day 3**: define the re-check trigger (e.g., "readiness >=80 で平常運転に戻す").

## Notes

- "Recovery debt" here is heuristic, not medical. State so explicitly.
- A single bad night does not trigger this recipe — require ≥3 of the last 7 days to be below the user's lower-quartile to warrant a "debt" framing.
- Distinguish acute load (recent training spike) from chronic accumulation (gradual creep over weeks). The former resolves in 2-3 nights; the latter needs a deeper reset.
- Always pair the verdict with **one** action, not five. The user should walk away with a clear "do X today".
