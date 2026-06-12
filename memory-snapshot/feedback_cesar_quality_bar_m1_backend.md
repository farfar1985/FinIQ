---
name: Cesar's quality bar for Ashwin-lane M1 backend tickets — review every diff, no spaghetti code
description: 2026-05-13 9:25 AM ET. When Cesar opened Ashwin's 6 unblocked M1 backend tickets to us, he attached an explicit caveat — review every bit of agent-generated code carefully; if it doesn't align with the system, it becomes spaghetti and pollutes the platform downstream. Different rhythm than our M2 sprint — slow, careful, system-fit over fast-shipping. Goal is to make Cesar's life easier not harder. **UPDATE 2026-05-23 Saturday afternoon — empirical case banked**: PR #375 (T-M3-45) was re-implemented by Cesar (PR #467 + #468) instead of merged. Architectural reasons: we bundled library + wiring; he pre-split them into 2 separate tickets. New cross-ref lock: `feedback_cesar_pre_split_tickets_check_related_first.md` — search related-ticket scan as pre-flight gate before scoping any PR that touches Cesar-owned files.
type: feedback
originSessionId: b3253814-675e-4c79-a58c-3184f8915019
---
## The rule

When picking up tickets outside our `track:ai-agent` lane (Ashwin's M1 backend / identity / tenancy / persistence tickets), the quality bar is **"no spaghetti code, review every diff."**

Cesar's exact words (FinIQ GenAI WhatsApp, 2026-05-13 9:25 AM):

> *"these are backend system components, so if you do want to pick any you can, but please be careful with how the agents code these pieces, they need to be fully aligned with the system and code needs to make sense, so you should reaview carefully every bit of code that the agents are doing, oterhwise we will end up with lots of spaghetti code"*

## Strategic frame (Farzaneh's directive, 05-13 mid-morning)

> *"it is very critical that the code we submit to cesar for the M1s are exactly what he wants to make his job easier not harder."*

This is THE binding frame. Every decision on these tickets routes through it:
- Don't optimize for our speed. Optimize for Cesar's read-time + merge-confidence.
- Don't ship a ticket that needs reverse-engineering to integrate downstream.
- Don't introduce a pattern Cesar will have to undo when his own work meets ours.

## What this means in practice

1. **Read the issue body cold, not from memory.** Plan files have known stale text — wire-level OBO is dead in v1, paths are `apps/api/src/amira_api/<area>/` not `services/<area>/`, MFA refs are dead, etc.
2. **Read `feedback_mars_architecture_lock.md` first.** Even non-LLM tickets touch the architecture: identity routes to Mars Okta OIDC + Workload Identity federation; persistence uses Supavisor not PgBouncer; audit is plain Postgres append-only not Cohasset/WORM.
3. **Brainstorm before coding** (Superpowers Phase 1). Cross-area touchpoints, system shape, precedent in shipped code. T-M2-27 (prompt registry) and T-M3-37 (capability graph) are the closest SQLModel + Alembic precedents we shipped.
4. **TDD red phase always** (binding standard, Superpowers iron law). Write failing tests before any production code.
5. **Review every diff before push.** Read the agent's full output. Cross-check against `apps/api/`'s existing shape. Does it use the locked tooling? (uv, FastAPI, Pydantic v2, SQLModel, Alembic, psycopg3, httpx, anyio.) Are docstrings present? Type hints complete?
6. **Match shipped precedent in style.** Our 7 shipped PRs (#235, #236, #237, #240, #242, #243, #244) are the closest stylistic fit. Mirror their structure: file layout, naming conventions, test fixture patterns, error-class hierarchy.
7. **Speed over alignment is forbidden.** If the agent suggests something that's faster but less-aligned with the rest of the system, push back / restart / re-prompt.
8. **No undocumented divergence.** If we must lift `services/<X>/` to `apps/api/src/amira_api/<X>/`, flag it in PR body. If we must skip stale OBO text, flag it. Make Cesar's review take two minutes, not twenty.

## Why this rule exists

These 6 tickets are foundational:

- **T-M1-21** `services/identity/User`/`Org` shape → used by every API handler's `require_principal` dependency → if wrong, every T-M1-22 / 25 / 27 / 28 ticket inherits the wrongness.
- **T-M1-31** Tenancy SQLModel classes → underlying RLS context for every Postgres query → wrong shape = RLS bugs everywhere.
- **T-M1-44** Canonical pytest fixtures (`pg_url`, `session`, `blob`) → every test in `apps/api/` will use these → wrong shape = platform-wide test pollution.
- **T-M1-47** Blob abstraction lint → enforces lint policy across every module that touches Blob → wrong rule = lint pollution.
- **T-M1-49 / T-M1-50** Persistence ACs → asserted by CI on every PR → wrong harness = false greens / false reds.

Misalignment compounds. Cesar's caveat is risk-mitigation against compounding-defect chains.

## Different rhythm than M2 sprint

| Dimension | M2 sprint (2026-05-06) | Ashwin-lane M1 (2026-05-13+) |
|---|---|---|
| Cadence | 7 PRs in ~7 hours | ~1 ticket per 0.5-1.5 days |
| Reviewer | Tests pass = ship | Tests pass + careful diff review = ship |
| Quality bar | "Standards met" | "Standards met + system-fit + Cesar-readable" |
| Goal | Maximize ticket count | Make Cesar's downstream integration zero-friction |

## Per-ticket application checklist

- [ ] Read issue body fresh via `gh issue view <NUMBER>` (not from memory or stale plan refs)
- [ ] Read source area file (linked in issue body) end-to-end
- [ ] Cross-check against `feedback_mars_architecture_lock.md` constraints touching this area
- [ ] Brainstorm: cross-area touchpoints, system shape, shipped precedent (which of our 7 PRs is closest fit?)
- [ ] Write a brief plan: file layout, table shapes, test shapes (Superpowers Phase 2)
- [ ] TDD red phase: failing tests committed first
- [ ] Implement to green
- [ ] **COLD DIFF REVIEW** before push: read every file end-to-end as if Cesar were reviewing — would he merge this in 2 minutes or push back?
- [ ] Run verification gate exactly per issue body
- [ ] PR body: flag any path divergence + arch-lock drift + assumptions explicitly
- [ ] Self-merge per `feedback_self_merge_pattern.md`

## Communication with Cesar

- **Before claiming first ticket**: brief WhatsApp confirming our plan ("starting with T-M1-44, then T-M1-21") so he can redirect if his priority differs.
- **After each PR**: WhatsApp post with PR number + one-line summary. Don't bundle.
- **If unsure on system fit**: ask in WhatsApp BEFORE coding, not after.

## Review-before-merge workflow (CONFIRMED 2026-05-13)

Cesar formalized this in WhatsApp at ~9:39 AM ET 2026-05-13:

> *"Farzaneh if you pick one, let me know when you're done and leave the PR open in github, I'll take a look at it"*

**This OVERRIDES the 05-06 self-merge directive (`feedback_self_merge_pattern.md`) for Ashwin-lane M1 backend tickets.** The 05-06 rule was context-specific to our `track:ai-agent` M2 sprint where speed was the priority. For these tickets, his explicit "leave it open, I'll look" replaces self-merge.

**The workflow per ticket**:

1. Ship to green
2. `git push -u origin <branch>` (CONFIRM with Farzaneh first per `feedback_no_remote_writes_without_confirm.md`)
3. `gh pr create` with body that flags every divergence-from-plan up front
4. **WhatsApp Cesar**: brief ping — `"PR #N for T-M1-NN ready when you have time. Leaving it open per your earlier message."`
5. **Wait for his review** — do NOT self-merge
6. If he approves: self-merge with `gh pr merge --squash --delete-branch` (still per-action confirmation)
7. If he requests changes: address them in a new commit on the SAME branch, push, ping him again
8. Don't pick up the next ticket until current PR is merged or explicitly hand-shook off

**Why the override is right**:
- These are HIS lane (Ashwin's, but he's the downstream consumer)
- His spaghetti-code caveat = implicit review-gate request
- Catching misalignment at PR time saves him 10x rework downstream
- Easier-not-harder frame requires it

**If he stays silent for hours**: don't merge prematurely. Send a follow-up ping. He may be deep in his own M1 infra work — let him surface naturally.

## BINDING — adversarial review every PR before push (Cesar's directive, 2026-05-14 in CLAUDE.md `7513cd4`)

Cesar locked this rule into the repo-root CLAUDE.md after merging our T-M1-31 PR #264. He used PR #264 as the trigger / textbook case:

> *"Adversarial-review every agent-generated PR before merge. Specifically check for: (a) `pytest.skip` patterns that hide all real assertions in CI when env vars aren't set, (b) schema drift from the locked area-file spec, (c) missing FK / uniqueness / enum / JSONB round-trip tests, (d) test thinness where 'N passed' hides skipped-by-default real-DB tests. PR #264 (T-M1-31 tenancy) was the textbook case: schema correct but only one assertion ran in default CI. The fix is concrete review asks per PR (OrgConfig round-trip test, lifecycle_state enum round-trip, slug uniqueness violation), not blanket distrust."*

**What we did wrong on PR #264**:
- Shipped 5 tests, 4 of which skip without `AMIRA_TEST_DB_DSN`
- In default CI (which doesn't set the env var), only `test_tenancy_public_surface_resolves` ran — pure import + signature check, no schema exercise
- "5 passed" looks good in PR body but doesn't reflect reality

**What we should have done**: included tests that exercise schema properties WITHOUT needing real DB, so default CI actually runs them:

```python
# These run in default CI — no AMIRA_TEST_DB_DSN required
def test_org_serializes_each_lifecycle_state():
    """Pydantic round-trip catches enum case mismatch in-memory."""
    for state in OrgLifecycleState:
        org = Org(slug=f"test-{state.value}", display_name="x", lifecycle_state=state, ...)
        round_tripped = Org.model_validate_json(org.model_dump_json())
        assert round_tripped.lifecycle_state == state

def test_org_config_pydantic_round_trip_with_jsonb_fields():
    """JSONB serialization works for list[UUID], dict[str, str]."""
    cfg = OrgConfig(org_id=..., version=1, skills_allowlist=[uuid4(), uuid4()], ...)
    round_tripped = OrgConfig.model_validate_json(cfg.model_dump_json())
    assert round_tripped.skills_allowlist == cfg.skills_allowlist

# This one still needs DB — keep gated, but the above two cover schema correctness regardless
@pytest.mark.usefixtures("schema_at_head")
async def test_org_slug_uniqueness_violation_raises(pg_url):
    """Two Orgs with same slug → IntegrityError on the unique constraint."""
```

**The discipline going forward**:

1. **Test-thinness audit per PR**: before push, count "tests that run in default CI" vs "tests that need env vars/Docker/credentials." If 80%+ of meaningful assertions require external state, the PR has a thinness problem.
2. **Schema-level Pydantic round-trip tests** for every SQLModel table — enum mapping, JSONB shape, required-field validation. These run in 0.01s without any DB.
3. **DB-requiring tests are ADDITIONAL**, not the only assertions. Schema correctness should be provable without a live database.
4. **Self-review the test plan** asking "if AMIRA_TEST_DB_DSN is unset, what does my PR actually prove?" If the answer is "the module imports" — the PR is too thin.

**Specific patterns Cesar flagged for review** (from CLAUDE.md):
- `pytest.skip(...)` gating ALL real assertions
- Schema drift from area-file spec (we caught most via cold review, but watch for it)
- Missing round-trip tests for: FKs, uniqueness constraints, enum columns, JSONB columns
- "N passed" headline hiding the SKIPPED count

**T-M1-49 + T-M1-50 application**: when we claim these next week, apply this rule. T-M1-49 (concurrency test) can't really run without real DB — concurrent inserts ARE the test. So flag in PR body that it's intentionally integration-only + propose CI workflow integration if needed. T-M1-50 (provider parity) CAN have schema-level tests (e.g., Pydantic round-trip of BlobStore inputs) plus integration tests.

---

## BINDING — surface foundational tickets to Cesar BEFORE claiming (Farzaneh's directive, 2026-05-13 EOD)

**The rule**: when a ticket is **foundational** (touches code every downstream area inherits / depends on), surface the question "do you want to handle this yourself?" to Cesar via WhatsApp BEFORE claiming. Don't auto-claim foundational work — even when labeled `ready`.

**What counts as foundational** — apply ANY of these triggers:

1. **Ships a class that downstream code inherits** (like `AmiraBase` would have been; like a `User` table that every `require_principal` route depends on).
2. **Ships a Protocol everyone implements** (like `BlobStore` would have been).
3. **Ships a dependency every route or workflow uses** (like `require_principal` middleware, `bind_engine` factory, etc.).
4. **Ships ≥10 files of new code** (large surface = many design choices to get right; rework cost is high if misaligned).
5. **Adds new top-level package deps** (authlib, itsdangerous etc.) — Standard #4 verification + Cesar's preference matter.
6. **Has 4+ judgment-call decisions in the design** (not just mechanical translation of a spec).

**T-M1-21 is the case that locked this rule** (2026-05-13 EOD):
- Ships `require_principal` dependency that every M1+ API route inherits
- 5 SQLModel tables + Pydantic `CurrentPrincipal` shape + middleware skeleton + audit kinds = ~13 files
- Adds `authlib` + `itsdangerous` deps
- 5+ design judgement calls (User table shape, CurrentPrincipal config, repo pattern, scope validation, middleware integration with `set_immutable_session_attrs`)
- **Spaghetti risk is highest** of any ticket touched — Cesar's caveat about "agent-generated code that's not aligned" cuts deepest here.

**Rule VALIDATED 2026-05-13 EOD-FINAL**: Farzaneh sent Cesar the canonical WhatsApp ("M21 is a big one. do you wanna do it yourself or should I?"). Cesar replied 3:08 PM: *"I'll pick on these ones, since the test issues are better suited for when the previous pieces of the code are plugged in so we can wait on those for a bit."* Outcome: Cesar took T-M1-21 + deferred T-M1-49/50. **Zero wasted work**; we now have ~9-11 hours of execution time freed up. If we had auto-claimed T-M1-21, we'd have spent ~6-8 hours writing a ticket Cesar wanted to write himself + added ~1-2 hours of review burden on him.

**The cost of NOT asking** (counterfactual): 6-8h of our time on T-M1-21 + 3-4h of Cesar's review (worst case for foundational misalignment) + ~4-6h of our rework. Total ~13-18h wasted. **Cost of asking**: one WhatsApp message + 3 hours of Farzaneh's wall-clock wait (Cesar replied at 3:08 PM to a 3:00 PM message). **Trade is asymmetric: always ask on foundational.**

**The math**:
- Us doing it well = ~6-8h our time + ~1-2h his review.
- Us doing it with subtle misalignment = ~6-8h ours + ~3-4h his review + ~4-6h our rework + ~1-2h his re-review.
- Cesar doing it himself = ~4-6h his time, zero back-and-forth.
- **For foundational tickets, his-doing-it can be the lowest-total-time path** even when it costs him more direct hours.

**The discipline check** (run BEFORE claiming a foundational ticket):

1. Estimate Cesar's review time on best-case vs worst-case outcome.
2. Estimate his write-time if he did it himself.
3. If write < worst-case-review, surface the question — even if best-case-review < write.
4. Frame the WhatsApp as offering him the choice, not pushing back.

**Canonical WhatsApp pattern**:

> *"Quick thought on T-M1-NN — it's [scope size] and [foundational property]. Given how foundational it is, would you prefer to handle it yourself? We're happy to take [smaller tickets X / Y] and leave T-M1-NN to you. Open to either — just want to make your life easier."*

What this does:
- Acknowledges the size + foundation status honestly
- Names the specific dependency that worries us
- Offers him the choice without presuming
- Frames as "easier not harder"
- Doesn't apologize or hedge — clean offer

**What this rule does NOT cover**:
- Single-file tests (T-M1-44, T-M1-47, T-M1-49, T-M1-50) — low spaghetti risk, no foundational classes.
- Mechanical schema work where every column shape is spec-locked (T-M1-31 was on the edge — but tenancy is the precedent T-M1-21 needs, so shipping it ourselves saved Cesar one foundational ticket).
- Tickets where Cesar has already explicitly said "you do this" (his "ok go ahead" greenlight for T-M1-47 was post-question; doesn't generalize).

---

## BINDING — second-pass evaluation before finalizing ANY task plan (Farzaneh's directive, 2026-05-13)

**The rule**: Before finalizing a plan for any T-M1-* (or any Ashwin-lane backend) ticket, do a deliberate **second-pass evaluation through Cesar's lens**. Not "is this technically correct" — "would Cesar himself write this, and would it reduce his review time?"

**Why this rule exists**: This conversation produced a concrete case where the first-pass plan was a spaghetti compromise that I would have shipped if Farzaneh hadn't asked the second-evaluation question. See "T-M1-31 ordering example" below.

**The second-pass checklist** (run BEFORE locking the plan, NEVER after PR opens):

1. **Spot "weak now, strong later" patterns.** Any "follow-up migration to add the constraint", "stub for now, real later", "exempt for this ticket, fix in a follow-up PR" — these are spaghetti seeds. Reframe them. Cesar doesn't ship temporal-coupling compromises; he sequences the work correctly.
2. **Spot sequencing mistakes.** If the plan has implicit cross-ticket dependencies (e.g., FK to a table another ticket creates), ask whether the SEQUENCING is wrong. Maybe a different ticket should ship first.
3. **Check every choice against existing precedent.** If we're diverging from a Cesar pattern (lint approach, fixture style, file layout, test rhythm), justify the divergence by *Cesar's philosophy* — not by our convenience.
4. **Make sure we're optimizing for HIS review time, not OUR ship speed.** Re-read the plan asking: "if Cesar opens this PR cold, does he merge in 2 minutes or does he have to figure out what we did?"
5. **Measure plan against issue body's "Files to create / modify" list.** Every addition we make, every file we skip, every path we lift — surface ALL divergences in the PR body, explicitly, with reasoning.
6. **Audit clever code.** Anything subtle, non-obvious, "elegant" — is it Cesar's elegance, or ours? If he wouldn't have written it that way, neither should we.
7. **Test depth calibration.** Per the match-precedent ≠ match-coverage rule below: does the test coverage match the PROBLEM shape, not just the precedent's shape?

**Concrete example — T-M1-31 ordering (the case that motivated this rule)**:

First-pass plan: do T-M1-31 (tenancy SQLModel) next. Handle the missing `user.id` FK via Option A — define `user_id` without the FK constraint, add a follow-up migration after T-M1-21 ships.

Farzaneh's second-pass prompt: *"what would be the option if we wanna be aligned with the system as cesar asked?"*

What the second-pass revealed:
- Option A creates 3 migrations where 2 would suffice
- Option A ships a knowingly-weak schema (no FK enforcement on user_id columns until the follow-up lands)
- Cesar's pattern from T-M1-13 was to back-propagate plan corrections, not ship known-wrong schemas
- The "T-M1-21 too risky to do first" objection was about DOWNSTREAM tickets (T-M1-22 OIDC sign-in, T-M1-23 token exchange) — NOT about T-M1-21's core deliverable (User SQLModel + package skeleton), which is IdP-agnostic and mechanical
- Right answer: pick T-M1-21 FIRST, then T-M1-31 with proper FK day 1. No follow-up migration. No temporal weakness. No spaghetti.

If we had shipped Option A, Cesar would have inherited:
- A schema with intentional gaps
- A pending follow-up migration to track
- An extra round-trip when he reviewed (because the gap would need explanation)

By doing the second pass, we reframed to a plan where Cesar inherits a clean schema, no follow-ups needed, and his review time is shorter.

**The aphorism worth keeping**: "First-pass plans optimize for OUR ship speed. Second-pass plans optimize for Cesar's review time." Always do both passes.

**When to do the second pass**: After the brainstorm + initial plan is drafted; BEFORE running `gh issue develop` to claim the ticket. NOT during cold review (too late — already coded). NOT after PR opens (way too late).

**Output of the second pass**: an updated plan that reflects the revised choices, plus a brief note in the PR body about what changed between first-pass and final.

---

## Discipline note — match-precedent ≠ match-coverage (T-M1-47 lesson, 2026-05-13)

**The trap**: when mirroring an existing Cesar test as the pattern template, it's easy to ship with the SAME amount of test coverage the precedent has — and call it "matching his style." That can hide gaps when the new problem has more behavioral surface than the precedent.

**Concrete example**: T-M1-47's lint test mirrored `test_irreversible_downgrades_carry_marker` (1 main test, no helper-level probes). But the precedent checks ONE thing (downgrade-body emptiness) while T-M1-47 parses 6+ AST import shapes (plain, aliased, multi-name, submodule, relative, TYPE_CHECKING-guarded). Same code-pattern, very different coverage need.

Initial submission claimed to "match Cesar's depth" with 1 test + 1 manual probe. Farzaneh's prompt — *"did we test the code and know every piece of this code and what each piece is doing? just like M44?"* — surfaced that "matching his pattern" was self-justifying cover for inadequate coverage on a problem that warranted more.

**The rule going forward**:

1. **When mirroring a Cesar precedent for a new ticket**: check whether the new problem has the SAME shape (number of distinct behaviors, edge cases, code paths) as the precedent. If not, the precedent's coverage level is NOT enough.
2. **Coverage calibration check**: enumerate the distinct behaviors the new code must handle. If there are more than the precedent had to handle, ADD explicit tests for each, even if Cesar's precedent didn't have helper-level tests.
3. **Don't use "Cesar's pattern has no probes" as justification** for skipping probes. His pattern was right for HIS problem. Adapt depth to YOUR problem.
4. **Self-check before claiming "we're aligned"**: can you explain every line AND prove every edge case is tested? If you can only explain but not prove, you have understanding without rigor. Add the tests.

**Aphorism**: pattern-matching matches the SHAPE; depth-matching matches the PROBLEM. Both are needed.

---

## Boundary check (sent 2026-05-13)

Farzaneh sent Cesar a second message offering him veto on specific tickets:

> *"Cesar, among those tasks if there is any you need me not to touch or go near to if you feel more comfortable doing that yourself, let me know. I don't wanna step on your toes specially since all these M1s are infrastructure build-ups."*

**This message is part of the workflow**. It pre-empts Cesar having to gently rein us in mid-sprint. His answer (whenever it comes) shapes which of the 6 tickets we actually work through.

## How rule #4 (foundational-surfacing) scales — the per-milestone critical scan template

**2026-05-15 validation**: when Cesar moved us to M2 with the directive "scan the M2 deliverables and be critic with the outputs for each of the github issues and the code," we ran the template:

1. **Inventory first** (`gh issue list -m <milestone>`)
2. **Group by track + identify our owned tickets** (label `owner:farzaneh`)
3. **Delegate deep-dives to Plan agents in parallel** — one per cluster (runtime / AI-agent / spec-agent / etc.)
4. **Synthesize into a per-milestone reference memo** (e.g., `project_m2_critical_scan.md`)
5. **Capture the "surfaced questions" list** — pre-flight checklist before any claim
6. **On assignment, re-read the memo first** — drift, dependencies, path corrections, risk surface, Pydantic shape sketches all already mapped
7. **Surface concerns BEFORE accepting** — never after PR review finds them

This template is the proactive shape of rule #4. The reactive shape (surfacing AFTER reading the ticket cold at claim time) is fine for one-off tickets but produces drift at milestone scale. The 5-rule discipline + this template should be applied to every milestone we work — M3 next, M4 after.

## BINDING — review tickets critically; resolve ambiguity unilaterally with defensible defaults (Cesar's directive, 2026-05-18)

**The rule**: When a ticket body has gaps, ambiguity, or apparent redundancy with other tickets, the right response is to **find and resolve** the ambiguity ourselves — not escalate every question. Only escalate if we hit a genuine blocker (foundational decision per rule #4, real conflict between standards, scope question that materially changes effort, or cross-ticket dependency we can't infer).

**Cesar's exact directive** (2026-05-18 internal call transcript):

> *"Review development tickets critically, as some lack clear instructions or result in redundant efforts."*

The operational meaning of "review critically": detect AND fix ambiguity — not raise every question back to Cesar.

**Concrete example — today's deep study for #84 produced 5 pre-claim questions, ALL resolved unilaterally**:

| Question | Critical to escalate? | Defensible default |
|---|---|---|
| Fixture count (30 vs 50) | No | Reuse existing 30 from `test_classifier_routing.py`; document in PR body |
| Activity input shape | No | Pydantic input (plan/05 §2 standard) |
| Activity-calls-emit vs Workflow-sandwiches | No | Workflow sandwiches (keeps Activity pure) |
| #91 scope (1 vs 4 agents) | No, defer | Wait for #81 to land; scope evident then |
| `llm-call-retry` NarrationEvent | No | Out of scope (lives in adapter, #86 closed) |

None required Cesar's attention. All have defensible defaults from codebase or binding standards.

**When TO escalate** (genuine blockers):

1. Foundational-ticket-surfacing per rule #4 (ticket touches code every downstream area inherits)
2. Real conflict between binding standards (plan/00 says X, plan/05 says Y, conflict is material)
3. Scope question that materially changes effort estimate (only AFTER you've tried to resolve, not preemptively)
4. Cross-ticket dependency we can't infer from issue/plan files

**When NOT to escalate**:

- Plan-doc-vs-code drift where code is clearly canonical (just document in PR body)
- Field-name or shape inconsistencies that don't change correctness
- Test fixture counts where existing precedent is defensible
- Patterns we can match from shipped PRs

**Why this rule exists**: Cesar's attention is the bottleneck. Today (5/18) he's wrapping #68 in focus mode. Pinging him with 5 questions we could resolve in 5 minutes burns his focus budget AND signals we can't make defensible calls. The "review critically" directive validates resolving ambiguity ourselves, not just surfacing it.

**Aphorism**: *"Surface what blocks; absorb what doesn't."*

**How this composes with rules #3 + #4**:
- Rule #3 (second-pass evaluation) — internal discipline applied to OUR plan before claiming.
- Rule #4 (surface foundational tickets) — escalation channel reserved for foundational scope only.
- Rule #6 (this one) — the in-between: for ambiguity that's not foundational, **resolve and document**, don't escalate.

The three rules together: think hard (rule #3), surface only when foundational (rule #4), otherwise absorb ambiguity with defensible defaults and document (rule #6).

---

## Rule #7 — (SUPERSEDED 2026-05-19 12:08 PM by Rule #8 below). When narrowing scope of an issue, ~~file follow-up tickets for the deferred parts~~.

> ⚠️ **SUPERSEDED 2026-05-19 12:08 PM by Rule #8 (pull-until-complete).** This rule is retained for historical context only. The default is no longer "file the carve-out" — it is "pull the upstream into the same PR." Carve-outs are only allowed on explicit project-lead authorization. See Rule #8.

**Originally locked 2026-05-18 EOD** after Cesar filed [#308](https://github.com/quantumdatatechnologies/amira-mars/issues/308) as a follow-up audit on our PR #300 (T-M3-39).

### The trigger case

Issue #132 (T-M3-39) listed *"`SpecAgentWorkflow` shell (signals/queries/**run loop**) + four Activities"*. Cesar's WhatsApp narrowed us to just `elicit_turn` mid-flight, so we shipped only 2 of the 4 Activities and wrote in the PR body: *"the other three Activities + run-loop integration are future T-M3 work."*

We did NOT file `gh issue create` for the deferred pieces. After PR #300 merged + closed #132, Cesar audited the gap himself and filed:

- **#308** — the missing run-loop body (**Wednesday demo blocker**)
- (confirmed #131 already exists for `compute_readiness`)
- `persist_spec_turn` — he'll carve out separately

He shouldn't have had to do this audit. We should have filed the follow-ups at PR-close time.

### The mechanical behavior change

**Before opening any PR that uses `Closes #N` (or otherwise closes a parent issue), do this gate:**

1. **Re-read the parent issue body's "Files to create" / "Deliverable" list.**
2. **Diff against what this PR actually ships.**
3. **For every deliverable NOT covered by this PR**, run `gh issue create --title "T-M<X>-<Y> follow-up: <thing>" --body "..."` and reference the original ticket.
4. **In the PR body**, list the follow-up issue numbers explicitly — not just prose "future ticket" or "deferred to T-M3 follow-up." Example: *"Out of scope (filed as carve-outs): #308 (run-loop body), #131 (compute_readiness — already open), #312 (persist_spec_turn)."*

If you can't write the issue number in the PR body's "Out of scope" section, you haven't filed the follow-up. Don't ship the PR until you have.

### When this triggers (recognize it)

- Issue body lists **N deliverables**, you ship **<N** because Cesar narrowed via WhatsApp.
- Issue body lists multiple **Activities / files / tables / endpoints**, you ship a subset.
- Plan section says *"X + Y + Z"*, you ship X.
- You're about to write the words *"future ticket"*, *"deferred to"*, or *"follows in a later T-M ticket"* in a PR body.

Each one is a mechanical "file the carve-out" trigger.

### Why this rule exists

Cesar's attention is the bottleneck. Audit-driven gap-finding by HIM (after we merged) costs him more than `gh issue create` by US (before the merge). Plus the demo timeline: #308 is a Wednesday demo blocker — if Cesar hadn't filed it himself, we'd have hit the demo with no run-loop body and no ticket tracking that gap.

**Aphorism**: *"Don't make Cesar audit what we deferred. File the carve-out."*

### How this composes with rules #4 + #6

- Rule #4 (surface foundational gaps BEFORE claiming) — scope-narrowing surfaces BEFORE the PR opens, often as a WhatsApp question.
- Rule #6 (resolve ambiguity unilaterally with defensible defaults) — for in-PR judgment calls, document in PR body.
- Rule #7 (this one) — for deferred scope, file the carve-out ticket. The PR body cites issue numbers, not prose.

The three together cover the full lifecycle: surface foundational unknowns up front (#4), absorb in-flight ambiguity (#6), file follow-ups for deferred-but-promised work (#7).

---

---

## Rule #8 — Pull the upstream into the same PR. No carve-outs by default. (BINDING 2026-05-19 12:08 PM)

**Locked 2026-05-19 12:08 PM** after Cesar rejected PR #337 (T-M3-42) for shipping a `LocalSandbox` placeholder + 3 skip-scaffolded tests + 4 follow-up tickets (#332/#333/#334/#335) per the (now-superseded) Rule #7.

**Source lock**: `docs/team-locks/feedback_no_carveouts_pull_until_complete.md` (in the amira-mars repo, shipped via PR #345).

### The rule

When a ticket's verification gate can't run end-to-end because an upstream deliverable doesn't exist yet, the session **PULLS that upstream ticket into the same PR**. No carve-outs, no "ship now / wire later," no follow-up tickets for the missing harness.

Only the project lead can authorize a carve-out, and only on explicit instruction. Default = pull until complete.

### The trigger case

PR #337 shipped with:

- `LocalSandbox` stub (tempdir + asyncio subprocess git) instead of the real Kubernetes `agent-sandbox` CRD client. Stated in PR body: *"Stubbed via LocalSandbox … until #94 lands. K8sSandbox swap filed as follow-up #335."*
- 3 of 7 tests `@pytest.mark.skip("AKV mock to ship in #332")` / `("OAuth-denied route to ship in #333")` / `("Anthropic timeout simulator to ship in #334")`.
- 4 follow-up tickets filed at PR-close: #332 (AKV mock harness), #333 (OAuth-denied route test), #334 (inference-timeout test), #335 (K8sSandbox swap post-#94).

Cesar rejected at 12:08 PM same day with the explicit callout:

> *"Direct violation of `docs/team-locks/feedback_no_carveouts_pull_until_complete.md`."*
>
> *"Four follow-up tickets filed off this one PR (#332, #333, #334, #335) — that's four carve-outs from one ticket. Lock #1 forbids this by default; no project authorization for carve-outs was given."*

Outcome: PR is being reworked on the same branch — pulling #94 (real sandbox CRD client, now closed via PR #343) and likely #103 (in-pod file-ops-api) into the same PR. Closing #332/#333/#334/#335 with comments explaining the work is absorbed.

### How to apply

Before opening any PR that closes a parent ticket:

1. **Run the verification gate end-to-end on the Linux dev VM.** Real keys, real DBs, real Temporal, real services.
2. **If a test can't run because a harness is missing**, ship the harness in this PR.
3. **If a production code path is stubbed** (LocalSandbox, mock provider, hand-crafted minimal bytes), replace it with the real path. Pull the upstream ticket if needed.
4. **Count follow-up tickets you're about to file off this PR**. If the count is non-zero, the PR isn't ready. Default to absorbing the scope.
5. **PR body**: every Deliverable row ✅, no ⚠️ markers, every test runs, every `Closes #N` reference covers actual coverage of that ticket's deliverables.

### When is a carve-out OK?

Only when the project lead has explicitly said *"file a follow-up for X"* in WhatsApp or PR comment. Default = no.

### Trigger words now BLOCKED in PR bodies

- *"future ticket"*
- *"deferred to"*
- *"follow-up for the harness"*
- *"to be enabled when X lands"*
- *"K8sSandbox swap post-#94"*
- *"Will run cleanly under CI after merge"*
- *"NOT verified locally (Windows asyncio ...)"*

If any of these appear in a draft PR body, stop and apply Rule #8: pull the upstream, ship the harness, run the gate on Linux dev VM.

### When pulling the upstream makes the PR too large

If pulling the upstream ticket(s) makes the PR touch 8+ unrelated subsystems and become genuinely too large to review, surface to the project lead BEFORE writing any code:

> *"Pulling #94 into #135 would also require pulling #103 and possibly #105 to make the gate run end-to-end. That's ~5 subsystems and ~3000 LOC across them. Would you prefer (a) we do that as one PR per pull-until-complete, or (b) you'd like to authorize a specific carve-out boundary?"*

Default answer: pull until complete. Only deviate on explicit authorization.

### Sibling locks (in `docs/team-locks/`)

- `feedback_no_carveouts_pull_until_complete.md` — the canonical source of this rule.
- `feedback_no_real_behaviour_nothing_moves.md` — ABSOLUTE: real exercise or nothing moves.
- `feedback_closing_pr_must_file_carveouts.md` — the OLD rule (Rule #7's source) explicitly notes itself superseded by this one.

### Aphorism

*"The PR is complete or it isn't. The shape of the work, not the size of the patch, defines the boundary."*

---

## Discipline note — when Cesar says "I will fix X", don't fix X ourselves (2026-05-19 ~12:35 PM)

**The rule**: When Cesar identifies an issue in HIS files (CLAUDE.md, architecture/, plan/, docs/team-locks/, his runbooks) and says *"I will fix this"* / *"I'll rewrite this"* / *"this shouldn't be here"* — that file is HIS to fix. Our job is to:

1. **Update OUR behavior** — drop the deprecated framing from our personal memory, our code, our PR body, our ACK replies.
2. **Adapt going forward** — apply the corrected rule in subsequent work.
3. **NOT edit his files** — even if it seems helpful, even if the fix is small, even if it's "obvious."

**Why**: His files are the canonical source of truth for the project. Editing them unsolicited (a) violates lane separation, (b) creates merge conflicts with whatever HE was about to edit, and (c) signals we don't trust him to follow through on his own stated commitment.

**Concrete case (2026-05-19 ~12:35 PM)**: Cesar pushed back on the dev-VM-specific framing in our ACK for PR #337 rework. He said *"I will fix this in the claude md file this shouldn't really be there. but maybe just tell the agent to avoid that, and rewrite the claude.md, we don't have to do stuff in cesar's vm..."*. The "rewrite the claude.md" tail-clause was ambiguous; the safe + correct read was "I'll rewrite [CLAUDE.md]" (continuation of his own commitment), not "[you] rewrite the claude.md." We:

- ✅ Updated our personal memory file (renamed + reframed `feedback_probe_real_behavior_not_local_smoke.md`)
- ✅ Sent a brief WhatsApp confirming the corrected framing
- ✅ Did NOT edit the repo CLAUDE.md
- ✅ Continued the PR #337 rework with the corrected rule applied going forward

If he'd wanted us to edit CLAUDE.md, the explicit ask would have been *"can you push a CLAUDE.md edit"* / *"the rewrite is on you"* — and he didn't.

**How to recognize the trigger**:

- *"I will fix this"*
- *"I'll update X"*
- *"I'll rewrite this"*
- *"this shouldn't be there"*
- *"let me fix that on my side"*

When you see those, the file is HIS to touch. Apply the corrected rule in our work, send a brief confirmation, move on.

**When the trigger doesn't apply** (rare; explicit ask):

- *"can you push an edit to CLAUDE.md"*
- *"the rewrite is on you"*
- *"please update plan/07 to reflect this"*

Those are explicit requests. Then we edit.

**Aphorism**: *"His files are his to fix. Update OUR behavior, leave HIS files alone."*

---

## Related memories

- [feedback_mars_architecture_lock.md](feedback_mars_architecture_lock.md) — binding architecture constraints (applies even to non-LLM tickets)
- [feedback_no_remote_writes_without_confirm.md](feedback_no_remote_writes_without_confirm.md) — per-action confirmation on every remote write
- [feedback_self_merge_pattern.md](feedback_self_merge_pattern.md) — ship → push → PR → self-merge immediately
- [feedback_avoid_jargon_amira_mars.md](feedback_avoid_jargon_amira_mars.md) — plain language in PR descriptions, issue comments
- [feedback_local_clone_freshness.md](feedback_local_clone_freshness.md) — git fetch + pull before every read
- [feedback_probe_real_behavior_not_local_smoke.md](feedback_probe_real_behavior_not_local_smoke.md) — **NEW 2026-05-19, REVISED post-Cesar-correction** — probe real behavior against real services, not "local smoke test." The dev VM is ONE option, not the rule itself.
- [feedback_no_skip_scaffolded_tests.md](feedback_no_skip_scaffolded_tests.md) — **NEW 2026-05-19** — skipped tests are not tests; ship the harness inline
- [feedback_pre_flight_lock_ack_required.md](feedback_pre_flight_lock_ack_required.md) — **NEW 2026-05-19** — when Cesar says "ACK before first code edit," that's a hard gate
- [project_prep_briefs_2026_05_06.md](project_prep_briefs_2026_05_06.md) — path divergence + OBO-dead + shipped patterns documented
- [project_m2_critical_scan.md](project_m2_critical_scan.md) — **VALIDATED EXAMPLE OF THE TEMPLATE** — adversarial-review scan of M2 deliverables; reference doc for every M2/M3 ticket we touch
