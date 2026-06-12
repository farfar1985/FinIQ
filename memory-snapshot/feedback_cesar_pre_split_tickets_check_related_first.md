---
name: cesar-pre-splits-tickets-into-library-plus-wiring-check-related-tickets-before-claiming-any-build-agent-or-core-modifying-ticket
description: "2026-05-23 Saturday afternoon. Banked after Cesar shipped his own T-M3-45 + T-M3-74 (PR #467 + #468) instead of merging our PR #375. We bundled what Cesar pre-split into two tickets. Discovery: before claiming or scoping any ticket that touches Cesar's Build Agent / Skill Catalog / core files, search the issue tracker for related/adjacent tickets — Cesar often pre-splits work into 'library' + 'wiring' tickets specifically so the wiring stays in his lane."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## The pattern

Cesar pre-splits work that crosses ownership/file boundaries into separate tickets:

- **Library ticket** — the pure-function policy + standalone Activity (in its own NEW file). Owner can be anyone if the library is in a shared module.
- **Wiring ticket** — the integration into an existing core file (`process_build_instruction.py`, `workflow.py`, Build Agent loop, etc.). **Owner is the file's domain owner** (usually Cesar for Build Agent core).

The split exists specifically so the wiring stays in the file-owner's lane. Bundling both into one PR violates this pattern even if the library half is in your domain.

## Empirical case — T-M3-45 + T-M3-74 (2026-05-23 Saturday)

| Phase | What happened |
|---|---|
| Original ticket | T-M3-45 — Build session checkpoint policy + Activity. We had `owner:farzaneh` on this at some point (was in our remaining 7 queue). |
| We shipped | **PR #375** (2026-05-21, 1,096 LOC across 7 files). Bundled: (1) `should_checkpoint()` predicate; (2) `write_checkpoint()` library with full BUILD-4 reproducibility-triple Blob CAS upload; (3) Temporal Activity wrapper; (4) **modifications to `process_build_instruction.py` (+83 LOC) + `workflow.py` (+47 LOC)** to dispatch the Activity from inside Cesar's Build Agent loop. |
| Cesar shipped | **PR #467** (T-M3-45, 2026-05-23 23:44 UTC, 596 LOC across 6 files). LIBRARY ONLY. Split into two clean files: (1) `checkpoint.py` (68 LOC) — pure predicate, workflow-deterministic-safe, zero I/O; (2) `activities/write_checkpoint.py` (179 LOC) — the Activity. Synthetic CAS payload key as placeholder; full Blob CAS deferred to v1.5 per BUILD-4 follow-up. **Zero modifications to his core files.** |
| Then 6 minutes later | **PR #468 — T-M3-74** (2026-05-23 23:50 UTC). Title: "checkpoint policy wire into Build Activity post-apply_edit". Owner: `owner:cesar`. THIS was the wiring ticket. Modified `process_build_instruction.py` (+79 LOC) — the SAME file we modified in PR #375. He had pre-split this work into a separate ticket explicitly to keep the wiring in his lane. |
| Outcome for our PR #375 | **Effectively orphaned.** Cesar's PR #467 + PR #468 together fulfill what we shipped in #375. Our 521-LOC `checkpoint.py` mega-file conflated policy + I/O (violating Temporal's deterministic-workflow rule); our modifications to `process_build_instruction.py` + `workflow.py` were doing T-M3-74's work without realizing T-M3-74 existed. |

## The lesson

**Before claiming or scoping any ticket that might touch Cesar's core files, do a pre-flight related-ticket scan:**

1. Search GitHub issues for the topic with broad keywords (e.g., "checkpoint", "replan", "OOS", "scorecard")
2. Look for adjacent tickets with `owner:cesar` labels covering the same area
3. If you find two tickets where one is "library" + one is "wiring/integrate into X" — that's the pre-split pattern. Stay in YOUR ticket's scope only.
4. If your ticket is the library, ship just the library. Do NOT preemptively wire it into Cesar's core files even if it "would save him a ticket."
5. If you're not sure whether a modification belongs to your ticket or a sibling ticket, ask in WhatsApp before opening the PR.

## Mechanical pre-flight gate

Adding to the per-ticket workflow's REASONING REQUIREMENT (Cesar's `/start-amira-issue` lock):

```
Before opening any PR that modifies a file in `apps/api/src/amira_api/runtime/agents/build/`
or any file under Cesar's named ownership (build / skills / canvas / runtime/temporal_client):

1. Run: gh issue list --label owner:cesar --search "<topic-keyword>"
2. If 2+ tickets in the same area, identify the library/wiring split
3. If the file you're modifying belongs to a SIBLING ticket, STOP — refactor
   your PR to only ship YOUR ticket's scope, file a follow-up note that the
   wiring depends on Cesar's parallel ticket.
4. NEVER modify Cesar's core files just because it "feels efficient to bundle"
```

## Related locks this reinforces

- **`feedback_cesar_quality_bar_m1_backend.md` Rule #8** ("When Cesar says 'I will fix X', he fixes X — leave HIS files alone") — pre-split-ticket pattern is the structural reason behind that rule. The "X" he'll fix is often pre-scheduled as a separate ticket.
- **`feedback_library_vs_consumer_dependency_direction.md`** — when an issue body says "wire into X" + X is a separate ticket, check the Depends-on field. T-M3-45 → T-M3-74 fits this exactly.
- **`feedback_no_carveouts_pull_until_complete.md`** — has a tension with this lock: pull-until-complete says ship the full feature; pre-split-ticket-check says respect ticket boundaries. **Resolution**: pull-until-complete applies WITHIN your ticket's scope. Pre-split-ticket-check determines what your ticket's scope IS. Pull-until-complete within scope ≠ bundle two tickets.

## Risk profile this exposes for our open PR queue

Looking at our 13 open Spec Agent PRs through this lens, the at-risk one is:

**PR #388 (ticket 11 — bidirectional Build → Spec replan signal)** — explicitly modifies Cesar's Build Agent `workflow.py` to wire the `signal_spec_replan` Activity into the OOS-blocked branch. Cesar has since shipped three SEPARATE tickets for Build-side replan triggers: **T-M3-95** (plan-checklist-gap detection), **T-M3-103** (OOS-override structural signal), **T-M3-104** (mid-exec capability discovery). This is the same pre-split pattern. Likely outcome:
- Spec-side receiver (our `runtime/agents/spec/activities/emit_replan_requested_from_build_narration.py` + workflow handler) → safe, in our domain
- Build-side trigger code (Build workflow.py mods + `signal_spec_replan.py` Activity + `emit_replan_cap_reached_audit.py`) → likely rejected; will be replaced by Cesar's T-M3-95/103/104 shape

Other PRs in our queue mostly stay in `apps/api/src/amira_api/runtime/agents/spec/` and `domain/spec/` — our domain. Lower risk.

## When this matters most

- Any ticket whose deliverable mentions "wire into" / "integrate with" / "hook into" Cesar-owned modules
- Any work that touches: `process_build_instruction.py`, build agent `workflow.py`, `temporal_client.py`, skill catalog routes, canvas persistence
- Any time the issue body says "Files to modify" includes files NOT in your usual edit surface

## Empirical reference

First applied retrospectively: PR #375 outcome (2026-05-23). Pre-flight scan would have caught T-M3-74 existed and prevented us from modifying `process_build_instruction.py` and `workflow.py` inside the T-M3-45 PR.

## Second instance brewing — shared agent-runtime harness (HARNESS-LIMITS-1)

Banked 2026-05-26 Monday morning after weekend study. Cesar shipped `runtime/agents/_shared/agent_runtime/loop.py` + `pricing.py` (PR #487) — a shared `run_agent_turn` loop with circuit breakers + pricing module, intended for Build + Deploy + (presumably eventually) Spec agents.

**Our ticket 1 (PR #377)** shipped a hand-rolled ReAct loop directly inside `runtime/agents/spec/activities/elicit_turn.py`. Same pattern risk as PR #375: the agent-runtime harness is the canonical place for ReAct + tool dispatch + circuit breakers + pricing; our inline implementation in `elicit_turn.py` may eventually be expected to refactor onto the shared harness.

**Why this isn't blocking Phase 12**:
- Our hand-rolled loop works (proven Saturday's session: 34 successful tool calls across 2 turns)
- The shared harness is for the Build + Deploy ReAct loops; refactoring Spec onto it is a structural cleanup, not a runtime correctness issue
- Phase 12 validates the AGENT'S BEHAVIOR, not the loop implementation. Either implementation produces the same behavior.

**Likely outcome when Cesar reviews PR #377**:
- (Most likely) Merges as-is + opens a follow-up ticket "refactor spec elicit_turn onto _shared/agent_runtime"
- (Possible) Asks us to refactor first before merge
- (Worst case) Re-implements ticket 1 himself on the shared harness — same as PR #375 outcome

**Pre-flight gate update** (incremented from the original):

```
Before opening any agent-runtime ticket (Spec or Build or Deploy) that adds:
  - ReAct loop logic
  - Tool dispatch
  - Circuit breakers / pricing / retries
  
1. Check runtime/agents/_shared/agent_runtime/ — does shared infrastructure already exist?
2. If yes, use it as the import boundary. Don't reimplement.
3. If no, build it in _shared/agent_runtime/ FIRST, then your agent imports it.
```

This protects against the "redundant hand-rolled loop" case the same way the library/wiring split protects against modifying-Cesar's-core-files cases.
