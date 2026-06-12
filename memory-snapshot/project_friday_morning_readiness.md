---
name: Friday-morning readiness reference — full prep before Cesar assigns tickets
description: 2026-05-14 late evening. Pre-loaded prep done so Friday-AM is execution, not study. Master at `900b887` (T-M1-32 RLS); pulled writable clone fresh. Studied 11 commits Cesar shipped tonight (T-M1-22 OIDC + T-M1-33 TenantContext + T-M1-34 require_tenant_context + T-M1-35 workspace routes + T-M5-22 shell loader + T-M5-?? landing + #279 customer-agnostic + T-M1-32 RLS + 3 CLAUDE.md updates). Captures: Cesar's coding patterns, the runtime question resolution (Anthropic SDK + Claude on QDT-side, NOT PydanticAI), audit-emit pattern, RLS pattern, JIT user-provisioning flow, test-fixture patterns, current ticket queue, missing-tests opportunity from T-M1-31 critique.
type: project
originSessionId: b3253814-675e-4c79-a58c-3184f8915019
---
## What this memory is

Tonight's deep-study session — pulled master, read all 11 commits Cesar shipped since `7513cd4` (mid-day baseline), absorbed his patterns visually. Friday-morning posture: **skip the study phase, go straight to execution when Cesar assigns**.

If you re-read this on Friday, the prep was done. Don't re-pull or re-study — the file captures the snapshot.

## Master state at study time (2026-05-14 ~23:00)

**HEAD**: `900b887` "T-M1-32 — RLS policy migration + amira_app grants (#281)"

**11 commits since `7513cd4`** (in order, all by Cesar):
1. `39616e5` T-M1-22 OIDC sign-in flow (login + callback + cookie + JIT user) — PR #267
2. `9f76419` CLAUDE.md: 3 learnings from T-M1-22 — PR #268
3. `6315b86` T-M1-33 TenantContext + bind_tenant_context + Postgres immutability guard — PR #269
4. `4a8d42a` T-M1-34 require_tenant_context dependency + workspace-membership guard — PR #270
5. `fb8968b` T-M1-35 Workspace REST routes — PR #271
6. `97f92e9` identity: initials + default_workspace_id on /api/v1/users/me — PR #272
7. `de44adf` T-M5-22 Shell data loader — PR #273
8. `d26e7ed` T-M5-?? Public landing page — PR #275
9. `95425b4` #279 strip Mars naming from platform code (refactored our T-M1-31)
10. `dd58106` fix(top-bar): wire Sign out — PR #280
11. `900b887` T-M1-32 RLS policy migration — PR #281

Net: **+14,228 lines** across `apps/api/src/amira_api/`, `app/`, `lib/shell/`, `components/shell/`, `infra/charts/`, `tests/playwright/`, `plan/`, `architecture/`, `CLAUDE.md`.

## Current ticket queue (verified via whats_next.py)

```
🟢 TO DO (ready):
  • #43  T-M1-44  Canonical pytest fixtures (pg_url, session, blob)
  • #46  T-M1-47  Blob abstraction lint enforcement
  • #48  T-M1-49  Monotonic project sequence under concurrent inserts
  • #49  T-M1-50  Provider parity matrix (MinIO ↔ Azure Blob)

⏸  WAITING:
  • #51  T-M1-52  Audit-log writer-role grants  ← waiting on T-M1-51
```

**Important**: T-M1-44 + T-M1-47 are STILL labeled as ours-to-do (PRs #259 + #262 are open but Cesar hasn't closed them or merged them). T-M1-49 + T-M1-50 are still held for Farzaneh as Cesar said in his group chat. So the Monday ticket assignment could be:
- A new wave of M2/M3-shape "spec workflow integration" tickets (per Cesar's WhatsApp 6:37 PM)
- OR continuation of M1 tickets we already have queued
- OR PR-review feedback on #259 + #262 that needs addressing

Posture: APPROACH-DISCUSSION-PENDING. Don't auto-claim.

## Runtime question — RESOLVED

**QDT-side build uses Anthropic SDK + Claude models.** Not PydanticAI.

Evidence in `plan/06-llm-adapter-and-cost.md`:
- `amira.llm.adapter` is the Python facade for every LLM call
- Provider env-toggle: `CLAUDE_CODE_USE_BEDROCK` / `_USE_VERTEX` / `_USE_FOUNDRY`
- **4 backends in v1**: Anthropic direct, Bedrock, Vertex, Azure-AI-Foundry
- All wrap the `Anthropic{,Bedrock,Vertex}` SDK clients
- Models cited inline: `claude-opus-4-6`, `claude-haiku-4-5`
- Anthropic SDK is in `apps/api/pyproject.toml` locked tooling list

**The Mars architecture lock** (PydanticAI + OpenAI-compatible endpoint + Mars Okta) applies to `architecture/mars/` track ONLY — per the QDT-vs-Mars anti-leak rule (PR #258, locked 2026-05-13). The two tracks are bidirectionally separate. The QDT-side build is at `amira.qdt.ai`, multi-tenant SaaS, Anthropic SDK, Auth0.

## The 11 new CLAUDE.md non-negotiables (delta from yesterday's tour)

1. **`pythonpath = ["../.."]` is a smell** — fix package layout, not workarounds.
2. **Platform code is customer-agnostic** — no "mars", "MarsX" anywhere in `apps/api/src/amira_api/`, `app/`, `components/`, `lib/shell/`, `Makefile`, `next.config.mjs`, or platform migrations. Customer-specific lives in exactly 3 places: `_dev_fixtures/`, M3 admin CLI (not yet built), per-tenant config rows. **Flag during review on first occurrence.**
3. **Dev fixtures live at `apps/api/src/amira_api/_dev_fixtures/`** — underscore prefix = internal. Production never imports from here. `seed_default_org(session, fixture, *, auth0_org_id)` is generic; `DEFAULT_FIXTURE` is the only customer-naming spot.
4. **Fix the foundation in the same session** — when iteration uncovers gaps between plan / code / CLAUDE.md / memory, fix all in one PR. Don't ship "fix code, plan stays smelly." Memory file: `feedback_fix_foundation_dont_defer.md`.
5. **Every third-party Helm chart needs explicit `resources` on every pod component** — `amira-namespaces` ResourceQuota requires all four (requests.{cpu,memory} + limits.{cpu,memory}).
6. **Tag every Azure resource for billing** — 4 keys: `customer`, `created-by`, `project`, `environment`. AKS-managed `MC_*` children need `az tag update --operation merge` follow-up.
7. **Default to simple v1 network/auth; lock down only with named v1 caller** — ACR Standard (not Premium), no Key Vault purge-protection, Storage `--default-action Allow`, Postgres Burstable B2ms, `--public-access 0.0.0.0` + allow-all firewall, no HA. Promote to strict-posture later via single non-destructive `az ... update`.
8. **No simulation in the demo flow** — every step real against amira.qdt.ai. Don't stub Deploy modal / Buildkit / Argo / AnalysisRun / companion-agent registration. Don't wire `lib/mocks/*` into the live app.
9. **Adversarial-review every agent-generated PR** — watch for pytest.skip hiding assertions in default CI, schema drift, missing FK/uniqueness/enum/JSONB round-trip tests, "N passed" hiding skipped count. **PR #264 (our T-M1-31) is the textbook citation case.**
10. **Tests TRUNCATE the dev DB** — `apps/api/tests/identity/` fixtures share `make dev` Postgres and TRUNCATE org/workspace/user_session/outbox/user tables. After pytest, dev-server state for those tables is gone — recover via `make seed` or psql UPDATE.
11. **Module-import-time code reads env vars directly, never `Settings()`** — `Settings()` requires the full env surface. Code that runs at module-import time (Alembic env.py, logging bootstrap, anything before FastAPI lifespan) reads `os.environ.get("AMIRA_…", default)` directly with a fail-loud `raise RuntimeError(...)` if required+missing. Concrete: `apps/api/migrations/env.py` reads only `AMIRA_DB_DSN`; `main.py`'s `configure_logging()` reads only `AMIRA_LOG_*`.
12. **`pytest_httpx` asserts all registered responses were consumed at teardown** — `mock_auth0` fixture in `tests/identity/conftest.py` pre-registers JWKS as `is_reusable=True`. Tests where the callback fails before JWKS validation runs (code-exchange 4xx, state-tampered) leave JWKS unused → test ERRORs at teardown. Use raw `httpx_mock` (not `mock_auth0`) when the test path won't hit `/.well-known/jwks.json`.

## Cesar's coding patterns (absorbed from study)

### Module structure
- **File header comment**: `# apps/api/src/amira_api/<area>/<file>.py` then triple-quoted module docstring
- **Module docstring**: long, explicit, references plan section + ticket ID + architectural decisions. Lists what the module does and what it doesn't. Imports go below.
- **`from __future__ import annotations`** in every Python file
- **Imports order**: stdlib → third-party → `amira_api.*`
- **`get_logger(__name__)` from `amira_api._shared.logging`** — every module that logs
- **`_SERVICE_ID = "<area>-svc"` constant** at module level (audit emit)

### Type signatures
- **`Annotated[..., Depends(...)]`** for FastAPI dependencies
- **Keyword-only args**: `async def method(self, *, org_id: UUID, user_id: UUID, workspace_id: UUID) -> bool`
- **Return types always explicit** — even `None`
- **`UUID | None`** in modern union syntax, not `Optional[UUID]`
- **`Literal["a", "b", "c"]`** for enum-like wire fields
- **`frozen=True` Pydantic ConfigDict** for immutable models (TenantContext, CurrentPrincipal, IdpFederation)

### Models
- **SQLModel inheritance**: `class Org(AmiraBaseGlobal, table=True)` for tenant roots, `class Workspace(AmiraBase, table=True)` for org-scoped (gets `id` + `org_id` + `created_at` free)
- **Composite PK tables use direct SQLModel**: `class OrgConfig(SQLModel, table=True)` with explicit `primary_key=True` on two fields (composite PK conflicts with AmiraBase single-id PK)
- **`__tablename__ = "..."` + `__table_args__ = {"schema": "app"}`** — every table in app schema
- **JSONB pattern**: `field: list[UUID] = Field(sa_column=Column(JSONB, nullable=False), default_factory=list)`
- **SAEnum with `values_callable`**: `_LIFECYCLE_STATE_COLUMN_TYPE = SAEnum(OrgLifecycleState, name="org_lifecycle_state", schema="app", create_type=False, values_callable=lambda enum: [m.value for m in enum])` — values_callable forces lowercase, create_type=False because migration creates explicitly
- **StrEnum subclasses** for enum types: `class OrgLifecycleState(StrEnum): ACTIVE = "active"; ...`
- **Schema-qualified FKs**: `foreign_key="app.workspace.id"` not `"workspace.id"`

### Repository pattern
- **`class <Area>Repo:`** with `def __init__(self, session: AsyncSession) -> None: self._session = session`
- **Method names**: `get_by_X`, `create`, `list_X_for_Y`, `set_X`, `revoke`
- **Caller commits** — repo methods do `flush()` not `commit()`, leaving transaction control to caller
- **Multiple repos per area**: identity has UserRepo + OrgRepo + SessionRepo + MembershipRepo + PatRepo (T-M1-26 future)
- **Sibling repos share tables**: identity.MembershipRepo (JIT-writer) + tenancy.TenancyRepo (request-time predicate + workspace-switcher writer) both touch org_membership + workspace_membership

### FastAPI routes
- **`router = APIRouter()`** at module level (no prefix — composed by main.py)
- **`@router.get("/api/v1/...")`** with full prefix in decorator
- **`response_model=...`** declared on every route
- **Dependencies via `Annotated[..., Depends(...)]`** pattern
- **Status codes**: `status.HTTP_400_BAD_REQUEST`, `_401_UNAUTHORIZED`, `_403_FORBIDDEN`, `_409_CONFLICT`, `_303_SEE_OTHER`
- **HTTPException with short string detail**: `raise HTTPException(status.HTTP_403_FORBIDDEN, "unauthorized_workspace")` — never long sentences in the detail field

### Error handling
- **Custom exception classes** per area: `Auth0Error`, `Auth0CodeExchangeError`, `IdTokenInvalid`, `StateError`, `StateInvalid`, `StateExpired`, `ImmutableSessionAttributesError`
- **`from exc` always set** when re-raising: `raise HTTPException(...) from exc`
- **DBAPIError → custom exception translation** with sqlstate check (P0001 for plpgsql RAISE)
- **Fail-loud is the default**: empty arg → `raise RuntimeError("auth0_org_id is required (Standard #1: fail loud). Set AMIRA_AUTH0_DEFAULT_ORG_ID in the environment.")`

### Audit emit pattern
- File location: `<area>/audit.py`
- Function pattern: `async def emit_<kind>(session: AsyncSession, *, org_id, user_id, ..., correlation_id) -> None`
- Body: `session.add(OutboxEvent(org_id=..., service=_SERVICE_ID, kind="<area>.<event>", actor_user_id=..., actor_service_id=_SERVICE_ID, correlation_id=..., payload={...}))`
- **Caller commits** — emitters never flush or commit
- **`PLATFORM_ORG_SENTINEL_ID = UUID("00000000-0000-0000-0000-000000000000")`** for pre-tenant failures (state-rejected, code-exchange-failed, id-token-invalid, unknown-org)
- **Kind naming**: `<area>.<event-name>` — e.g., `tenancy.workspace-switched`, `user.signed-in`, `auth.unknown-org`
- **Module docstring includes audit-kind catalogue** as a markdown table

### Alembic migration pattern
```python
"""<revision_name>

Revision ID: 20260514150000
Revises: 20260514130100
Create Date: 2026-05-14 15:00:00.000000

T-M1-32 (plan/02 §2.2 + §2.7) — ...
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260514150000"
down_revision: str | None = "20260514130100"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        # ...
        sa.ForeignKeyConstraint(["org_id"], ["app.org.id"], name="fk_user_org_id"),
        sa.UniqueConstraint("idp_subject", name="uq_user_idp_subject"),
        schema="app",
    )
    op.create_index("ix_user_org_id", "user", ["org_id"], schema="app")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app.user CASCADE")  # idempotent
```

- **Named constraints always**: `name="fk_..."`, `name="uq_..."`, `name="ix_..."`
- **Schema-qualified everywhere**: `schema="app"` on tables + indices, `["app.org.id"]` in FKs
- **`postgresql.UUID(as_uuid=True)`** not generic `sa.UUID`
- **PL/pgSQL functions as raw SQL strings** via `op.execute(_FUNCTION_DDL)`
- **`REVOKE FROM PUBLIC` + `GRANT EXECUTE TO amira_app`** pattern for functions
- **`IF EXISTS` clauses in downgrade** for idempotency

### Test fixtures pattern (`tests/identity/conftest.py` shows it all)
- **`pg_url` fixture** reads `AMIRA_TEST_DB_DSN`, skips when unset with explicit message (Standard #5)
- **`schema_at_head` fixture** runs `command.upgrade(cfg, "head")` once, session-scoped, sync (avoids asyncio.run conflict)
- **`rs256_keypair` fixture** generates 2048-bit RSA keypair via `cryptography.hazmat.primitives`
- **`jwks` fixture** builds JWKS doc from public key via `joserfc.jwk.RSAKey.import_key`
- **`mock_auth0` fixture** uses `pytest_httpx.HTTPXMock` to register JWKS endpoint with `is_reusable=True`
- **`sign_id_token` helper** signs RS256 JWT with configurable claims (defaults: Cesar user + TEST_AUTH0_ORG_ID)
- **`seeded_org` fixture** TRUNCATEs 7 tables in order (`workspace_membership, org_membership, user_session, outbox_event, user, workspace, org CASCADE`) then inserts demo Org + 5 workspaces
- **`asgi_client` fixture** monkeypatches env vars, calls `get_settings.cache_clear()`, binds engine, creates FastAPI app with router, ASGITransport, AsyncClient — both before and after teardown clears the lru_cache
- **`TEST_AUTH0_ORG_ID = "org_testharness"`** — fixed test value
- **Windows compat shim** at module load: `if sys.platform == "win32": asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())`

## OIDC sign-in flow — the 8-step callback (`identity/router.py`)

For reference when working on anything that consumes principal:

1. **Verify state** — `amira_auth_state` cookie matches `state` query param; signed via itsdangerous; emit `auth.state-rejected` on fail
2. **Exchange code** — `client.exchange_code(code)` → Auth0 `/oauth/token`; retry 5xx/429 only; emit `auth.code-exchange-failed`
3. **Validate ID token** — `client.validate_id_token(tokens.id_token)` via `joserfc` (NOT authlib — joserfc is canonical successor); RS256 only; iss/aud/exp/org_id essential; emit `auth.id-token-invalid`
4. **Resolve Org** — `OrgRepo.get_by_auth0_org_id(claims["org_id"])`; emit `auth.unknown-org` on miss; **IDA-6 enforcement**
5. **JIT / reuse User** — `user_repo.get_by_idp_subject(idp_subject)` then either reuse (check `auth.org-mismatch`) or JIT-create (check `auth.email-collision`); JIT creates User + OrgMembership + WorkspaceMembership×N + set default to first workspace by slug
6. **Create UserSession** — device_label, user_agent, ip_first_seen, ip_last_seen, idp_id_token_jti, idp_refresh_token_ciphertext (placeholder until T-M1-24)
7. **Audit + commit** — `emit_user_signed_in` + `session.commit()`
8. **Set session cookie + redirect** — `encode_session_cookie(secret, user_session.id)`; HttpOnly + Secure + SameSite=lax; delete state cookie; 303 to `state_payload.redirect_to`

## `require_principal` flow (`identity/middleware.py`)

Cross-area dependency every protected route uses:

1. Decode `amira_session` cookie via `itsdangerous.URLSafeSerializer` → UserSession.id
2. Load UserSession via `SessionRepo.get_by_id`; reject if missing/revoked → 401
3. Load User via `UserRepo.get_by_id`; reject if deactivated → 403
4. Join WorkspaceMembership via `MembershipRepo.workspace_ids_for_user` for principal's workspace_ids list
5. Fetch default_workspace_id via TenancyRepo (org-scoped) with fallback to User.default_workspace_id
6. **`set_immutable_session_attrs(session, org_id=..., user_id=..., correlation_id=...)`** — sets `app.org_id`, `app.user_id`, `app.correlation_id` GUCs via the simpler helper (NOT the full tenancy `bind_tenant_context` — that runs later via `require_tenant_context`)
7. Return frozen CurrentPrincipal

## `require_tenant_context` flow (`tenancy/middleware.py`)

Composes WITH `require_principal` via FastAPI dependency graph (NOT as Starlette middleware — that was plan/02's original sketch but Cesar implemented as dependency because middleware can't reach the resolved principal):

1. Parse `X-Workspace-Id` header (None / "" / valid UUID; reject malformed UUID with 400)
2. Read `x-correlation-id` header (fallback to principal.session_id)
3. If header present: `TenancyRepo.is_member_of_workspace`; if not member emit `tenancy.workspace-access-denied` + 403; else use header value
4. If no header: `TenancyRepo.get_default_workspace_id` (may be None → org-admin context)
5. Build TenantContext (frozen Pydantic)
6. `bind_tenant_context(session, ctx)` — calls `app.bind_tenant_attrs(...)` plpgsql function, verifies via `current_setting`, logs
7. Set `current_tenant_context` ContextVar
8. Yield; reset ContextVar on teardown

## RLS pattern (`persistence/rls.py` + `20260514150000_rls_baseline.py`)

For every tenant-scoped table:
- **PERMISSIVE `<table>_org_isolation`** keyed on `current_setting('app.org_id', true)` — uses CASE not OR (Postgres planner doesn't short-circuit OR through `::uuid` cast)
- **RESTRICTIVE `<table>_workspace_scope`** on workspace-scoped tables — short-circuit when GUC unset (org-admin)
- **Special `org_self_isolation`** on `app.org` itself (the tenant root — `id IS the org_id`)
- **Read-allow-on-unset-GUC** for OIDC callback discovery; **WITH CHECK requires GUC set + matching** for writes
- **ENABLE + FORCE RLS** (force applies to table owner too)
- **`amira_app` role** gets SELECT/INSERT/UPDATE/DELETE grants
- **`TENANT_SCOPED_TABLES` tuple** in rls.py lists all tables; migration iterates

## Frontend shell wiring pattern

- `app/page.tsx` — **public landing** at `/` (outside `(app)` group, no shell loader). Sign-in CTA → `/auth/login?redirect_to=/home` which `next.config.mjs` rewrites to FastAPI `/auth/login`
- `app/(app)/layout.tsx` — **server component**, calls `fetchShellData()` from `lib/shell/api.ts`
- `lib/shell/types.ts` — `ShellUser`, `ShellWorkspace`, `AppShellProps` — narrower than mockup's `User`/`Workspace`
- `lib/shell/api.ts` — `"server-only"` directive, `fetchShellData()` parallel-fetches `/api/v1/users/me` + `/api/v1/me/workspaces`, forwards `cookie` header from Next.js, throws `ShellUnauthorizedError` on 401
- `lib/shell/actions.ts` — `"use server"` directive, `switchActiveWorkspace(workspaceId)` POSTs `/api/v1/me/active-workspace`, `revalidatePath("/(app)", "layout")` on success
- `components/shell/top-bar.tsx` — workspace dropdown + Sign-out menu item (PR #280 wired it)

## Plan/07 Spec Workspace + Spec Agent — what's coming

This is what Cesar's working on Friday. We'll likely consume the foundation he builds.

**`SpecAgentWorkflow`** — Temporal Workflow per Spec session
- **Activities** (each is a checkpoint seam): classify_intent, assemble_spec_context, elicit_turn, lint_narrative, resolve_referenced_skills, compute_readiness, persist_spec_turn, index_kb_attachment, out_of_scope_check, route_for_esignature, bump_spec_version
- **Signals**: submit_instruction, request_lock, approval_signed, approval_declined, control(pause/resume/cancel)
- **Queries**: readiness(), snapshot()
- **Per turn**: classify → assemble → elicit → lint → resolve_skills → compute_readiness → persist_spec_turn (one atomic Postgres tx)

**Key components**:
- SpecReadiness rubric (deterministic 6-row scoring: fr-coverage / nfr-measurability / ac-checkability / decisions-resolved / open-gaps / scope-clean) + LLM self-assessment tie-breaker
- Spec Capability Graph (DSL, single source of truth, incremental delta per turn, frozen at e-signature) — populated by structured tool-use return
- SpecDocument (IEEE-830 sections 1-9, 9 sections always present)
- Reviewer Agent linter (deterministic, no LLM, vendor-SDK leak detection)
- Out-of-scope detector (2-pass: deterministic Bloom-filter membership + LLM-judge fallback)
- REVENG-1 repo-import pipeline (`agent-sandbox` CRD pod, AST walk + LLM inference)

**Persistence** (Spec-domain tables): spec_version, spec_requirement, decision_point, gap, spec_chat_message, spec_capability_graph, kb_attachment, kb_chunk, spec_skill_reference, imported_spec_session

**FastAPI surface**: `/api/v1/specs/{spec_version_id}`, `/api/v1/specs/by-project/{project_id}/versions`, `/api/v1/specs/diff`, `/api/v1/specs/{id}/requirements/confirm`, `/api/v1/specs/{id}/kb/upload`, `/api/v1/specs/{id}/export.{fmt}`, `/api/v1/specs/genesis/nl`, `/api/v1/specs/genesis/fork`

**Frontend**: `app/(app)/spec/[slug]/page.tsx` + `components/spec/*` (chat-pane, document, context-panel, readiness, lifeline-stepper, version-history, imported-spec-summary, request-approval-dialog)

**Path divergence**: plan/07 uses `agents/spec/workflow.py`; real repo path is `apps/api/src/amira_api/agents/spec/workflow.py` (src-layout per PR #232). Lift + flag in PR body.

## Plan/12 Companion Agents + Ask Amira — what's coming

The "agents" plural in "integrating the agents with the right spec workflow." Cesar referenced this too.

**3 sub-areas**:
1. **`companion-synthesis`** — deploy-time SKILL.md + MCP server generator (Temporal Activity bundle). Reads build-plan.lock + spec FRs/ACs → emits CompanionAgentManifest + CompanionMcpServerSpec
2. **`companion-mcp-server`** — per-app, per-build MCP server pod running in `org-<orgId>-app-<appId>-<env>` namespace. Receives MCP `tools/call` with workflow-context user attribution (NOT wire-level OBO per SIMPLIFY-IDA-2). Enforces `min(source_app_perms ∩ caller_perms ∩ user_perms)`
3. **`companion-runtime`** — `CompanionAgentWorkflow` per Ask-Amira **turn** (not per session). Loads chat thread, composes prompt + tool catalog + provenance instructions, runs Claude Agent SDK tool-use loop against synthesized MCP server, streams NarrationEvents through `#5`'s outbox
4. **`chat-platform-api`** — chat FastAPI routes (`/threads`, `/messages`, AgentRef picker)

**Path convention**: plan/12 uses `apps/companion/synthesis/models.py` — actual repo path likely `apps/api/src/amira_api/companion/...` (lift + flag like spec).

**OBO stale references**: `obo_token: str` field still appears in `McpToolCallRequest` Pydantic shape; same drift as T-M3-32/47/M5-16 from prep_briefs 5/06.

## What's NOT in v1 (stripped per CLAUDE.md "Not in v1")

Remember these for any spec we write — don't re-introduce:
- No regulatory frameworks; "Compliance Matrix" = spec-coverage scoring only (one readiness predicate)
- No image vulnerability scanning, no SCA/SAST/Trivy
- No data residency / geography lock as platform concerns
- No MFA / step-up / TOTP
- No Terraform — hand-provision via Azure CLI + capture in runbooks
- No Grafana/Loki/Tempo/Mimir/OTel — v1 is structured logging → Elastic Agents → Kibana → Postgres rollups
- No RFC 8693 / OBO / `act`-chain — workflow-context propagation only
- No connection-pool sidecar (Supavisor/PgBouncer/Pgpool) — direct Postgres connections
- No customer-facing-deployment narrative leaking into QDT-side build

## Open follow-up opportunity (low-risk, 30-50 lines)

**Cesar's T-M1-31 critique still stands** — the 3 specific tests he wanted are NOT in `test_tenancy_models.py` (he replaced our seed_mars_demo tests with dev-fixture tests but didn't add the schema-level adversarial tests he called out).

What's currently there:
- ✓ test_tenancy_public_surface_resolves (default CI — import check)
- ✗ test_alembic_round_trip (skip without DSN)
- ✗ test_create_org_with_two_workspaces_and_member (skip without DSN)
- ✗ test_seed_default_org_creates_org_with_auth0_org_id_and_workspaces (skip without DSN) — added by Cesar in #279
- ✗ test_seed_default_org_is_idempotent (skip without DSN) — added by Cesar in #279
- ✗ test_seed_default_org_fails_loud_without_auth0_org_id (skip without DSN) — added by Cesar in #279

What's STILL MISSING per the adversarial-review rule:
- OrgConfig JSONB round-trip test (Pydantic-only, default CI)
- lifecycle_state StrEnum round-trip via values_callable (Pydantic-only, default CI)
- slug uniqueness violation (model-level validation, default CI)

These would be a clean follow-up PR addressing the binding discipline rule we triggered. ~30-50 lines. Discuss with Farzaneh before claiming — may be timing-bad if Cesar is mentally past M1.

## Auth0 details captured

- **Tenant**: `qdt-amira.us.auth0.com`
- **Cesar's user id**: `auth0|6a05f8f0983df84518fb0c76`
- **Live Org id**: `org_l4AEkJYBn2PTiPPI`
- **Connection id**: `con_bnn6WKDP3bv5Fh2l`
- **Test Org id used in fixtures**: `org_testharness`
- **OIDC scope**: `openid profile email`
- **Algorithm**: RS256 only (whitelist in JsonWebToken)
- **JWKS endpoint**: `https://qdt-amira.us.auth0.com/.well-known/jwks.json`
- **JWKS cache TTL**: 1 hour in-process
- **HTTP timeouts**: connect=5s, read=10s, write=10s, pool=5s
- **Retry backoffs**: 250ms, 1s, 4s (3 attempts total, only on 429/5xx)

## How Friday-AM execution should go

1. **Pull master**: `cd D:/amira-mars-readonly && git fetch origin && git pull --ff-only origin master` — see what Cesar shipped overnight
2. **Pull writable clone**: `cd D:/amira-mars && git checkout master && git pull --ff-only origin master`
3. **Check ticket queue**: `cd D:/amira-mars-readonly && PYTHONUTF8=1 python scripts/whats_next.py farzaneh`
4. **Wait for Cesar's WhatsApp ping** — he assigns tickets
5. **For each ticket**:
   - `gh issue view <N>` — read the ticket body
   - Read the relevant area-file section + cross-area Lane notes (trust prose, not just `Depends-on:`)
   - Surface to Cesar if foundational (per rule #4 from feedback_cesar_quality_bar_m1_backend.md)
   - Confirm scope with Farzaneh before claiming
   - Follow per-action confirmation rule for all remote writes (6 steps per ticket + 2 if blockers)

## Memory cross-references (chain when re-reading)

- `feedback_cesar_quality_bar_m1_backend.md` — 5 binding discipline rules (THE quality bar)
- `feedback_mars_architecture_lock.md` — Mars-track scope (NOT relevant to QDT-side `apps/api/` work)
- `project_cesar_codebase_tour.md` — repo structure overview (predates tonight's haul; still useful for big-picture)
- `project_mars_deployment_plan.md` — current build reference (status doc)
- `project_amira_first_deployment.md` — tonight's deployment + plan summary
- `project_next_session.md` — status pickup
- `project_spec_agent_design_doc.md` — v0.6 design doc we sent Cesar 4/24 (referenced from plan/07)
- `feedback_local_clone_freshness.md` — always pull before reading
- `feedback_no_remote_writes_without_confirm.md` — per-action confirmation rule
- `feedback_whats_next_windows_encoding.md` — `PYTHONUTF8=1` for whats_next.py on Windows
- `feedback_avoid_jargon_amira_mars.md` — plain language; no triage/swimlane/synergy

## Readiness rating

**~90% ready** — solid on Cesar's patterns, the architecture, the runtime question, the 11 new CLAUDE.md rules, the OIDC flow, RLS pattern, audit-emit pattern, test fixture patterns, migration patterns, ticket queue state.

**Remaining 10% unknowns**: actual ticket IDs Cesar assigns, exact scope, whether the "spec workflow integration" tickets touch `agents/spec/` directly or just consume Cesar's foundation via REST/SSE, what shape "the magic" we bring takes (Activity bodies? prompts? frontend components? all three?).

These resolve in <30 minutes when Cesar pings us with ticket IDs Monday morning.
