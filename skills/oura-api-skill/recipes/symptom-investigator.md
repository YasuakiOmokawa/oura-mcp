# symptom-investigator

When the user reports a vague subjective complaint ("最近疲れる", "集中できない", "風邪っぽい", "やる気が出ない"), build a small investigation across multiple Oura signals before answering.

## Steps

1. Restate the complaint in 1 sentence and list 2-3 candidate hypotheses (e.g., sleep debt, autonomic stress, sub-clinical illness, training overload, dehydration). Keep the list short.
2. Pick the minimum endpoints needed to test each hypothesis. Typical mapping:
   - **Sleep debt** → `/v2/usercollection/daily_sleep` last 14 days; check rolling 7d total sleep duration.
   - **Autonomic stress** → `/v2/usercollection/daily_readiness` last 14 days; watch `contributors.hrv_balance` and `contributors.resting_heart_rate`.
   - **Sub-clinical illness** → same readiness endpoint; flag `temperature_deviation` >0.3°C above the user's 14-day baseline for 2+ consecutive nights.
   - **Training overload** → `/v2/usercollection/workout` + `/v2/usercollection/daily_activity` last 14 days; look for high `total` activity with falling readiness.
3. Fetch the relevant ranges with `oura_api_get` (`max_pages: 1` for 14-day daily endpoints). Do not pull endpoints unrelated to the active hypotheses.
4. For each hypothesis, present:
   - The signal you looked at
   - The actual numbers vs the user's own baseline
   - A confidence verdict (likely / unlikely / inconclusive)
5. End with **one** most-likely cause and **one** concrete next-step (e.g., "今夜は 23:00 までに就寝、明朝の readiness を再評価" or "37.0°C 越えが続いているので体温計で実測を").

## Notes

- Always compare against the user's own baseline, never population norms. Single-day deviations are weak signal; require 2+ consecutive nights.
- If the user has <14 days of data, downgrade to qualitative observation and say so explicitly.
- Refuse to diagnose. Use language like "Oura のデータからは X の可能性が高い" / "医療判断ではない".
- Do not run all hypotheses if 1 is obvious — token economy matters.
