---
name: probe-real-behavior-not-local-smoke
description: "PR verification means probing real behavior against real services — real Postgres, real Anthropic, real Temporal, real K8s, real HTTP round-trips. NOT 'I ran a smoke test on my laptop and it passed.' The Linux dev VM is ONE place those real services are wired up, not the rule itself. Banned PR-body excuses for skipping verification: 'Windows asyncio blocks X', 'Will run on CI after merge', 'Smoke-tested once pre-commit'."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

PR verification means **probing real behavior against real services**. Real Postgres, real Anthropic, real Temporal, real K8s (when the deliverable touches the sandbox), real HTTP round-trips. The test doesn't have to run on any specific machine — it just has to run against real substrate.

Banned PR-body excuses for skipping verification:

- *"NOT verified locally (Windows asyncio blocks alembic — known issue per memory)."*
- *"Will run cleanly under CI / WSL on master after merge."*
- *"Smoke-tested once pre-commit, see snippet below."*
- *"All tests pass except the ones gated on Docker / env vars / credentials I don't have."*

Any of these means the substrate wasn't real and the gate didn't run.

# Why this rule exists (and what I got wrong before)

**Original framing (rejected by Cesar 2026-05-19 ~12:35 PM):** I'd written *"the test gate runs on the **Linux** dev VM `qdt-dev-cesar-vm`. Not on local Windows. Not on WSL. Not on 'CI after merge.'"* That was too biased toward Cesar's specific VM.

Cesar's correction:

> *"we don't have to do stuff in cesar's vm, the job is to probe real behaviour... make test is not strictly necessary as a hard rule, not everyone works in cesar's vm."*

The right framing: **the gate is real-behavior verification, not a specific machine.** `make test` on a Linux VM is one good way to do that. Running against a real K8s cluster (kind, AKS) is another. Running with `ANTHROPIC_API_KEY` against the real Anthropic endpoint is another. The constant is *real services round-tripping* — the variable is where you run it.

**The underlying mistake on PR #337 (2026-05-19 AM):** I'd claimed *"NOT verified locally (Windows asyncio blocks alembic … known issue per memory). Will run cleanly under CI / WSL on master after merge."* That was misdiagnosed — Windows asyncio was a LOCAL DEVELOPMENT concern, not a verification gate concern. And "Will run on CI" punts the gate to after-merge, which is too late. The PR got rejected.

The corrected lesson: don't conflate "I can't run it on my laptop" with "the gate can't run." Find a place where the substrate IS available (WSL with Docker, a Linux VM you have access to, a real K8s cluster) and run it there.

# How to apply

## Before opening any PR that closes a ticket

- [ ] Identify what real substrate the verification needs: Postgres? Anthropic? Temporal? K8s? Auth0? Real OAuth provider?
- [ ] Run the verification gate against that real substrate.
- [ ] Capture verbatim terminal output (or equivalent evidence) in the PR body under `## Verification`.
- [ ] If you can't access the substrate, coordinate BEFORE opening the PR — don't ship a PR that punts verification to after-merge.

## When writing the PR body

- The `## Verification` section is mandatory and concrete: what real services were touched, what output was observed, what assertions passed.
- It's NOT a list of "what would happen if I could run it." It's a list of "what happened when I ran it."
- It's NOT "smoke-tested pre-commit." Smoke tests are dev-loop convenience; gate verification is real round-trips.

## When a test seems to fail locally

- Don't blame local environment as the verification skip. The verification is real-substrate, not local convenience.
- Try WSL, a Docker container, a cloud VM, or whatever environment has the real services wired up.
- If the failure is environmental (e.g., Windows asyncio incompatibility, missing creds), that's a LOCAL DEVELOPMENT problem to solve — not a gate-skip excuse.

## What substrate maps to what test

| Test concern | Real substrate |
|---|---|
| DB-touching | Real Postgres (`amira_test`) |
| LLM-touching | Real Anthropic SDK with real key (`@pytest.mark.integration`) |
| Route-touching | Real FastAPI ASGI transport, asserting on HTTP response + DB state + outbox + audit |
| Workflow-touching (deliverable IS the workflow) | Real `WorkflowEnvironment.start_local()` |
| Browser-touching | Manual verification against the running stack |
| K8s sandbox-touching | Real kind cluster (env-gated like `AMIRA_KIND_E2E=1`) |

# Sibling locks (from `docs/team-locks/`)

- `feedback_no_real_behaviour_nothing_moves.md` — ABSOLUTE: real keys, real services, real round-trips. Anything less = nothing moves.
- `feedback_no_simulation_demo.md` — demo is real system at amira.qdt.ai; never stubs/mocks/local-only as scope relief.
- `feedback_check_parallel_make_test_before_blaming_regression.md` — flaky `make test` is usually parallel-session DB pollution, not a real regression.
- `feedback_test_shape_matches_deliverable_shape.md` — match test shape to deliverable; shell pytest hangs >60s = wrong test shape.
- `feedback_minimal_bytes_to_pass_tests_is_simulation.md` — hand-crafted minimal valid bytes is the same family as mocking.

# Aphorism

*"The gate isn't a machine — it's real services round-tripping. Find a place that has them and run there."*
