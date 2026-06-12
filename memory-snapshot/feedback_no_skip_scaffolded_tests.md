---
name: no-skip-scaffolded-tests
description: "Never ship `pytest.mark.skip(\"to be enabled when X harness lands\")` paired with a follow-up ticket. If a test needs a harness (AKV mock, ASGI route extension, K8s sandbox client, HTTP-outage simulator), ship the harness IN THE SAME PR. Skipped tests are not tests. Never add Windows-only or simulated-scenario tests — the platform runs on Linux/K8s and doesn't need environment hacks."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

Tests either exercise real behavior end-to-end against the real system, or they don't exist. Two anti-patterns are explicitly banned:

## Anti-pattern 1: skip-scaffolded tests

`pytest.mark.skip("to be enabled when <harness> lands in #<N>")` paired with a follow-up ticket for the harness. Cesar will reject the PR.

- **Wrong**: ship a `@pytest.mark.skip` test today, file a follow-up ticket for the harness tomorrow.
- **Right**: ship the harness IN THE SAME PR as the test that uses it. AKV mocks, ASGI route extensions, K8s sandbox client stubs, Anthropic-HTTP outage simulators — all ship inline.

## Anti-pattern 2: Windows-only or simulated-scenario tests

Don't add tests that ONLY work in Windows. Don't add tests with simulated-scenario hacks (mocked time, mocked subprocess, mocked filesystem) when the real behavior is available. The platform runs on Linux under Kubernetes and does not need environment hacks.

Cesar's exact addendum (WhatsApp 2026-05-19 12:18 PM):

> *"beware of any 'pytest' or 'test' creation that gets leaked into the code, try to push back that the test is not necesary to run in windos or in any simulated scenario, the platform will run in kubernetes under linux and does not need any hacks to work in widnows or in other environments. If the test is not real behavour or deviates from the objective of the component in this ticket then just skip [writing it entirely], only test real behavior."*

The operational rule: if a test isn't real-behavior, **don't write it at all** — `pytest.mark.skip` is NOT the answer; deletion is.

# Why this rule exists

PR #337 (T-M3-42) shipped 7 tests, 3 of which were `@pytest.mark.skip("AKV mock to ship in #332")` / `("OAuth-denied route to ship in #333")` / `("Anthropic timeout simulator to ship in #334")`. We filed 4 corresponding follow-up tickets (#332/#333/#334/#335) per the OLD Rule #7.

Cesar rejected at 12:08 PM the same day:

> *"Three of seven tests are scaffolded with skip-reasons + follow-up tickets (#332, #333, #334). Skipped tests are not tests. Violates `docs/team-locks/feedback_no_real_behaviour_nothing_moves.md` (ABSOLUTE)."*

And:

> *"Four follow-up tickets filed off this one PR (#332, #333, #334, #335) — that's four carve-outs from one ticket. Lock #1 forbids this by default; no project authorization for carve-outs was given."*

The deeper lesson: a `pytest.mark.skip` paired with a follow-up ticket is mechanically the same as deferring scope — it carves up the deliverable and ships a partial. The new project lock `feedback_no_carveouts_pull_until_complete.md` makes that the default-forbidden pattern. If the harness is needed, the harness ships.

# How to apply

## Before writing any test

1. Identify what real system component the test exercises.
2. Confirm that component is available in the test environment (Linux dev VM, real Postgres, real Temporal, real Anthropic, real K8s sandbox).
3. If not: identify what harness is missing. Decide whether to ship the harness in this PR or narrow the test's scope.
4. **Never** write a test you intend to mark `@pytest.mark.skip`. Either ship the harness or don't write the test.

## When tempted to write `@pytest.mark.skip`

- Ask: "what's missing?" — usually a mock harness, a stub server, a fixture.
- Then ask: "can I ship the missing piece in this PR?" — per `feedback_no_carveouts_pull_until_complete.md`, the default answer is YES.
- If the missing piece is enormous (e.g., the entire K8s cluster), surface to Cesar via WhatsApp BEFORE coding. Do not ship the skipped test as a placeholder.

## When a test would only work on Windows

- Delete it. Don't add Windows-specific test infra hacks.
- The platform runs on Linux under K8s. Tests need to run there.
- Local Windows development convenience does not justify a Windows-only test.

## When the test deviates from the component's objective

- Per Cesar's addendum: if the test is not real-behavior or deviates from the component objective, don't write it.
- This includes "smoke tests" that just check imports work, "schema tests" that just check Pydantic shapes round-trip without exercising the database, and "infrastructure tests" that test mocks rather than real behavior.

## PR body checklist

- Every test listed in the `## Tests — one sentence per test (user-visible behaviour)` section actually runs.
- Zero `@pytest.mark.skip` on the tests this PR ships.
- Zero follow-up tickets filed for "test harness to enable test X."
- Every test asserts user-visible behavior in product terms (not adjacent shapes per `feedback_test_the_user_visible_contract_not_adjacent_shapes.md`).

# Sibling locks (from `docs/team-locks/`)

- `feedback_no_real_behaviour_nothing_moves.md` — ABSOLUTE: real exercise or nothing moves.
- `feedback_no_carveouts_pull_until_complete.md` — pull upstream into same PR; don't carve out.
- `feedback_minimal_bytes_to_pass_tests_is_simulation.md` — hand-crafted minimal bytes (PDF magic, OOXML skeleton) to pass a content-type assertion is the same family as workflow mocking.
- `feedback_test_shape_matches_deliverable_shape.md` — test shape matches deliverable shape; shell tests are structural (<0.5s); test-server is for routes that actually execute workflows.
- `feedback_test_the_user_visible_contract_not_adjacent_shapes.md` — tests assert the wire shape a real user sees, not adjacent fields.
- `feedback_playwright_was_net_negative.md` — UI verification is manual; don't reintroduce Playwright.

# Aphorism

*"A skipped test is a lie shaped like a test. Ship the harness or delete the file."*
