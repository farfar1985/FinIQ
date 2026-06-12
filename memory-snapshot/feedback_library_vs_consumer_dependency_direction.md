---
name: library-vs-consumer-dependency-direction
description: "When an issue body's deliverable says 'wire into X' + X is a separate ticket, the wiring direction is often the opposite of what the wording implies. Check the Depends-on field on BOTH tickets. If X depends on this ticket, then X imports THIS library — the wiring lands in X's PR, not ours. Surface to Cesar if direction is unclear."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

When an issue body's deliverable says *"wire into X"* / *"wired into X"* / *"integrate into X"* — and X is a separate ticket — **do not assume the wiring is in this ticket's scope**. The wording can name either:

- **A**: this PR ships the wiring (this ticket's scope includes the integration into X)
- **B**: X will import the library this ticket ships (the integration is in X's PR, not ours)

**To distinguish, check the `Depends on:` field on BOTH tickets**:

- If **X's `Depends on:` field references THIS ticket** → direction is **B** (X imports our library; the wiring is X's job; the "wired into X" wording in our deliverable is just naming the downstream consumer for context, NOT our scope)
- If **THIS ticket's `Depends on:` field references X** → direction is **A** (X already exists; we wire into it; the wiring IS in our scope)

When the direction is ambiguous from the issue bodies alone, surface to Cesar via WhatsApp before claiming.

# Why this rule exists

T-M3-44 (#137 Out-of-scope guard Build-side) issue body deliverable said:

> *"`check_in_scope(project_id, candidate)` ... Wired into BuildAgentWorkflow turn loop ... and into `add-resource-drawer` POST handlers (§2.6): pre-bind check..."*

Initial reading suggested this PR ships BOTH wirings: BuildAgentWorkflow integration AND add-resource-drawer integration. But:

1. `add-resource-drawer` POST handlers weren't on master (we'd need to ship them)
2. Surfacing to Cesar revealed the truth (his WhatsApp 2026-05-20 9:34 AM):

> *"DO NOT pull #105. The dependency goes the other way: #105 depends on #137, not the reverse (#105 has T-M3-44 in its Depends on field). The ticket body wording 'Wired into add-resource-dra…' is naming the LIBRARY's downstream consumer, not #137's scope. The drawer-route wiring lands when Cesar takes #105 and imports check_in_scope."*

So the wording was direction-**B** (X imports our library), not direction-**A** (we ship the wiring). #137's scope is just the library + BuildAgentWorkflow wiring (where the consumer DOES exist via PR #355). The add-resource-drawer wiring lands in #105's PR when Cesar takes it.

# How to apply

## Before claiming any backend ticket with "wire into X" wording

1. Read the ticket body's deliverable line carefully.
2. Identify every "wire into X" / "integrate into X" mention where X is a separate ticket.
3. For each X:
   - Run `gh issue view <X>` and check its `Depends on:` field.
   - If `Depends on:` references the current ticket → **direction B** — the wiring is in X's PR, not ours.
   - If the current ticket's `Depends on:` references X → **direction A** — the wiring is in our PR.
   - If neither references the other → **ambiguous** — surface to Cesar before claiming.

## Likely candidates in our backlog

Tickets where this pattern likely applies (worth re-reading their bodies with this lens):

- **#143 T-M3-50 LLM-judge wrapper** — probably wires into detector orchestration (#144). #144 has T-M3-50 in its Depends-on field → direction B → wiring lands in #144's PR.
- **#142 T-M3-49 static-analysis probe** — likely wires into #144 too → direction B → wiring in #144.
- **#115 T-M3-22 matrix API** — its routes that ship signatures may have consumer-direction wiring in #119 (T-M3-26) / #120 (T-M3-27).
- **#138 T-M3-45 Build session checkpoint** — depends on T-M3-13 (Cesar's Canvas read endpoints) so probably direction A for that consumer.

When studying any of these, apply the Depends-on cross-check first.

## When in doubt — surface to Cesar

Per Rule #4 of `feedback_cesar_quality_bar_m1_backend.md` (surface foundational ambiguity before claiming), if the dependency direction isn't clear from the issue bodies, send a 1-line WhatsApp asking. Example:

> *"re #N — body says 'wired into X'. X (#M) doesn't appear on master yet. is the wiring in this PR's scope, or does X's PR import our library when X ships?"*

Cesar typically clarifies within minutes if he's at his desk.

# Cross-reference

Related locks:
- `feedback_cross_check_issue_deliverables_against_locks.md` (in `docs/team-locks/`) — issue body lags architecture; cross-check against plan + CHANGELOG + locks
- `feedback_no_carveouts_pull_until_complete.md` — pull upstream into same PR
- `feedback_cesar_quality_bar_m1_backend.md` Rule #4 — surface foundational tickets BEFORE claiming

# Aphorism

*"The wording 'wired into X' tells you the consumer, not the scope. Check the Depends-on field to learn who ships the wire."*
