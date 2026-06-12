---
name: Correlation Queries (Post-Demo Enhancement)
description: Parked enhancement — true parallel Databricks+QML correlation handler for "is X affecting Y" questions. Deferred until after April 21 demo.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
Enhancement parked 2026-04-16. Not to be touched before April 21 Bruce Simpson meeting.

**The gap:** Queries like "is inflation affecting Mars sales?" are causal/correlational — need Mars data AND macro data as equal inputs with a quantified relationship. Currently they go through the financial path (Databricks first) and get macro appended as a "Wondering why?" paragraph. Reads well narratively but architecturally sequential, not a true correlation.

**What a proper implementation would look like:**
1. New `correlation` class in `classifyQuerySource()` — detects "is X affecting Y", "how does Y impact X", "correlation between"
2. New handler branch in `query/route.ts` — `Promise.all([databricks, qml])`, then LLM synthesis pass with both series
3. Dual-axis Recharts chart (Mars bars + CPI line on right Y-axis)
4. New provenance variant ("correlation")

**Why:** Scope = ~3–5h done right. Risk = classifier changes ripple to working queries; query route is ~1700 lines with 5+ branches already.

**How to apply:** After April 21 demo, not before. Bundle with the banner DEMO/LIVE fix and any chart-grouping issues noticed during demo prep.
