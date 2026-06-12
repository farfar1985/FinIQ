---
name: build-readiness-scorecard-pattern-quality-gate-with-composite-categorical-agent-iteration-loop
description: "2026-05-23 morning. Banked from the ticket 12 design study (Direction D Spec Agent overhaul). When the task is \"add a quantitative quality gate\" — composite scoring + per-dim findings + agent-iteration loop pulling from spec-kit + Karpathy + FinIQ matrix is the right pattern. Reusable for future tickets that ask \"is this artifact good enough to proceed?\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## When to use this pattern

Trigger conditions:
- A multi-step agent workflow produces an artifact (spec, build plan, deployment manifest) that needs to be "good enough" before proceeding to the next phase.
- Existing structural / lock-eligibility checks aren't enough — the question shifts from "is this internally consistent?" to "is this executable by the next agent in the chain?"
- The artifact-quality question has multiple dimensions that need INDIVIDUAL inspection (not just a single rubric pass/fail).
- Phase 12 / eval-harness work needs data to tune against.

Examples:
- ✅ Ticket 12 — build-readiness scorecard between locked spec + Build Agent kickoff
- ✅ Future: deploy-readiness scorecard between approved Build + Deploy Agent
- ✅ Future: companion-readiness scorecard between built app + Companion Agent registration
- ❌ NOT — simple validation ("does the field exist?") — that's a rubric row or consistency-check finding, not a scorecard
- ❌ NOT — pure structural integrity (cycle detection alone) — that's a single dimension, not a multi-dim scorecard

## The three references to synthesize

### Spec-kit `/analyze` (github/spec-kit)

Borrowable:
- **Categorical severity heuristic** (CRITICAL / HIGH / MEDIUM / LOW) for findings
- **Constitution-as-CRITICAL** pattern (locked decisions can't be negotiated; flag conflicts automatically critical)
- **Per-finding affected_ids** so the agent can target its next iteration precisely

NOT borrowable:
- Markdown-by-LLM output shape — Amira uses Pydantic-validated structured outputs (Standard #3)
- No-composite scoring — spec-kit reports counts per severity but doesn't combine into a single number; Amira needs composite for the gate decision

### Karpathy eval framework

Borrowable (anchor philosophical principles):
- **Frozen evaluator** — scorecard weights + thresholds + dimension set don't change while system optimizes against them. Bump version when changing.
- **Binary or scalar per criterion** — each dimension scores 0-100 cleanly; avoid fuzzy ranges
- **Keep-or-revert protocol** — agent iterates → re-score → keep improvement or revert. The Spec Agent's re-request_lock IS the keep-or-revert loop.
- **Targets reflect risk surface** — 95%+ for safety-critical, 80-85% for nice-to-have
- **Regression gate not creative tool** — scorecard catches regressions; doesn't guide creative spec-writing

NOT borrowable directly:
- Single scalar dogma — Karpathy prefers one metric but allows weighted composite for multi-dimensional domains
- Fixed wall-clock budget — Amira's cost guard is Haiku-call-count + cache breakpoints, not wall-clock

### FinIQ compliance matrix

Borrowable lessons:
- **Ternary > binary scoring** — pure pass/fail loses information; pure 0-100 per dim is even richer (Amira adopts 0-100)
- **Atomic dimensions** — split vague requirements into atomic checks (FinIQ's FR8.3 "WebSocket" was too broad → split into server + client)
- **Composite scoring + per-category weights** drives iteration cadence
- **95+ ambition** for the overall composite — pressure to fix the "complete-but-buggy" items

NOT borrowable directly:
- 80-item granularity — wrong scope when scoring the artifact itself (not the system's full deliverables)
- Batch-gating cadence — Amira agent iterates turn-by-turn, not batch-by-batch

## The pattern (locked 2026-05-23 Farzaneh + 7-pick design)

### Architecture

```
1. Pure-Pydantic types module (sandbox-safe imports)
   - <Name>Score (composite + threshold + per-dim breakdown)
   - <Name>DimensionResult (score 0-100 + weight_pct + findings + method + llm_call_succeeded)
   - <Name>Finding (severity Literal + message + suggested_fix + affected_ids)
   - 1 verdict shape per LLM-judged dimension
   - <Name>Config (weights dict + thresholds + version) frozen per-deployment

2. Pure-deterministic module
   - N dimension functions (deterministic algorithms)
   - Composite calculator (weighted average → rounded int 0-100)
   - Hybrid composer (deterministic-ceiling + LLM-can-only-drop)
   - list_<dim>_needs_haiku_check() helpers per supplemental LLM dim

3. LLM-judge module
   - N Haiku judges with forced tool-use + 1h cache breakpoint
   - Asymmetric failure: PRIMARY judges fail loud (drop to 40, below floor)
   - SUPPLEMENTAL judges fail soft (return None, hybrid composer falls back)

4. Activity wrapper
   - Opens DB session
   - Loads artifact rows
   - Dispatches deterministic + LLM dims
   - Composes score via the pure module
   - Emits audit row with full breakdown
   - Returns score for caller's gate decision

5. Workflow integration as the gate
   - Place inside the workflow's gate signal handler (e.g. request_lock)
   - On failure: emit findings-narration + stay in RUNNING state for agent iteration
   - On pass: continue to next state transition
```

### 7-pick checklist for new scorecards

When designing a new scorecard, surface these 7 picks to the user up front:

1. **D1 — Number of dimensions** (5 leaner vs 7+ comprehensive). 7 covers most artifact-quality questions; 5 if scope is genuinely narrower. Each dim should be ATOMIC + ORTHOGONAL.
2. **D2 — Composite vs categorical** — always BOTH. Composite for the gate decision (boolean: ship/iterate); categorical for actionable findings the agent iterates on.
3. **D3 — Placement** — usually inside the workflow's gate signal handler, NOT at the consuming route. Match the existing pattern (e.g., readiness + consistency live at request_lock — new scorecard joins them).
4. **D4 — LLM integration shape** — multi-Haiku (1 per LLM-amenable dimension) if dimensions are heterogeneous; single Haiku tie-breaker if the rubric is mostly deterministic.
5. **D5 — Threshold + per-dim floor** — composite ≥X AND no dim <Y. Floor prevents one-bad-dim being masked by good ones. Start strict (FinIQ-ambition); Phase 12 tunes.
6. **D6 — Failure UX** — agent iterates on findings (NOT a separate route 409). Workflow stays RUNNING + emits findings-narration + next agent turn reads findings.
7. **D7 — Eval harness scope** — audit emit only in v1. Future ticket builds the harness that consumes audit data + tunes thresholds.

### Asymmetric failure semantics

Mirror the consistency check + ticket 7 OOS judge pattern:
- **Primary judges** (no deterministic fallback): fail loud per ORCH-4. LLM-call failure → dim drops to floor → forces iteration. Matches safety-gate contract.
- **Supplemental judges** (augment existing deterministic checks): fail soft. LLM-call failure → return None → hybrid composer falls back to deterministic-only score. Matches advisory contract.

The asymmetry tracks the structural role of the dimension. Same pattern as ticket 10's evaluator (advisory) vs ticket 7+8's judges (safety).

## House-style invariants

- **Deterministic-primary + Haiku-supplemental** for hybrid dimensions
- **Pydantic-typed everything**: shapes split from logic for sandbox-safety
- **Audit emit pattern**: one audit kind per scorecard run (pass or fail), full breakdown in payload
- **Forced tool-use + 1h cache breakpoint** on system + tool catalog (LLM-CACHE-1)
- **Per-org config knob** for thresholds (v1 hard-codes default; v1.1 surfaces per-org row)
- **Sandbox-safe types module** so workflow body can import without dragging DB / LLM heavy modules

## Related memory files

- `feedback_assessment_deep_study_workflow.md` — the 5-phase pattern that produced ticket 12's design
- `feedback_pre_build_comprehensive_audit_workflow.md` — pre-commit audit before shipping
- `feedback_test_shape_rule.md` — boundary-mock at LLM-client seam permitted for forced-tool-use judges; never mock the dimension functions
- `feedback_no_carveouts_pull_until_complete.md` — ship the FULL scorecard (all dims + composite + threshold + iteration loop); don't carve out
- `feedback_house_style_beats_best_practice.md` — match existing rubric / consistency / evaluator patterns; don't innovate on structure

## Empirical reference

First applied: ticket 12 PR #390 — `domain/spec/build_readiness*.py` + `runtime/agents/spec/activities/score_build_readiness_activity.py`. Locked 2026-05-23 morning. 7 dimensions, composite ≥85 + per-dim floor 70, 4 Haiku judges, 5 deterministic checks. Validation pending Phase 12 testing.
