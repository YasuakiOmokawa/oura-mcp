# intervention-experiment

Help the user run a structured 2-week A/B experiment on themselves (e.g., "no caffeine after 14:00 for 14 days", "screen off 1 hour before bed").

## Steps

1. Confirm three things, in order, before starting:
   - **Hypothesis** in one line ("仮説: X をやめると sleep score が上がる").
   - **Exact rule** for the intervention. Vague rules destroy compliance — make it binary. Examples: "カフェイン総量ゼロ" vs "14:00 以降のカフェインゼロ" are different experiments; pick one. "Screen off 1h before bed" vs "no screens after 22:00" — pick one.
   - **Single primary metric** (default: `daily_sleep.score`). Multi-metric = noise; pick one. Lock it before T0 — do not change mid-experiment. If the user prefers HRV / deep sleep / RHR, substitute everywhere in the rest of this recipe.
2. Define baseline window: previous 14 days. **At T0, validate `len(data) == 14`** before computing baseline stats; if shorter (sparse syncs / new user), abort and say so explicitly.
3. Define intervention window: next 14 days from today, with the user committing to one behavior change.
4. At baseline collection time:
   - Pull `oura_api_get` `path: "/v2/usercollection/daily_sleep"`, last 14 days.
   - Compute mean and standard deviation of the primary metric.
   - State the **minimum detectable effect** at n=14 vs n=14: roughly `1.0 × baseline_sd` (Cohen's d ≈ 1.0 detectable with this n at α=0.05). If the user's expected effect is smaller, warn that the experiment may be underpowered.
5. Mid-experiment (day 7) check-in: pull last 7 days, plot vs baseline, surface compliance issues. Do not declare a result yet.
6. End-of-experiment (day 14):
   - Pull last 14 days as intervention window.
   - Compute mean / sd / delta vs baseline.
   - Run an informal Welch's t-test in your head or describe the comparison qualitatively. Quote both the effect size (mean delta) **and** the variance overlap (do the windows' ranges overlap?).
   - Verdict: meaningful improvement / no detectable change / negative effect / inconclusive.
7. Propose the **next experiment**: extend if positive (4 weeks), pivot if negative, retry with stronger compliance if inconclusive.

## Notes

- Confounders to call out: weekly cycle (Mon vs Sat), travel, illness, menstrual cycle, season change. If the baseline contained a confounder, recommend re-baselining.
- Do not promise statistical certainty with n=14. Frame results as "personal evidence", not science.
- Keep the intervention to **one** change at a time. If the user wants to change 3 things, run 3 sequential experiments.
- Honor user goals: if the metric they care about is not `sleep.score` (e.g., HRV, deep sleep minutes, RHR), substitute it everywhere in step 1.
