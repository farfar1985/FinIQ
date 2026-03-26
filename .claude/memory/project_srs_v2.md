---
name: SRS v3.0 final unified status
description: SRS v3.0 generated 2026-03-26 — combines base v2.1 + Addendum A + dual-data-mode into one final spec (50 FRs, 21 acceptance criteria)
type: project
---

SRS v3.0 generated on 2026-03-26 as `FinIQ SRS v3.0 Final.docx`, by `generate_srs_final.py`.

Combines:
1. SRS v2.1 Merged (base, 46 FRs)
2. Addendum A Databricks integration (4 amended + 4 new FRs)
3. Dual-mode operation (simulated + real data) as cross-cutting requirement

Key changes from v2.1:
- FR1.1 rewritten: Databricks-primary with Excel fallback
- FR2.1 rewritten: PES from precomputed Databricks views
- FR6.1 rewritten: Three-way comparison (Actual vs Replan vs Forecast)
- New: FR1.6, FR2.7, FR6.5, FR7.6 (Databricks connection, budget variance, freshness monitoring, DB admin)
- "Azure OpenAI" → "Azure OpenAI Foundry" throughout
- CI/CD → "GitHub (Mars internal GitHub repository)"
- Section 6: Databricks schema reference (view mapping, KPI-to-account codes, SQL patterns)
- Section 7: Dual-mode operation (config toggle, synthetic data requirements, mode parity)
- 21 acceptance criteria (up from 14)

**Why:** Rajiv directed combining since no code was built yet. One clean doc to share with team and feed to coding orchestrator.

**How to apply:** This is now THE spec. Previous v2.1 base + Addendum A are kept for history but superseded. Next: testing agent SRS (separate doc), synthetic data creation, stylistic guidelines from Alessandro.
