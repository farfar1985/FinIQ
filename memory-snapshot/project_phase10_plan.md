---
name: Phase 10 demo polish plan
description: Proposed Phase 10 — 7 high-impact features for April 21 MLT demo, on separate branch for safe testing
type: project
---

**Phase 10: Demo Polish — PROPOSED (2026-04-03)**

**Status**: Discussed with Farzaneh, pending team review before starting.

**Approach**: Create `phase-10-demo-polish` branch off `main` in ale-build repo. Test there. If good, merge to main. Zero risk to working app.

**Priority order (for maximum MLT demo impact):**

1. **Query reliability (curated demo script)** — Ensure 10-15 queries Mars execs would ask work flawlessly every time. Fix unit name mismatches, fuzzy matching. One failed query in front of Bruce kills the demo.

2. **Internal vs External cross-reference (FR3.3, currently 0 pts)** — "How does Mars OG compare to Nestle?" Combine real Databricks data with FMP competitor data in one answer. This IS the unified platform pitch.

3. **Actual vs Replan comparison (FR6.1)** — finiq_financial_replan data exists in Databricks. Finance people care most about actual vs budget vs forecast. No other team build does this.

4. **Voice agent pre-warming** — Pre-warm warehouse before demo. Cache demo queries. Databricks cold start (2-3 min) would kill a live voice demo.

5. **One-click Executive Summary** — "Generate Board Report" button for any entity/period. Maps directly to PES but better (on-demand, any entity, any period).

6. **Data lineage breadcrumbs (FR1.4, currently 0 pts)** — Show full path: "Databricks → finiq_vw_pl_unit → filtered to MW USA → 5.7B rows scanned". Builds trust. We have ProvenanceBadge already but need detailed trail.

7. **SQL parameterization (T1, currently 0 pts)** — Not visible but technical reviewers would flag SQL injection as dealbreaker.

**Quick wins also discussed:**
- Configurable KPIs (FR2.2)
- WCAG accessibility (FR8.6)

**What to skip:**
- Marketing Analytics API (FR6.2) — no real API exists
- Drag-drop dashboard — no demo payoff
- Multi-panel workspace — complexity without demo payoff

**Why:** April 21 MLT meeting with Bruce Simpson. Need working demo with real data that tells the "unified platform" story convincingly.

**How to apply:** When Farzaneh says go, create branch and work through items in priority order. Each item should be testable independently.
