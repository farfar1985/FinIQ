---
name: companion-mcp-206-recon
description: "Pre-build deep-read (Plan-agent recon, 2026-06-05) of GitHub #206 / T-M5-16 — Companion MCP handler with permission intersection (the LAST open milestoned ticket; the keystone for 'talk to / call a deployed app's companion from Amira, governed'). VERDICT: ~80% clear path; ONE gate = the permission-intersection CONTRACT needs a ~15-30min brainstorm + Cesar sign-off (in v1 the 3 principals source_app∩caller∩user collapse to ~2 — caller_perms==user_perms==a single role string; role_ids 'pending RoleGrant M5/M6'). Surprise: clearer than feared — NO RLS-row-scope intersection; the algorithm is a role-set intersect already in-tree 2× (invoke.py:178 + build/permission.py). Reshape: the CLIENT side is ALREADY built (companion_mcp_call.py + llm_turn.py intercepts write→confirm runtime-side); #206 = just the SERVER side (receive → permission-check → classify → audit). Plan: 3 files (permission_check.py / handlers.py / mcp_router.py) + 4 real-services tests, supersede the 501 skeleton test. Size ~2-2.5 days (8/10). Owner-label now cesar (body says farzaneh — was ours as T-M5-16). MUST build vs fresh origin/master (spike branch's companion workflow.py regressed ~200 lines). 5 open Qs for Cesar inside. ACTION: ask Cesar Monday — take it + lock the contract; if yes → build."
metadata:
  node_type: memory
  type: project
  created: 2026-06-05
  updated: 2026-06-05
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## What this is
Pre-build recon (Plan-agent deep read, 2026-06-05) of **#206 / T-M5-16 — "Companion MCP handler with permission intersection"** — the **last open milestoned ticket** in the whole build, and the keystone for the *"chat with / call a deployed app's companion from Amira, governed"* feature. **We are NOT building it yet.**

**ACTION — Monday: ask Cesar** (a) can we **take it** (it's labeled `owner:cesar` now, but the ticket *body* says `owner:farzaneh` — it was ours as T-M5-16), and (b) **lock the permission-intersection contract** (the 5 Qs below). **If he says go → build (~2-2.5 days).**

## VERDICT — clear path ~80%; ONE gate
- **Clear → straight to Plan+TDD:** the two handlers (`tools/list` + `tools/call`), the audit emission, the per-call principal, and the test harness. All mirror concrete in-tree precedents.
- **The one gate (brainstorm + Cesar sign-off):** the **permission-intersection CONTRACT** — *not* the algorithm (a known role-set intersect, done twice in-tree), but the **operands**. In v1 the three principals `source_app ∩ caller ∩ user` collapse to ~two: `caller_perms` and `user_perms` are the *same single role string* today (`CurrentPrincipal.role_ids` is empty — "pending RoleGrant work M5/M6", `identity/contracts.py:96`; `exposure_scopes == list(role_flags)`; the wire `McpToolCallRequest` carries only `caller_role: str`). So "what are the 2nd + 3rd operands?" is a design call. Security-sensitive (fail-closed) → Cesar locks it. ~15-30 min, not a saga.
- **Surprise (good):** the RLS-row-scope-intersection complexity feared up front does **NOT** exist — permissions here are **role strings**; RLS is enforced separately at the Postgres `SET LOCAL` boundary (org_id/user_id GUCs), not a value the handler intersects.

## RESHAPE — the client side is ALREADY built; #206 is only the server side
Already on the branch:
- `runtime/agents/companion/activities/companion_mcp_call.py` — HTTPX client that POSTs `/.well-known/amira/mcp/tools/call` with the `caller_*` envelope; treats `403→deny`, `400/422→invalid-args`, `501→not-implemented`, `5xx→raise`.
- `runtime/agents/companion/activities/llm_turn.py` — the real Anthropic tool-use loop; **already intercepts write/external-write tools into `request_write_confirm` → `PendingToolConfirm` runtime-side BEFORE calling the server**, then calls `companion_mcp_call` for reads.
- `companion/server/mcp_router.py` — the T-M5-02 skeleton: locked prefix `/.well-known/amira/mcp`, the `McpToolCallRequest`/`McpToolCallResponse`/`Provenance` wire shapes, 3 routes all raising **501**.

So the server's job = **receive → permission-check → classify side-effect → audit** (+ belt-and-braces confirm-by-default per AGENT-3 §4.5).

## THE PLAN (3 new files + 4 tests)
1. **`companion/server/permission_check.py`** (pure, no IO) — mirror `runtime/agents/build/permission.py` (frozen-dataclass policy) + the role-set logic in `skills/agent_runtime/invoke.py:178`. `class McpDenialError(Exception)` carrying `failing_field: Literal["source_app","caller","user"]` + `.reason`; map the failing field to audit context key **`missingPermission`**. `enforce_permission_intersection(*, tool_name, side_effect, source_app_role_gating, caller_role, ...) -> None` (raise on miss). Core rule (precedent `invoke.py:178`): for tool's allowed-role set `A = role_gating.get(tool_name)` — **empty allowlist = allow-all**; non-empty AND `caller_role ∉ A` → deny; unknown tool → deny. Keep the signature shaped so a future real `caller_perms`/`user_perms` split is an *argument addition, not a rewrite*.
2. **`companion/server/handlers.py`** — `handle_tools_list(manifest)` (return manifest `tools[]` as MCP `Tool(name, description, inputSchema)`); `handle_tools_call(session, request, manifest, registry)`: look up tool + classify `side_effect` from `CompanionToolBinding.side_effect` → `enforce_permission_intersection` (on `McpDenialError` emit `audit-companion-permission-denied` + re-raise) → dispatch the underlying skill as the **platform service identity** (per SIMPLIFY-IDA-2; reuse the T-M5-02 MCP-runtime-client / `skills/agent_runtime` invoke path) → emit `audit-companion-tool-call` (`AuditActor(user_id=caller_user_id, agent_id=companion_id, service_id=COMPANION_SERVICE="companion")`) → return `McpToolCallResponse(result, result_id, side_effect, duration_ms, provenance=[...])`.
3. **`companion/server/mcp_router.py`** — replace the 501 stubs: `tools/list`→handler, `tools/call`→handler, map `McpDenialError → HTTP 403` (lights up the already-built client's 403 branch). Resolve the active `CompanionAgentManifest` (from `CompanionAgentVersionRow`/`CompanionAgentActivePointer`); open the DB session; caller owns commit. `resources/list` can stay 501.
4. **`tests/companion/test_mcp_handler.py`** — ASGI integration against the router + real Postgres `amira_test` for audit-row asserts (conftest provides `app_db_engine` RLS-enforced + `db_engine` seeding + `seeded_org`). **No `WorkflowEnvironment` / no Anthropic** (this is an HTTP handler + pure fn, not workflow-execution). The 4 scenarios: (1) read tool → 200 + `side_effect=="read"` + one `audit-companion-tool-call` row w/ actor triple; (2) **write tool → confirm-required** [CAVEAT — see Q4]; (3) permission denial → `McpDenialError` w/ failing-principal field + 403 + one `audit-companion-permission-denied` row w/ `missingPermission`; (4) [CONFIRM w/ Cesar — likely external-write escalation OR unknown-tool denial; a literal session-expiry test looks moot post-SIMPLIFY-IDA-2]. **Supersede `test_mcp_router_skeleton.py`** (its `test_routes_return_501` will go red — re-point the still-valid URL-prefix/route-mounted asserts).

**Order:** brainstorm+lock contract (Cesar) → `permission_check.py` + pure unit tests → `handlers.py` → wire `mcp_router.py` → `test_mcp_handler.py` → supersede skeleton test.

## 5 OPEN QUESTIONS FOR CESAR (the Monday ask)
1. **What are the 2nd + 3rd operands?** v1 `caller_perms` == `user_perms` == one `caller_role` string. Is the v1 intersection effectively `tool ∈ manifest ∩ caller_role ∈ role_gating[tool]` (third = identity), with `McpDenialError.failing_field` reporting which conceptual principal failed? Or should the handler also consult `app.skill_role_grant` (via `skills/role_resolver.py::resolve_role_availability`) as the true "source-app" operand (a genuine 2-source check — AC-CMP-4 references "a role that lacks one of the demo companion's source-app skill grants")?
2. **Wire-shape gap.** `McpToolCallRequest` carries only `caller_role` (one string); `CallerPrincipal` carries `exposure_scopes` (a list) but the runtime drops it at the wire boundary. If the intersection must consider exposure scopes, the **already-shipped** wire shape + `companion_mcp_call` payload must grow a field — confirm before touching a shipped contract (+0.5-1 day if so).
3. **Which service owns `audit-companion-permission-denied`?** Ticket says the MCP handler emits it; the audit-kinds docstring (`companion/audit/kinds.py:16`) classifies it under `service='agent-runtime'` (workflow). Pick one so emit `service`/actor is correct.
4. **Test #2 reading.** Does the *server* return/emit confirm-required (belt-and-braces, §4.5), or does it only classify+audit while the runtime (`llm_turn`, already built) gates? Wording "write tool emits confirm-required" reads as the former; current code does the latter.
5. **Test #4 identity.** External-write escalation, unknown-tool denial, or a genuinely-deferred expiry test? (Handler holds no token post-SIMPLIFY-IDA-2, so expiry-at-handler looks moot.)

## CRITICAL FILES / PRECEDENTS (paths)
- `companion/server/mcp_router.py` — skeleton to replace; owns `COMPANION_MCP_URL_PREFIX` + wire shapes (`caller_role` is the only role on the wire, ~line 35-52).
- `runtime/agents/build/permission.py` — **mirror for `permission_check.py`**: pure frozen policy, `authorize()->(Decision,reason)`, unknown-tool→deny, confirm-gate overlay.
- `skills/agent_runtime/invoke.py:178` — **role-set intersection precedent**: `if role_gating and not (set(role_gating) & caller_roles): raise RoleGateError` + typed exc `.reason` + `agent.skill-invoke-denied` audit row w/ actor triple.
- `skills/role_resolver.py::resolve_role_availability` — queries `app.skill_role_grant` (role→skill); the "source-app skill grant" operand candidate (Q1).
- `companion/audit/kinds.py` — `COMPANION_PERMISSION_DENIED` (req key `missingPermission`, ~line 133), `COMPANION_TOOL_CALL` (req keys `companionId,toolName,sideEffect,resultId,ok`, ~line 147), `COMPANION_SERVICE="companion"`. (Docstring line 16 marks permission-denied as `agent-runtime` — see Q3.)
- `audit/emit.py` + `audit/registry.py:73` (`AuditActor(user_id, agent_id, service_id)`) — emit seam; caller owns commit; validates vs registry before write.
- `companion/synthesis/models.py` — `CompanionAgentManifest` (`tools: list[CompanionToolBinding]`, `role_gating: dict[str,list[str]]`), `CompanionToolBinding` (`tool_name`, `side_effect`, `source_skill_id`, `input_schema`). The source-app-perms operand.
- `runtime/agents/companion/models.py` — `CallerPrincipal` (`role: str`, `exposure_scopes: list[str]`), `PendingToolConfirm`.
- `runtime/agents/companion/activities/{llm_turn.py, companion_mcp_call.py}` — the already-built CLIENT (defines the request/response contract the handler must satisfy).
- `tests/companion/conftest.py` — `app_db_engine` (RLS), `db_engine` (seeding), `seeded_org`, `FakeTemporalClient`, ASGI wiring. `tests/companion/test_mcp_router_skeleton.py` — to supersede.

## SIZE
**~2-2.5 days, confidence 8/10.** ~0.5d brainstorm+lock, ~1d `permission_check.py`+`handlers.py`+wiring (heavy mirroring), ~0.75d the 4 tests + supersede skeleton. **+0.5-1 day if Q2 reopens the wire contract.** Confidence dragged by: (a) exact downstream skill-dispatch as platform service identity (depends on the T-M5-02 MCP-runtime-client surface, not fully read); (b) the test #2/#4 readings.

## MUST-DO before building (fresh-master)
- Spike branch `spec-agent-completeness-spike` is ~3 commits behind master **AND its companion `workflow.py` is REGRESSED ~200 lines vs origin/master** (`git diff --stat` ~`15 insertions, 215 deletions`). **Build against fresh origin/master; re-read `workflow.py` + `llm_turn.py` there first** (the handler must satisfy the *current* client shape). `companion/api/routes.py` + `tests/companion/test_workflow.py` also differ.
- `handlers.py` + `permission_check.py` exist on **neither** branch (genuinely new). Skeleton `mcp_router.py`, `companion_mcp_call.py`, `synthesis/models.py`, `audit/kinds.py`, migrations `20260525*`, `conftest.py` confirmed present on both.
- Re-verify on fresh master: (a) `McpToolCallRequest` still carries only `caller_role`; (b) `audit-companion-permission-denied` service ownership; (c) the T-M5-02 MCP-runtime-client downstream-dispatch surface; (d) `test_mcp_router_skeleton.py` still asserts 501.
- **Authoritative file path = `apps/api/src/amira_api/companion/server/...`** (issue body + actual tree); ignore the plan-doc's `apps/companion/...` prose.

## Source
- GitHub #206 (body) · area file `plan/12-companion-agents-and-ask-amira.md` §2.2 + §8 (T-CMP-3) · `docs/implementation/TECHNICAL_EXECUTION_PLAN.md` (search T-M5-16).
- Recon performed via Plan agent on the local `spec-agent-completeness-spike` working tree (flag the regression above).
