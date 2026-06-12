# Bidirectional Spec ↔ Build Loop

**LOCKED 2026-05-21 evening by Cesar's WhatsApp** (Q4 of Spec Agent assessment).

**BOTH SIDES NOW SHIPPED 2026-05-23 overnight**:
- **Spec-side (our PR #388 ticket 11)** — `SpecAgentWorkflow.request_spec_replan` signal handler + `emit_replan_requested_from_build_narration` Activity + `SpecReplanRequest` Pydantic + `SpecReplanRequestedFromBuild` narration kind + audit-kinds migration; defensive APPROVED → ITERATING flip.
- **Build-side (Cesar's PR #436 / T-M3-95)** — Build → Spec replan signal via plan-checklist-gap detection. When Build Agent detects a mid-execution gap (plan-checklist item that the spec didn't anticipate), it signals back via Temporal `signal_with_start` with predictable workflow_id pattern.

**Phase 12 implication**: Layer 3 row 3.10 (Bidirectional replan signal) is now **end-to-end testable**. The full Karpathy bidirectional loop has both halves built. Was tagged as a "requires Build Agent integration → can't validate in Phase 12" row; promoted to a realistic weekend milestone after Cesar's overnight push.

**How to test the full loop end-to-end** (post weekend Phase 12 drive):
1. Drive a Spec session through to APPROVED state (using `phase12_test_drive_checklist.md` canonical prompt)
2. Build Agent picks up the locked spec, starts execution
3. Build Agent deliberately encounters something the spec didn't anticipate (test fixture: a plan-checklist item without a matching FR)
4. Build-side `signal_spec_replan` Activity fires
5. Verify the Spec workflow re-opens via the receiver Activity
6. Verify narration "replan requested from Build" lands in Spec chat panel with the Build context
7. Verify spec_version state flips APPROVED → ITERATING (per `iterating-replan` story)
8. User can then refine the spec; re-lock; Build resumes

**Risk register reminder**: 3-emit cap (`_REPLAN_EMIT_CAP=3`) prevents infinite loops if Build keeps detecting the same gap. Beyond cap, Build emits cap-reached audit + falls back to its normal OOS handling.

**Escalation-chain refinement** (added 2026-05-23 Saturday morning after Cesar's T-M3-99 `ask_user_question` shipped in #406):

Cesar's T-M3-99 gave Build Agent a structured `ask_user_question` tool. This sharpens when `request_spec_replan` should fire vs when Build should just ask the user inline:

```
Build encounters ambiguity / unexpected state
  ↓
  First response: Build calls `ask_user_question` (T-M3-99)
                  → structured options surface in Build session UI
                  → user picks / clarifies inline → Build proceeds
  ↓
  If user can't resolve OR ambiguity is structural in the spec
  (the FR is genuinely missing, not just unclear in conversation)
  ↓
  Escalation: Build calls `signal_spec_replan` (T-M3-95)
              → fires our PR #388 ticket-11 receiver Activity
              → Spec workflow re-opens with Build context
              → spec_version state flips APPROVED → ITERATING
```

**Trigger semantics tightened**: `request_spec_replan` should NOT fire for every Build-side ambiguity. It fires only when:
1. `ask_user_question` already tried and user can't resolve (e.g. answer is "I don't know, the spec should cover this"), OR
2. Build detects a structural gap that can't be expressed as a user question (missing FR class, missing capability node, missing skill binding the spec needs to declare), OR
3. Build hits the 3-strike OOS-after-retry case (existing risk-register trigger).

No code change needed in our PR #388 — the trigger conditions live in Cesar's Build-side T-M3-95 code. Just bank as a shared mental model for Phase 12 testing + future Build-Agent integration work.

## The pattern

Spec → Build is NOT a one-way handoff. When the Build Agent detects unexpected complexity, OOS-blocked instruction, or a structural gap in the locked spec mid-execution, it can re-open the Spec workspace via a new signal:

```
BuildAgentWorkflow detects spec gap
  → emits signal: SpecAgentWorkflow.request_spec_replan(reason, context)
  → SpecAgentWorkflow handler receives signal
  → spec_version state flips: approved → iterating-replan
  → Spec UI re-opens with the Build context surfaced as a system note
  → User refines spec
  → User re-routes for e-signature
  → Build Agent resumes from compatible checkpoint with updated spec_hash
```

## Cesar's exact words (2026-05-21 evening WhatsApp)

> for the 4th point yes in v1. It's what makes the specs --> development loop bidirectional

## Why this matters strategically

A one-way Spec → Build handoff treats the spec as a contract finalized at e-signature. Real software development surfaces unknowns during build — frameworks behave differently than expected, schemas don't compose, third-party APIs change. A bidirectional loop treats the spec as an ongoing source of truth that can be refined when reality differs from expectation.

This is what makes Amira's platform structurally different from "generate-an-app" tools (Replit Agent, v0.dev, Bolt.new) where the spec is implicit/captured-once and the build is the only iterative artifact.

## Implementation notes (locked in Direction D)

**Signal lives on SpecAgentWorkflow** (the workflow being resumed). Emit-side fires from BuildAgentWorkflow. Not the reverse — `BuildAgentWorkflow.request_spec_replan` would be wrong naming because Build isn't the workflow being signaled; Spec is.

**Trigger conditions** (Build-side detection):
- `agent.out-of-scope-blocked` audit emit + retry budget exhausted
- Permission gate denial + 3 consecutive retry failures
- Capability graph membership probe returns "miss" repeatedly during file ops
- Build Agent LLM emits explicit "spec gap" signal in a tool result (Cesar may detect this differently — pending T-M3-11 + #138 maturity)

**Context payload** (what Build passes to Spec on replan):
- `build_n` (which build invocation hit the gap)
- `instruction_that_failed` (the natural-language instruction Build was trying to execute)
- `gap_reason` (one of: oos-after-retry / permission-denied-after-retry / capability-miss / explicit-gap)
- `affected_files` (paths Build touched before pivoting)
- `correlation_id`

**Spec-side handling**:
- `_pending_replan_request: SpecReplanRequest | None` field on workflow
- Handler appends a system-note chat message: "Build Agent flagged a gap: {gap_reason}. Context: {instruction_that_failed}"
- spec_version state flips approved → iterating-replan
- New audit kind: `spec.replan-requested-from-build`
- New narration kind: `SpecReplanRequestedFromBuild` → frontend renders a system card with "View Build context" expander

**Frontend impact** (1 new narration kind + 1 new system card; modest):
- Add to `narration-reducer.ts` discriminated union
- Render in `chat-thread.tsx` as system card with red border + "from Build Agent" badge + context expander
- Add re-lock CTA to bring spec back to e-signable state

## What's NOT in this lock

- Whether Build pauses while waiting for Spec to re-lock (yes, BuildAgentWorkflow has `paused` state already — reuse it)
- Whether the replan can happen N times in one Build session (yes, no cap in v1)
- Whether multiple Build Agents can replan against the same Spec (yes, but only one at a time can hold the workspace token — already locked by per-session sandbox)

## Mechanical gate for similar future patterns

Before designing a "X → Y handoff" assume bidirectionality unless explicitly one-way-locked. Default = both directions allowed. One-way handoffs are special cases (e.g., spec → audit log is one-way; audit is append-only).

## ⚠️ PR #388 RISK PROFILE — banked 2026-05-23 Saturday afternoon

Our PR #388 (ticket 11) shipped BOTH the Spec-side receiver AND Build-side trigger code:
- ✅ Spec-side: `runtime/agents/spec/activities/emit_replan_requested_from_build_narration.py` + spec workflow handler + audit emit + state flip
- ⚠️ Build-side: `runtime/agents/build/activities/signal_spec_replan.py` (Temporal client signal-with-start) + `emit_replan_cap_reached_audit.py` + Build workflow.py OOS-blocked branch wiring

Cesar has since shipped THREE separate Build-side replan trigger tickets:
- **T-M3-95** (PR #436) — plan-checklist-gap detection
- **T-M3-103** (PR #464) — OOS-override structural signal
- **T-M3-104** (PR #465) — mid-exec capability discovery

**Prediction**: same pre-split pattern as T-M3-45/T-M3-74 will apply (see `feedback_cesar_pre_split_tickets_check_related_first.md`). Cesar likely:
1. Merges or absorbs our **Spec-side receiver** (no conflict — in our domain)
2. Rejects/replaces our **Build-side trigger code** (overlaps with his three already-shipped Build-side tickets)

**Action when this becomes relevant**: scope-narrow PR #388 to Spec-side only; file a follow-up note explaining the Build-side is now satisfied by Cesar's T-M3-95/103/104. Don't fight this — his Build-side is the canonical implementation; ours was a parallel-track artifact from when his work hadn't shipped yet.
