---
name: Prep briefs for 15 candidate tickets generated 2026-05-06 afternoon
description: Pre-staging digest covering plan/13 (compliance) + plan/14 (data plane) + plan/12 (companion) + plan/10/11 (skills + deploy + frontend). Top-leverage cross-cutting findings + per-ticket scope estimates so we can ship within 5 minutes of Cesar's pick.
type: project
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
## Why this exists

Sent Cesar 15 candidate tickets via WhatsApp 2026-05-06 mid-afternoon. While waiting for his pick, dispatched 4 subagents in parallel to deep-read plan/13, plan/14, plan/12, plan/10/11 + the relevant ticket bodies + precedent files we already shipped. This memory holds the digest so a fresh session can spin up cold.

## Three universal cross-cutting findings

### 1. Path divergence (every ticket)
Every plan doc references `services/<area>/...` or `backend/<area>/...`. Repo's actual src-layout is `apps/api/src/amira_api/<area>/...` (per Cesar's PR #232 rebase). All 7 of our shipped tickets followed the repo layout, NOT the plan-doc paths. **Resolution pattern**: lift the listed file paths to `apps/api/src/amira_api/<area>/<file>.py`, flag the divergence in the PR body. Same approach as T-M2-17 (`apps/runtime/contracts/...` plan → `apps/api/src/amira_api/runtime/contracts/...` repo) and T-M3-37 (`domain/spec/...` top-level plan → `apps/api/src/amira_api/domain/spec/...` repo).

### 2. Wire-level OBO is DEAD in v1
`IDA-3` reformulated 2026-05-06 under `SIMPLIFY-IDA-2`. Mars Entra MFAs upstream; platform uses plain OIDC. User identity propagates through **Temporal workflow context (in-process)**, NOT JWT bearer tokens on the wire. v1 uses per-org credentials registered at onboarding; calling user's `(userId, agentId, serviceId)` triple is included in the request envelope as workflow-context attribution.

**Three issue bodies still have stale `obo_token` references — DRIFT TO FLAG, NOT TO IMPLEMENT**:
- T-M3-32 (Query Session Gateway) — reason name `"obo-failed"` kept; means "service-identity caller rejected" in v1
- T-M3-47 (MCP Runtime Client) — title says "OBO routing"; test file `test_obo_token_propagation.py` actually verifies in-process propagation
- T-M5-16 (Companion MCP handler) — title says "permission intersection + OBO routing"; plan/12 §4.3 confirms wire-level OBO dropped

### 3. `expected_implementation` pattern shape on `CapabilityNode` is unresolved
T-M3-48 will lock Q-13-1 ("Spec Agent emits `expected_implementation: list[Pattern]` per capability-graph node at finalization"). When Cesar resolves this:
- Our already-shipped `CapabilityNode` Pydantic in `apps/api/src/amira_api/domain/spec/capability_graph.py` (PR #240) needs a new field `expected_implementation: list[ExpectedImplementationPattern]`
- Pattern shape itself unspecified in plan — open spot for design when implementing T-M3-49 (likely `kind: Literal["file-path-glob","file-path-regex","import-regex"] + pattern: str + target_role: ...`)
- v1 = pattern strings; AST predicates parked for v1.5

This would be a small follow-up PR amending PR #240's shape.

## Architecture pattern (consistent across all areas)
Immutable Pydantic shapes (`model_config = ConfigDict(frozen=True, extra="forbid")`) + version-row tables (`<entity>_version`) + atomic active-pointer flip (`<entity>_active_pointer`) on each new build/version. Used by `CompanionAgentManifest`, `ComplianceMatrix`, `BuildPlanLock`, `SpecCapabilityGraph`.

---

## Per-ticket scope estimates (15 candidates from Cesar's pick list)

### Decision-locks (doc-only, no code, fast)

| Ticket | Owner | Scope | Notes |
|---|---|---|---|
| **T-M2-15** | Cesar | M-L | BYOK API + persistence + vault validation. Real code, ~1.5d. |
| **T-M3-22** — Lock CF-COMPLIANCE-MATRIX | Cesar | S | Pydantic + FastAPI surface + SSE event names lock. ~1-2hr doc edit. |
| **T-M3-23** — Resolve Q-13-2 deploy-gate-status | Cesar | S | ~30 min doc edit. Lock option 1+3 combined: Canvas reads latest published policy; deploy-gate uses envelope-named version. |
| **T-M3-30** — Lock warehouse policy DDL ownership Q-14-1 | Cesar | S | Pick (A) Amira renders DDL, customer admin applies vs (B) Amira applies. Doc-only. |
| **T-M3-48** — Resolve Q-13-1 expected-implementation pattern owner | Cesar | S-M | Doc-only, but cross-area with #7 (CapabilityNode shape extension may follow). ~2hr. |
| **T-M4-01** — Q-DEPLOY-4 ACR repo namespace | Cesar | S | Lock `acr.azurecr.io/platform/ac-runner:<version>`. ~30 min. |
| **T-M4-08** — Lock CF-APPROVAL-GATE | Cesar | S | UUID of `approval-signed` audit row IS the signed approval ID carried in handoff envelope. Doc-only. |
| **T-M4-16** — Lock CF-DEPLOY-WORKFLOW | Cesar | S-M | Highest leverage among locks. Freezes `DeployHandoffEnvelope` shape. |
| **T-M4-17** — Q-DEPLOY-1 secret resolution timing | Cesar | S | Lock option (a) mount-time: chart renders ExternalSecret → ESO reconciles → pod mounts. Doc-only. |
| **T-M4-32** — Q-DEPLOY-5 backgroundable deploy modal UX | Cesar | S | Doc-only UX text. |
| **T-M5-01** — Lock CF-COMPANION-REGISTRY | Cesar | S | Pure decision-lock. Field-by-field review of `CompanionAgentManifest`, `CompanionAgentVersionRow`. |
| **T-M5-08** — Lock Elastic endpoint + namespace conventions Q-OBS-1 + Q-OBS-2 | Cesar | S-M | Two coupled decisions; Q-OBS-2 owner question is the real lift (audit-blob vs LLM-trace-store vs new table). |

### Code tickets

| Ticket | Owner | Scope | Notes |
|---|---|---|---|
| **T-M3-09** — Canvas-owned persistence schema + Alembic | Ashwin | L | 8 tables + RLS + repos. ~2-3 days. |
| **T-M3-17** — Skill Catalog skeleton + SQLModel + Alembic | Cesar | M | 6 SQLModel tables + Pydantic bundle. **Top recommended pick — clean, no upstream deps, foundational for T-M3-46/47.** ~1 day. Watch `class` keyword collision (`Field(alias="class")` + `sa_column_kwargs={"name":"class"}`). |
| **T-M5-22** — Shell data loader (frontend) | Cesar | M | Server-component fetch in `app/(app)/layout.tsx`. Replace `lib/mocks/users::CURRENT_USER`. ~1 day. Needs Playwright e2e via MCP. |

---

## Per-area key contracts (sketched from plan)

### Compliance Matrix (plan/13)
**Cross-cutting Pydantic** (sketch from §2.1):
```
RequirementKind = Literal["FR","NFR","AC"]
ImplementedState = Literal["yes","partial","no"]
RequirementStatusValue = Literal["passing","warning","failing"]
EvidenceKind = Literal[
    "component-file","binding-file","skill-version","ac-test-result",
    "policy-file","rls-validation","perf-probe","audit-emission",
]

EvidenceRef { kind, ref, open_target?, detail? }
RequirementStatus { req_id, kind, required, implemented, status, evidence: list[EvidenceRef], detector_confidence: float[0..1], last_evaluated_at, last_evaluated_build_n, last_evaluation_correlation_id }
ComplianceMatrix { project_id, build_n, spec_version, readiness_score (0..100), passing, total, rows: list[RequirementStatus], generated_at, deploy_gate_status: Literal["pass","fail","no-policy"] }
ComplianceMatrixView { matrix, stale, next_scheduled_probe_at? }
```
**5 main tables**: `compliance_requirement_status`, `compliance_evidence`, `compliance_evidence_index`, `compliance_score_history`, `compliance_outbox` + 2 (`compliance_policy`, `compliance_probe_run`). All carry `org_id` for RLS.

**Critical lessons from prep**:
- **Hallucination rejection** is THE differentiating standard #1 commitment for T-M3-50. Every `EvidenceRef.ref` from the LLM judge MUST appear in `static.inspected_paths` ∪ `static.observed_skill_versions` ∪ `{ac_lookup.most_recent_run_id}` — else raise `EvidenceHallucinationError`. No silent strip-and-continue. Mandatory test: `test_evidence_hallucination_rejection.py`.
- Two-tier **Haiku → Sonnet** escalation on `confidence < 0.7` is open per §4.5 — implement or document TODO in PR.
- **Affected-set 16-cap** is a hard bound. If exceeded → schedule full recompute on workflow's idle window. Test the "17 affected" case.
- Q-13-3 (per-org RLS predicate on `compliance_score_history` for federation) **unresolved**.

### Data plane + Federation (plan/14)
**Three-step query flow**: AUTH (typed-Python evaluator over `CallerPrincipal`) → CLASSIFY (warehouse-native RLS via Postgres `CREATE POLICY` / Databricks `ROW FILTER` / Snowflake `ROW ACCESS POLICY`) → REDACT (column-level via `POST /api/v1/data/redaction-hints` returning `RedactionHint{action: pass|mask|drop}`).

**Pydantic** (§2.1, §2.2, §2.5):
```
WarehouseKind = Literal["postgres","databricks-unity-catalog","snowflake","qdl-federation"]
Classification = Literal["public","internal","confidential","restricted"]

DataSource { id, org_id, workspace_id, kind, name, endpoint_ref, catalog?, schema_name?, geography, secret_ref (NEVER value), allowed_role_ids, default_classification, created_at }
CallerPrincipal { org_id, workspace_id, user_id, role_ids, obo_token_ref (v1: per-org cred ref) }
AuthorizationDecision { allowed: bool, reason: Literal["tenant-match","role-denied","classification-denied","source-disabled","obo-failed"], applied_filters, max_classification }
ClassificationLabel { data_source_id, object_name, column_name?, classification, label_source: Literal["manual","warehouse-tag","catalog-sync"] }
RedactionHint { column_name, action: Literal["pass","mask","drop"], reason }

# T-M3-52 federation specifics
FederationSymbolQuery { symbol, from_date?, to_date?, frequency? ∈ daily/weekly/monthly/quarterly }
FederationSeriesPoint { ts, value, classification, provenance }
FederationSeries { symbol, points, source_version }
SymbolMatch { symbol, description, provider, classification, frequency_available }  # NOT in plan — invent for T-M3-52
```

**Critical lessons from prep**:
- **`redaction.py` precedent already shipped** (T-M2-25). Per-Pydantic-field at LLM boundary uses `Tag()` + `x-amira-redact` JSON-schema extra. T-M3-34's column-level redaction-hint API is the **column-level sibling** — same `pass/mask/drop` action vocabulary. Reuse verbatim.
- **`SymbolMatch` shape unspecified** — design freedom for T-M3-52, flag in PR.
- **Q-14-2 classification precedence not yet locked** — T-M3-30 first, then T-M3-34 finalizes.
- **`source_version` on `FederationSeries` has no contract** — flag.

### Companion Agents (plan/12)
**3-stage lifecycle**:
1. **Synthesis (Build/Deploy time)** — 5 Activities: `synthesize_skill_md`, `synthesize_mcp_server_manifest`, `publish_companion_skill_version`, `flip_active_pointer`, `audit_companion_registered`. Builds `CompanionAgentManifest` from `(build-plan.lock, spec_version)`.
2. **Runtime registration (Deploy-time tail)** — embedded MCP router as FastAPI subroute (`/.well-known/amira/mcp`) inside the deployed-app pod (per SIMPLIFY-CMP-1, NOT separate pod).
3. **Per-turn query** — one `CompanionAgentWorkflow` per TURN, not per session (per AGENT-4). Anthropic Agent SDK tool-use loop + structured-output emits.

**`CompanionAgentManifest` shape** (§2.1):
```
CompanionAgentManifest {
    manifest_schema_version: Literal["amira/v1"]
    companion_id: UUID                    # stable across versions
    version: str                          # f"{build_n}.{spec_version_id}"
    app_agent_provenance: AppAgentProvenance
    tools: list[CompanionToolBinding]
    smoke_tests: list[CompanionSmokeTest]
    role_gating: dict[str, list[str]]
    secret_refs: list[str]                # vault keys, NEVER values
    lifecycle_state: Literal["active","deprecated","archived"]
    capability_summary: str
    inherited_capabilities_count: int
}
```

**Permission intersection** (in-process, NOT wire-level OBO): `min(source_app_perms ∩ caller_perms ∩ user_perms)`. Source-app perms from `tools[*].sideEffect` allowlist (deploy-time-resolved skill grants from `build-plan.lock`). On miss, raise typed `McpDenialError` — fail loud per Standard #1.

**~10 audit kinds need T-M5-07 first**: `audit-companion-registered`, `audit-companion-turn-started/completed`, `audit-companion-tool-call`, `audit-companion-write-confirmed/denied`, `audit-companion-permission-denied`, `audit-companion-out-of-scope`, `audit-companion-provenance-reforce`, `audit-companion-call-failed`.

**T-M5-15 is cleanest first pick of our M5 trio** when deps land — pure synthesis logic, no transport concerns, structurally similar to `classifier.py` we shipped. T-M5-16 gated on T-M5-02 posture lock + has stale OBO title to flag. T-M5-17 is the keystone, depends on T-M5-03 + T-M5-16, largest of the three.

### Skills + Deploy + Frontend (plan/10/11)
**Skill Catalog 6 tables** (T-M3-17):
```
SkillClass = Literal["external","platform-authored"]
Lifecycle, SecretMode, SideEffect, Role  # all Literal unions

SQLModel rows: Skill, SkillVersion, SkillRoleGrant, SkillSecretBinding, SkillInstall, SkillReview
```
**Watch the `class` keyword collision** — Pydantic `Field(alias="class")` + SQLModel `sa_column_kwargs={"name":"class"}`. Subtle test breakage if missed (called out in plan/10 §8 T-10-1 subtask).

**Build Plan canonical-JSON discipline** (T-M3-46): sorted keys + no whitespace + UTF-8 NFC + ISO-8601 with `Z`. **`json.dumps(obj, sort_keys=True)` is NOT enough on its own** — doesn't NFC-normalize unicode strings. Build a canonicaliser test that round-trips a graph with non-ASCII + nested timestamps + sub-objects.

**`DeployHandoffEnvelope`** (plan/11 §2.3, T-M4-16 will lock):
```
DeployHandoffEnvelope {
    org_id, project_id, deploy_request_id, approval_id (= approval-signed audit row UUID),
    build_n, build_plan_lock_hash (SHA-256 → CAS),
    image_source_blob_key, env: Literal["dev","uat","prod"],
    audience: Literal["bu-internal","specific-roles","deployment-wide"],
    audience_role_ids?, network_policy_id, resource_profile_id,
    geography: Literal["us","eu","apac"],
    block_on_critical_cve: bool, block_on_compliance_score: int (50..100),
    register_companion: bool
}
```

**Approval gate**: UUID of `approval-signed` audit row IS the signed approval ID carried in `RUNTIME-7` Spec→Build envelope and deploy hand-off envelope. Per CF-APPROVAL-GATE locked at T-M4-08.

**Decision-lock conflict pattern**: Multiple decision-lock PRs all edit `architecture/04-decisions.md` + `architecture/CHANGELOG.md`. If two are open simultaneously, second one will conflict on the same line range. **Recommended posture**: ship one decision-lock at a time, merge before opening next, OR scope each PR's `04-decisions.md` insertion to non-overlapping section so git auto-resolves.

---

## Top 3 most-likely-ready picks (synthesis recommendation)

| Likelihood Cesar gives us | Ticket | Why |
|---|---|---|
| **HIGH** | **T-M3-17** (Skill Catalog skeleton) | Code ticket, zero upstream deps already met, foundational for T-M3-46 + T-M3-47. SQLModel + Alembic + RLS pattern matches T-M3-03's shape. ~1 day. |
| **MEDIUM** | **T-M4-16** (CF-DEPLOY-WORKFLOW lock) | Highest-leverage decision-lock — freezes the `DeployHandoffEnvelope` our M3 deploy-side work integrates against. Doc-only, ~1-2 hours. |
| **MEDIUM** | **T-M2-15** (Per-org BYOK API) | Code ticket, vault-validation + audit row + RLS. Self-contained. ~1.5 days. |

**Less likely picks** (Cesar tends to keep these per his architecture authority): T-M3-22 / T-M3-30 / T-M3-48 (architecture-decision tickets), T-M5-22 (frontend, his comfort zone).

## Path forward when assignment lands

1. Verify deps with `gh issue view <NUM>` + cross-reference with master tip
2. `gh issue edit <NUM> --add-label owner:farzaneh --remove-label owner:cesar` (only with explicit Cesar approval per first-time-flip pattern from T-M3-37)
3. Brainstorm 5 design questions per Superpowers
4. Plan with concrete file layout + types + test names (use `apps/api/src/amira_api/<area>/...` paths, NOT plan-doc paths)
5. TDD red phase (write failing tests first per Standard #5)
6. Implement to green
7. Verify per ticket's verification gate
8. Commit locally on a branch off master (NOT stacked)
9. Push (confirm) → `gh pr create --base master` (confirm) → `gh pr merge <num> --squash --delete-branch` (confirm) per self-merge directive
