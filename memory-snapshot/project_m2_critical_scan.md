---
name: M2 deliverables critical scan — adversarial-review per Cesar's directive
description: 2026-05-15 ~16:00. Cesar's WhatsApp directive 3:18 PM was "ask your agent to do a scan on the M2 deliverables and be critic with the outputs for each of the github issues and the code." Did 3 parallel deep-dive Plan agents covering Runtime substrate (M2-01..M2-13), AI Agent layer (M2-17..M2-28 + our 6 shipped), and Spec Agent (M2-14/18 + 22 M3 tickets + plan/07). Captures: cross-cutting drift, our owned tickets in detail, top concerns to surface to Cesar before claiming, recommended posture. Reference doc when M2 tickets get assigned Mon/Tue 5/18-19.
type: project
originSessionId: b3253814-675e-4c79-a58c-3184f8915019
---
## 2026-05-18 EOD UPDATE — several findings RESOLVED

**#84 T-M2-21 SHIPPED** as [PR #299](https://github.com/quantumdatatechnologies/amira-mars/pull/299) — awaiting Cesar's review. **#91 T-M2-28 NOT claimed**; deps #70 + workflow-shell-domain-Activities still OPEN.

Pre-claim concerns from §"Top concerns to surface to Cesar" were **resolved unilaterally** per the new binding rule #6 in [feedback_cesar_quality_bar_m1_backend.md](feedback_cesar_quality_bar_m1_backend.md) ("review tickets critically; resolve ambiguity with defensible defaults"):
- **#15 prompt-path drift** → shipped with canonical `agents/classifier/prompts/v3.txt`, flagged plan/05 §5#3 staleness in PR body
- **#16 emit seam** → Workflow-sandwich (Activity is pure leaf returning `ClassifyInstruction`; Workflow constructs `ClassifierVerdict` and calls `emit_event`). Flagged in PR body — open to redirect if Cesar prefers Activity-emits-directly
- **#17 T-M2-28 no foundation** → confirmed; not claimed
- **#18 `OBO_TOKEN`→`OPAQUE_TOKEN` rename** → still pending in `stash@{0}` (foundation-cleanup bundle WIP)

Master state shifts since this memo was written (5/15 → 5/18):
- **Path divergence → CONVERGED** on `apps/api/src/amira_api/runtime/...` (T-M2-03 + our #84 ship state confirm the canonical layout)
- **Outbox table** → PR #296 brought in `runtime/persistence/outbox.py` wired to `app.outbox_event`. Single-table strategy looks resolved code-side (verify when #68 emit_event Activity lands)
- **Workflow shells #81/82/83 → SHELL CODE on master** via PR #296 (bundled with T-M2-06). Issues stay OPEN because domain-Activity wiring deferred to plan/07 T-M3 tickets per `runtime/agents/spec/workflow.py` docstring
- **Test-shape rule (`eab924b`)** → BINDING on master. Applied preemptively to #84 test design. See [feedback_test_shape_rule.md](feedback_test_shape_rule.md)
- T-M2-03 substrate (PR #292) → SHIPPED
- T-M2-06 start-session route (PR #296) → SHIPPED
- T-M2-01 Temporal Server v1 runbook (PR #297) → SHIPPED

Questions still OPEN from this scan (carry forward):
- Q-SPEC-A, Q-SPEC-3, Q-SPEC-C (Spec Agent unknowns)
- Audit-kind naming format (hyphenated kebab vs dotted)
- `Provenance.added_by: UUID` semantics (service-principal or requesting user)
- #137 vs #133 OOS guard duplication
- Whether #133 T-M3-40 (OOS detector) gets reassigned to Farzaneh — would be the natural peer of our 8 owned Spec Agent M3 tickets

---

## What this memo is + when to re-read

Cesar's WhatsApp 5/15 3:18 PM:
> *"So you can ask your agent to do a scan on the M2 deliverables and try to understand that the more you can so you're critic with the outputs for each of the github issues and the code"*

This is the adversarial-review pass before any M2 ticket gets claimed. Re-read before:
- Claiming any M2 ticket
- Replying to Cesar with questions about M2 scope
- Starting work on any of our 8 owned Spec Agent tickets in M3

## M2 milestone shape

- **23 open + 7 closed = 30 tickets**
- **M1 closed in full** (62/62) — Cesar's "Only one thing I'm finishing and then were officially out of M1" is past
- **5 tracks**: platform-infra (2), backend (12), ai-agent (6), frontend (2), our shipped (7 closed)
- **2 tickets explicitly owner:farzaneh, ready**: #84 T-M2-21 (Classifier Activity) + #91 T-M2-28 (Wire adapter into Runtime)
- **Owner-label drift**: 4 backend tickets (#70, #71, #73, #74) body says "Ashwin" but label says `owner:cesar` — Cesar needs to lock these before assignment

## Cross-cutting findings (apply to many tickets)

### 1. OUTBOX TABLE STRATEGY IS STALE — highest-blast-radius drift
- **T-M1-41 (shipped 5/05)** locked single-table `app.outbox_event` with `service` discriminator
- **All M2 runtime tickets (#67/#68/#72/#76)** still say `agent_runtime_outbox` as if it's a fresh table
- **Plan/05 §2.7 also stale** on this point
- **Cascading**: #67 (schema), #68 (emit_event activity), #72 (SSE broker reads outbox tail), #76 (Audit Consumer drain — premise mostly DONE by T-M1-56)
- **Action**: Cesar needs to lock — extend `outbox_event` with `session_id` + per-session `seq` columns, or carve a second table

### 2. PATH DIVERGENCE — recurring tax across every ticket
Three layers say three different paths:
- **plan/05** uses `apps/runtime/...`
- **plan/06** uses `services/platform-api/amira/...`
- **plan/07** uses `agents/spec/...`
- **Reality (PR #232 src-layout)**: `apps/api/src/amira_api/...`

**Our 6 shipped PRs landed at `apps/api/src/amira_api/llm/`** (Cesar accepted at review time). Our T-M3-37 shipped at `apps/api/src/amira_api/domain/spec/capability_graph.py`. **Precedent is set** — but ticket text wasn't refreshed. Worth noting once at memo top, not re-discovering each time.

### 3. STALE-OBO references scattered
- **T-M3-32 (#125)** explicitly has OBO in title + body — Cesar's 5/13 comment says strip but text not updated
- **Plan/05 §5 logging discipline list** line 1073 still mentions `obo-token-exchanged` decision-point log
- **Our shipped T-M2-25 code** has `OBO_TOKEN` enum value that should be `OPAQUE_TOKEN` per SIMPLIFY-IDA-2 (renamed 5/06)
- **Spec Agent: zero OBO refs** ✓ clean
- **Runtime M2-01..M2-13: zero stale OBO in bodies** ✓ (just the plan/05 leftover)

### 4. ZERO PYDANTICAI LEAKS
Verified across all ticket bodies + all our shipped code + all plan files in scope. 9 hits across the repo are all in `architecture/mars/*`, `docs/superpowers/*`, and `architecture/03-research/*` — historical/Mars-track-only per the QDT-vs-Mars anti-leak rule (PR #258). **QDT-side stays Anthropic SDK + Claude.** ✓

### 5. CUSTOMER-LEAK CHECK passed mostly
- **No `mars`/`mars-demo` literals in M2 ticket bodies or our shipped code** ✓
- **One exception**: plan/07 §2.5 Reviewer linter example uses `fmp.getCompanyProfile` — FMP is third-party not Mars, but worth keeping the seed YAML platform-generic + per-customer patterns in org config
- **One typo/local-path leak**: T-M3-48 (#141) body has `/Users/cesar/workspaces/qdt/amira-mockup/...` Mac path — needs cleaning

## Top concerns to surface to Cesar BEFORE claiming

These are the questions that, if unanswered, will produce drift / re-work / awkward PRs:

### Outbox + path layer (blocks 6+ tickets)
1. **Outbox table strategy**: extend `app.outbox_event` with `session_id` + `seq` cols, or new `agent_runtime_outbox` table?
2. **`apps/runtime/` vs `apps/api/src/amira_api/runtime/`**: which is canonical? (Likely the latter — but #66/#67/#68 ticket text disagrees with our shipped precedent)
3. **Owner labels on #70/#71/#73/#74**: body says Ashwin, label says Cesar — flip labels or fix bodies?

### Stale text in tickets
4. **#65 T-M2-02 title + body**: still says "PgBouncer pool sizing"; Cesar's 5/13 comment scope-strips per SIMPLIFY-PERSIST-2 but text not updated
5. **T-M3-32 (#125) title + body**: OBO-routing language must be stripped per SIMPLIFY-IDA-2 (Cesar's 5/13 comment)
6. **#76 T-M2-13 premise** is mostly already done by T-M1-56 — rewrite to "integration-test that runtime Activities emit `kind="audit-*"` correctly"?

### Spec Agent (our heaviest future work)
7. **Q-SPEC-A open**: OAuth callback URL space — blocks T-M3-04 + T-M3-42
8. **Q-SPEC-3 open**: VCS OAuth client credentials provisioning — blocks T-M3-42
9. **Q-SPEC-C open**: version label sequencing across re-iterations after `approval_declined` — blocks T-M3-03 + T-M3-39
10. **Audit-kind naming format**: hyphenated kebab (plan §3.4: `spec-version-created`) or dotted (migration `20260514170100`: `spec.edit`)? 21 of 25 still un-seeded
11. **`Provenance.added_by: UUID`** ambiguous: when Spec Agent emits a node, what UUID lands? Service-principal per agent? Requesting user?
12. **#137 vs #133**: Build-side OOS guard a wrapper around Spec-side detector library, or parallel implementation?
13. **#97 T-M3-04 scope**: decision-point resolve / gap-resolve / lock-request — these route through workflow signal per §2.1, not REST. Trim body?
14. **Could #133 T-M3-40 (OOS detector) be reassigned to Farzaneh?** Currently `owner:cesar` but it's a perfect peer of our other 8 Spec Agent tickets

### Our owned M2 tickets
15. **T-M2-21 prompt-path** — ticket text references phantom `agents/_shared/prompts/classifier_v1.txt`; we shipped `agents/classifier/prompts/v3.txt` per plan/06 §2.7. Keep one (the latter)?
16. **T-M2-21 emit_event seam**: does the Activity call `emit_event` itself, or return the `ClassifierVerdict` and let the Workflow call `emit_event` (plan/05 §5#2 single-seam pattern)?
17. **T-M2-28 has no foundation**: depends on T-M2-18/19/20 + T-M2-05 + T-M2-15 — all `todo`. Should this wait?
18. **`OBO_TOKEN` → `OPAQUE_TOKEN` rename**: small follow-up PR on our shipped T-M2-25, or accept as historical-compat?

## Our owned tickets — detail

### 7 already shipped (CLOSED COMPLETED — all merged clean to master)

| # | Ticket | Merge SHA | Code location | Concerns |
|---|---|---|---|---|
| #80 | T-M2-17 NarrationEvent union | 8914346 (#237) | `apps/api/src/amira_api/runtime/contracts/{narration,envelopes}.py` | clean |
| #86 | T-M2-23 Adapter facade | 7da0412 (#236) | `apps/api/src/amira_api/llm/{contract,adapter,providers}.py` | Foundry uses base_url+headers (not yet AnthropicFoundry class) — flagged in PR comment |
| #87 | T-M2-24 Cache planner | 3034a0a (#242) | `apps/api/src/amira_api/llm/cache.py` | clean — implements 3 of 4 hierarchy levels per spec |
| #88 | T-M2-25 Redaction | 7cec994 (#243) | `apps/api/src/amira_api/llm/{tags,redaction}.py` | **MINOR DRIFT**: `OBO_TOKEN` enum still in code; should be `OPAQUE_TOKEN` per SIMPLIFY-IDA-2 |
| #89 | T-M2-26 Classifier (LLM) | d12eb41 (#244) | `apps/api/src/amira_api/llm/classifier.py` + `agents/classifier/prompts/v3.txt` | clean |
| #90 | T-M2-27 Prompt registry | 59543cc (#235) | `apps/api/src/amira_api/llm/prompts.py` + `startup.py` | clean — only registers `classifier:[3]` so far |
| #130 | T-M3-37 Capability graph DSL | 1f8b3ec (#240) | `apps/api/src/amira_api/domain/spec/capability_graph.py` | **PENDING T-M3-48 amendment** for `expected_implementation` field on CapabilityNode (Cesar owns) |

**Coherence**: the 7 fit together cleanly — tests for T-M2-23 import T-M2-24's cache planner; T-M2-25 redaction is plumbed as no-op forward-compat; T-M2-26 consumes T-M2-27 prompt registry + T-M2-23 adapter.

### Open + assignable (M2, owner:farzaneh, ready)

**#84 T-M2-21 — Classifier Activity** (~4-6 hours)
- **What**: Temporal Activity wrapper around our shipped `classify()` LLM call (T-M2-26). Workflows (T-M2-18, T-M2-19) call this Activity for deterministic checkpoint-able classification.
- **Path** (corrected): `apps/api/src/amira_api/runtime/activities/classify_intent.py` + tests at `apps/api/tests/runtime/test_classifier_activity.py`
- **Pydantic shape**: `ClassifyIntentInput(instruction_text, ctx: ClassifierContext)` → `ClassifyIntentOutput(verdict: ClassifyInstruction, narration: ClassifierVerdict)`. Activity stays pure-classification; Workflow calls `emit_event` separately (single-seam pattern per plan/05 §5#2)
- **Verification gates**: 50-fixture golden trace (extend T-M2-26's 30), ≥90% match rate, p95 ≤600ms prod / ≤2500ms dev, determinism (5 runs same answer), `confidence` round-trip
- **Foundation**: T-M2-26 + T-M2-17 DONE ✓; T-M2-05 emit_event todo (workaround: stub inline or claim T-M2-05 first)
- **Risk surface**: re-emitting metering inside Activity (would double-count); putting emit_event call inside Activity (breaks single-seam); 50-fixture extension done lazily

**#91 T-M2-28 — Wire LLM adapter into Runtime Activities** (~8-12 hours IF foundation exists)
- **What**: Find every direct Anthropic SDK call inside the 4 agent runtime Activities (Spec/Build/Deploy/Companion) and replace with `await get_llm_client(metadata.org_id).chat(req)`, threading `CallMetadata` through Activity input.
- **CRITICAL GAP**: **The runtime Activities don't exist on master yet.** Verified by file tree: `apps/api/src/amira_api/runtime/` contains ONLY `contracts/narration.py` + `envelopes.py`. Zero workflow files, zero activities files.
- **Cascading deps (ALL `todo`)**: T-M2-18 SpecAgentWorkflow, T-M2-19 BuildAgentWorkflow, T-M2-20 Deploy+Companion Workflows, T-M2-05 emit_event, T-M2-15 BYOK + `llm_call` table
- **Verification gate unachievable**: "every Activity call produces an `llm_call` row" — `llm_call` table doesn't exist; metering stub returns empty strings
- **Posture**: **DO NOT CLAIM until foundation lands.** Surface to Cesar: "the Activities I'm supposed to wire don't exist on master yet"

### 8 owned Spec Agent tickets (M3, owner:farzaneh)

| # | Ticket | Foundation status |
|---|---|---|
| #131 | T-M3-38 Readiness rubric + LLM tie-breaker | Deps: T-M3-37 (done), T-M3-03 (todo) |
| **#132** | **T-M3-39 SpecAgentWorkflow shell + elicit_turn** | Architectural keystone — surface to Cesar before claiming |
| #134 | T-M3-41 Reviewer linter library | **LOWEST-DEP** — only needs T-M3-03 |
| #135 | T-M3-42 Repo-import pipeline (REVENG-1) | 2 cross-area gaps: T-M3-01 sandbox CRD + T-M3-10 file-ops-api |
| #137 | T-M3-44 OOS guard Build-side | Relationship to #133 unclear |
| #142 | T-M3-49 Static-analysis probe + graph reader | Pending T-M3-48 (`expected_implementation` field on CapabilityNode) |
| #143 | T-M3-50 LLM-judge call wrapper + prompt v1 | Pending T-M3-48 |
| #144 | T-M3-51 Detector orchestration + recompute | Deps #142 + #143 |

**Cleanest first M3 claim when M3 opens**: **#134 T-M3-41 Reviewer linter** — lowest-dependency Spec ticket, pure Python library with deterministic behavior, no LLM in hot path.

**Avoid as first claim**: #132 T-M3-39 (architectural keystone, surface first), #135 T-M3-42 (sandbox + file-ops deps not on master), #137 T-M3-44 (shape Q unresolved).

## What's missing from master (Spec Agent specifically)

Of the 11 plan/07 sections, only 1 is shipped:
- ✓ §2.3 Capability Graph DSL (T-M3-37 PR #240)
- ✗ §2.7 Persistence (10 tables — `spec_version`/`spec_requirement`/etc not migrated)
- ✗ §2.1 SpecAgentWorkflow (no `agents/spec/` directory)
- ✗ §2.5 Reviewer linter
- ✗ §2.6 OOS detector (Bloom primitives exist in capability_graph.py but no detector wraps them)
- ✗ §2.8 FastAPI surface (`/api/v1/specs/...`)
- ✗ §2.10 REVENG-1 pipeline
- ✗ §2.12 Spec export
- ✗ Prompts directory `agents/spec/prompts/v1/*.txt`
- ✗ Spec UI under `app/(app)/spec/` (mockup preserved per plan §2.9; rewire = T-M3-53)
- ✗ Audit kinds 21 of 25 not yet seeded

## Recommended posture for Monday assignment

**When Cesar pings with assigned tickets:**

1. **If he assigns T-M2-21 (Classifier Activity)** — clean accept. Mostly self-contained. Surface 2 questions first: (a) `emit_event` seam (Activity vs Workflow), (b) prompt-path keep `agents/classifier/prompts/v3.txt` (drop ticket-text's phantom `agents/_shared/...`).

2. **If he assigns T-M2-28 (Wire adapter into Runtime)** — surface foundational concern BEFORE accepting: "the Activities don't exist on master yet (no `runtime/activities/` files); T-M2-18/19/20 + T-M2-05 + T-M2-15 are all `todo`. Should this wait, or do you want a foundation-laying interpretation (write the failing test + scaffold)?"

3. **If he assigns any Spec Agent M3 ticket directly** — surface that #132 SpecAgentWorkflow is the architectural keystone; suggest #134 Reviewer linter as a cleaner first-claim if he's flexible.

4. **If he assigns work from outside the M2-21/M2-28 + 8 Spec Agent set** — listen carefully + check the foundation status before committing.

**Per binding rule #4 (foundational-surfacing — VALIDATED 2x already)**: surface foundation concerns BEFORE claiming. Saved Cesar 6-8 hrs on T-M1-21 (he took it himself) and prevented us from shipping T-M1-44/47 only to be deferred — both got closed-as-not-planned by Cesar today.

**Per binding rule #5 (adversarial-review every PR)**: any code we ship in M2 needs the same default-CI test coverage discipline as the T-M1-31 critique called out. Schema-level tests (Pydantic round-trip per enum value, JSONB round-trip, FK violation, uniqueness violation) MUST run without `AMIRA_TEST_DB_DSN` env var.

## Two open follow-ups from us (not claimed, awaiting Cesar)

1. **Windows asyncio shim** for `apps/api/migrations/env.py` + `apps/api/src/amira_api/_dev_fixtures/seed_default_org.py` — local patches working, 6-line PR proposed in WhatsApp 5/15. Cesar hasn't responded yet on "PR or absorb yourself."

2. **`OBO_TOKEN` → `OPAQUE_TOKEN` rename** in our shipped T-M2-25 (`apps/api/src/amira_api/llm/tags.py` + `redaction.py`). Either small follow-up PR or accept as historical-compat. Bundled with #1 as a "small foundation cleanups" offer if Cesar wants them.

## Source of findings

- **Agent 1** (Runtime substrate M2-01..M2-13): 137k tokens used, 55 tool uses, ~6 min
- **Agent 2** (AI Agent + our 7 shipped): 158k tokens, 59 tool uses, ~6 min
- **Agent 3** (Spec Agent deep dive): 184k tokens, 86 tool uses, ~11 min

Total scan: ~23 min wall time, 3 agents in parallel, no remote writes. Read-only analysis. Findings include cited ticket numbers, plan section references, file paths, and line numbers — anything action-able is traceable to source.

---

## 2026-05-15 evening update — Cesar addressed 5 of our 14 findings

Master moved from `533daa7` → `bf43e19` Friday evening via 5 commits. Two of them were **direct back-propagations of locked decisions across the plan/ tree** — these resolve drift items the scan flagged.

### Cross-cutting findings now PARTIALLY RESOLVED (at plan layer)

| Original finding | Plan layer | Ticket bodies | Status |
|---|---|---|---|
| **#1 Outbox table strategy stale** (`agent_runtime_outbox` vs `app.outbox_event`) | ✅ plan/01/04/05/09/12/13 now reference `app.outbox_event` with `service` discriminator (via `02d2385` + `91e2bc0`) | ⚠️ #67/#68/#72/#76 ticket bodies may still say `agent_runtime_outbox` | Plan fixed; verify ticket text at claim |
| **PgBouncer stale refs** (#65 T-M2-02 title + plan refs) | ✅ plan/02/04/05/08/16 stripped (`91e2bc0`) | ⚠️ #65 title may still say "PgBouncer pool sizing" | Plan fixed; ticket text TBD |
| **Stale OBO references** | ✅ plan/05 strips `obo-token-exchanged` audit kind | ⚠️ T-M3-32 #125 title + body may still have OBO language | Plan fixed; ticket text TBD |
| **Mars-specific hostnames in plans** | ✅ plan/02/06/09/10/11 stripped | n/a | Done |
| **Per-framework compliance registry** | ✅ plan/08 AppCompliancePin + plan/09 Q-09-4 / AC-09-8 deleted | n/a | Done |
| **No MFA / step-up** | ✅ plan/10/11 remove `require_step_up_mfa` | n/a | Done |

### Additional things shipped Friday evening

**`d3dd9c8` — cleanup commit** (strip v1-banned UI surfaces + customer naming + dead modules):
- Removed SOX/GDPR compliance framework checkboxes from `components/deploy/deploy-dialog.tsx`
- Removed CVE scan toggle + Geography lock field
- Stripped Mars-specific literals from `components/projects/import-form.tsx`, `settings/security/page.tsx`, `settings/profile/page.tsx`
- **DELETED** `apps/api/src/amira_api/persistence/project_seq.py` (dead duplicate; canonical lives at `audit/sequences.py`)
- Dropped `sys.path` hack from `tests/playwright/_setup.py` (CLAUDE.md forbids workarounds)
- Added `[tool.pytest.ini_options].markers = integration` to `apps/api/pyproject.toml` + `PYTEST_MARKERS` knob to Makefile

**`bf43e19` — IDA-7 runtime SHIPPED** (PR #282):
- `apps/api/src/amira_api/identity/router.py:callback` — JIT self-signup branch when ID token has no `org_id` claim (creates personal Org, lifecycle PENDING when beta gate ON, ACTIVE when OFF)
- `POST /api/v1/admin/orgs/{org_id}/approve` — operator approve flow
- New `Settings.beta_gate_enabled` (`AMIRA_BETA_GATE_ENABLED`, defaults True)
- `/auth/login?screen_hint=signup` — suppresses Auth0 `organization` param to trigger self-signup branch
- `app/pending-approval/page.tsx` — new route outside `(app)` group, redirects PENDING members from any `(app)` route
- New audit kinds: `tenancy.personal-org-created`, `tenancy.org-approved`
- Auth0 OIDC app `organization_usage` flipped `require` → `allow` in production tenant (operational)
- Tests: `tests/identity/test_router_callback_self_signup.py` (261 lines, JIT branch e2e) + `test_admin_router.py` (operator approve) + Playwright `self-signup-and-beta-gate.spec.ts` (289 lines)

### What's STILL OPEN from our 14 questions

The plan-layer resolutions don't address everything. Still pending Cesar's call:

1. **Ticket body refresh** for #67/#68/#72/#76 (outbox naming), #65 (PgBouncer title), #125 (OBO title) — flag at claim
2. **Path divergence** still recurring tax (plan/05 says `apps/runtime/...`, plan/07 says `agents/spec/...`, reality `apps/api/src/amira_api/...`)
3. **Owner-label drift** #70/#71/#73/#74 (body says Ashwin, label says Cesar)
4. **#76 T-M2-13 premise** mostly already done by T-M1-56
5. **Spec Agent Qs**: Q-SPEC-A (OAuth callback URL space), Q-SPEC-3 (OAuth client creds), Q-SPEC-C (version label sequencing) — still open in plan/07
6. **Audit-kind naming format** — hyphenated kebab vs dotted; 21 of 25 still un-seeded
7. **`Provenance.added_by: UUID`** ambiguous when Spec Agent emits a node
8. **#137 vs #133** relationship (wrapper vs parallel)
9. **#97 T-M3-04 scope** — decision-point resolve / gap-resolve / lock-request are signals not REST
10. **#133 T-M3-40** — reassign to Farzaneh?
11. **T-M2-21 (Classifier Activity)** — emit_event seam location + prompt path
12. **T-M2-28 (Wire adapter)** foundation gap still real
13. **`OBO_TOKEN` → `OPAQUE_TOKEN`** rename in our shipped T-M2-25
14. **Windows asyncio shim** for `env.py` + `seed_default_org.py`

### Implication for Monday

The "14 surfaced questions to Cesar BEFORE claiming" list is now effectively **~9 surfaced questions** (5 plan-layer items resolved). The smaller list is faster to walk Cesar through. **Re-read this updated memo, not the original 14-question list**, before any M2/M3 ticket claim.

### Net signal — Cesar is moving fast + close to our scan

That Cesar fixed half of what we flagged within hours of when we flagged it (our scan was 16:00, his back-prop commits were 20:55 + 21:06) means: **he's reading the same plan files we are, hitting the same drift, and cleaning it up methodically.** Our scan caught the right things. The work calibration is aligned.

### Stack state at end-of-day Friday

- Local stack is DOWN (Docker Desktop stopped sometime during Farzaneh's break)
- Backend task `bw6dtwnfo` and frontend `br6caegas` both no longer responding
- Last successful sign-in: 16:18 UTC, Farzaneh
- To resume Monday: start Docker Desktop → `docker compose up -d` → `alembic upgrade head` (idempotent — no new migrations from this push) → restart backend + frontend per recipe in `project_local_dev_setup.md`
- 2 local Windows shim patches re-applied to `env.py` + `seed_default_org.py` (still uncommitted)
