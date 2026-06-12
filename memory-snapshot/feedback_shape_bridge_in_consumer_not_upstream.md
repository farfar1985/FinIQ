# Shape-bridge in consumer, not upstream

**Banked 2026-05-20 late-evening** from T-M3-51 (#144 PR #366) build.

## The pattern

When two PRs ship at different times with mismatched shapes —
upstream ships a LEAN concrete class; downstream expects a RICHER
Protocol — the bridge between them belongs in the CONSUMER's
home, not as a force-push to either shipped PR.

## Today's catch

#142 (T-M3-49, PR #365) shipped a lean `StaticProbeResult` with
just `outcome: Literal["match", "partial", "miss"]` +
`inspected_paths: list[str]` — per plan/13 §2.2 verbatim.

#143 (T-M3-50, PR #360, already merged) defined
`StaticProbeResultShape` Protocol expecting `verdict` +
`inspected_paths` + `observed_skill_versions` + `notes` — richer
shape, written before #142 shipped its lean answer.

Mid-build on #144 I caught the mismatch:
- field name: `outcome` vs `verdict`
- value vocab: `"match"` vs `"pass"`
- missing: `observed_skill_versions`, `notes`

Three options surfaced:

| Option | Cost | Risk |
|---|---|---|
| Force-push to #142 (in review) to extend the shape | Touches Cesar's review-queue PR | Interrupts review |
| Force-push to #143 (merged) to lean the Protocol | Touches merged code | Spec drift |
| **Bridge in #144** with a `StaticProbeContext` Pydantic class that wraps #142's `StaticProbeResult` into the rich Protocol shape | None | Right home — Protocol's own docstring named #144 as the impl home |

I picked option 3. The Protocol declaration in `llm_judge.py`
literally said: *"Concrete class lands in T-M3-51 / #144 as part
of the DetectorContext aggregate."* The author of the Protocol
ANTICIPATED the bridge living in the consumer ticket.

## Mechanical gate

Before patching either upstream or downstream:
1. Read the Protocol's docstring — does it name the consumer
   ticket as the impl home? If yes, bridge there.
2. Is the upstream PR still in review? Touching it triggers
   re-review on already-reviewed work.
3. Is the downstream PR merged? Force-push to merged code is a
   stronger move than a bridge — needs broader justification.
4. Can a single Pydantic class in the consumer wrap the upstream
   concrete + add the missing fields? If yes, that's the bridge.
5. Map fields explicitly — a constant dict (`_PROBE_VERDICT_MAP`
   in our case) is the right home for vocabulary translation, not
   `if/else` chains.

## Related locks

- `feedback_no_infra_without_caller.md` — the bridge is born with
  its first consumer (#144); no orphan shapes
- `feedback_house_style_beats_best_practice.md` — touching shipped
  code for a "stronger typing" feeling is the same overcorrection
  reflex the brainstorm trigger catches
- `feedback_fix_foundation_dont_defer.md` — but only on docs that
  drift, not on code that ships
