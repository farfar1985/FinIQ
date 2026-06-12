---
name: pre-build-comprehensive-audit-workflow
description: "BEFORE writing any code on a non-trivial ticket, run the 5-phase comprehensive pre-build audit: (1) pre-claim study, (2) manual brainstorm when ambiguous + Cesar unavailable, (3) adversarial self-review against ALL applicable locks, (4) consolidated 🟢/🟡/🔴 audit table, (5) execute. The build phase becomes execution, not discovery. Empirical: PR #360 (T-M3-50) shipped with 2 picks self-flipped pre-code + 2 real LLM-shape bugs caught by pre-commit smoke; zero rework after coding started. Farzaneh locked this as the default workflow 2026-05-20 late-PM."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

For every non-trivial ticket I claim, run the 5-phase comprehensive
pre-build audit BEFORE writing a single line of code. The audit
phase produces a fully-locked design + a green-lit rules-compliance
table; the build phase is execution, not discovery.

Farzaneh locked this as the default workflow on 2026-05-20 late-PM
after observing the pattern's effectiveness on PR #360 / T-M3-50.

## Why this rule exists

Empirical evidence from 2026-05-20:

- **PR #358 (#137 OOS guard)** — partial pre-build pattern. Caught
  2 trigger-word violations late in the verification phase + 1
  master FK-resolution bug mid-test. Rework cost: ~30 minutes.
- **PR #359 (#115 Compliance Matrix API)** — better. Manual
  brainstorm applied, 6 decisions surfaced + approved. Caught a
  mid-flight scope correction (route ownership between #115 and
  #119) + 1 Pydantic `min_length` bug pre-test. Rework cost: ~15
  minutes.
- **PR #360 (#143 LLM-judge)** — **full pre-build audit pattern**.
  Brainstormed 5 decisions; 2 self-flipped under adversarial pressure
  pre-code (Protocol over new file; drop Pydantic-shape tests once I
  noticed they're banned). Comprehensive rules audit table walked
  through 7 engineering standards + 8 quality-bar rules + 7
  test-shape locks + customer-agnostic + foundation drift + tooling
  + project rules. Caught 2 real LLM-shape bugs via pre-commit
  real-Haiku smoke (`agent_role` Literal mismatch + NFR-3 assertion
  too strict). Rework cost after coding started: **zero**.

The discipline scales: the more comprehensive the upfront audit, the
cleaner the build phase. Tickets ship faster because the design
phase already absorbed the friction.

# The 5-phase workflow

## Phase 1 — Pre-claim study (~10-20 minutes)

Before flipping the label. Outputs a "yes/no can we even start?" verdict.

**Steps:**

1. Read the ticket body via `gh issue view <N>`. Capture:
   - Owner label (`owner:farzaneh` vs `owner:cesar`)
   - State label (`ready` / `in-progress` / `blocked`)
   - Editorial flag scan: any `[EDITORIAL FLAG]` / `[STOP]` /
     `[BLOCKED]` markers? (per `feedback_start_amira_issue_locks.md`
     zeroth step)
   - File list in the deliverable
   - Depends-on chain
2. Read the cited plan area + relevant `architecture/04-decisions.md`
   entries.
3. Library-vs-consumer dependency direction check (per
   `feedback_library_vs_consumer_dependency_direction.md`): if the
   deliverable says "wire into X" and X is a separate ticket, check
   `Depends on:` field on BOTH tickets. Surface to Cesar if
   ambiguous.
4. Verify dependencies: are they shipped (on master)? In one of our
   own open PRs (chain off)? Cesar's lane (wait or stub)?
5. Cross-check against shipped codebase: any path drift in the issue
   body's file list? Any deleted/renamed modules referenced? (per
   `feedback_cross_check_issue_deliverables_against_locks.md`)

**Verdict:** can we claim this ticket cleanly? If editorial-flagged
or depends on unshipped foundation we don't own → surface to Cesar
+ park.

## Phase 2 — Manual brainstorm (when ambiguous + Cesar unavailable)

Per `feedback_brainstorm_skill_manual_when_cesar_unavailable.md`.

**Trigger:** Phase 1 surfaced ≥2 ambiguous design decisions AND Cesar
is unavailable (rate-limited / WhatsApp lag / hours-out).

**Steps:**

1. Identify each ambiguity (plan silent, plan + codebase contradict,
   multiple defensible reads).
2. Present 2-3 options + tradeoffs per ambiguity:
   ```
   ### Decision N: <question>
   **Problem:** <one sentence>
   | Option | Tradeoff |
   | A | matches existing pattern X; adds Y |
   | B | simpler but Z |
   **My pick: <letter>.** Rationale + anchor to existing locks.
   ```
3. Surface to Farzaneh as a brainstorm output.
4. Farzaneh picks (or asks clarification or surfaces to Cesar).
5. Lock the decisions in writing (typically in the PR body's "How
   integrates" section + a brainstorm doc if Cesar's pattern calls
   for one).

## Phase 3 — Adversarial self-review (~10 minutes)

After Phase 2's decisions are locked, walk through every applicable
lock category and audit each pick. Flip picks that don't pass.

**Categories to audit (in this order — heaviest weight first):**

### A. `plan/00-engineering-standards.md` — 7 binding standards

1. Fail loud, no silent fallbacks (Standard #1)
2. Senior code quality, no smelly hacks
3. AI prompt discipline (structured tool-use + Pydantic + cached
   prompts + versioned under VCS) — applies if LLM code
4. `context7`-verified deps + current stable versions
5. Realistic e2e tests
6. Retry & timeout discipline
7. Logging discipline (structured JSON + correlation IDs)

### B. `feedback_cesar_quality_bar_m1_backend.md` — 8 binding rules

1. Tickets are claimed → PR'd → green-lit (label workflow)
2. Single commit per ticket
3. PR body — 6 sections in exact order
4. Surface foundational ambiguity BEFORE claiming (Phase 1's job)
5. Adversarial self-review (THIS phase)
6. Review critically; absorb ambiguity with defensible defaults
7. ~~File follow-up tickets~~ SUPERSEDED by Rule 8
8. Pull-until-complete; no carve-outs by default

### C. Test-shape locks

- `feedback_test_shape_rule.md` (PR #301) — full-reality tests + 10
  banned shapes
- `feedback_test_the_user_visible_contract_not_adjacent_shapes.md`
  — assert exact wire shape consumer reads + follow end-to-end path
- `feedback_no_real_behaviour_nothing_moves.md` — real
  keys/services; NO fallback to canned responses or mocked creds
- `feedback_no_skip_scaffolded_tests.md` — no `pytest.mark.skip("ship
  harness in #N")`
- `feedback_smoke_test_llm_tool_use_pre_commit.md` — real-Anthropic
  smoke before commit on any LLM code
- `feedback_test_shape_matches_deliverable_shape.md` — shell =
  structural; behavior = integration
- `feedback_minimal_bytes_to_pass_tests_is_simulation.md` — real
  renderer not hand-crafted bytes

### D. Customer-agnostic + jargon discipline

- CLAUDE.md "platform code is customer-agnostic" — no FinIQ / Mars
  naming in platform files (test files can reference fixtures
  with scenario data, but file names should be generic)
- `feedback_avoid_jargon_amira_mars.md` — banned: triage / north
  star / swimlane / circle back / low-hanging fruit / synergy
- `feedback_no_carveouts_pull_until_complete.md` banned trigger
  words: "future ticket" / "deferred to" / "Will run cleanly under
  CI" / "Windows asyncio (blocks X)"

### E. Closing-PR + carve-outs

- `feedback_closing_pr_must_file_carveouts.md` — every issue-body
  deliverable bullet must ship in the closing PR, OR file the
  carve-out ticket in the same session. PR's test list MUST match
  the issue body's test list (FR-1 / NFR-3 / AC-1 scenarios all
  ship if the issue body names them).
- `feedback_no_carveouts_pull_until_complete.md` — no follow-up
  tickets filed off this PR

### F. Foundation drift discipline

- `feedback_fix_foundation_dont_defer.md` — plan-doc + TEP path
  fixes in the same PR
- `feedback_cross_check_issue_deliverables_against_locks.md` — plan
  is canonical when issue body lags

### G. Tooling discipline

- `feedback_sqlmodel_use_exec_not_execute.md` — `session.exec` not
  `session.execute`
- `feedback_run_tooling_directly.md` — direct `uv run pytest`, not
  wrappers
- `feedback_no_temporal_jargon.md` — no Workflow/Activity jargon in
  user-facing prose

### H. Project-level (Farzaneh)

- One PR per ticket (locked 2026-05-20)
- Per-action confirmation for remote writes (label flip, gh issue
  develop, push, gh pr create, label flip — 5 steps minimum, never
  bundled)
- Brainstorm-skill manual when Cesar unavailable
- ALWAYS surface CLAUDE.md diff before edit
- This pre-build audit workflow (locked 2026-05-20)

**Flip picks that don't pass.** Don't defend a pick under pressure
— the cost of flipping pre-code is minutes; the cost of flipping
mid-build is hours.

## Phase 4 — Consolidated audit table

Produce a 🟢 / 🟡 / 🔴 table summarising the audit. Surface 🟡 and
🔴 explicitly with proposed handling.

**Format:**

```
| Category | Status | Notes |
|---|---|---|
| 7 engineering standards | 🟢 all green | (per-standard summary) |
| 8 quality bar rules | 🟢 all green | ... |
| Test-shape locks | 🟢 or 🟡 | (any refinements caught) |
| ... | ... | ... |
```

**🟡 items get explicit handling**: either flip the pick to resolve,
or document the deliberate compromise in the PR body for Cesar's
review.

**🔴 items block.** Stop. Surface to Farzaneh. Surface to Cesar if
escalation needed.

## Phase 5 — Execute (with per-action confirmation)

Once the audit table is fully green (or yellows have documented
handling), proceed with the per-ticket workflow:

1. Label flip `ready` → `in-progress` (per-action confirm needed)
2. `gh issue develop <N> --base <branch> --checkout` (per-action
   confirm)
3. Code each file per the locked plan
4. Tests (4-10 typically, depends on ticket scope)
5. Verification gate: ruff + 3× deterministic + adversarial
   trigger-word grep + pre-commit real-LLM smoke if applicable
6. Foundation drift fixes (plan/TEP path corrections, etc.)
7. `git add` explicit file list (NO `-A`)
8. Single commit, Cesar-style multi-section message
9. `git push -u origin <branch>` (per-action confirm)
10. `gh pr create` with 6-section body (per-action confirm)
11. Label flip `in-progress` → `needs-review` (per-action confirm)

# When to apply the full workflow vs lightweight check

## Full workflow (Phases 1-5)

Apply when:

- Ticket has ≥2 ambiguous design decisions
- Ticket touches contract surface (architecture lock, API contract,
  cross-area types)
- Ticket integrates with downstream tickets (chained PR, shared
  contracts file, etc.)
- Cesar is unavailable for clarifications
- The deliverable is a non-trivial library + tests (≥3 files)

## Lightweight check (Phases 1 + 5 only — skip 2-4)

Apply when the area file pins every detail AND the deliverable is
truly mechanical:

- Single-file path correction
- Single-line typo fix
- Migration that registers a single audit kind whose payload + presence
  rules are already pinned in plan
- Adding one row to a stable enum

Even in lightweight mode, ALWAYS run:

- Editorial flag scan
- Trigger-word grep on touched files pre-push
- 3× deterministic test gate (or whatever verification the area file
  prescribes)
- Per-action confirmation for remote writes

## Mechanical-vs-non-trivial heuristic

If the ticket's brainstorm doc would be empty (no real choices to
make), it's mechanical. If the brainstorm doc would have ≥2
decisions, it's non-trivial.

# Today's PR #360 as the canonical example

The full pre-build audit applied to T-M3-50 produced this trace:

| Phase | Output |
|---|---|
| 1. Pre-claim study | Editorial flag scan clean ✓; owner:farzaneh ✓; ready label ✓; dep #357 not on master but chained off it; library-vs-consumer direction check ✓ (we own both ends) |
| 2. Manual brainstorm | 5 decisions surfaced — ctx Protocol vs new file / single test file / hybrid test shape / branch base / fixture location. Picks made + Farzaneh approved. |
| 3. Adversarial self-review | 2 of 5 picks FLIPPED under pressure: D1 (Protocol over file — avoids wasted file on rebase); D3 (drop Pydantic-shape tests — they're banned by `feedback_test_shape_rule`); D4 (off #357 not #359 — 1-hop chain). |
| 4. Audit table | All 7 categories green; 1 yellow (closing-PR carve-out refined the test plan from 6 to 7 tests so issue-body's FR-1/NFR-3/AC-1 scenarios all ship). |
| 5. Execute | 7 tests 3× green; 2 real LLM-shape bugs caught by pre-commit real-Haiku smoke; zero rework after coding started. |

The 2 catches the pre-commit smoke surfaced were also evidence of the
workflow paying off — both would have been embarrassing in PR review
if they'd shipped silently.

# Cross-reference

Related locks (all integrated into Phase 3):

- `feedback_cesar_quality_bar_m1_backend.md` — Cesar's 8 binding rules
- `feedback_start_amira_issue_locks.md` — `/start-amira-issue`
  pre-flight gate
- `feedback_pre_flight_lock_ack_required.md` — when Cesar says ACK
  before code, that's a HARD gate
- `feedback_brainstorm_skill_manual_when_cesar_unavailable.md` —
  Phase 2's substrate
- `feedback_claude_md_management_skill.md` — CLAUDE.md diff-before-edit
  rule (applies during Phase 5 if we touch CLAUDE.md)
- `feedback_smoke_test_llm_tool_use_pre_commit.md` — Phase 5's LLM
  smoke gate
- `feedback_no_remote_writes_without_confirm.md` — Phase 5's
  per-action confirmation rule
- `feedback_fix_foundation_dont_defer.md` — Phase 5's foundation
  drift sweep
- `feedback_test_shape_rule.md` + `feedback_test_the_user_visible_contract_not_adjacent_shapes.md`
  + `feedback_no_real_behaviour_nothing_moves.md` — Phase 3's
  test-shape audit substrate

# 2026-05-20 evening addendum

## The "are you confident?" adversarial trigger

When Farzaneh asks "are you confident?" or "are your picks the
best decisions?" after Phase 2/3 — treat it as a HARD pause. Re-run
Phase 3 (adversarial self-review) with explicit attention to:

1. Have you overridden codebase house style on a default
   best-practice instinct? (See
   `feedback_house_style_beats_best_practice.md`.)
2. Have you used "pull-until-complete" reasoning to widen scope
   past `feedback_no_infra_without_caller.md`?
3. Did you label something a "smelly hack he probably regrets"
   without precedent-checking?

Empirical from 2026-05-20 evening on T-M3-48 / PR #361:
two flip-points (D1 Pattern shape, D6 docs-only) both surfaced
under this trigger. Both flips were back to the original picks I'd
overcorrected away from. The trigger consistently produces
useful re-evaluation.

## Docs-only ticket variant

For docs-only architectural-lock tickets (T-M3-48 / PR #361 is the
canonical example), Phase 4-5 differ:

- **Phase 5 verification gate** is NOT `make test 3×` — it's:
  - Adversarial grep on 13 banned trigger words → 0 hits
  - Cross-reference density count (e.g., new term referenced N
    times across all touched files; internal consistency)
  - Python AST parse on any Pydantic/code snippets in markdown
  - Foundation drift sweep across cited sibling docs
- **Tests section in PR body** explicitly says "None — docs-only
  ticket. `feedback_test_shape_rule.md` bans Pydantic shape tests;
  first behavioral tests land in <consumer ticket> with the reader."
- **CHANGELOG entry mandatory** when the lock spans 2+ files in
  `architecture/`. Format from PR #359 + #361 precedent.

The lightweight check from the original "skip phases 2-4 for
truly mechanical tickets" does NOT apply to architectural locks —
they're docs-only but still need the full audit because the lock
becomes binding for every downstream consumer.

# Aphorism

*"The build phase is execution, not discovery. If the design
absorbed the friction, the code lands clean. If the code absorbs the
friction, the PR review costs hours."*
