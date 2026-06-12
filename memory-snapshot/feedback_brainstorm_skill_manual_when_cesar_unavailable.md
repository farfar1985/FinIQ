---
name: brainstorm-skill-manual-when-cesar-unavailable
description: "Cesar's `superpowers:brainstorming` skill is referenced in his CLAUDE.md but NOT loaded as a callable Skill in our sessions. When a ticket has ambiguous design decisions AND Cesar is unavailable (rate-limited / WhatsApp lag / hours-out), apply the brainstorm workflow MANUALLY: identify each ambiguity → present 2-3 options + tradeoffs each → flag recommendation → Farzaneh picks → execute. Worked cleanly on #115 (6 decisions, 6 picks, zero rework)."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

When a ticket has ambiguous design decisions AND Cesar is unavailable
(rate-limited, WhatsApp lag, hours-out, end-of-day), **apply the
`superpowers:brainstorming` workflow MANUALLY** — the skill itself
isn't loaded as a callable Skill in our sessions (verified
2026-05-20: `Skill(skill="superpowers:brainstorming")` returns
"Unknown skill"; the skill is referenced in Cesar's CLAUDE.md but
the actual plugin isn't in any marketplace directory I can find).

The pattern is one of the explicit "when to invoke a skill manually"
triggers I should NOT confuse with the not-per-PR cadence default.

## Why this rule exists

2026-05-20 mid-day: Cesar hit his Anthropic rate limit (~10:44 AM)
and was out for ~2 hours. We had #115 (T-M3-22 Lock CF-COMPLIANCE-MATRIX)
queued — a contract-locking ticket with multiple ambiguous design
decisions. Cesar's CLAUDE.md says to invoke
`superpowers:brainstorming` before contract-locking work; the
TECHNICAL_EXECUTION_PLAN explicitly calls it out:

> "`superpowers:brainstorming` — only when a ticket *iterates a
> contract* (back-prop to `architecture/04-decisions.md` is
> required). Not for normal ticket execution."

But with Cesar unavailable, we couldn't ask him to resolve the
ambiguities. Farzaneh's framing:

> *"we dont have cesar, maybe for the tasks we dont know what to
> do we use the brainstorm skill and we choose the best. huh?"*

That's the rule: use the brainstorm skill (manually) to lock the
decisions ourselves, with Farzaneh picking from presented options.

# How to apply

## When this rule fires

✅ Triggers:

- A ticket has 2+ ambiguous design decisions (i.e., plan/area file
  doesn't fully specify, or specifies one shape but the
  codebase has drifted to another)
- AND Cesar is unavailable for the next 1-4 hours (rate-limit,
  WhatsApp lag, sleep, etc.)
- AND the ticket is in the explicit work queue (claimed by us or
  greenlit for us)

❌ NOT triggers:

- A ticket that's purely mechanical (plan pins every detail)
- A ticket where Cesar is available — surface ambiguities to him
  via WhatsApp instead
- "Interesting design question" without an actual ambiguity blocking
  the ticket — that's chatter

## The 5-step workflow (apply manually since skill not loaded)

### Step 1 — Identify each ambiguity

Read the ticket body, plan section, area file. For each design
decision that's NOT fully pinned, note:

- What's the question?
- What's the canonical source if any? (plan section, decision lock
  in `architecture/04-decisions.md`, codebase precedent)
- Why is it ambiguous? (plan silent, plan + codebase contradict,
  multiple defensible reads)

### Step 2 — Present 2-3 options + tradeoffs per ambiguity

Format:

```
### Decision N: <question>

**Problem:** <one-sentence why this is ambiguous>

| Option | Tradeoff |
|---|---|
| **A.** <option name + brief> | <tradeoff: matches existing pattern X but adds Y> |
| **B.** <option name + brief> | <tradeoff: simpler but Z> |
| **C.** <option name + brief> | <tradeoff: ...> |

**My pick: <letter>.** <one-paragraph rationale referencing existing
locks / patterns / precedents>
```

Each option must be a defensible read (no straw-man options).

### Step 3 — Flag my recommendation

For each decision, mark which option I'd pick + the rationale.
Anchor recommendations to existing locks:

- `feedback_no_carveouts_pull_until_complete.md`
- `feedback_test_shape_rule.md`
- `feedback_compliance_matrix_is_spec_coverage.md`
- existing precedent in `apps/api/src/amira_api/<area>/...`
- existing locked decision in `architecture/04-decisions.md`

If an option violates a lock or contradicts a codebase pattern, eliminate it.

### Step 4 — Farzaneh picks

Present all decisions in one block. Farzaneh either:

- **"go" / "approved"** — locks all my picks as-recommended; proceed
- **"flip N to <letter>"** — overrides individual picks
- **"can you re-explain N?"** — clarification cycle on a specific ambiguity
- **"hold"** — surface to Cesar instead (rare; usually means the
  ambiguity is bigger than I framed it)

### Step 5 — Execute

Lock the picks in the design (in PR body's `## How this PR integrates
with the system` section + the brainstorm doc if Cesar's pattern
calls for one). Then code, following the locked decisions.

## What worked cleanly (today's pilot)

**Ticket**: #115 / T-M3-22 Lock CF-COMPLIANCE-MATRIX (compliance
matrix API + SSE events + deploy-gate input).

**Ambiguities surfaced** (6 total):

1. `POST /recompute` write-side pattern — outbox event vs cursor table vs both
2. Stub-route 501 vs sentinel response vs comment-out
3. SSE narration emit ownership — #115 vs #118 vs #144
4. Audit-kind registration scope — all 5 here vs per-consumer-ticket
5. Architecture lock doc framing — full SIMPLIFY-13-1 entry vs minimal
6. Branch base — off PR #357's HEAD vs off master

**Farzaneh's response**: *"approved, lets go. make sure we dont pick
any against the rules we have so far and also in compliance with the
current codes."* All 6 picks held during implementation; zero rework
needed. PR opened cleanly as #359.

**Total time**: ~10 minutes of brainstorm + 10 minutes Farzaneh
review + go-ahead. Cesar would have likely answered the same way
(my picks aligned with existing locks); the manual workflow
let us ship without waiting hours for his response.

## When NOT to ship without Cesar's input

Some ambiguities ARE too big for manual brainstorm:

- A locked architecture decision (`COMPLIANCE-EVAL-1`, etc.) is
  contradicted by the ticket — surface to Cesar
- An ambiguity touches cross-tenant data security, billing, or
  Mars-side policy — surface to Cesar
- An ambiguity changes the project's binding rules (one PR per
  ticket, pull-until-complete, etc.) — surface to Farzaneh first,
  who decides whether to surface to Cesar

For these, the right move is "park the ticket until Cesar
responds" + work on a different ticket meanwhile.

## Cross-reference

Related locks:

- `feedback_claude_md_management_skill.md` — same manual-application
  pattern but for the `claude-md-improver` skill (different scope,
  different cadence)
- `feedback_cesar_quality_bar_m1_backend.md` — Cesar's 8 binding
  rules that my "Step 3 anchor recommendations to existing locks"
  step references
- `feedback_pre_flight_lock_ack_required.md` — when Cesar has
  explicitly directed an ACK before code, that's a HARD gate; this
  rule (manual brainstorm) does NOT bypass it

## Aphorism

*"When Cesar is offline and the ticket has ambiguities — don't park,
don't guess. Surface options + tradeoffs to Farzaneh; let her be
the substitute decider. Cesar's brainstorm-before-contract rule is
the same rule whether Cesar runs it or we do."*
