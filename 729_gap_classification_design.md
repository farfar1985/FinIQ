# #729 — Gap classification (block-and-ask vs default-and-flag): design proposal for Cesar's lock

**Status:** Phase 0 (study) + brainstorm complete. Awaiting Cesar's D1 lock before any build.
**Author:** Farzaneh / Claude. **Anchored on:** Cesar's #729 WhatsApp guidance (4 points + the spec-kit mirror).
**Read for this:** `tools.py` (raise_gap), `turn_types.py` (GapItem), `readiness.py` (lock gate), `agents/spec/prompts/v1.txt`, `serialize.py` (handoff), `routes_approval.py`+`views.py` (approver surface), and the spec-kit reference at `D:/refs/spec-kit` (`spec-driven.md` §165-222 + `templates/{spec,plan}-template.md`).

---

## 1. The problem (recap)

On a rich spec the empowered interviewer surfaces build/deploy-config specifics (NetSuite auth mode, SCIM push/poll, Graph mailbox, tenant config) as **`critical` gaps**, which block lock. So the spec never converges — even when the human wants to lock, it isn't lock-eligible. Cesar's framing: **"block-and-ask vs default-and-flag — same depth, different disposition."**

## 2. Where the spec-kit skill lives (located, per "find it yourself")

- **The reference:** `D:/refs/spec-kit` (github/spec-kit, cloned during the 2026-05-21 Spec Agent strategic assessment).
- **The "skill we already added":** `apps/api/src/amira_api/chat/slash_commands.py` (T-M3-102) — the `/specify → /clarify → /plan → /analyze → /tasks → /implement` flow that "mirrors github/spec-kit's flow" (Q3 lock 2026-05-22). Direction-D synthesis (assessment `docs/superpowers/specs/2026-05-21-spec-agent-strategic-assessment.md`) already picked: keep Amira's typed capability graph + conversational UX; borrow spec-kit's flow + discipline.

## 3. spec-kit's model (the thing to mirror) → Amira mapping

spec-kit (`spec-driven.md`) is a clean **three-way** model — NOT a typed disposition field:

| spec-kit | rule | Amira mapping |
|---|---|---|
| **WHAT/WHY, specified** (§169: "focus on WHAT/WHY; avoid HOW — no tech stack/APIs") | a requirement | a rich FR/NFR/AC — **the spec content** |
| **WHAT/WHY, ambiguous, no reasonable default** (§180 `[NEEDS CLARIFICATION]`; "don't guess") | block + ask | a **`critical` gap** |
| **HOW / tech / config** (belongs to the `/plan` phase, not the spec; default at plan time, mark NEEDS CLARIFICATION only if no default) | default + (optional) flag | a **non-blocking `warning`/`info` assumption** carrying the default + "confirm at build" |
| **Completeness** (§199: "No `[NEEDS CLARIFICATION]` markers remain") | ready | **"no `critical` gaps remain"** → human locks |

**The classification criterion the prompt is missing today** is exactly spec-kit's WHAT-vs-HOW + has-a-reasonable-default test:
- A **requirement ambiguity with no reasonable default** (auth method, FX fallback, can-a-rejected-claim-be-resubmitted) → `critical` (block + ask).
- A **HOW/config detail** (auth *mode*, SCIM push/poll, exact deps, tenant config, target platform) → it's plan/build-phase → **`warning`/`info` + sensible default + "confirm at build"**, never `critical`.

## 4. Ground-truth: the existing surfaces already do the right thing for non-critical gaps

This is the headline finding — it shrinks the change:
- **Lock gate** (`readiness.py::_evaluate_open_gaps`): blocks **only on `critical`-open**; `warning`/`info` are explicitly non-blocking. ✅ no change needed.
- **Build handoff** (`serialize.py`): renders **unresolved gaps of any severity** into `spec.md`'s "Open Gaps" → the Build Agent receives them. ✅ no change needed (satisfies Cesar #3, build side).
- **Approver surface** (`SpecVersionView.gaps` in `views.py`): carries **all gaps with severity** → the approver's workspace shows them. ✅ no change needed (satisfies Cesar #3, approver side).
- **Convergence** (`routes_approval.py`): agent only *proposes* ready; human routes for e-signature → an Authorized Approver signs. **No auto-lock exists.** ✅ Cesar #4 already satisfied.

## 5. D1–D4 recommendations (for the lock)

- **D1 — reuse `severity` (Option A). RECOMMEND A.** spec-kit has no "disposition" field — it has the `[NEEDS CLARIFICATION]` marker + the spec-vs-plan *phase* separation. Mirroring it = teaching the WHAT-vs-HOW rule in the prompt + using `critical` for unresolvable WHAT-ambiguities and `warning`/`info`+default for HOW/config. **Adding a typed `disposition` field would be the "new vocabulary / parallel scheme" you said not to invent**, and would re-expand to the 5-surface scope. Reuse keeps it faithful AND collapses the change to **prompt + evaluator only.**
- **D2 — the fix lands in two files:** `agents/spec/prompts/v1.txt` (the WHAT/HOW classification rule on `raise_gap` + the interview section) and `agents/spec/prompts/v1/evaluator.txt` (a **symmetric penalty** for marking build-config `critical` — the two-sided-calibration pattern from #681/#625, so the rubric rewards correct classification, not just the prompt).
- **D3 — already wired** (no new surface) under Option A: non-blocking gaps flow to both `spec.md` (build) and `SpecVersionView` (approver). The assumption's default rides in the gap `description` ("Assume TBA; confirm at build") — exactly like spec-kit's inline plan-template defaults.
- **D4 — no new convergence mechanism.** Agent proposes ready when no `critical` remain (the terminal-message rule already exists from #728); human locks via e-signature. Skip the depth dial, per Cesar.

## 6. One deliberate deviation from pure spec-kit (flag for the lock)

Pure spec-kit keeps config **entirely out** of the spec (it lives in `/plan`). We have no separate `/plan` artifact yet, and Cesar's **hard #3** requires the assumption be **visible to the approver + passed to the build**. So we **extend** spec-kit slightly: keep a **lightweight non-blocking record** of the config assumption *in* the spec (a `warning`/`info` gap that flows to `spec.md` + the approver view), rather than pushing it to a plan phase that doesn't exist. Defensible bridge between spec-kit and #3 — calling it out explicitly for your sign-off.

## 7. Scope of the build (after the lock) — Option A

- `v1.txt`: add the WHAT-vs-HOW classification rule + the "config → warning/info + default + confirm-at-build, never critical" guidance; reinforce "ready = no critical remain."
- `evaluator.txt`: symmetric penalty for over-`critical`-ing build-config.
- 1 real-Opus regression test: drive the integrations aspect; assert config gaps come out `warning`/`info` (non-blocking, default in description) and the spec reaches lock-eligible.
- **Zero** schema / gate / serializer / approver-UI / migration changes.

## 8. Richness is preserved (the "won't it go naive again?" check)

The change touches **gap disposition, not spec content**. The kickoff bloom + the 12-aspect interviewer still produce the full FR/NFR/AC/graph (our expense run: 38 FR untouched). spec-kit's whole purpose (§190) is to keep **requirements rich and precise** ("don't guess") while keeping **config out of the spec** — so mirroring it yields **rich AND convergent**. "Close the loop" holds: `critical` gaps are asked + resolved-on-answer; config gets a default + confirm-at-build (don't pester).

## 9. The lock question for Cesar

**D1: confirm Option A (reuse `severity`; prompt + evaluator; mirror spec-kit's WHAT/HOW + `[NEEDS CLARIFICATION]`; no typed field) — or do you want Option B (typed `disposition` field) for a reason I'm not seeing?** Plus: OK with the §6 deviation (lightweight config-assumption record in the spec for #3 visibility)? Once locked, I'll plan + build per the locked option.
