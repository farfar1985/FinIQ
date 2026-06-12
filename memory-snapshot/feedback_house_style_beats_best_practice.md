# House style beats best-practice imposition

**Banked 2026-05-20 evening** from T-M3-48 (#141 PR #361) brainstorm.

## The trap

When picking up a `owner:cesar` ticket under his greenlight + applying
a default "best practice" you'd reach for (e.g., discriminated unions
are stronger than tagged-Literal flat shapes), STOP and check
codebase precedent first.

## Today's catch

T-M3-48 Pattern DSL design. Adversarial second-pass on confidence:

- **First pick (D1)** — single class with `kind` Literal + `pattern: str`
  (matches `CapabilityParameter`, `AcceptancePredicate`, `Provenance`)
- **Overcorrect under "would Cesar pick the strictest typing?"** —
  flipped to Pydantic v2 discriminated union with 5 subclasses,
  calling `AcceptancePredicate.parameters: dict[str, ...]` a "smelly
  hack Cesar probably regrets"
- **Re-correct under Farzaneh's "are you confident?" pressure** —
  flipped back to single class. The codebase precedent in
  `domain/spec/capability_graph.py` is THREE FOR THREE
  single-class-with-Literal-discriminator. Zero discriminated unions
  exist in the spec domain. If I shipped one, that's me imposing my
  preferred typing style over Cesar's house style.

Same session also flipped D6 (docs-only vs docs+Pydantic class).
First pick docs-only; overcorrect to docs+class on "pull-until-complete"
reasoning; re-correct back to docs-only because
`feedback_no_infra_without_caller.md` trumps pull-until-complete when
there's no reader yet — the class lands in #142 (T-M3-49) with its
first consumer, the static probe.

## The lesson

The "stronger typing" gain is real but doesn't outweigh "matches
every existing sibling in this file." House style is a signal of
what the codebase author considered worth doing; ignore that signal
only with explicit justification, not on default best-practice
instinct.

## Mechanical gate

Before picking a shape on an `owner:cesar` ticket:
1. List the closest 2-3 sibling shapes in the same file/module
2. If they're consistent, MATCH them
3. If you're about to break the consistency, name why explicitly
   in the PR body before shipping

## Adversarial trigger pattern

"Are you confident?" from Farzaneh has consistently produced useful
flip-points. Treat it as a hard pause: re-run the adversarial pass
through all 8 lock categories from
`feedback_pre_build_comprehensive_audit_workflow.md` Phase 3, and
specifically check whether your pick is overriding house style on
a default best-practice instinct. Two flips today (D1 + D6) both
came from this trigger.

## Related locks

- `feedback_cesar_quality_bar_m1_backend.md` #2 (senior code quality,
  no smelly hacks) — DOESN'T override house style; it works through it
- `feedback_brainstorm_skill_manual_when_cesar_unavailable.md` —
  adversarial self-review naturally surfaces the house-style check
  when applied properly
- `feedback_pre_build_comprehensive_audit_workflow.md` Phase 3
  (adversarial self-review) — this is what Phase 3 protects against
- `feedback_no_infra_without_caller.md` — the trump card when
  pull-until-complete tempts widening scope to "include the consumer
  side"; if no consumer yet, hold the line on docs/library-only
