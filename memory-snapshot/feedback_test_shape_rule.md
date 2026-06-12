---
name: test-shape-follows-deliverable-shape
description: "Cesar's test-shape rule — evolved 2026-05-18 from 'match shape' (PR #294) to 'full-reality tests or no test' (PR #301). Bans decorator-introspection, Pydantic shape, caplog log-assertion, schema-column introspection. Every test must assert a user-describable behaviour against the real running system. PR body must list every test in one sentence of user-visible behaviour."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## The rule

**Test shape follows deliverable shape.** Don't pick the most thorough test pattern; pick the right-scoped one for what the deliverable is. Test infra weight calibrates to deliverable type, not to "be safe."

**Why**: Cesar opened PR #294 (`test-guardrails` branch, 2026-05-18 ~9:55 AM ET) after hitting *"11+ minutes booting a Temporal test-server to verify a class declaration that needed two `hasattr` assertions"* on T-M2-18 (SpecAgentWorkflow shell, his lane, still OPEN). The rule lands in `CLAUDE.md` + `plan/00-engineering-standards.md` when merged.

**How to apply**: Match infra weight to deliverable shape:

| Deliverable shape | Test pattern |
|---|---|
| **Structural** (class exists, decorators applied, type fields match) | Introspection only — `hasattr`, `__temporal_signals__`, `model_fields`, Pydantic round-trip. No DB, no Temporal server. Sub-second. |
| **Behavioral logic** (state machines, validation, mappings, computations) | Unit tests + real-DB integration where state matters. |
| **HTTP routes** | ASGI + real Postgres via existing fixtures. |
| **Demo seams** (UI-visible flows) | Playwright via MCP. |

## Enforcement

In `apps/api/pyproject.toml`:
- `pytest-timeout==2.4.0` dev dep
- Global `timeout = 60` / `timeout_method = "thread"` config
- Any test taking >60s **FAILS** rather than hanging
- Override per-test via `@pytest.mark.timeout(N)` when genuinely needed (rare)

## The trigger case (T-M2-18)

The `SpecAgentWorkflow` shell ticket's deliverable was a class declaration with `@workflow.defn`, two `@workflow.signal` handlers, and one `@workflow.query`. Testing only needed to verify:
1. `hasattr(SpecAgentWorkflow, "_workflow_attrs")` or similar
2. The signal method names exist with correct decorators
3. The query method exists

All three are **structural** introspection. Booting a real Temporal server to start a worker to run the workflow to verify these is theatre — and slow.

## How this composes with prior binding rules

| Rule | Prior framing | 5/18 refinement |
|---|---|---|
| #5 adversarial-review (2026-05-14, CLAUDE.md `7513cd4`) | No test-thinness — assertions must run in default CI | Plus: don't INFLATE infra weight either. Match shape to deliverable. |
| #6 resolve ambiguity unilaterally (2026-05-18) | Find and absorb ambiguity with defensible defaults | This rule explicitly defensible default for "what test pattern do I use?" |
| Standard #5 from plan/00 (realistic e2e tests) | Realistic scenarios, not smoke-only | Test infra weight matches DELIVERABLE shape, not "realistic" maximalism |

**Together**: tests must run in default CI (rule #5), be calibrated to deliverable shape (this rule), and use defensible defaults when patterns are ambiguous (rule #6).

## Application to #84 (Classifier Activity)

- **Activity decorator applied** → structural, `hasattr(classify_intent, "__temporal_activity_defn__")` or equivalent. No infra.
- **Input/output Pydantic types correct** → structural, `model_fields` introspection + round-trip serialization (per the 5/14 rule).
- **Verdict mapping (`result.category` → `ClassifierVerdict.intent`)** → behavioral unit, pure function call. No infra.
- **Activity calls `classify()` with correct context** → behavioral unit, mock the LLM call OR call real `classify()` if the integration test in `test_classifier_routing.py` is already considered the coverage source.
- **Real Haiku classification accuracy** → already in [`test_classifier_routing.py`](apps/api/tests/test_classifier_routing.py) for `classify()`. Activity test does NOT duplicate.
- **Activity-in-Worker e2e** → already proven by [`test_client.py`](apps/api/tests/runtime/test_client.py) for the T-M2-03 substrate. Activity test does NOT re-prove.

Total runtime for #84's test file: well under 60s. No real Temporal server needed.

## Application to all future Activity / Workflow tickets

Before designing tests, ask:
1. What's the deliverable's primary shape? (class definition vs. behavior vs. route vs. UI)
2. What's the cheapest test pattern that PROVES the deliverable works?
3. Is there infra weight that doesn't actually prove anything more than introspection would?

If the answer to #3 is yes, strip it.

## Status — RULE EVOLVED 2026-05-18 LATE

**ORIGINAL rule** (PR #294 `eab924b`, 11 AM ET): "test shape follows deliverable shape" — structural→introspection ALLOWED, behavioral→unit+DB, etc. Applied to our PR #299 (T-M2-21 classify_intent) which Cesar merged saying *"matches the rule cleanly."*

**REVISED rule** (PR #301 `87e638c`, ~3 PM ET): **"Full-reality tests or no test."** Cesar locked a HARDER rule in `CLAUDE.md` after concluding the #294 rule was *"a compromise that allowed introspection tests for 'structural' deliverables. Agents over-fit on it — every M2 ticket produced `assert hasattr(X, '__temporal_signals__')` filler that wasted hours without verifying anything the running system doesn't already enforce."*

### The new BANNED list (delete on sight in code review)

- **Decorator-introspection tests** (`hasattr`, `__temporal_signals__`, `__temporal_queries__`, `_Definition.must_from_callable`) — running worker fails at registration if decorator missing
- **Pydantic shape tests** (`model_fields`, `extra="forbid"`, `frozen=True`, `min_length` asserts) — testing Pydantic-the-library
- **caplog log-assertion tests** — logs are observability, not contract; operator-grep belongs in Kibana
- **Schema column / `__table__.columns` introspection** — Alembic + runtime SQL verify this
- **"Returns a value" / "function is callable" / "module imports" tests**
- **Any test whose one-sentence description is "the X is applied" or "the Y returns a Z" without naming an end-user-observable consequence**

### The new POSITIVE rule

> *A test exists only if it asserts a behaviour a user can describe in product terms, against the real running system.*

- **Real Postgres** (`amira_test`) for DB-touching code
- **Real Anthropic SDK** for LLM code (`@pytest.mark.integration`, skipped without `ANTHROPIC_API_KEY` in default CI)
- **Real ASGI transport** for routes, asserting on HTTP response + DB state + outbox row + audit log row
- **Real Workflow execution** (`WorkflowEnvironment.start_local()`) only when the deliverable IS workflow execution behaviour
- **Real browser** (Playwright) for demo-flow seams

### PR body requirement

> *PR bodies MUST list every test in one sentence describing the user-visible behaviour it verifies. Sentences that match the banned categories → delete the test before opening.*

### Enforcement mode: going-forward, NOT retroactive

Cesar's PR #301 only deleted 2 caplog tests from our `test_classifier_activity.py` (the worst offenders that flaked under `make test`). He **kept** our decorator-introspection + Pydantic shape + behavioural tests despite the new ban list. Reading: existing-on-master tests are grandfathered; new PRs are reviewed under the new rule.

### Cesar attributed our PR #299 as a churn source

Verbatim: *"After three sessions of agent-generated test churn (PR #299 caplog regressions, T-M2-18 11-minute Temporal-test-server hangs for class introspection, three conftests with conflicting TEST_AUTH0_ORG_ID), the symptoms accumulated faster than they were fixed."*

Implication for the "farzaneh will bring the magic" framing: quality bar is now visible BOTH ways — high-quality production code MORE shipping (he validated our classify_intent design), AND high test-discipline expected (we caused his cleanup work). Pattern alignment matters more than coverage padding.

## Implication for active work

- **PR #300 (T-M3-39 elicit_turn)**: has 2 caplog tests + 5 Pydantic shape tests + 1 decorator test. The 2 caplog tests will almost certainly be deleted by Cesar in review (matches his behaviour on #299). **Proactive refactor**: delete the 2 caplog tests + update PR body to add one-sentence-per-test descriptions before he reviews.
- **PR #143 (T-M3-50 LLM-judge wrapper) and future M3 work**: write tests strictly per the new rule. ~3-5 golden-trace tests with deterministic mock adapter + 1 real-LLM integration. NO decorator, NO Pydantic shape, NO caplog tests.

## Validation event — PR #300 retroactive application (2026-05-18 evening)

Cesar reviewed PR #300 (T-M3-39 elicit_turn Activity) post-PR-#301-merge and applied the new rule retroactively (despite the "going-forward not retroactive" framing in #301). He flagged the original 17-test file as full of banned patterns and asked us to refactor.

**What we deleted** (13 tests, all matching the banned categories):
- 1 decorator-introspection test (`test_is_a_temporal_activity_with_correct_name`)
- 5 input Pydantic shape tests (`extra="forbid"`, `frozen=True`, `min_length`, etc. on `ElicitTurnInput`)
- 4 output Pydantic shape tests (`SpecTurnOutput` round-trip, discriminator-union resolution, ID-pattern enforcement, `kind_hint` enum)
- 2 helper-unit tests (`_render_context_block` rendering)
- 2 caplog log-assertion tests (decision-event with both `decision_point_emitted` branches)
- Net: 17 default-CI tests → 3 + 1 integration

**What we kept** (4 tests, every one user-describable):
1. `test_calls_adapter_with_correct_request_shape` — adapter receives the right system blocks + tool + tool_choice + metadata
2. `test_returns_parsed_spec_turn_output` — Activity returns typed `SpecTurnOutput` not dict, so Workflow consumers don't break
3. `test_propagates_adapter_exceptions` — adapter errors propagate so Workflow `RetryPolicy` can govern
4. `test_activity_routes_one_real_call_against_shipped_prompt` (`@pytest.mark.integration`, `@pytest.mark.timeout(120)`) — real Opus call against shipped prompt produces parsable output

**PR body**: rewrote with each test in one numbered sentence + a `Catches:` enumeration of what regressions it prevents. Added a determinism gate section (3× back-to-back `pytest` runs, 352/4 deterministic).

**Lessons reinforced**:
- The "going-forward not retroactive" framing in Cesar's #301 merge note was directional, not a hard guarantee. If a PR is open at the time the rule lands, expect retroactive application.
- The integration test absorbs coverage that helper-unit tests would have provided (the `_render_context_block` deletion is safe because if rendering breaks, the real LLM response shape becomes detectably wrong — same signal, less surface).
- Each kept test gets a `Catches:` line in its docstring listing the specific regressions it would surface — this is what makes the one-sentence-per-test PR body actually meaningful (not just labels).
- Determinism gate is non-negotiable post-#301: when test count drops big, run `pytest` 3× back-to-back to verify no hidden dependency on deleted tests existed.

### Cesar's verbatim approval — closing the loop (PR #300 MERGED `f93b3ae`, 10:56 AM)

> *"All 13 banned tests deleted. 4 surviving tests (3 behavioural + 1 integration) verify real wire behaviour. PR body lists each in one sentence of user-visible behaviour. Full suite 353 passed on Linux (the cp1252 issue she flagged is Windows-only and unrelated). Ship."*

**Five validations from one approval message**:
1. ALL 13 banned-category deletions were the right ones — no false-positive deletes, no missed bans.
2. The 4 surviving tests "verify real wire behaviour" — the positive rule passed.
3. PR body format "lists each in one sentence of user-visible behaviour" — matched expectation exactly.
4. Full suite passes deterministically on his Linux (353 passed) — the 3× back-to-back gate cleared.
5. Surfacing the cp1252 alembic-encoding failure as Windows-only-and-unrelated was the right call — diagnosis acknowledged, no follow-up.

Approved + merged within ~2 minutes of our PR comment. The faster the approval cycle, the better the alignment signal.

### Concrete template for future tickets (banked from PR #300)

Per the rule, every test file should open with:
```python
"""<Module name> — <ticket ID> / <plan reference>.

Test shape per CLAUDE.md "Full-reality tests or no test" (locked PR #301,
master <commit>): each test asserts a behaviour a user can describe in
product terms against the real running system. No <list the categories
that COULD have been tempting for this deliverable type but were skipped>.
"""
```

Each test function gets a docstring of the form:
```python
"""<One sentence describing user-visible behaviour>. Catches: <specific
regressions this would surface — comma-separated, name each one>."""
```

If you cannot write the `Catches:` line concretely, delete the test — it's not measuring anything specific.

## Suite-wide fixture isolation (PR #301 part 1)

PR #301 also refactored test infrastructure:
- `apps/api/tests/conftest.py` is now the **single source of truth** for `pg_url`, `schema_at_head`, `TEST_AUTH0_ORG_ID="org_testharness"`, `monkeypatch_session`, `_reset_module_singletons` (autouse function-scoped — resets `get_settings.cache_clear()`, `persistence.engine._session_factory`, agents Temporal client singleton)
- Sub-conftests in `tests/{audit,audit_consumer,persistence,identity,tenancy,api}/conftest.py` no longer redefine these. Cross-conftest divergence (e.g., `"org_testharness_agents"` vs `"org_testharness"`) was root cause of UNIQUE-constraint pollution.
- `make test` now depends on `sync-deps` → `uv sync --extra dev` auto-runs when `pyproject.toml` / `uv.lock` newer than `.venv/.synced-stamp`. No more "plugin in lockfile, not in venv" footgun.

When writing future tests: do NOT redefine `pg_url` / `schema_at_head` / `TEST_AUTH0_ORG_ID` in sub-conftests. Inherit from the root.

## Related memories

- [[feedback_cesar_quality_bar_m1_backend]] — rules #5 (adversarial review, no test-thinness) + #6 (resolve unilaterally)
- [[project_next_session]] — current state tracker
- [[project_m2_critical_scan]] — M2 deliverables analysis
