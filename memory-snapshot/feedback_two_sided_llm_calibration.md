---
name: two-sided-llm-calibration
description: "When tuning an LLM's default behaviour via prompt, build the SYMMETRIC penalty into the evaluator rubric SIMULTANEOUSLY — push the desired direction in the prompt AND add the over-correction penalty in the eval. One-sided pressure (prompt only OR eval only) calibrates poorly; the LLM either under-shoots or over-shoots and the eval can't catch the latter. Banked 2026-05-28 from #681 C3 sub-FR decomposition tuning."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-28
  source: #681 sub-FR calibration follow-up
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The pattern

When you want to shift an LLM's default behaviour (e.g., "produce more sub-FRs by default", "be more concise", "always cite sources"), the instinct is to add a stronger prompt rule. That's half the answer. The other half: add the SYMMETRIC over-correction penalty to the evaluator rubric SIMULTANEOUSLY.

**One-sided pressure calibrates poorly:**

- **Prompt only** ("prefer hierarchical decomposition by default") → LLM over-corrects. Calculator app gets FR-1.1 "Add positives" / FR-1.2 "Add negatives" / FR-1.3 "Add with overflow" — test cases masquerading as sub-FRs.
- **Eval only** ("score low when sub-FRs are noise") → LLM has no positive trigger. Continues to under-decompose, eval just keeps flagging it.

**Two-sided pressure produces calibration:**

- Prompt says "split when X" (positive trigger)
- Eval says "score low when split-decision violated Y" (negative trigger)
- The intersection X∧¬Y is the target behaviour
- LLM iteratively settles into the band where both pressures release

## The canonical shape (from #681 C3 sub-FR tuning)

**Prompt side (positive trigger):**
1. State the default direction clearly: *"Prefer hierarchical decomposition by default."*
2. Give a 3-criterion split test the agent applies per item:
   - (1) **Behavioural cardinality**: ≥3 distinct user-visible behaviours differing in data shape, UX flow, or error path
   - (2) **Build divergence**: meaningfully different code/tests, not unit-test variations
   - (3) **Information delta**: each sub-item's `detail` field adds NEW measurable behaviour the parent doesn't specify
3. Show ONE positive worked example (where to apply)
4. Show TWO negative worked counter-examples (where NOT to apply) — these are load-bearing
5. Add framing signals from user input (e.g., "simple X" / "basic X" → bias FLATTER)

**Eval side (negative trigger):**
- Extend an existing rubric dimension with the symmetric penalty
- For our case: Measurability already scored "missing thresholds / unobservable verbs"; we extended it with "a sub-FR whose detail could be deleted without losing information distinct from the parent is noise — score 1-2 when 2+ sub-FRs fail this test"
- The penalty is symmetric to the existing under-decomposition penalty (which lives in Completeness — "kickoff with 1 FR scores 1-2")

## Empirical results from #681

Calibration across 3 prompt-complexity levels, post-rule:

| Prompt | Total reqs | Sub-FRs | % | Verdict |
|---|---|---|---|---|
| "build me a basic to-do list app" (simple) | 18 | 5 | 28% | well-calibrated — auth + CRUD split, mark-complete/storage flat |
| "build a recipe-sharing app with user accounts, comments, ratings, search" (complex, explicit feature list) | 20 | 6 | 30% | well-calibrated — auth + recipe-authoring split, comments/ratings/search/upload flat |
| Pre-rule baseline ("habit tracker") | 13 | 0 | 0% | under-decomposed |

The rule produces consistent 28-30% sub-FR rates with INTELLIGENT picks (auth + multi-action CRUD) across different complexity levels. The over-decomposition guard fired correctly on borderline calls (e.g., "comments" feature kept flat as a single capability with ACs, not split into add/edit/delete).

## When to apply

- Any time you're tuning LLM default behaviour via prompt (richness, conciseness, citation style, formatting, decomposition depth, etc.)
- ALWAYS pair the prompt edit with the eval rubric edit in the same PR/commit
- If you can't find a natural rubric dimension for the symmetric penalty, that's a signal your rubric is incomplete — add the dimension

## Common failure modes this guards against

1. **Over-correction**: LLM swings too far in the desired direction. Eval flags it.
2. **Eval drift**: Future PR weakens or removes the symmetric penalty → LLM regresses to over-correction. The eval test catches the regression.
3. **Prompt-only tuning**: New maintainer reads the prompt rule, sees it works "most of the time", doesn't realise the eval is what keeps the rule in band.
4. **Eval-only tuning**: The agent stops emitting the behaviour entirely because no positive trigger ever fires.

## Linked locks

- `feedback_test_shape_rule.md` — eval rubric changes should be tested with real-LLM regression suites covering both directions (under + over).
- `feedback_always_propose_complete_no_deferrals.md` — when shipping prompt + eval calibration, ship BOTH sides; don't defer the symmetric penalty to a follow-up.

## Caught how

Cesar reviewed PR #689 (#681 implementation) post-verification, where the original prompt change ("prefer hierarchical decomposition") was discussed alongside the risk of over-decomposition on simple specs. Adding the symmetric Measurability-side penalty in the same commit (commit 12, `11534ed`) gave the system two-sided calibration pressure, verified empirically across 3 prompt-complexity levels.
