---
name: start-amira-issue-locks-consolidated-per-ticket-workflow-gate
description: "Cesar's PR"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Source

`D:/amira-mars/.claude/commands/start-amira-issue.md` (Cesar's PR #320 shipped 2026-05-19 overnight, commit `7ad9df2`). This is the slash command `/start-amira-issue <issue-number>` he runs when picking up any open Amira issue. It injects everything in this memory file as live context for each ticket session — read here so we know the lock set even without invoking the slash command.

# REASONING REQUIREMENT (NEW lock 2026-05-19)

Every PR body MUST include a section titled exactly:

```
## How this PR integrates with the system
```

placed **BEFORE** the test list. The section is a one-paragraph reasoning draft covering three points:

1. **How this deliverable integrates with existing master surfaces.** Name the specific module / table / route / Activity it extends. If the ticket needs a caller that doesn't exist on master yet, flag it — you may be shipping dormant code (per `feedback_no_infra_without_caller.md`, Cesar-side memory).

2. **Which locks apply and how the design respects each.** From the locks loaded (CLAUDE.md / architecture/CHANGELOG.md / plan/00 / memory feedback files), list every one that touches the ticket's scope and state how the code stays inside the line.

3. **The end-to-end user-visible consequence of shipping this ticket.** What does a user / operator see in the browser, the DB, or the logs that they didn't see before? If you can't name a user-visible consequence, the test will fall into the banned category — re-scope or surface to Cesar.

Without this section, the PR is incomplete per the new lock. Locked 2026-05-19.

# Drift patterns to cross-check in EVERY M3 ticket

Seed-time issue bodies often lag the locks. Before writing code, scan the ticket's deliverable line-by-line against `architecture/CHANGELOG.md` + CLAUDE.md "Not in v1" + this list:

| Stale shape | Source | Correction |
|---|---|---|
| `app_compliance_pin` table in plan/08 | `architecture/CHANGELOG.md:16` | DELETED. Canvas persistence is 7 tables, not 8 (per merged PR #317). |
| `skill_outbox` table in plan/10 | CLAUDE.md Single-table outbox lock | STALE. All skills audit goes to `app.outbox_event` with `service='skill-catalog'`. |
| `services/*-svc/` paths anywhere | pre-monorepo layout | STALE. Translate to `apps/api/src/amira_api/<area>/` (mirror Spec / Canvas / Skills patterns on master). |
| Regulatory framework concepts (SOX / GDPR / HIPAA / PCI / CVE / Trivy / scan_image / geography_lock / residency_nfr / per-framework predicates) | "Not in v1" | BANNED. Compliance Matrix is spec-coverage scoring only (one `readiness_score` float + one deploy-gate predicate). Strip from scope. |
| Playwright anywhere | PR #316 (2026-05-18) + `feedback_playwright_was_net_negative.md` | STRIPPED. UI verification is manual against the running stack. Never reintroduce. |

If drift found, **fix the foundation in the same PR** (per `feedback_fix_foundation_dont_defer.md`, Cesar-side memory): ship the lock-consistent shape AND update the stale plan/issue/TECHNICAL_EXECUTION_PLAN entry in the same diff. Don't decorate around stale plan text.

# BANNED on sight (delete in code review) — expanded list

These are deleted in code review without ceremony. Cesar's list, verbatim:

- **Decorator-introspection** (`hasattr`, `_Definition.must_from_callable`, `__temporal_signals__`)
- **Pydantic shape tests** (`model_fields`, `extra="forbid"`, `frozen=True`, pattern / `min_length` asserts, JSON round-trip)
- **`caplog` log-assertion tests** — logs are observability, not contract
- **Schema-column introspection** (`__table__.columns`, `inspect(table).columns`)
- **`inspect.signature()` / `inspect.isasyncgenfunction()` / "is X callable" tests**
- **`from amira_api.x import (...)` "public surface resolves" smoke tests**
- **`unittest.mock.AsyncSession` / `AsyncMock`-based DB tests** — use real `db_engine` (NEW 2026-05-19)
- **Any mock / stub / fake of OUR code** (`LLMClient`, `MeteringClient`, `classify()`, workflow signal handlers, repositories) — use real production classes. Spy `MeteringClient` at the persistence seam is the ONLY acceptable stub. (NEW 2026-05-19 — formalizes PR #305 lesson.)
- **`@pytest.mark.flaky` / `pytest-rerunfailures` / `pytest.mark.skip`** masking a failing test (NEW 2026-05-19)
- **PLAYWRIGHT anything** (`.spec.ts`, `playwright.config.ts`, `@playwright/test` import, `npx playwright`) (NEW 2026-05-19, locked by PR #316)

PR body MUST include one sentence per test describing the user-visible behaviour it verifies. If the sentence falls into a banned category, **delete the test before opening the PR**.

# The positive test rule (no relaxation)

A test exists only if it asserts a behaviour a user can describe in product terms, against the real running system. That means:

- **Real Postgres** (`amira_test`) for DB-touching code. No SQLite. No in-memory. No `unittest.mock.AsyncSession`.
- **Real Anthropic SDK** for LLM code. `@pytest.mark.integration` + `@pytest.mark.timeout(N>60s)`, skipped without `ANTHROPIC_API_KEY` in default CI. Use `get_provider_client()` + a spy `MeteringClient` at the persistence seam ONLY — **never stub `LLMClient` itself**.
- **Real ASGI transport** for HTTP routes. Assert on HTTP response + DB state + outbox row + audit log row — the user-facing contract end-to-end.
- **Real `WorkflowEnvironment.start_local()`** ONLY when the deliverable IS workflow execution behaviour.
- **Real browser — MANUAL verification** for UI demo-flow seams. Playwright was stripped 2026-05-18. Manual = Cesar drives the stack, captures evidence.

# FILE-SCOPE DISCIPLINE (locked 2026-05-19)

Multiple Claude Code sessions may share the writable working tree (`D:/amira-mars/`). Stage ONLY files in YOUR ticket's `Files to create / modify` scope.

- **NEVER** `git add -A` / `git add .` / `git commit -a`.
- Use explicit `git add <path>` per file.
- If uncommitted changes appear outside your scope, **leave them alone** — they belong to another session.

# DEFERRED chain — DO NOT TOUCH

Three tickets are deferred to M6 (label `deferred-post-demo`). Never introduce code that depends on or would consume them:

- **#78 BYOK** (Bring Your Own Key)
- **#79 metering** (the `llm_call` table + real `MeteringClient` — our spy-adapter pattern in PR #305/#313 already accommodates this)
- **#93 `/settings/usage` rebuild**

The spy `MeteringClient` swaps to a real-DB query when #79 lands, but until then the spy IS the impl.

# HARD CONSTRAINTS

1. **`make test` must exit 0 on master after the PR**. Three back-to-back deterministic runs from a clean checkout is the gate.
2. **Global 60s pytest-timeout**. Integration tests need explicit `@pytest.mark.timeout(N>60s)` with a named caller in the docstring.
3. **Multiple sessions share `amira_test` DB** — if `make test` shows flaky cross-org / tenant-middleware / audit-consumer failures, suspect **parallel-session DB pollution first** (per `feedback_check_parallel_make_test_before_blaming_regression.md`, Cesar-side memory), NOT a recent merge regression.
4. **Foundation drift fix in same PR** — per `feedback_fix_foundation_dont_defer.md`. Don't ship code that decorates around a stale plan; fix the plan/issue/doc text in the same diff.

# PR body shape lock (2026-05-19)

Open ONE PR titled exactly the issue title (e.g. `T-M3-XX — <deliverable name>`). Body sections in this exact order:

1. **`## How this PR integrates with the system`** — the REASONING REQUIREMENT paragraph
2. **`## Deliverable shipped`** — what landed (vs the ticket's stated deliverable; flag any de-scope explicitly)
3. **`## Tests — one sentence per test (user-visible behaviour)`** — N sentences, each starting with the test function name
4. **`## Verification`** — `make test` output (three deterministic runs), plus any manual-browser steps run
5. **`## Foundation drift fixed in this PR`** (if any) — what stale plan/issue/doc text was corrected and where
6. **`Closes #<issue-number>`**

# Pre-claim checklist (Cesar's slash command's "STOP" gate)

**ZEROTH STEP (added 2026-05-19 morning after #135 surprise):** scan the issue body for `[EDITORIAL FLAG]`, `[STOP]`, `[BLOCKED]`, `[DO NOT PICK UP]`, or any explicit pickup-blocking marker Cesar may have embedded. These can appear:

- As a markdown section header right after the metadata block (e.g. `## [EDITORIAL FLAG — Cesar review needed before Farzaneh picks up]`)
- Inside the "Claude Code prompt" section at the bottom (e.g. *"THIS TICKET IS FLAGGED FOR EDITORIAL REVIEW. Do NOT pick up until..."*)
- As prose inside the deliverable / verification sections referencing an undecided scope option

Labels can lag the body. The body markers are the gold source. If found: surface to Farzaneh with verbatim quote; do NOT pick up; do NOT comment on the issue yourself; let Farzaneh decide whether to WhatsApp Cesar or pivot.

**First example caught**: #135 T-M3-42 Repo-import — 2026-05-19 morning. Cesar drafted three scope options (A full / B split / C defer-shapes-only) and flagged the ticket pending his pick. Hard dep on #94 (sandbox CRD) compounds — Option A/B can't run e2e until #94 lands; Option C is unblocked.

Before writing any code on a new ticket:

1. **Read the source area `plan/*.md` § linked in the ticket body** — the FULL deliverable + FULL file list + FULL verification gate. The issue body is a teaser; the plan section is canonical.

2. **Read the architectural locks**:
   - `CLAUDE.md` (full file) — "Full-reality tests or no test", "Single-table outbox", "Not in v1", "UI verification (manual, not Playwright)", "Master must stay green", test rule + BANNED list
   - `architecture/CHANGELOG.md` — search for any term from the ticket's deliverable. Any "No X" / "deleted" / "overrides" entry that touches scope is a hard lock
   - `plan/00-engineering-standards.md` — fail loud, retry/timeout discipline, context7 verification, structured logging, realistic e2e

3. **Read the memory locks index** + spot-read any `feedback_*` whose one-line description touches the ticket's scope.

4. **Cross-check the ticket against the locks** — match against the drift-patterns table above. If drift found, plan to fix in same PR.

5. **Draft the REASONING REQUIREMENT paragraph** in a scratchpad. If you can't name a user-visible consequence, re-scope or surface to Cesar before writing code.

# Cesar-side memory files referenced (we don't have local copies)

The slash command cites four `feedback_*` files at `/home/azureuser/.claude/projects/-home-azureuser-workspaces-qdt-amira/memory/`:

- **`feedback_no_infra_without_caller.md`** — don't ship code without a caller on master. Gist: dormant code without an invoker is dead weight; either land the caller in same PR or flag the dormancy explicitly.
- **`feedback_fix_foundation_dont_defer.md`** — when you find stale plan / issue / CLAUDE.md text mid-ticket, fix it across all sources in the same PR. Don't decorate around drift.
- **`feedback_check_parallel_make_test_before_blaming_regression.md`** — flaky cross-org / tenant / audit failures: suspect parallel-session DB pollution FIRST before blaming a merge regression.
- **`feedback_playwright_was_net_negative.md`** — Playwright was stripped 2026-05-18 (PR #316). UI verification is manual against the running stack. Never reintroduce.

We've absorbed the gist via the slash command itself — these are pointers, not standalone files we hold.

# How this composes with the 7 binding rules

This memory file consolidates Cesar's pre-flight gate. It doesn't replace the 7 binding rules in [feedback_cesar_quality_bar_m1_backend.md](feedback_cesar_quality_bar_m1_backend.md) — it operationalizes them as a per-ticket checklist:

- **Rule #1** (review-before-merge) — implicit in PR cycle
- **Rule #2** (match-precedent ≠ match-coverage) — covered by "name the user-visible consequence" in REASONING REQUIREMENT
- **Rule #3** (second-pass evaluation) — covered by "draft reasoning paragraph BEFORE code"
- **Rule #4** (surface foundational before claiming) — covered by "if anything in deliverable conflicts with a lock, STOP and surface to Cesar"
- **Rule #5** (adversarial review, no test-thinness) — covered by test-rule + BANNED list
- **Rule #6** (defensible defaults, document, don't escalate) — covered by REASONING REQUIREMENT's "how the design respects each lock"
- **Rule #7** (file follow-ups for deferred scope) — covered by "Deliverable shipped" section flagging de-scope explicitly

Net: the slash command makes Rule #1–#7 mechanical at PR-open time.

# Related memories

- [[feedback_cesar_quality_bar_m1_backend]] — 7 binding rules
- [[feedback_test_shape_rule]] — full-reality test rule + banned categories
- [[feedback_no_remote_writes_without_confirm]] — per-action confirmation on remote writes
- [[feedback_avoid_jargon_amira_mars]] — plain language in PR / issue / WhatsApp
- [[project_next_session]] — current state tracker
