---
name: Comprehensive map of `amira-mars` master — what's shipped, what patterns Cesar uses, what's locked
description: 2026-05-13 afternoon. Full study of master branch (post T-M1-17, before claiming T-M1-31). Captures the repo structure, Cesar's coding patterns, locked decisions, anti-leak rules, "Not in v1" list, and a precise map of what exists on master so future ticket study is FAST (target where to look, don't re-discover patterns from scratch).
type: project
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---

## CRITICAL READ-FIRST CORRECTIONS

**1. QDT-side vs customer-facing track anti-leak rule** (locked 2026-05-13 in PR #258 review):

| Lives in | What it describes |
|---|---|
| `plan/`, non-`mars/` `architecture/`, `infra/`, root `CLAUDE.md`, code in `apps/api/` | **QDT-side build** — multi-tenant SaaS at `amira.qdt.ai` (`qdt-prod-amira`, AKS `amira`, ACR `qdtamira`). Unrestrictive, simple, effective. **Uses Auth0 Free for OIDC sign-in.** |
| `architecture/mars/` | **Customer-facing Mars deployment** — what a future Mars engagement's deployment might look like IF/when materializes. Uses Mars Okta, Workload Identity, Mars Foundry. |

**Bidirectional anti-leak**: Mars-side specifics MUST NOT leak into QDT-side docs or code. QDT-side specifics MUST NOT leak into `architecture/mars/`.

**What this means for us**: Code we ship in `apps/api/` is **QDT-side** — uses **Auth0**, not Mars Okta. The `feedback_mars_architecture_lock.md` constraints apply to the FUTURE customer-Mars deployment (a different track), NOT to the code we're currently writing.

**2. Single-table outbox is locked** (2026-05-05): `app.outbox_event` with `service` discriminator. Overrides plan/03 §2.5's "per-service tables" design. Already shipped in `persistence/outbox.py`.

**3. SIMPLIFY-PERSIST-2** (2026-05-06): No connection-pool sidecar in v1. Direct Postgres connections + SQLAlchemy per-process pool. `AMIRA_DB_FRONTED_BY_POOLER` env-var path stays for future reintroduction.

**4. SIMPLIFY-IDA-2** (2026-05-06): RFC 8693 OBO / wire-level user-bearer-tokens DROPPED from v1. Identity propagates in-process via workflow input + `SET LOCAL app.org_id / app.user_id`. `services/identity/obo.py` is NOT created. Stale references in issue bodies are drift.

---

## Repo structure (top-level)

```
amira-mars/
├── app/                          # Next.js mockup pages (frontend, lower priority for backend work)
├── apps/api/                     # FastAPI backend (where we ship code)
├── architecture/                 # System design (locked decisions, changelog, research)
├── components/                   # React UI components
├── demo-screenshots/             # Frontend visuals
├── docs/implementation/          # HOW_WE_WORK.md, TECHNICAL_EXECUTION_PLAN.md, LOCAL_DEV.md, STAKEHOLDER_ROADMAP.*
├── infra/                        # Runbooks (13+), Helm charts, install scripts, smoke tests
├── lib/                          # TypeScript libs (mocks, theme)
├── plan/                         # 17 area files (00-engineering-standards through 17-observability) + _DISPATCH.md
├── scripts/                      # whats_next.py, seed_github_issues.py, advance_milestone.sh, sync-roadmap-html.sh
├── .github/workflows/            # alembic-roundtrip.yml + lint.yml (our addition from T-M1-47)
├── CLAUDE.md                     # 304 lines — repo-root build instructions (MUST read on every session)
├── PLAN.md                       # 318 lines — top-level coordination
├── DEMO_FLOW.md                  # 15-step golden demo path
├── DESIGN.md                     # Dual-theme design system (light: Financial Japandi, dark: Sophisticated Technical Minimalism)
├── README.md                     # Brief platform intro
├── Makefile                      # make dev / make temporal / make psql / make backend etc.
├── package.json / next.config    # Next.js mockup config
└── tsconfig.json / tailwind...   # Frontend tooling
```

## Backend code map — `apps/api/src/amira_api/` (every file, what it does, who wrote it)

```
amira_api/
├── __init__.py                                       # root package init
├── settings.py                                       # Pydantic v2 BaseSettings, fail-loud on missing env vars
├── main.py                                           # FastAPI app entry. Lifespan: configure_logging → validate_prompt_manifest → make_async_engine → bind_engine. Health endpoints: /healthz (liveness, always 200) /readyz (queries Postgres SELECT 1)
├── _shared/
│   ├── __init__.py                                   # empty
│   └── logging.py                                    # Standard #7 — Locked JSON schema: {timestamp, level, correlation_id, service, event, context}. correlation_id_var as contextvars.ContextVar. configure_logging() called once from main.py lifespan. get_logger(__name__) factory.
├── persistence/                                      # T-M1-41 (Cesar shipped 2026-05-06 in PR #230)
│   ├── __init__.py                                   # Docstring listing public surface only — no centralized re-exports
│   ├── base.py                                       # AmiraBase (id, org_id, created_at — for org-scoped tables) + AmiraBaseGlobal (id, created_at — for platform-global tables). _utcnow() module-level helper for monkeypatching.
│   ├── engine.py                                     # make_async_engine(dsn, pool_class=None) + bind_engine(engine) + get_session() FastAPI dep (commits-on-success / rollback-on-exception). Module global _session_factory. RuntimeError if engine not bound.
│   ├── session_attrs.py                              # set_immutable_session_attrs(session, *, org_id, user_id, correlation_id) — issues SET LOCAL on app.org_id / app.user_id / app.correlation_id. Fail-loud on None inputs (Standard #1).
│   ├── outbox.py                                     # OutboxEvent(AmiraBase, table=True) — single-table outbox in `app` schema. Columns: service discriminator, project_id, project_seq, kind, actor_user_id/agent_id/service_id, caused_by, correlation_id, payload (JSONB), consumed_at. Per-service subclassing pattern.
│   ├── project_seq.py                                # next_project_seq(session, project_id) helper. SQL "CREATE SEQUENCE IF NOT EXISTS" + nextval. Per-project monotonic seq for outbox.
│   ├── migrations_helpers.py                         # ASSIGN_PROJECT_SEQ_FUNCTION_SQL constant + install_outbox_trigger_sql() / drop_outbox_trigger_sql() helpers.
│   ├── blob.py                                       # BlobStore Protocol + S3CompatibleBlobStore (aioboto3) + AzureBlobStore. Custom exceptions: BlobNotFound, BlobImmutableError. CAS containers (`cas`, `build-cas`, `spec-cas`) are delete-rejected.
│   └── testing/                                      # T-M1-44 (OUR PR #259, still OPEN)
│       ├── __init__.py / conftest.py / fixtures.py / docker-compose.yml
├── llm/                                              # Mostly OUR M2 work
│   ├── adapter.py                                    # T-M2-23 (OUR — needs PydanticAI rewrite per Mars arch lock, but Mars arch lock applies to Mars track not QDT — so this stays for QDT?)
│   ├── cache.py                                      # T-M2-24 (OUR)
│   ├── classifier.py                                 # T-M2-26 (OUR)
│   ├── contract.py                                   # Pydantic models — UserMessage, etc.
│   ├── prompts.py                                    # T-M2-27 versioned prompt registry (OUR)
│   ├── providers.py                                  # Provider config
│   ├── redaction.py                                  # T-M2-25 (OUR)
│   ├── startup.py                                    # validate_prompt_manifest() — called from main.py lifespan
│   └── tags.py                                       # Tagging utilities
├── runtime/                                          # Mixed — Cesar shipped contracts/, we shipped extensions
│   ├── __init__.py
│   └── contracts/
│       ├── __init__.py
│       ├── envelopes.py                              # Cesar — NarrationEnvelope (frozen Pydantic, schema_version, seq, session_id, correlation_id, ts, event)
│       └── narration.py                              # T-M2-17 NarrationEventUnion (OUR — discriminated union over many event kinds)
├── agents/                                           # Mostly placeholders so far
│   ├── __init__.py
│   └── classifier/
│       ├── __init__.py
│       └── prompts/__init__.py                       # empty placeholder
└── domain/                                           # Mostly OUR M3 work
    ├── __init__.py
    └── spec/
        ├── __init__.py
        └── capability_graph.py                       # T-M3-37 (OUR — Spec capability graph DSL freeze + canonicalizer)
```

## Migrations chain (single, linear)

`apps/api/migrations/`:
- `env.py` — async via `async_engine_from_config` + `connection.run_sync(do_run_migrations)`. Reads DSN from `get_settings().db_dsn` (env var `AMIRA_DB_DSN`).
- `alembic.ini` — `script_location = migrations`, `prepend_sys_path = src`, `file_template = %%(year)d%%(month).2d%%(day).2d%%(hour).2d%%(minute).2d%%(second).2d_%%(slug)s` (14-digit timestamp + slug).
- `versions/20260505000000_enable_extensions.py` — ONLY revision on master. Installs pgcrypto + vector + pg_trgm extensions, fails loud if pgvector < 0.7.0. Downgrade is bodyless with `# noqa: irreversible — <reason>`.

## Test suite map — `apps/api/tests/`

Existing tests (all Cesar's unless noted):
- `conftest.py` — anyio_backend = "asyncio" + (our T-M1-44 addition) pytest_plugins for canonical fixtures
- `test_alembic_roundtrip.py` — 2 tests: round-trip + irreversibility-marker lint. Has stub `pg_url` fixture reading from `AMIRA_TEST_DB_DSN` env var (Cesar's pattern, our T-M1-44 PR's canonical version supersedes once merged)
- `test_base.py`, `test_engine.py`, `test_blob.py`, `test_outbox.py`, `test_project_seq.py`, `test_session_attrs.py`, `test_settings.py`, `test_logging_format.py`, `test_main.py` — unit tests for T-M1-41 components
- `test_narration_union.py` — T-M2-17 (OUR)
- `test_capability_graph.py` — T-M3-37 (OUR)
- `test_classifier_routing.py` — T-M2-26 (OUR, has `@pytest.mark.integration` against real Anthropic)
- `test_llm_adapter_roundtrip.py`, `test_llm_cache_breakpoints.py`, `test_llm_redaction.py`, `test_prompt_registry.py` — T-M2-23/24/25/27 (OUR)
- `test_persistence_testing.py` + `test_persistence_testing_e2e.py` — T-M1-44 (OUR PR #259)
- `test_blob_abstraction_lint.py` — T-M1-47 (OUR PR #262)

## The 7 binding engineering standards (`plan/00`)

Floor-level. Reviewers reject PRs that violate them.

1. **Fail loud, never silently.** No silent fallbacks. Every `except` / `??` / default-value branch needs a one-line comment stating reason + equivalence guarantee, OR fails loud.
2. **Senior code quality.** Established patterns, clear naming, single-responsibility functions/modules. No god-files, no copy-paste, no `# TODO: clean up later`, no abbreviations needing a glossary. Comments explain WHY not WHAT.
3. **AI prompt discipline.** Structured I/O over free-form parsing — Pydantic tool-use schemas always. No "you are an expert X" verbiage. No towers of always/never. Anthropic prompt caching for system prompts + tool definitions. Versioned prompt files in `agents/<agent-name>/prompts/v<N>.txt`.
4. **`context7` library verification + web-vet packages.** Use context7 MCP before writing library API calls (even libraries you "know" — versions drift). Web-search reliability signals for new deps. `uv` for Python deps (NOT pip/poetry/conda).
5. **Realistic e2e tests, Playwright MCP for UI.** No "endpoint returns 200" tests. Real Postgres for backend integration tests (no DB mocks). Golden-trace tests for agent runtimes.
6. **Retry + timeout discipline.** Retry only when failure is genuinely transient AND retry has a different probability of success. Bounded retries. Each attempt emits structured event. NEVER bump timeouts to mask logical slowness.
7. **Structured logging, decision points only.** stdlib `logging` + `python-json-logger`. Locked JSON schema `{timestamp, level, correlation_id, service, event, context}`. Log decision points + boundaries, not entry/exit. No PII / secrets / `print("here")`.

## Locked tooling (binding, no substitutes without architecture decision)

**Python backend**:
- Python 3.13/3.14, `uv` (deps + envs)
- FastAPI, Pydantic v2, SQLModel (with SQLAlchemy 2 async fallback if context7 surfaces SQLModel maintenance issues), Alembic, psycopg3 (`psycopg[binary]`), httpx
- Anthropic Python SDK (LLM)
- Temporal Python SDK (workflow engine, self-hosted on shared Postgres)
- stdlib `logging` + `python-json-logger`
- pytest + anyio plugin (NOT pytest-asyncio — anyio handles context-var propagation correctly)
- Test fixtures: real Postgres via pytest-docker (T-M1-44 ours) or env-var stub `AMIRA_TEST_DB_DSN` (Cesar's existing pattern in `test_alembic_roundtrip.py`)

**Frontend**: Next.js App Router + TypeScript + Tailwind + shadcn/Radix + lucide-react + recharts. Playwright via MCP for e2e.

**Infrastructure**: One AKS cluster (`qdt-prod-amira/amira`), nginx ingress + cert-manager + external-dns, Buildkit in-cluster for image builds, ACR (`qdtamira`), Argo Rollouts BlueGreen for deploys, external-secrets-operator + Key Vault for secrets, Elastic Agent / Fleet for log shipping (NO Grafana/Loki/OTel — per "Not in v1").

## Key locked decisions (`architecture/04-decisions.md`)

| ID | Decision | What it means for backend work |
|---|---|---|
| **PERSIST-1** | Single Postgres serves app state + Temporal event history + audit log + outboxes | One DSN, one Alembic chain |
| **PERSIST-2 + AUDIT-1** | Plain Postgres append-only `audit_log` table | Audit rows = INSERTs into `app.audit_log`, REVOKE UPDATE/DELETE on audit-writer role |
| **PERSIST-5** | Two-plane RLS — Postgres-native RLS via `SET LOCAL app.org_id/app.user_id` (data plane) + typed in-process policy evaluator (retrieval plane) | Every connection sets immutable session attrs at open; mid-session rewrite raises |
| **IDA-3** (reformulated 2026-05-06 per SIMPLIFY-IDA-2) | OIDC sign-in via Auth0 Free + **in-process** identity propagation. NO wire-level OBO. NO RFC 8693. | Workflow input carries `(userId, agentId, serviceId, causedBy)`. Audit-emit triple. Postgres `SET LOCAL`. v2 OBO design preserved in `architecture/03-research/IDA-3-obo-rfc-8693.md`. |
| **RUNTIME-1** | Temporal as durable-workflow engine, self-hosted on shared Postgres, NO pooler sidecar in v1 per SIMPLIFY-PERSIST-2 | `pg_stat_activity > ~120` triggers re-evaluation |
| **RUNTIME-4** | Per-instruction classifier model dispatches to specialized sub-agent path. Intents: edit / binding-or-schema / out-of-scope. | T-M2-26 implements this (OUR shipped work) |
| **RUNTIME-2** | Build Agent emits code via search-replace blocks applied to file tree | T-M3-43 (Cesar's ticket) |
| **RUNTIME-3** | Build Agent code-generation sandbox = standard AKS pods (NOT Kata/Firecracker) | T-M3-42 RepoImportWorkflow uses standard sandbox |
| **AGENT-TOPO-1** | Day-one Build Agent is single-agent ReAct loop with tools. Multi-agent triad deferred until single-agent error rate unacceptable. | |
| **MTEN-1** | QDT-hosted multi-tenant SaaS at `amira.qdt.ai` with strict workspace partitioning (NOT one isolated deployment per prospect) | One Postgres, RLS-keyed by org_id |
| **DEPLOY-1 + DEPLOY-2** | One AKS cluster in QDT Azure subscription | 9 namespaces, 5 nodepools (system/platform/runtime/workload/buildkit) |
| **STANDARDS-1** | The 7 engineering standards as binding floor | |
| **BUILD-4** | Build artifacts are content-addressed (CAS containers in blob storage are delete-rejected) | `_CAS_CONTAINERS = frozenset({"cas", "build-cas", "spec-cas"})` in blob.py |
| **BUILD-6** | Registry URLs configurable, default public, no platform-side dependency operation/proxy/scan | |
| **SIMPLIFY-IDA-2** (2026-05-06) | Drop wire-level RFC 8693 OBO from v1 entirely | obo.py is NOT created |
| **SIMPLIFY-PERSIST-2** (2026-05-06) | Defer Supavisor / pooler product | `AMIRA_DB_FRONTED_BY_POOLER` env path stays |

## Cesar's code patterns (style markers to mirror)

**File-path comment as first line of every Python file**:
```python
# apps/api/src/amira_api/<path>/<file>.py
```

**Module docstring**:
```python
"""<One-sentence summary>.

<Multi-line detail referencing plan sections + standards.
Example: per `plan/03 §2.1` + Standard #6.>
"""
```

**Imports**:
```python
from __future__ import annotations   # ALWAYS first non-comment line in Python files

import <stdlib_first>
from <stdlib_module> import ...

import <third_party>

from amira_api.<area> import ...   # internal imports last
```

**Type hints**:
- Absolute everywhere — `frozenset[str]`, `list[tuple[int, str]]`, `dict[str, Any]`
- `from collections.abc import AsyncIterator, Iterator` (NOT `typing.AsyncIterator` — deprecated path)
- Modern Python 3.10+ union syntax: `str | None`, not `Optional[str]`

**SQLModel patterns** (from base.py + outbox.py):
- Inherit from `AmiraBase` (org-scoped) or `AmiraBaseGlobal` (platform-global)
- `__tablename__ = "name"` explicit
- `__table_args__ = {"schema": "app"}` for tables in the `app` schema
- `Field(default_factory=_utcnow, nullable=False)` for created_at (monkeypatch-friendly)
- JSONB: `Field(sa_column=Column(JSONB, nullable=False))` — import `from sqlalchemy.dialects.postgresql import JSONB`
- FKs schema-qualified: `Field(foreign_key="app.workspace.id", index=True, nullable=False)`

**Pydantic patterns** (from envelopes.py):
- `from pydantic import BaseModel, ConfigDict, Field`
- `model_config = ConfigDict(frozen=True)` for immutable models
- `schema_version: int = 1` for versioning + breaking-change tracking

**Logging patterns**:
```python
from amira_api._shared.logging import get_logger
log = get_logger(__name__)
log.info("event_name", extra={"context": {"key": "value"}})
```

**Settings patterns** (from settings.py):
- `class Settings(BaseSettings)` with `SettingsConfigDict(env_prefix="AMIRA_", extra="forbid")`
- `Field(..., description="...")` for required env vars
- `Field(default=..., description="...")` for optional
- Use `Literal["a", "b"]` for enum-like env values

**FastAPI patterns** (from main.py):
- `@asynccontextmanager async def lifespan(app: FastAPI) -> AsyncIterator[None]:`
- Health endpoints: `/healthz` (always 200 if process up), `/readyz` (probes Postgres `SELECT 1`)
- `Depends(get_session)` for DB sessions

**Test patterns** (from test_engine.py / test_alembic_roundtrip.py):
- File-path header comment
- Module docstring
- `inspect`-based signature contract tests for public APIs
- `@pytest.mark.integration` for tests needing real services (env-var gated)
- AST-walk pattern for "lint rule via pytest" (one test fn + helpers + accumulator)

**Alembic migration patterns** (from 20260505000000_enable_extensions.py):
- Filename: 14-digit timestamp + slug + `.py`
- `from __future__ import annotations`
- `from collections.abc import Sequence`
- `from alembic import op`
- Module-level: `revision`, `down_revision`, `branch_labels`, `depends_on`
- `def upgrade() -> None:` / `def downgrade() -> None:` 
- Bodyless downgrades need `# noqa: irreversible — <reason>`

**PR body shape** (from Cesar's recent PRs #257, #260):
- ## Summary (bullets)
- ## (optional) Drift / Resolves Q-X-N / Design choice
- ## Files (New: / Modified: subsections)
- ## Test plan (checked items + verification output)
- Closes #N
- 🤖 Generated with [Claude Code](https://claude.com/claude-code)

## "Not in v1" — explicit do-not-introduce list

These accreted in earlier AI iterations and have been stripped:

1. **No regulatory frameworks.** "Compliance Matrix" = spec-coverage scoring ONLY. Deploy gate = `readiness_score >= threshold` predicate. No SOX/GDPR/HIPAA/FedRAMP/PCI-DSS per-framework gates.
2. **No image vulnerability scanning / supply-chain attestation.** No Trivy, SCA/SAST scanner, `scan_image` Activity, `block_on_critical_cve`, `cve_findings`.
3. **No data residency / geography lock.** Apps run in cluster region; storage runs alongside.
4. **No MFA / step-up / TOTP / factor enrollment.** E-signature gate = session + role + audit row.
5. **No Terraform for v1 infra.** Hand-provision via Azure CLI / Portal; capture in `infra/runbooks/<topic>.md`.
6. **No Grafana / Loki / Tempo / Mimir / OTel.** Observability = structured logging → Elastic Agent / Fleet → Kibana.
7. **No RFC 8693 / OBO / `act`-chain / per-agent M2M Auth0 apps.** Identity in-process via workflow context.
8. **No connection-pool sidecar** (Supavisor / PgBouncer / Pgpool). Direct Postgres + SQLAlchemy per-process pool.
9. **No customer-installed / on-prem narrative on the QDT side.** Customer-facing tracks (e.g., Mars) live entirely under `architecture/mars/`.

## Vocabulary discipline

**Use exactly**:
- Pipeline: **Specifications → Development (Canvas) → Artifacts**
- Agents: **Spec Agent**, **Build Agent**, **Deployment Agent**, **Companion Agent**
- Governance role: **Authorized Approver** (not manager/reviewer)
- Action: **e-signature** (not approve/sign)
- Spec CTA: **"Route for e-signature"** (not Request approval)

**Avoid**: triage, north star, swimlane, circle back, low-hanging fruit, synergy. Plain language.

**Don't add to v1 vocab**: OBO (not in v1).

**Mock user identity**: `u-current` = Cesar Flores · cesar@qdt.ai · Senior Architect & Engineer (per `lib/mocks/users.ts`). The demo script references this; don't rename without instruction.

## Pre-existing tech debt on master (not ours, flagged for future)

These exist on master independently of our work. Watch for them; they'll show up in lint/test runs.

| Issue | Where | Status |
|---|---|---|
| 12 ruff violations | apps/api/ (mostly `UP017`/`UP035` stdlib modernization in `_shared/logging.py`, `persistence/base.py`, `main.py`, `persistence/engine.py`; `B008` FastAPI Depends idiom in main.py; `RUF002` en-dash in outbox.py docstring) | Flagged in T-M1-47 PR #262 body. Our CI workflow deliberately skips `ruff check` to avoid blocking PRs on these. Cleanup needs separate PR with Cesar's call on each. |
| `test_irreversible_downgrades_carry_marker` fails on Windows local | `tests/test_alembic_roundtrip.py:44` — `path.read_text()` without `encoding="utf-8"` causes em-dash cp1252 mojibake | Confirmed pre-existing on master. CI uses ubuntu-latest where it passes. Flagged in T-M1-44 PR #259 body. |
| `tests/test_alembic_roundtrip.py` has stub `pg_url` fixture | Reads `AMIRA_TEST_DB_DSN` env var | Will be obsoleted by our T-M1-44 PR #259 canonical fixture once merged. Suggest follow-up PR removes the stub. |

## Per-ticket workflow (from `docs/implementation/HOW_WE_WORK.md`)

```
1. ./scripts/whats_next.py farzaneh    # READY vs BLOCKED queue
2. gh issue view <NUMBER>               # read the contract
3. gh issue develop <NUMBER> --checkout # create branch + auto-link
4. (claim) gh issue edit <NUMBER> --add-label in-progress --remove-label ready
5. Open Claude Code, paste prompt from issue body
6. Implement files listed
7. Run verification per issue body
8. git push + gh pr create --title "T-MX-NN — <title>"
9. gh issue comment <NUMBER> --body "<test output>"  (optional if test output in PR body)
10. gh issue edit <NUMBER> --add-label needs-review --remove-label in-progress
11. WhatsApp Cesar: "PR #N ready when you have time"
12. Wait for Cesar's review (per his 05-13 directive — leave PR open, he reviews)
13. gh pr merge <N> --squash --delete-branch (after his approval)
```

**Per-action confirmation rule** (`feedback_no_remote_writes_without_confirm.md`): each remote-write step (`gh issue develop`, label flips, `git push`, `gh pr create`, `gh pr merge`) needs explicit Farzaneh go-ahead. Never bundle.

## Key documents to consult per ticket type

| Ticket type | Read FIRST |
|---|---|
| Any | `gh issue view <NUMBER>` (contract) + `plan/NN-*` source area + `feedback_cesar_quality_bar_m1_backend.md` |
| Persistence / SQLModel / Alembic | `plan/03-persistence-substrate.md`, `persistence/base.py`, `persistence/outbox.py`, `migrations/versions/20260505000000_enable_extensions.py` |
| Identity / auth | `plan/01-platform-identity.md` (Auth0 = v1!), `architecture/04-decisions.md` IDA-3 |
| Tenancy / RLS | `plan/02-tenancy-and-workspaces.md`, `architecture/04-decisions.md` PERSIST-5, MTEN-1 |
| Audit / lineage | `plan/04-audit-and-lineage.md`, `persistence/outbox.py` (single-table outbox is locked) |
| Agent runtime | `plan/05-agent-runtime-and-job-communication.md`, `runtime/contracts/envelopes.py`, `runtime/contracts/narration.py` |
| LLM adapter | `plan/06-llm-adapter-and-cost.md`, `llm/*.py` (much is OUR work) |
| Anything new | `CLAUDE.md` (root) "Not in v1" list — check what's been stripped |

## Scripts in repo root `scripts/`

- `whats_next.py <name>` — daily ordered queue (READY vs BLOCKED) for owner. Run on Windows with `PYTHONUTF8=1` per `feedback_whats_next_windows_encoding.md`.
- `seed_github_issues.py` — one-time setup, 7 milestones + 11 labels + 229 issues from TICKETS.csv (already run by Cesar)
- `advance_milestone.sh M<from> M<to>` — verifies milestone closure, advances, prints WhatsApp kickoff
- `sync-roadmap-html.sh` — keeps STAKEHOLDER_ROADMAP.html in sync with .md + .json sources

## Where each plan file lives + what it covers

| File | Area |
|---|---|
| `plan/00-engineering-standards.md` | The 7 binding standards + locked tooling |
| `plan/01-platform-identity.md` | OIDC sign-in (Auth0 Free), session refresh, PAT, JIT user provisioning |
| `plan/02-tenancy-and-workspaces.md` | Org, Workspace, OrgMembership, RLS, OrgConfig, exposure_scope |
| `plan/03-persistence-substrate.md` | Persistence package, Alembic, outbox, blob abstraction, pytest fixtures |
| `plan/04-audit-and-lineage.md` | Audit log, audit consumer, kind registry |
| `plan/05-agent-runtime-and-job-communication.md` | Temporal workflows, narration envelope, SSE, agent classifier dispatch |
| `plan/06-llm-adapter-and-cost.md` | LLM adapter facade, prompt cache, prompt registry, redaction |
| `plan/07-spec-workspace-and-spec-agent.md` | Spec Agent UI + workflow |
| `plan/08-canvas-and-build-agent.md` | Canvas UI + Build Agent (search-replace) |
| `plan/09-approval-and-governance.md` | Authorized Approver + e-signature flow |
| `plan/10-skills-layer-and-build-plan.md` | 2-class skill catalog, build-plan lockfile, MCP runtime client |
| `plan/11-deployment-pipeline.md` | Argo Rollouts BlueGreen, deploy workflow |
| `plan/12-companion-agents-and-ask-amira.md` | Per-app Companion Agent, MCP handler |
| `plan/13-compliance-matrix-and-continuous-eval.md` | Spec-coverage scoring + readiness gate |
| `plan/14-data-plane-and-federation.md` | Retrieval plane, QDL federation, policy evaluator |
| `plan/15-frontend-shell-and-read-views.md` | Next.js shell, navigation, read-view pages |
| `plan/16-infrastructure-and-cluster-topology.md` | AKS, namespaces, Helm charts, infra runbooks |
| `plan/17-observability.md` | Logging → Kibana, monitor rollups |

## Documents in `docs/implementation/`

- `HOW_WE_WORK.md` — canonical per-ticket workflow (paste this in PR descriptions if needed)
- `TECHNICAL_EXECUTION_PLAN.md` — deep ticket reference (search by T-MX-NN)
- `LOCAL_DEV.md` — `make dev` setup
- `STAKEHOLDER_ROADMAP.{md,html,status.json}` — customer-facing tracker

## What's NOT yet on master (gaps in code surface for downstream tickets)

- **No `user` table** — comes from T-M1-21 (ours via Ashwin lane, not started)
- **No `org` / `workspace` / `org_membership` / `workspace_membership` / `org_config` tables** — comes from T-M1-31 (our next ticket)
- **No RLS policies** — comes from T-M1-32 (B-TENANCY-2)
- **No TenantContext / middleware** — comes from T-M1-33/T-M1-34 (B-TENANCY-3/4)
- **No `audit_log` table** — comes from T-M1-51/52/53/54/55/56 (audit bank)
- **No FastAPI routes for identity / tenancy / governance** — all in M1+ scope
- **No agent runtime workflows** — M2/M3/M5
- **No Spec Agent, Build Agent, Companion Agent code** — M3/M5 (ours mostly)

So when T-M1-31 ships, it's the FIRST concrete table chain (Org → Workspace → memberships → OrgConfig). After it lands, T-M1-32 layers RLS on top, T-M1-33 adds TenantContext, etc.

## Patterns and gotchas Cesar's existing code teaches us (beyond style)

1. **Alembic env reads from Settings** (`get_settings().db_dsn`) — to point at a test Postgres, set `AMIRA_DB_DSN` env var
2. **Engine + session pattern** — `make_async_engine(dsn)` → `bind_engine(engine)` (sets module-global `_session_factory`) → `get_session()` yields per-request session. Fail-loud if engine not bound (RuntimeError).
3. **`_utcnow()` module-level helper** in base.py — for monkeypatching in tests
4. **Outbox is one table** with `service` discriminator — NOT per-service tables (overrides plan/03 §2.5)
5. **CAS containers are delete-rejected** (`blob.py:_CAS_CONTAINERS = frozenset({"cas", "build-cas", "spec-cas"})`) per BUILD-4
6. **Schema "app"** — tables go in `app` schema (`__table_args__ = {"schema": "app"}`)
7. **psycopg async on Windows requires `WindowsSelectorEventLoopPolicy`** — our T-M1-44 captured this; should be propagated when running async tests locally on Windows
8. **`SET LOCAL` per-connection** — confines GUC change to current transaction
9. **`docker-compose` for dev stack** at `infra/dev/docker-compose.yml` — Postgres + MinIO + secret-shim + Temporal CLI
10. **Cesar's commit + PR title format**: `T-MX-NN — <Title>` (no conventional-commits prefix for M1 squash commits — that's only for M2 lane)
11. **Deprecation banner = signal, not noise** (locked 2026-05-13 in CLAUDE.md `a4084fa` after T-M1-18 caught `tctl` 7+ months post-EOL inside an otherwise-current `temporalio/auto-setup` image): when a CLI / healthcheck output shows a deprecation banner, treat the binary as on borrowed time. Verify the modern replacement via `context7`. Migrate same-change. **Image release cadence ≠ bundled-binary release cadence; verify both.**

## Patterns I learned from T-M1-31 shipping (2026-05-13 EOD)

T-M1-31 was the first concrete-table baseline migration we shipped — surfaced several patterns worth keeping for the next persistence-area ticket:

1. **Migration chain visibility check FIRST.** Before writing a new migration, `ls apps/api/migrations/versions/` to see EVERY existing revision, not just the one whose `revision = "..."` you remembered. T-M1-31's first attempt set `down_revision = "20260505000000"` because I had only loaded one migration into context — missed `20260505000001_roles_and_schemas` + `20260505000002_outbox_event_table` shipped in the same T-M1-41 PR. Multiple-heads error caught it; could have been caught at the LIST step.
2. **`SAEnum` + `values_callable` for Python `StrEnum` ↔ Postgres `ENUM`.** SQLAlchemy's default mapping uses `member.name` (uppercase Python identifier). Postgres ENUM types created in migrations use lowercase string values (matching the `StrEnum` instances). Override with `values_callable=lambda e: [m.value for m in e]` + `create_type=False` (migration owns type creation). Pattern in `tenancy/models.py::_LIFECYCLE_STATE_COLUMN_TYPE`.
3. **`AsyncSession` constructor defaults to `expire_on_commit=True`.** Cesar's session factory in `engine.py` overrides to `False`, but tests that construct sessions directly inherit the default → `MissingGreenlet` errors when accessing attributes after commit. Always pass `expire_on_commit=False` to direct `AsyncSession()` constructors in tests, or get the session via `get_session()` fixture.
4. **Pydantic-level `default=` AND `sa_column=Column(...)` both needed for SQLModel enum fields.** Just `sa_column` doesn't give Pydantic a default; instances constructed without the field have None → DB rejects. Pattern: `Field(default=OrgLifecycleState.ACTIVE, sa_column=Column(_LIFECYCLE_STATE_COLUMN_TYPE, ...))`.
5. **Deterministic UUIDs for seed/test data via `uuid5(NAMESPACE_DNS, "<semantic-name>")`.** Avoids magic-number constants AND avoids non-deterministic-test pitfalls. Pattern in `tenancy/seed.py::MARS_DEMO_ORG_ID` etc.
6. **`u-current` mock user = Cesar.** Per `lib/mocks/users.ts` — Cesar Flores · cesar@qdt.ai · Senior Architect & Engineer. Any seed function loading `u-current` is implicitly Cesar in the mockup; don't rename without instruction.
7. **Migration's `app` schema already exists from `20260505000001`.** Don't `CREATE SCHEMA IF NOT EXISTS app;` in a new migration — it's redundant. The amira_app role + default privileges grant SELECT/INSERT/UPDATE/DELETE on `app.*` tables created in subsequent migrations automatically via `ALTER DEFAULT PRIVILEGES`.
8. **Add `WindowsSelectorEventLoopPolicy` at module load for psycopg-async tests on Windows.** Linux/macOS use SelectorEventLoop by default; Windows uses ProactorEventLoop which psycopg refuses. No-op shim:
   ```python
   if sys.platform == "win32":
       asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
   ```
9. **Async tests can't call `command.upgrade(cfg, "head")` directly inside the test body.** Alembic's `env.py` uses `asyncio.run(run_async_migrations())` which fails inside an already-running event loop. Use a SYNC session-scoped fixture (`@pytest.fixture(scope="session") def schema_at_head(pg_url): ...`) that runs upgrade once, returns DSN, and async tests depend on the fixture.
10. **`AmiraBase` patterns for inheriting tables**: `Org` (tenant root, no `org_id`) → `AmiraBaseGlobal`. Workspace + memberships → `AmiraBase`. Composite-PK tables (like `OrgConfig` with `(org_id, version)`) → direct `SQLModel` subclass (can't inherit AmiraBase's single-`id` PK).
