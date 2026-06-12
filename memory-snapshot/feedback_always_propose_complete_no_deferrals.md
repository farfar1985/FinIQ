---
name: always-propose-complete-no-deferrals
description: "Default scope for every proposal is the most complete, production-grade option. NO deferrals unless the deferred work requires a design/architecture decision Cesar hasn't locked yet AND that exception requires his explicit sign-off — not my judgment call. Sharper than feedback_no_carveouts_pull_until_complete.md: that lock is about pulling-upstream-when-blocked; this lock is about default scope ALWAYS being maximal."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-28
  source: Cesar WhatsApp 2026-05-28 after answering
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The lock

Direct quote from Cesar (2026-05-28, after he answered the §4 + audit-vocab lock questions):

> *"always propose the most complete, production-grade option, no deferrals unless the deferred work requires a design/architecture decision we haven't locked yet, and that exception requires my explicit sign-off, not your judgment call."*

## Parsing

Three parts, all binding:

1. **Always propose the most complete, production-grade option.** Default scope = full. Not minimum-viable. Not narrow-carve-out. Not "ship the easy parts now, file follow-ups for the hard parts." If a ticket has 7 sections (C1-C7), propose all 7 at once. If a refactor has downstream consumers, update them in the same PR. If a migration has reverse-direction consequences, ship the inverse too.

2. **No deferrals — except ONE narrow exception.** The exception: when the deferred work depends on a design/architecture decision that hasn't been locked yet. Example: if shipping C5 requires an audit-vocab pick that's still in Cesar's queue, deferring C5 until the pick lands is legitimate. But that's it — no other deferral reasons qualify.

3. **The exception requires HIS explicit sign-off — not my judgment call.** Even when the exception applies (i.e., genuinely waiting on an unlocked architecture decision), I cannot decide unilaterally to defer. I have to surface the dependency to Cesar + get his explicit go to defer. The decision belongs to him.

## How this differs from related locks

- **`feedback_no_carveouts_pull_until_complete.md`**: When the immediate ticket's verification gate can't run end-to-end because UPSTREAM is missing, PULL the upstream into the same PR. That lock is about "make the gate runnable by pulling what's needed." This new lock extends it: "and also propose the MAXIMAL scope from the start, not the minimum that satisfies the gate."

- **`feedback_no_real_behaviour_nothing_moves.md`**: ABSOLUTE — if the system can't be exercised end-to-end, NOTHING moves. This new lock is about scope DECISION, not verification. Both apply.

- **`feedback_one_pr_per_iteration.md`**: One PR can cover multiple tickets when they're tightly dependent. This new lock confirms the default direction: bundle scope toward MORE, not less.

## What this means in practice

When drafting a proposal, ticket, plan, or PR scope:

- **Question to ask**: "What's the MOST production-grade version of this?"
- **NOT**: "What's the narrowest version that satisfies the immediate ask?"
- **NOT**: "Should we ship A now and file B/C/D as follow-ups?"
- **NOT**: "Can we defer X to make the PR smaller?"

When a real architecture decision is genuinely unlocked:
- **DO**: Surface the dependency to Cesar explicitly + ask if a deferral is authorized
- **DON'T**: Decide unilaterally that a deferral is "obviously fine here"
- **DON'T**: Frame the deferral as "we can ship narrow now and revisit later"

## How this was caught

I'd repeatedly fallen into "narrow carve-out" thinking on #681:
- Original draft proposed 12 new tools + 12 new audit kinds (over-built one way)
- After Cesar's rewrite, I asked him to pick between "Option III: ship requirement CRUD now, defer gap+DP CRUD to follow-up" vs "Option I: consolidate all"
- He picked Option I + then added this lock as a persistent rule, recognizing my drift toward "defer the harder parts."

The pattern was: when scope feels big, my default was to propose a narrower carve-out + a follow-up ticket. Cesar's correction: the carve-out path is the wrong default. Default is full scope; carve-outs require his explicit sign-off.

## Trigger conditions

This lock matters most when:
- A ticket has multiple sub-sections (C1-C7 in #681, etc.) and the easy ones are tempting to ship alone
- A refactor has downstream consumers and the question is "update them now or later"
- A migration has reverse-direction needs (e.g., audit-vocab consolidation has consumers reading the old kinds)
- An architecture decision is locked, but I'm tempted to think "maybe the spirit of the lock allows shipping narrower"

In all these, the answer is: ship complete. If genuinely unlocked architecture is the only blocker, ASK Cesar for explicit deferral sign-off.

## Linked locks

- `feedback_no_carveouts_pull_until_complete.md` (related — pull upstream when blocked)
- `feedback_one_pr_per_iteration.md` (related — bundle is fine when coherent)
- `feedback_no_real_behaviour_nothing_moves.md` (orthogonal — verification gate rule)
- `feedback_dont_drift_to_customer_shapes_when_drafting_platform_design.md` (related — both about default-scope drift)
