---
'@yasuakiomokawa/oura-mcp': patch
---

Tune `oura-api-skill` SKILL.md and all 9 recipes via empirical-prompt-tuning. SKILL.md gains locale phrase mappings (先週/今週/先月/今月/Nヶ月), recipe-vs-vague-default precedence, topic-vs-timeframe routing, and JST timezone defaults. Recipes are sharpened with exact JSON paths, raw-vs-contributor disambiguation, ranged-batch call shape for per-item iterations, future-day retargeting, and event-class branching (cognitive / physical-endurance / travel) in `event-prep`. Each recipe was validated against blank-slate executor scenarios until instruction-side defects converged to zero.
