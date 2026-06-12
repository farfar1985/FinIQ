---
name: Amira Canonical Architecture Specification (PARTIALLY SUPERSEDED 2026-05-05)
description: Build-ready reference for Amira's locked architecture (Cesar's Session-4 spec, 2026-04-29). PARTIALLY SUPERSEDED by amira-mars repo `architecture/` directory (2026-05-05), which simplified 6 times in `architecture/CHANGELOG.md`. Use for HISTORICAL CONTEXT only; verify current claims against `D:/amira-mars-readonly/architecture/`.
type: project
originSessionId: 20e675b7-ca5e-47f4-b68f-3a4fdff77d61
---

> **⚠️ PARTIALLY SUPERSEDED 2026-05-05.** Cesar shipped a NEW comprehensive plan in repo `quantumdatatechnologies/amira-mars` (separate from the older `amira` repo this memory was originally written about). The `architecture/` directory in the new repo iterated 6 times in `CHANGELOG.md` and simplified the architecture significantly. Headline changes:
>
> - **Two AKS clusters → ONE AKS cluster** (9 namespaces, 5 nodepools)
> - **Kata-Firecracker microVMs → standard AKS pods**
> - **Hash-chained ledger + WORM Merkle anchor + Cohasset/SEC 17a-4(f)/FINRA framing → plain append-only Postgres `audit_log`** (REVOKE UPDATE/DELETE + trigger). Compliance branding dropped entirely.
> - **DBOS → Temporal**
> - **3-tier skill curation + Sigstore + JFrog full pipeline → 2-class skills** (external + platform-authored) + registry-URL config
> - **OPA Rego → typed Python predicates**
> - **Step-up MFA → no MFA in v1, plain OIDC** (Mars Entra MFAs upstream)
> - **Grafana/Loki/Tempo/Mimir → existing Mars Elasticsearch + Fleet-managed Elastic Agents**
> - **PgBouncer → Supavisor**
>
> **Use this memory for HISTORICAL CONTEXT only.** For current build truth, use [project_mars_deployment_plan.md](project_mars_deployment_plan.md) and verify against `D:/amira-mars-readonly/architecture/04-decisions.md` (locked decision IDs, ~73 of them). Below is preserved as-was for provenance.

---

# Amira Canonical Architecture — Build Reference (2026-04-29 snapshot)

**Source files** (canonical, do not edit, treat as authoritative):
- [`Amira_Architecture/05-architecture.html`](../../../../../D:/Amira%20FinIQ/Amira_Architecture/05-architecture.html) — **CURRENT** (Cesar shipped 2026-04-29 afternoon). 4,149 lines, ~2,230 lines of markdown source rendered client-side. Title: "Amira — Platform Architecture." Same 14 prose sections + EXPANDED §0 visual overview (5 sub-sections of Mermaid diagrams). §15 Coverage check REMOVED. Smaller byte footprint (192 KB) because diagrams are now Mermaid (text) + one inline SVG template instead of an embedded base64 PNG. **All Mermaid sources are inspectable.**
- [`Amira_Architecture/amira-architecture_v2.html`](../../../../../D:/Amira%20FinIQ/Amira_Architecture/amira-architecture_v2.html) — earlier version (Cesar shipped 2026-04-29 morning). 3,038-line pre-rendered HTML with embedded base64 image. Kept for diff/provenance; superseded by `05-architecture.html`. Includes the §15 decision-ID coverage map (~50 IDs) which is no longer in the current doc — see §15 of THIS memory for the preserved index.
- [`Amira_Architecture/amira-overview.png`](../../../../../D:/Amira%20FinIQ/Amira_Architecture/amira-overview.png) — executive 1-pager (PNG export). Still relevant; the new HTML references `amira-overview.svg` but contains an inline SVG template fallback.

**Diff between the two HTML versions** (2026-04-29 morning → 2026-04-29 afternoon):
- **Title**: "Canonical Architecture Specification" → "Platform Architecture" (less formal framing).
- **§0 Visual overview EXPANDED** from ~3 sub-sections to 5: new §0.1 "Whole architecture (single-picture view)" with Mermaid mirror of the executive PNG; new §0.4 "Network and ingress topology" showing request travel (DNS → ingress → namespaces → egress with Artifactory allowlist); new §0.5 "Per-component internals" with 4 sub-diagrams covering 0.5.1 Agent runtime session loop, 0.5.2 Audit pipeline write path, 0.5.3 Sandbox CRD lifecycle, 0.5.4 Deploy pipeline (Build → Production). All Mermaid, source-controllable.
- **§15 Coverage check REMOVED** — the decision-ID-to-section map (~50 IDs) is gone from the doc itself. We preserve it in §15 of THIS memory; cite it from there.
- **Prose largely identical** — spot-checks of §1 system overview, §6.1 SDK execution model, §6.10 out-of-scope detection, §7.1-7.7 build/preview, §8.1-8.4 deployment, §13.1 customer-deploy table, §13.3 not-supported, §14.3 verifier-deferred, §14.8 multi-LLM-provider all match word-for-word or near-identical (one minor editorial change in §8.4: "literally AC-1 from the FinIQ spec" → "as an example, a FinIQ spec's `period-end recon ±$0.5M` AC becomes a deploy-gate smoke test of the same shape"; same meaning).
- **No new decisions, no removed decisions, no contradictions.** All four flagged follow-ups remain (§14.8 vs §13.1 LLM provider, §13.3 vs trial commercial, §14.3 verifier+learning loop, AI Foundry as default route).
- **No structural changes to section numbering** for §1-§14.

**Both originals also at** `C:/Users/farza/Desktop/` (do not delete; Cesar may iterate).

**Authority**: Every choice traces to a locked decision ID in Cesar's `/architecture/04-decisions.md`. Cite the decision ID in commits / design discussions when implementing. Choices marked "(default; revisit if constraints change)" are explicit working assumptions, not locks.

**When NOT to apply this**: this is the platform-level architecture. FinIQ as it exists today does NOT yet conform — it pre-dates the platform. Apply when (a) building a new component on the Amira platform, (b) reviewing platform PRs, (c) advising on customer-environment redeploys, (d) writing future spec/design docs that integrate with the platform.

---

## 1. The shape (one paragraph)

Multi-tenant SaaS at `amira.qdt.ai` running on **two AKS clusters in QDT's Azure subscription**. `amira-platform` (control plane: UI, API, agent runtimes, DBOS workflow engine, Postgres-family persistence, Skill Catalog, IdP, OPA, Audit Consumer, Grafana stack). `amira-workloads` (sandboxed customer code: build sandboxes, preview environments, deployed apps, companion-agent MCP servers — all on Kata-Firecracker microVMs via the upstream `agent-sandbox` CRD). Connected via Azure VNet peering. Three persistence substrates: **PostgreSQL (Azure Database for PostgreSQL Flexible Server with pgvector)** for all relational state + vector embeddings + DBOS workflow checkpoints + audit outboxes + hash-chained audit ledger; **Azure Blob Storage** for spec exports + build artifacts + content-addressable build inputs + WORM Merkle anchors; **Azure Key Vault** for skill secrets and platform credentials, surfaced via external-secrets-operator. Identity propagates via OAuth 2.0 OBO (RFC 8693 Token Exchange) with cumulative `act` claim. Hostnames: `amira.qdt.ai` (UI/API/SSE) on platform cluster's nginx ingress, `<appslug>-<orgslug>.apps.amira.qdt.ai` on workloads cluster's nginx ingress (one wildcard cert via DNS-01).

---

## 2. Component inventory — what runs, where, why

### `amira-platform` cluster

| Component | Tech | Owns | Decision |
|---|---|---|---|
| **Platform UI** (`amira.qdt.ai`) | Next.js (App Router) + TypeScript + Tailwind | Home portal, Specifications, Canvas, Skills marketplace, Projects/Artifacts, Settings, Ask Amira (full + drawer), Project Governance, Approval surface, Audit Log | BUILD-1 |
| **Streaming endpoint** (SSE) | Server-Sent Events over HTTP, terminated at nginx | One connection per Build/Spec session; structured narration events (`instruction-received`, `binding-resolved`, `file-written`, `compliance-re-evaluated`, `hot-reload-applied`) | STREAM-1 |
| **Platform API** | FastAPI (Python 3.12+) | REST + SSE entry; auth via session cookie; resolves `(orgId, userId, role)`; sets immutable session attributes on Postgres connections; dispatches to agent runtimes, Skill Catalog, OPA | (default — Python fits Claude Agent SDK + DBOS shape) |
| **Agent runtimes** (Spec / Build / Deploy / Companion drivers) | **Claude Agent SDK** + DBOS workflow checkpointing | Tool-use loop with step-checkpoints; long-lived Python worker pods pulling work from DBOS queues | RUNTIME-1, RUNTIME-2, RUNTIME-6 |
| **DBOS workflow engine** | DBOS Python (library, not separate cluster) | Durable execution of every Spec/Build/Deploy/Companion-register session + continuous-compliance probes; step-checkpoints model calls / file-ops / MCP tool calls into Postgres | RUNTIME-1 |
| **Skill Catalog + MCP Registry** | In-process service inside Platform API; manifests in Postgres; signed bundles + SBOMs in Blob | Stores MCP manifests + Amira overlay (role-gating, source-tier, secret-refs, `sideEffect`-per-tool, signing-key-id, lifecycle-state); resolves per-build catalog into `build-plan.lock`; gates community-tier promotions through curation pipeline | SKILL-1, SKILL-3, SKILL-5, SKILL-2 |
| **Platform IdP** | Auth0 / WorkOS (default working assumption — managed IdP supporting federation + custom OIDC client registration + Token Exchange) | Authenticates platform users; federates from each customer org's IdP (OIDC/SAML/OAuth 2.0); is the OAuth 2.0 authorization server for RFC 8693 token-exchange | IDA-2 |
| **OPA policy engine** | Self-hosted OPA, Rego policies | Retrieval-plane authorization (chunks before LLM context), deploy-gate threshold policies (CVE / dependency-policy / compliance-score), write-action gating against spec capability graph | PERSIST-5, DEPLOY-4, AGENT-GUARD-1 |
| **Audit Consumer** | Single-writer poller using `SELECT FOR UPDATE SKIP LOCKED` | Polls every `<service>_outbox`; writes to hash-chained ledger | ORCH-1, AUDIT-4 |
| **WORM Anchor Job** | Hourly scheduled job | Reads chain tip → computes Merkle root → writes to Azure Blob Immutable Compliance Mode | AUDIT-1 |
| **Grafana / Loki / Tempo / Mimir** | Self-hosted in `observability` namespace | Logs / traces / metrics. OpenTelemetry collector DaemonSet forwards from both clusters. **Azure Monitor / App Insights / Log Analytics rejected on cloud-portability grounds.** | OBS-3 |
| **Reviewer Agent (linter)** | Hybrid rubric + LLM self-assessment + lock override | Spec quality scoring | SPEC-1 |
| **External-secrets-operator** | Sidecar pattern | Pulls Key Vault secrets into pods | (default) |
| **cert-manager + external-dns** | Standard | TLS issuance via Let's Encrypt; DNS records from Ingress objects | (default) |
| **nginx ingress** | Standard | TLS termination at `amira.qdt.ai` | (default) |

### `amira-workloads` cluster

| Component | Tech | Owns |
|---|---|---|
| **`agent-sandbox` CRD + SandboxWarmPool** | Upstream Kubernetes operator | Every Build / Spec / Preview / Repo-import session runs as one pod managed by this CRD. Warm pools for sub-second cold-starts. **`RuntimeClass` = Kata-Firecracker** (hardware-isolated microVMs). Node pools: `Standard_D*s_v5` / `Standard_E*s_v5` (nested-virt-capable). |
| **Argo Rollouts controller** | Standard | BlueGreen deploys with `prePromotionAnalysis` |
| **Buildkit pod** | Standard | Image build inside the cluster. Pulls deps through JFrog Artifactory (only sanctioned source). Pushes to ACR. Each install scanned: Socket (behavioural malware) + Trivy (CVE) + Sigstore cosign (provenance). |
| **Companion-agent MCP servers** | One pod per source app, in `org-<orgId>-app-<appId>-<env>` namespace | Synthesized from spec FRs (as natural-language tool descriptions) + ACs (as smoke tests) at deploy time. Tier `deployment-proprietary`. Pointer flips atomically with traffic. |
| **Deployed customer apps** | Per app's Helm values (1-4 vCPU / 2-8 GB RAM) | Same Kata-Firecracker microVM class as sandboxes; `NetworkPolicy` default-deny + spec-derived egress allowlist |
| **OpenTelemetry collector** | DaemonSet | Forwards to platform's Grafana stack |
| **external-secrets-operator + cert-manager + external-dns + nginx ingress** | Standard | TLS at `*.apps.amira.qdt.ai` |

### Storage substrates (3, by design)

| Substrate | Implementation | What it holds |
|---|---|---|
| **PostgreSQL** | Azure Database for PostgreSQL Flexible Server (single instance v1; logical separation by table; PgBouncer / Supavisor for connection pooling) | All relational state, pgvector embeddings, DBOS workflow tables, per-service `_outbox` tables, hash-chained audit ledger, RLS keyed by `org_id` (+ `workspace_id` predicate for BU scope) |
| **Azure Blob Storage** | S3-compatible interface, two storage accounts (general + Compliance-Mode for WORM) | Spec exports, build artifacts, content-addressable build inputs, signatures, WORM Merkle anchors. Compliance-Mode account has its own locked retention policy independent of general account. |
| **Azure Key Vault** | Standard | Skill secrets (3 modes: `shared-platform`, `per-deployment`, `per-user-OAuth`) + platform credentials. Surfaced via external-secrets-operator sidecar. |

### External SaaS dependencies (7 total)

| Dependency | Role | Notes |
|---|---|---|
| **Anthropic API** | DEFAULT LLM provider — powers all 4 AI agents | Replaceable per-deployment via env-var-toggle adapter (Bedrock / Vertex / Foundry / on-prem). Subscription-OAuth proxy permanently rejected (LLM-6 + Feb 2026 ToS). |
| **Auth0 / WorkOS** | Hosted IdP | Federates to each customer's identity provider |
| **GitHub** | Per-app Git repos | QDT-managed org |
| **JFrog Artifactory** | Vetted mirror for npm + PyPI + container base images | Only sanctioned dep source (BUILD-6) |
| **Sigstore** | Public signing/verification for build provenance | |
| **Let's Encrypt** | TLS certs for platform + app domains | Wildcard via DNS-01; per-domain via HTTP-01 |
| **Namecheap** | Registrar for `qdt.ai` | (Authoritative DNS open: working assumption is Azure DNS for cleaner DNS-01; Namecheap-stays-authoritative is operational, not architectural) |
| **Customer data sources** | Snowflake, Databricks, etc. | Accessed via skills, with OBO authorization |

---

## 3. Three-agent pipeline data flows

### 3.1 Spec → Build → Deploy → Companion (the canonical pipeline)

Sequential-but-reversible. Each phase is its own DBOS workflow. Handoff via durable signal (per ORCH-2). User can return from Canvas to Spec at any time, creating a new spec version and triggering rebuild.

### 3.2 Hand-off envelopes (RUNTIME-7) — the contract

Each hand-off is an audit-emitting envelope. The downstream agent reads ONLY from the envelope; references outside it are rejected.

| Hand-off | Envelope contents | Audit kind |
|---|---|---|
| **Spec → Build** | frozen spec hash, signed approval ID, resolved `build-plan.lock` content hash | `build-handoff` |
| **Build → Deploy** | frozen spec hash, signed approval ID, build N, lockfile hash, image digest | `deploy-handoff` |
| **Deploy → Companion-register** | build N, env, deployment ID, opt-in flag | `companion-handoff` |

**Bare-database-state-machine and approval-ID-only hand-offs are rejected** — they don't bind the resolved build plan to the approval.

### 3.3 Companion agent invocation (Ask Amira)

After Service-selector flip succeeds, the deploy DBOS workflow synthesizes a SKILL.md + MCP server from the resolved Build Plan tools, the spec's FRs (as natural-language tool descriptions), and the spec's ACs (as smoke tests). Publishes a `companion_agent_version` row in the Skill Catalog at tier `deployment-proprietary`. The companion-agent version is locked one-to-one with the build version. The `companion_agent_active_pointer` for the source app flips atomically with the deployed-app traffic switch.

Provisioning is **opt-in at deploy** (deploy modal carries a "register companion agent" toggle). Synthesis is **pure auto for v1**; explicit prompt customization is Phase 2 (per AGENT-1 follow-up + §14.10).

---

## 4. Persistence layer detail

### 4.1 Postgres tables (the system of record)

| Table family | What it holds | Retention | Consistency |
|---|---|---|---|
| `org`, `org_membership`, `user`, `org_idp_federation`, `role`, `role_grant` | Identity + tenancy graph | Lifetime + 90d post-deletion | Strong; RLS by `org_id` |
| `workspace`, `workspace_membership` | BU sub-tenant | Same as org | Strong; RLS + `workspace_id` predicate |
| `project`, `project_governance`, `project_collaborator` | Project records, governance, scope | Lifetime + archival | Strong; RLS |
| `spec_version`, `spec_capability_graph`, `decision_point`, `gap`, `kb_attachment`, `spec_skill_reference` | Living spec doc, structured capability graph (SPEC-DECOMP-1), KB | Lifetime; immutable per version | Strong |
| `approval_request`, `approval_signature` | Approval routing + e-signatures | **7 years (audit-bound)** | Append-only |
| `build`, `build_plan`, `build_plan_skill_binding`, `build_artifact_pointer` | Per-build state; pointers into Blob CAS | Lifetime | Append-only per build |
| `compliance_matrix_row`, `compliance_evidence`, `compliance_score_history` | Per-FR evidence + scores | Lifetime | Mutable with history (continuous re-eval per COMPLY-1) |
| `deploy_run`, `deploy_smoke_result`, `deploy_companion_pin` | Deploy lifecycle + AC-tagged smoke + paired companion-agent version pin | Lifetime | Append-only |
| `skill`, `skill_version`, `skill_role_grant`, `skill_secret_binding`, `skill_signature`, `skill_lifecycle` | Skill catalog + tier-signed manifests | Immutable per version | Append-only per version |
| `companion_agent_version`, `companion_agent_active_pointer` | Companion-agent registry | Lifetime of source app | Append-only versions; pointer flip = rollback primitive |
| `kb_doc`, `kb_chunk` (pgvector), `kb_promotion` | KB attachments; embeddings; per-promotion scope (private/team/org per KB-PROMOTION-1) | Lifetime | Mutable |
| DBOS workflow tables (managed) | Event histories, queues, schedules | Per-workflow + tunable | Strong (DBOS guarantees) |
| Per-service `_outbox` tables | Audit events pending consumption | Until consumed (TTL) | Append-only |

**Retention design rule**: anything labeled "audit-bound" gets 7 years (SEC 17a-4(f) / FINRA 4511(c) / CFTC 1.31(c)).

### 4.2 Vector embeddings — pgvector inside the same Postgres

NOT a separate vector DB. KB chunks (`kb_chunk`) are embedded with pgvector for retrieval. Same RLS rules apply. OPA gates retrieval-plane authorization on chunks BEFORE they reach LLM context (per PERSIST-5 follow-up).

### 4.3 Object storage shape

S3-compatible interface (Azure Blob with the S3 protocol). Two accounts:
- **General** — spec exports, build artifacts, signatures, content-addressable build inputs (CAS).
- **Compliance-Mode** — WORM Merkle anchors. Retention locked. Cannot be overridden by Microsoft support, QDT operators, or anyone (AUDIT-1).

### 4.4 Generated codebase storage

Git repo per app in QDT's GitHub org (BUILD-4). Build artifacts content-addressed in Blob CAS. Phase 2: time-travel UI in Canvas (BUILD-4 follow-up).

### 4.5 Secret modes (3, never confuse them)

| Mode | Resolved how | Use case |
|---|---|---|
| `shared-platform` | One secret value for all callers, from Key Vault via vault sidecar | Platform-wide (e.g., LLM provider key in QDT-hosted) |
| `per-deployment` | Resolved per org, keyed by caller's `org_id` (deployment admins set the value at install time) | Customer-tier credentials (e.g., Mars's QDL token) |
| `per-user-OAuth` | Requires calling user to have completed the skill's OAuth flow; user's stored skill-token is fetched via vault sidecar; first call surfaces "connect <skill>" UX inline | User-bound third-party connectors (e.g., user's Google Workspace token) |

---

## 5. Identity, auth, and authorization

### 5.1 Sign-in
Platform users authenticate against the Platform IdP. The IdP federates from each org's customer IdP at org-onboarding time. JIT user provisioning creates `user` + `org_membership` rows on first login. Sessions are HttpOnly cookies bound to ID token + refresh token. **Step-up MFA required for: deploy, e-signature, secret-binding configuration** (IDA-5). PATs are a strict subset of user capabilities — they cannot sign approvals, read skill secrets, or trigger external writes.

### 5.2 Per-request authz (the access invariant)
```
access = (tenant_match) ∧ (role_grant)
```
These are **independent dimensions** (IDA-2). Single composite enums are rejected. Platform API:
1. Sets immutable session attributes on Postgres connection (`SET LOCAL app.org_id = …`, `app.user_id = …`, with no-rewrite guard per PERSIST-5).
2. Postgres RLS enforces tenancy by `org_id` + optional `workspace_id` predicate for BU scope.
3. OPA evaluates retrieval-plane policy on chunks BEFORE they reach LLM context.

### 5.3 OBO (RFC 8693 Token Exchange) — the wire format for delegation
Every platform agent (Spec / Build / Deploy / Companion) holds its own service identity registered with the Platform IdP. Downstream calls go through OAuth 2.0 OBO. The user's session token is exchanged for a downstream token whose `sub` is the user and whose `act` claim is the agent. **`act` is cumulative for multi-hop delegation, capped at 6 elements** (AUDIT-2). Service-account-with-tenant-cookie permanently rejected (IDA-3).

For long-running agent jobs that outlive the originating session: IdP refresh-token flow. On refresh failure → workflow checkpoints + pauses → user gets re-auth notification → workflow resumes from last checkpoint with fresh OBO token.

### 5.4 Three-field actor model (audit attribution)
Every audit row carries `(userId, agentId, serviceId)` + `causedBy` UUID pointer + `(orgId, projectSeq)` for intra-project ordering. Causation DAG stored as parent-pointer chain in Postgres (UUID column, indexed); traversal via recursive CTE.

### 5.5 Customer-environment IdP federation
When Amira is redeployed into a customer environment (§13), the customer's IdP becomes the Platform IdP for that deployment. **Mars's Entra ID is the reference case**, with Microsoft Entra Agent ID as the standardized OBO-for-agents pattern.

---

## 6. Agent runtime (the heart of the platform)

### 6.1 SDK and execution model
**Claude Agent SDK** as inner tool-use loop, embedded inside a **DBOS workflow** that checkpoints into Postgres. Workflows are decorated Python functions; model calls / tool calls / MCP-server calls are step-checkpointed so a worker crash resumes at the last successful step with replay-correctness.

**Day-one topology: single-agent ReAct loop with tools** (AGENT-TOPO-1). Verifier sub-agent (compliance re-eval running async alongside main loop) added when Compliance Matrix re-eval starves main loop's context budget — measurable trigger, data-driven introduction, NOT day-one.

### 6.2 Per-instruction routing
A small classifier model runs upfront on every chat instruction, parallelized with context assembly. Output: discrete intent label (`edit` / `binding-or-schema` / `out-of-scope`) → dispatches to specialized sub-agent path.

### 6.3 Code-edit modality (Build Agent)
Model emits **search-replace blocks** (or unified diff with elision); deterministic apply does `str.replace(search, replace)` against file's current contents in-process. **Fails fast on no-match or ambiguous-match**. On failure, model gets structured error + re-emits with current file contents in context. Apply-failure rate is an SLI. Aider's published 26% → 59% improvement from emit/apply separation is the on-record reason this shape is locked (RUNTIME-2).

### 6.4 Context and compaction
Claude Agent SDK's default 5-stage compaction pipeline (budget reduction → snip → microcompact → context collapse → auto-compact). Custom per-stage budgets only if dogfood telemetry shows defaults wedge. **Naive truncation and summary-then-resume are rejected.**

### 6.5 Streaming and resumability
SSE from `amira-platform` to user's browser, one connection per session. Structured event schema: `instruction-received`, `binding-resolved`, `file-written`, `compliance-re-evaluated`, `hot-reload-applied`. User pause/resume/cancel use separate REST endpoints. **WebSocket multiplexer + event-sourced read model rejected as v1 over-scope.** Postgres `LISTEN/NOTIFY` on outbox tables enables disconnected→reconnected resume.

### 6.6 Tool calling — every tool is an MCP tool
1. Re-validate calling identity's role intersects bound role; mismatch fails closed (SKILL-2).
2. Look up per-tool `sideEffect` annotation. `read` tools execute without confirmation; `write` and `external-write` tools prompt inline-confirm UX.
3. Acquire OBO token for the call (per AGENT-2 follow-up: **always-runtime token-exchange per call**; sealed capability tokens rejected).
4. Call MCP server.
5. Write per-call audit event to runtime's outbox (kind tied to tool's side effect).

### 6.7 MCP integration
MCP is the wire format for ALL skills (SKILL-1). Skill Catalog stores manifests = MCP standard fields + Amira overlay (`role-gating`, `source-tier`, `secret-refs`, `app-agent-provenance`, `lifecycle-state`, `sideEffect`-per-tool, `signing-key-id`, `manifest-schema-version`). Non-MCP sources (proprietary internal APIs, Anthropic Skills, raw OpenAPI) wrap behind QDT-maintained MCP adapters. Non-immutable-publish MCP servers wrapped: QDT pins content-hash version per fetch + re-publishes under stable Amira-managed version.

**Build Agent code-gen reads resolved MCP endpoint from the lockfile, never from runtime registry lookup.** Drift detected as content-hash mismatch on lockfile.

### 6.8 Cost + concurrency posture
Per-org concurrency limits (one Build Agent session per user at a time within an org; org-level concurrent-user limit configurable per subscription tier). Dynamic model-tier selection inside agent runtime: **Haiku-class for classification / compliance scans / out-of-scope checks; top-class for code-edit + spec elicitation** (COST-CONC-1). Per-org BYOK is the release valve when an org wants to lift platform limits.

LLM caching is hierarchical via Anthropic's `cache_control` blocks (LLM-CACHE-1):
- System prompt + tool catalog cached per session (long TTL)
- Spec doc cached per spec version (invalidated on lock)
- File-tree snapshot cached per build (invalidated on lockfile change)
- Tool-call results cached per `(skill-id, version, args)` tuple

The env-var-toggle adapter preserves identical `cache_control` semantics when migrating to Bedrock / Vertex / Foundry.

### 6.9 Guardrails (5-layer defense-in-depth, AGENT-GUARD-1)
1. Per-tool `sideEffect` annotation (deterministic primary classifier; manifest-validator rejects unannotated tools at catalog gate).
2. OPA gates write actions against spec's capability graph.
3. Runtime egress NetworkPolicy allowlist blocks calls to undeclared hostnames.
4. Inline LLM-judge confirmation for `external-write` actions.
5. Kata-Firecracker per-pod isolation bounds blast radius.

### 6.10 Out-of-scope detection (ORCH-4)
Layered: capability-membership check against spec's capability graph (deterministic) → LLM judge with structured rubric for ambiguous cases the graph can't resolve. All decisions emit audit events distinguishing first-pass blocks from second-pass blocks.

---

## 7. Build & preview infrastructure

| Aspect | Spec |
|---|---|
| **Sandbox primitive** | One pod per session managed by `agent-sandbox` CRD. `RuntimeClass` = Kata-Firecracker (microVMs). **Rejected**: shared-kernel container isolation, external SaaS sandboxes (Vercel Sandbox, E2B, Modal, StackBlitz WebContainers). |
| **Warm pools** | One pool per supported stack. v1 ships ONE pool: **Next.js (App Router) + FastAPI**. Adding a stack costs 1 dev-month (Helm chart + warm-pool template + file-ops adapter + dependency-policy bundle + AC-runner adapter). |
| **File-ops API** | Build Agent NEVER touches sandbox filesystem directly. All mutations through file-ops API endpoint exposed by each sandbox pod. Atomic write→fsync→rename. Framework's file watcher picks up rename → triggers HMR (Turbopack for Next.js, `uvicorn-hmr` for FastAPI). |
| **HMR fallback** | When change can't be HMR'd (large refactor / dependency install / schema change) → dev server restarts; UI shows `rebuilding (full restart)` state distinct from in-place HMR. |
| **Preview hostnames** | `<appslug>-<orgslug>.apps.amira.qdt.ai`. One wildcard cert. nginx ingress in `amira-workloads` terminates. UI surfaces "preview ready" when warm-pool slot allocated AND dev server reports ready. |
| **Console / build log** | Subscribes to structured-event SSE stream (instruction received, binding resolved, file written, compliance re-evaluated, hot-reload latency, apply errors). Streamed via SSE; persisted to Loki. Audit-relevant events flow to ledger via outbox. |
| **Lifecycle** | Sandbox pods claimed from warm pool on session start, returned on session end (or torn down if customized beyond reset), time out after configurable inactivity window. CRD owns lifecycle. Build-session checkpoints + Git two-way sync preserve user work across pod recycles. |
| **Repo-import** | AST-walk + framework-detection heuristics + LLM inference of FRs/NFRs/ACs with provenance back to source files. **Sandboxed-execution probes rejected** (slow + side-effect risk). **CodeQL / Semgrep over-scope for v1.** Non-Next/FastAPI imports are **host-only** — platform runs them but Build Agent's full editing capability degraded. |

---

## 8. Deployment infrastructure

| Aspect | Spec |
|---|---|
| **Orchestration engine** | DBOS (platform-side workflow) + **Helm + Argo Rollouts** (K8s deploy step). **Argo CD intentionally NOT adopted in v1** — DBOS workflow + audit ledger is single source of truth; adding GitOps reconciliation creates a second source of truth. |
| **Per-stack Helm charts** | One chart per supported stack. v1 ships `amira-app-nextjs-fastapi`. Each chart templates: `Rollout` CR, `Service`, `Ingress`, `NetworkPolicy` (default-deny + spec-derived egress allowlist), `ResourceQuota`. |
| **Per-app namespaces** | `org-<orgId>-app-<appId>-<env>` where env ∈ `{dev, uat, prod}`. Helm release history backs v1.0 forward-only rollback. |
| **Image build** | Buildkit pod inside `amira-workloads`. Pulls deps through Artifactory only. Pushes to ACR. Each install scanned: Socket + Trivy + Sigstore cosign. **ACR Tasks rejected** (cloud-portability). **Off-cluster Buildkit-as-a-Service rejected** (no external dep on deploy hot path). |
| **BlueGreen with AC-tagged smoke tests** | `prePromotionAnalysis` runs: (a) **AC-runner** — custom Python runner consuming spec's AC DSL, executing each AC as smoke test against new ReplicaSet (e.g., FinIQ AC-1 `period-end recon ±$0.5M` runs literally as smoke); (b) **k6** for spec-NFR latency probes; (c) **OPA Rego deploy-gate policies** consuming Trivy CVE scan + dependency-policy bundle results + latest compliance-score from Compliance Matrix. Failures block traffic flip + emit AC-tagged audit events. |
| **AC change** | Smoke test regenerated from new AC by default; audit `ac-changed-test-regenerated` emitted. Manual override via PR with audit trail. |
| **Domain provisioning** | Default: wildcard `*.apps.amira.qdt.ai` (cert-manager + Let's Encrypt via DNS-01); external-dns watches Ingress objects. Custom domains opt-in per app (per-domain Ingress, per-domain cert via HTTP-01). |
| **Companion-agent registration** | After Service-selector flip succeeds → deploy DBOS workflow synthesizes SKILL.md + MCP server → publishes `companion_agent_version` row at tier `deployment-proprietary`. Locked one-to-one with build version. `companion_agent_active_pointer` flips atomically with traffic. |
| **Rollback** | **v1.0 forward-only** via `helm rollback <release> <revision>`. UI surface = "redeploy previous build", not "atomic rollback". **v1.5 adds Argo BlueGreen rollback with paired companion-agent version-pin flip atomicity.** Canary-with-progressive-traffic rejected for v1.x (BlueGreen suits AC-driven smoke better). |
| **External API exposure** | Thin sidecar v1. Per-app API tokens via Project Governance. Spec-derived OpenAPI manifest at `https://<appslug>-<orgslug>.apps.amira.qdt.ai/.well-known/openapi.json`. Every external call audit-tagged `external-api`. Audience-RBAC reuses spec's role surface. **No quotas UI / no developer portal / no mTLS / no monetization in v1.** Full API management = Phase 2. |

---

## 9. Event/orchestration architecture

### 9.1 Eventing backbone — Postgres outbox + idempotency-keyed consumer
- Each platform service owns `<service>_outbox` table next to its business tables. **Business writes + outbox writes commit in the SAME Postgres transaction** (atomicity).
- One global Audit Consumer in v1 polls every outbox via `SELECT FOR UPDATE SKIP LOCKED`. Consumer outage delays audit visibility but **never blocks business writes**.
- Per-project monotonic sequence numbers from a Postgres sequence per project (`audit_seq_<projectId>`) at outbox-row insert. Audit ledger rows carry `(orgId, project_seq)` as unique index.
- Cross-table commit-order is NOT preserved at the relay; cross-event ordering uses the `causedBy` causation DAG, NOT WAL order.

**Migration triggers**: WAL-tail when sustained chain-write throughput >1k events/sec for rolling 24h window; per-project chain sharding when sustained throughput approaches ~5k events/sec single-writer ceiling. Cross-region fanout (Kafka / NATS JetStream) deferred until cross-region demand is real.

### 9.2 Three-agent pipeline orchestration
Per-phase DBOS workflows with handoff via durable signal (ORCH-2). Hand-off envelopes (§3.2) are the contract.

### 9.3 Continuous compliance probing
**Hybrid event-triggered + scheduled** (COMPLY-1). Probes run on event signals (skill version change, data-source schema change, deploy completion) for fast feedback, with **6h scheduled timer as backstop**. Probes are AC-tagged k6 jobs running against deployed apps. Failures recompute compliance score + emit audit events.

### 9.4 KB promotion lifecycle
User-initiated, three scope levels: **private → team → org-wide** (KB-PROMOTION-1). Org admins can demote/remove. Cross-org promotion rejected.

### 9.5 Fork lineage
Forked project carries `forkedFromProjectId` lineage edge for audit traversal. Spec content + governance role assignments are inherited; **build / deploy / approvals / KB reset** (FORK-LINEAGE-1).

---

## 10. Observability and audit

### 10.1 Telemetry stack
Self-hosted Grafana stack in `amira-platform` (OBS-3): **Loki for logs, Tempo for traces, Mimir for metrics**. OpenTelemetry collector DaemonSet in both clusters. **Azure Monitor / Application Insights / Log Analytics rejected on cloud-portability grounds.**

LLM-call telemetry: OpenTelemetry middleware emitting spans tagged `(orgId, userId, projectId, agentRole, callType, model, cached-read, cache-write, uncached, latency, status)` (LLM-4). Spans land in Tempo; aggregations build per-org / per-project / per-agent / per-call-type cost + latency views (also surfaced in billing / Settings UI).

### 10.2 Trace store, redaction, audit-bound view
Tool-call results land in Tempo with **content redaction tags applied to PII / RLS-marked rows BEFORE LLM context** (CROSS-6 + LLM-5). LLM sees redacted view; trace store retains full content but engineers see only redacted view by default. **Audit-bound roles can request un-redacted view; the request itself is an audit event.** Trace store retention separate from 7-year audit-ledger window.

### 10.3 SLIs + NFR compliance
Live per-route SLIs from OpenTelemetry spans (P50 / P95 first-token, dashboard load, voice end-to-end, errors per 1k). k6 scheduled probes every 6h for AC-tagged compliance NFR checks.

### 10.4 Audit ledger and immutability
- Hash-chained Postgres ledger: each row stores `prev_hash + row_hash`. Chain is intrinsically serial (one writer).
- Hourly job reads chain tip → computes Merkle root → writes to Azure Blob Immutable Compliance Mode. Anchor digest recorded as next ledger row's hash input.
- 7-year retention enforced by Azure Blob's locked policy. Can be extended, never shortened.
- **Immutability cannot be overridden by Microsoft support, QDT operators, or anyone** (AUDIT-1).
- External regulator audit: hand over ledger export + anchor blob set; chain integrity verifiable end-to-end. **SEC 17a-4(f) / FINRA 4511(c) / CFTC 1.31(c) defensible.**
- **EventStoreDB and distributed-ledger products rejected** as operational overhead with no compliance benefit. **MinIO self-hosted rejected.** **Public anchor publication NOT v1** (revisit only if regulator/customer asks).

### 10.5 Audit kinds — open-ended schema
Mockup seeds 12 representative kinds; production schema is open-ended with per-kind validator registry. **"Twelve" as closed set is a mockup-as-truth trap.** When defining a new audit kind, register a per-kind validator.

### 10.6 Single-action correlation example (the "lock spec for e-signature" thread)
1. Platform API: `userId=user, agentId=null, serviceId=platform-api, kind=spec-lock-requested, causedBy=null`
2. Spec Agent runtime exchanges user's token via OBO: `userId=user, agentId=spec, serviceId=spec-runtime, kind=spec-locked, causedBy=spec-lock-requested`
3. Approval routing: `agentId=null, serviceId=approval-router, kind=approval-routed, causedBy=spec-locked`
4. Approver e-signs: `userId=approver, serviceId=approval-ui, kind=approval-signed, causedBy=approval-routed`
5. Build Agent receives hand-off: `agentId=build, kind=build-handoff, causedBy=approval-signed`
6. ... `build-plan-resolved`, `file-edit`, `deploy-handoff`, etc.

Recursive-CTE traversal of `causedBy` DAG retrieves the full thread. `projectSeq` orders events deterministically within a project. `act`-chain on wire format carries delegation through external systems.

---

## 11. Kubernetes topology

### 11.1 Two clusters, VNet-peered
- `amira-platform`: Platform API + UI, Agent runtime workers, DBOS scheduler/queue runner, Skill Catalog, IdP client, OPA, Audit Consumer, WORM Anchor job, Grafana stack, OTel collector, external-secrets-operator, cert-manager, external-dns, nginx ingress. Terminates `amira.qdt.ai`.
- `amira-workloads`: `agent-sandbox` CRD + warm pools, Argo Rollouts controller, Buildkit pod, deployed customer-app pods, companion-agent MCP-server pods, OTel collector, external-secrets-operator, cert-manager, external-dns, nginx ingress. Terminates `*.apps.amira.qdt.ai`.

**Platform cluster's DBOS workflow drives workloads cluster's Argo Rollouts + `agent-sandbox` resources through workloads cluster's Kubernetes API over the peered network.**

### 11.2 Namespaces
**`amira-platform`**: `platform-system`, `platform-data`, `observability`, `ingress-system`.
**`amira-workloads`**: `sandbox-system`, `sandbox-<sessionId>` (per-session), `org-<orgId>-app-<appId>-<env>` (per-app-per-env), `argo-rollouts`, `image-build`, `ingress-system`.

### 11.3 Per-namespace controls (every `sandbox-*` and `org-*-app-*-<env>`)
- **`NetworkPolicy` default-deny** + explicit egress for: Artifactory, ACR, Key Vault (via external-secrets-operator), Postgres + LLM-adapter endpoints (control-plane-marked services only), spec-derived egress allowlist (CROSS-4 layer 4 — for deployed apps).
- **Pod Security Standards `restricted` profile.**
- **`ResourceQuota`** sized per app's tier + environment.
- **`RuntimeClass` = Kata-Firecracker** for every pod.
- **External-secrets-operator sidecar** for Key Vault-backed secrets.

### 11.4 Tenant isolation enforcement (two planes)
- **Data plane**: Postgres RLS keyed by `org_id` + Snowflake-style immutable session attributes set on every connection (PERSIST-5).
- **Network plane**: namespace-per-org-per-app + NetworkPolicy default-deny in `amira-workloads` (DEPLOY-2).

Cross-environment data leakage blocked twice. For BU boundaries: same RLS engine adds `workspace_id` predicate. For per-customer (dedicated tier): boundary is the deployment itself, not a code path inside one platform.

### 11.5 Resource profiles (default; revisit once dogfood telemetry exists)

| Pod class | vCPU | Memory | Notes |
|---|---|---|---|
| Platform API | 2 | 4 GB | Multiple replicas |
| **Agent runtime worker** | **4** | **8 GB** | **Long-running; per-session memory dominated by Claude Agent SDK context cache** |
| DBOS worker | 2 | 4 GB | Stateless poll/exec |
| Skill Catalog | 2 | 4 GB | Read-mostly |
| Audit Consumer | 1 | 2 GB | Single-writer; backpressure-tolerant |
| Sandbox (Next.js + FastAPI) | 2 | 4 GB | Kata microVM; tunable per pool |
| Deployed app | 1–4 | 2–8 GB | Per app's Helm values |
| Companion MCP | 1 | 2 GB | One per source app |
| Buildkit | 4 | 8 GB | Burst |
| OTel collector | 1 | 2 GB | DaemonSet |

### 11.6 PVs minimized
Postgres is managed (no PV). Loki / Tempo / Mimir use Azure Blob-backed storage where supported; managed-disk PVs for Mimir's local ingester + Tempo's WAL. Sandbox pods ephemeral. Deployed apps stateless except for app-owned data in per-app DB (provisioning model open per PERSIST-1 follow-up).

---

## 12. Local development (production parity)

`make dev` brings up a docker-compose topology that mirrors production component-for-component:

| Service | Local impl | Production equivalent |
|---|---|---|
| Postgres + pgvector | `pgvector/pgvector:pg16` container | Azure Database for PostgreSQL Flexible Server |
| Object storage | MinIO | Azure Blob Storage (S3-compatible) |
| Secret store | Local file-backed shim emulating external-secrets-operator | Azure Key Vault |
| Container registry | Local Docker registry | Azure Container Registry |
| Dependency mirror | Verdaccio (npm) + devpi (PyPI) | JFrog Artifactory |
| Sandbox runtime | **Plain Docker containers (no Kata)** | Kata-Firecracker on AKS |
| Workflow engine | DBOS Python (same package, against local Postgres) | DBOS on managed Postgres |
| Argo Rollouts | Skipped — `helm install` direct | Argo Rollouts on `amira-workloads` |
| Ingress | Caddy (local TLS) | nginx + cert-manager + Let's Encrypt |
| Identity | Local OIDC mock (mock-oauth2-server) | Auth0 / WorkOS / customer IdP |
| LLM provider | Anthropic API direct via `ANTHROPIC_API_KEY` | Anthropic API (or Bedrock / Vertex / Foundry) |
| OTel stack | Grafana single-container dev image | Grafana / Loki / Tempo / Mimir self-hosted |
| Skill scanners | `make scan` on demand | Inline at every install / promotion |

**Mocked locally (and why)**:
- Kata-Firecracker isolation → plain Docker (laptops don't run AKS Pod Sandboxing). **Trade-off: local sandboxes share host kernel; suitable for dev, NEVER for production code execution.**
- Azure Blob Immutable Compliance Mode → MinIO (no immutability lock). Local audit chain still hash-chains; WORM property absent. Immutability tests run only against Azure.
- External IdP federation → mock OIDC server with seeded users + orgs. Federation handshakes exercised in CI integration tests, not local dev.
- Argo Rollouts BlueGreen → `helm install` direct; deploy gating + AC-runner runs but no `prePromotionAnalysis` Service-selector flip. Local "deploy" produces running app at `<app>.localtest.me` (resolves to 127.0.0.1).
- Cross-cluster VNet peering → collapsed: both clusters in same compose network. VNet boundary exercised in CI / staging.
- Skill curation scanners → disabled at install gate; runnable on demand via `make scan`.

`make seed` loads FinIQ + Petcare + governance fixtures (`/lib/mocks/*.ts` is source of truth for shape).

---

## 13. Customer-environment deployment model — `Mars-Amira` pattern

**v1 default = multi-tenant SaaS at `amira.qdt.ai`.** Dedicated customer-installed deployment (e.g., Mars-Amira inside Mars's Azure subscription) is the **enterprise commercial tier** — same code, different deployment configuration — **out of scope for this iteration**, but the platform is built so the redeploy is a configuration change, NOT a fork.

### 13.1 What gets reconfigured per deployment

| Surface | Reconfigured to | Default in QDT-hosted |
|---|---|---|
| **Platform IdP** | Customer's IdP (Mars Entra ID / Okta / etc.) — drives users + roles directly; no federation needed | Auth0 / WorkOS (federates from each customer org's IdP) |
| **LLM provider** | Customer-configured via env-var-toggle adapter — Anthropic direct, Azure OpenAI in customer subscription, AWS Bedrock, Google Vertex, Microsoft AI Foundry, on-prem | Anthropic API direct |
| **Customer data sources** | Customer's data lakes (Mars QDL / QML / Q-* via Skill MCP adapters) | Demo data only |
| **Skill catalog `deployment-proprietary` tier** | **Customer-admin signing key**; customer-published skills (e.g., Mars's QDL/QML skills) | QDT-admin key + QDT release skills |
| **Container registry** | Customer's ACR or equivalent | QDT's ACR |
| **Object storage** | Customer's Azure Blob (or other S3-compatible) in customer subscription | QDT's Azure Blob |
| **Postgres** | Customer's Azure Database for PostgreSQL (or equivalent managed Postgres) | QDT's instance |
| **Secret store** | Customer's Key Vault (with customer's signing chains) | QDT's Key Vault |
| **DNS / hostnames** | Customer-chosen domain (e.g., `amira.mars.com`); per-app subdomain pattern preserved or replaced with per-app sub-path; cert authority configurable (Let's Encrypt or customer internal CA) | `amira.qdt.ai`; `*.apps.amira.qdt.ai` |
| **Dependency mirror** | Customer's curated Artifactory / Nexus | QDT's Artifactory |
| **Observability** | Customer-side Grafana stack (or routed via OpenTelemetry to backend of customer choice) | QDT's self-hosted Grafana |

### 13.2 What stays the same
Two-cluster split, Postgres + pgvector schema, RLS rules, immutable session attribute pattern, hash-chained audit ledger + WORM Merkle anchor pattern, DBOS workflow engine, Claude Agent SDK runtime, MCP skill format with Amira manifest overlay, `agent-sandbox` CRD with Kata-Firecracker + warm pools, Helm + Argo Rollouts BlueGreen deploy with AC-runner + `prePromotionAnalysis`, OBO via RFC 8693, three-field actor + `causedBy` audit attribution, Spec capability graph + Compliance Matrix re-evaluation, **per-tenant config record (MTEN-2) loaded at session start — in single-tenant deployment the config simply has one tenant.**

### 13.3 What is NOT supported
- **License enforcement, feature-gating, tier-based entitlement** — no runtime license-key check, no feature flag tied to license tier, no expiration-triggered read-only mode, no phone-home enforcement. Entitlement is governed contractually. **If AMS lapses, customer keeps a working perpetual build but stops receiving updates.** ⚠️ This is incompatible with Rajiv's 9:34 AM 2026-04-28 "3-month trial → annual contract" framing without contractual-only governance — flag in commercial discussions.
- **Per-user BYOK** — v1 only supports per-org BYOK.
- **Subscription-OAuth proxy for LLMs** — permanently rejected (Anthropic Feb 2026 ToS).
- **Cloud lock-in to Azure** — platform runs on AKS today and remains portable to other K8s flavors with config change. (Avoiding Azure-Monitor / App Insights / Log Analytics is the structural reason observability is Grafana-based.)
- **Local-agent topology** (user runs agent on own machine) — out of scope.

### 13.4 Per-deployment + per-org config record (MTEN-2)
Loaded at session start. Supplies: skills allowlist, governance roles, vocabulary, compliance standards, prompt fragments, audit kinds. Tenant-specific tools install through Skill Catalog's `deployment-proprietary` tier. **Fork-driven customization rejected.**

---

## 14. Open architectural risks (eleven, with triggers to revisit)

| # | Risk | Why safe today | Trigger to revisit |
|---|---|---|---|
| 14.1 | **Single-Postgres concentration** — one Postgres family carries app state, DBOS workflow state, audit outboxes, audit ledger | Azure Flexible Server with geo-redundant backup + PITR; v1 expected concurrency (~200-500 events/sec peak) is order of magnitude under chain-write ceiling | Sustained chain-write >1k events/sec for rolling 24h (WAL-tail migration), or approach to ~5k events/sec (per-project chain sharding). For workflow workload: separate DBOS Postgres from audit Postgres if triple-workload contention surfaces. |
| 14.2 | **Single audit consumer** — outage delays audit visibility for every project | Hash chain is intrinsically serial (one writer). Consumer outage doesn't block business writes; only audit visibility lags. SKIP LOCKED degrades gracefully. | Sustained backpressure or consumer operational fragility. Migration is partition-key-per-consumer, not architectural redesign. |
| 14.3 | **Single-agent ReAct loop without verifier** — Day-one Build Agent shares context with compliance re-eval | Cheaper, fewer moving parts. Compliance Matrix re-eval bounded; published research shows verifier sub-agents help mostly when error rates unacceptable. | Compliance re-eval starves main loop's context budget (measured), or single-agent error rate unacceptable on dogfood metrics. **Same primitive that should capture v0.7 learning-loop signal.** |
| 14.4 | **Forward-only rollback in v1.0** | Helm release history preserved per app; forward-only acceptable when ACs gate every promotion | Customer requirement for atomic rollback, or operational pain from manual companion-agent re-pin. |
| 14.5 | **Public anchor publication NOT implemented** | Cohasset-assessed Azure Blob Compliance Mode meets SEC 17a-4(f) / FINRA 4511(c) / CFTC 1.31(c) without public publication | Regulator or customer specifically asks for public verifiability. |
| 14.6 | **Single greenfield stack (Next.js + FastAPI)** | Lovable-style narrow lock-in is deliberate quality trade. Cost to add a stack is bounded (~1 dev-month). | Paying customer requires different greenfield stack. |
| 14.7 | **Per-user BYOK deferred** | Org-level BYOK matches org-as-tenant model; covers volume-economics use case | Power-user demand for per-user keys, or org-level BYOK proves operationally awkward. |
| 14.8 | **No multi-LLM-provider in v1** | Anthropic models cover Build Agent quality. Adapter shape (env-var-toggle) preserves option without code change. ⚠️ §13.1 LLM provider table says "reconfigurable per deployment" — clarification: per-deployment swap, NOT per-session selection within one deployment. | Customer specifically requires another provider, or model-quality gap on target task. |
| 14.9 | **Dedicated customer-installed deployment is parallel offering** | Same code, different config. Built so redeploy is config change, not fork. | Commercial demand validates dedicated tier. |
| 14.10 | **Companion-agent prompt customization not user-editable in v1** | Synthesis from spec FRs + ACs covers demo + early production cases. Hand-edit creates ownership question about SKILL.md across deploys. | Customer demand for branded / customized companion-agent voice. |
| 14.11 | **Time-travel UI in Canvas deferred** | Build-session checkpoints + Git tags + repo browsing cover recovery | User research surfaces strong demand. |

---

## 15. Decision-ID index (cite when implementing)

When opening a PR, drafting a design doc, or discussing a choice, **cite the decision ID** so the trace lands in the audit log. Source of truth: Cesar's `/architecture/04-decisions.md` (we don't have it; he does). The architecture HTML's §15 maps each decision to where it's reflected.

| ID | Topic | Sections |
|---|---|---|
| **IDA-2** | Tenancy × role independence | §5.2 |
| **IDA-3** | OBO + three-field actor | §5.3, §5.4, §10.5 |
| **IDA-5** | PAT scope | §5.1 |
| **MTEN-1** | Multi-tenant SaaS default | §1, §13, §14.9 |
| **MTEN-2** | Per-org config loaded at session start | §13.4 |
| **PERSIST-1** | Managed Postgres, Azure Blob, S3 interface | §2.3, §4 |
| **PERSIST-2 + AUDIT-1** | Hash-chained Postgres + Azure Blob Compliance Mode + hourly anchor | §10.4, §14.5 |
| **PERSIST-5** | RLS + OPA | §2.2, §4.1, §5.2 |
| **AUDIT-2** | 3-field actor + causedBy + projectSeq + 6-element act-chain | §10.5 |
| **AUDIT-4** | Per-service outbox + central consumer | §9.1 |
| **ORCH-1** | Postgres outbox + SKIP LOCKED + per-project sequence | §9.1 |
| **ORCH-2** | Per-phase DBOS workflows + durable-signal handoff | §9.2 |
| **ORCH-4** | Layered out-of-scope + spec-finalize populator | §6.10 |
| **RUNTIME-1** | DBOS | §2.2, §6.1, §14.1 |
| **RUNTIME-2** | Model-emit + in-process strict-match apply | §6.3 |
| **RUNTIME-3** | Kata-Firecracker on agent-sandbox CRD | §7.1, §11.3 |
| **RUNTIME-4** | Per-instruction routing | §6.2 |
| **RUNTIME-6** | Claude Agent SDK 5-stage compaction default | §6.4 |
| **RUNTIME-7** | Frozen spec hash + signed approval id + lockfile hash hand-off envelope | §9.3 |
| **AGENT-1** | Companion: opt-in, deploy-step synthesis, version coupling, pure auto v1 | §8.7 |
| **AGENT-2** | Always-runtime token exchange | §3.4, §5.4, §6.6 |
| **AGENT-3** | Per-tool sideEffect + strict catalog gate | §6.6 |
| **AGENT-4** | Per-user companion threads | §3.4, §6 |
| **AGENT-TOPO-1** | Single-agent default (verifier deferred) | §6.1, §14.3 |
| **AGENT-GUARD-1** | 5-layer guardrails | §6.9 |
| **SKILL-1** | MCP + manifest fields + non-immutable wrap | §6.7 |
| **SKILL-2** | Compile-time resolver, build-plan.lock, audit-anchored | §6.6, §6.7 |
| **SKILL-3** | 3-tier curation + scanners | §2.2, §2.3 |
| **SKILL-4** | 3-mode secrets + Azure Key Vault | §2.3, §4.5, §5.4 |
| **SKILL-5** | Immutable publish, lifecycle, sunset 180d, opt-in auto-upgrade | §6.7, §4.1 |
| **SPEC-1** | Hybrid rubric + LLM self-assessment + lock override | §2.2 |
| **SPEC-DECOMP-1** | LLM-emits-DSL capability graph | §3.1, §6.10, §8.4 |
| **BUILD-1** | Next.js + FastAPI single greenfield stack v1 | §7.2, §14.6 |
| **BUILD-2** | Preview hostname pattern | §7.4, §8.5 |
| **BUILD-3** | Framework-native HMR + uvicorn-hmr | §7.3 |
| **BUILD-4** | Git + CAS + GitHub + Azure Blob + Phase 2 time-travel | §4.4, §14.11 |
| **BUILD-6** | Mirror + scanners | §2.3, §8.3 |
| **DEPLOY-1 / DEPLOY-2** | Two clusters + namespace-per-app-per-env | §11 |
| **DEPLOY-3** | Helm + Argo Rollouts; Buildkit; no Argo CD | §8 |
| **DEPLOY-4** | Argo AnalysisRun + Trivy + OPA Rego deploy gates | §8.4 |
| **DEPLOY-5** | BlueGreen + paired companion pin; v1.0 forward-only | §8.8, §14.4 |
| **DEPLOY-6** | AC-driven smoke; regenerate on AC change | §8.4 |
| **REVENG-1** | AST + heuristics + LLM, sandboxed, no exec probes, host-only non-Next/FastAPI | §7.7 |
| **API-GATEWAY-1** | Thin sidecar v1; per-app tokens; OpenAPI manifest; audit-tagged | §8.9 |
| **STREAM-1** | SSE | §2.1, §6.5 |
| **OBS-2** | Live SLIs + 6h k6 probes | §10.3 |
| **OBS-3** | Grafana / Loki / Tempo / Mimir self-hosted | §10.1, §10.2 |
| **LLM-2** | Chat + tool-use + streaming + caching with TTL + structured output | §6 (implicit) |
| **LLM-3** | Prompts in-repo, deploy-versioned | §6 (implicit) |
| **LLM-4** | OpenTelemetry per-call telemetry | §10.1 |
| **LLM-5** | PII pre-redaction + vault for secrets + provider-side as belt-and-suspenders | §4.5, §10.2 |
| **LLM-6** | Env-toggle adapter; Anthropic direct default; per-org BYOK; no sub-OAuth | §6.8, §13.1, §14.7, §14.8 |
| **LLM-CACHE-1** | Hierarchical cache_control | §6.8 |
| **COST-CONC-1** | Per-org concurrency + dynamic model-tier | §6.8 |
| **COMPLY-1** | Event-triggered + 6h scheduled probes | §9.4 |
| **COMPLIANCE-EVAL-1** | Static + AC-test + LLM judge hybrid | §3.2, §10 |
| **CROSS-2** | Pluggable adapter pattern + per-vendor connectors into pgvector | §6.7, §13.1 |
| **CROSS-4** | 4-layer references-not-bindings + structured warning | §6.9, §11.3 |
| **CROSS-6** | Audit/trace split + redaction policy | §10.2 |
| **KB-PROMOTION-1** | Private → team → org-wide; user-initiated | §9.5 |
| **FORK-LINEAGE-1** | forkedFromProjectId edge; build/deploy/approvals/KB reset | §9.6 |
| **LOCAL-3** | DBOS step-checkpoint replay across upgrade | §6.1 |

---

## 16. Build benchmarks — what "good" looks like by component

When assigned to build any platform component, hold work against these:

### Spec Agent (Phase 1, mostly shipping on PR #1 today)
- Conversational elicitation produces a `spec_version` + `spec_capability_graph` + `decision_point` + `gap` + `kb_attachment` + `spec_skill_reference` row set in Postgres
- Output is data, not document — IEEE 830 / OpenSpec / Word / PDF are render targets via adapter
- `lock` action freezes the spec hash and routes to approval workflow with optional e-signature
- Self-check covers AC-1..AC-7 + AC-10 (current PR #1 §1.4 coverage); AC-8/9 are post-build
- 12 MCP-wired tools per phase 1.4: `update_spec_section`, `flag_gap`, `resolve_gap`, `record_assumption`, `add_open_question`, `list_available_skills`, `attach_skill_reference`, `read_kb_file`, `list_attached_uploads`, `run_self_check`, `render_markdown`, `lock_spec`
- All tools are `@tool` + `create_sdk_mcp_server` (in-process MCP); no stub tools

### Build Agent (Phase 2, planned)
- Reads ONLY from Spec → Build envelope (frozen spec hash + signed approval ID + `build-plan.lock` content hash)
- Resolves skills at compile time into `build-plan.lock`; lockfile is the audit-evidence handle for every build
- Code-edit modality: search-replace blocks → deterministic `str.replace` apply with fail-fast on no-match/ambiguous-match
- File-ops API is the single seam to the sandbox filesystem
- All sandboxes are `agent-sandbox` CRD pods with `RuntimeClass = Kata-Firecracker`
- Compliance Matrix re-evaluates on event signals + 6h scheduled timer; failures emit AC-tagged audit events
- Latency target: per-route SLIs from OpenTelemetry — first-token P50/P95, dashboard load, errors per 1k

### Deploy Agent (Phase 3, planned)
- Reads ONLY from Build → Deploy envelope (frozen spec hash + signed approval ID + build N + lockfile hash + image digest)
- Uses `amira-app-nextjs-fastapi` Helm chart (v1 only stack)
- Argo Rollouts BlueGreen with `prePromotionAnalysis`: AC-runner runs each AC as smoke + k6 NFR probes + OPA Rego deploy-gates on Trivy CVE + dependency-policy + compliance-score
- Service-selector flip is atomic; failure aborts and keeps previous active
- Rollback v1.0: forward-only (`helm rollback <release> <revision>`); v1.5: BlueGreen rollback with paired companion-agent version-pin flip atomicity
- After flip succeeds: synthesize companion SKILL.md + MCP server + register `companion_agent_version` at tier `deployment-proprietary`; flip `companion_agent_active_pointer` atomically with traffic
- `prePromotionAnalysis` audit kinds: `ac-changed-test-regenerated`, deploy-gate failures with failing rule

### Companion Agent (Phase 4)
- Synthesized from spec FRs (NL tool descriptions) + ACs (smoke tests) + resolved Build Plan tools
- Tier `deployment-proprietary`; signed with deployment-tier signing key
- Inherits source app's permissions and audit boundary
- Per-user companion threads (AGENT-4)
- Pure auto for v1 (no user-editable prompts; AGENT-1 follow-up)

### Skills (any tier)
- MCP server with Amira manifest overlay (`role-gating`, `source-tier`, `secret-refs`, `app-agent-provenance`, `lifecycle-state`, `sideEffect`-per-tool, `signing-key-id`, `manifest-schema-version`)
- Each tool has `sideEffect`: `read` (no confirmation), `write` (inline confirm), `external-write` (LLM-judge confirm + audit kind tied to side effect)
- Manifest-validator rejects unannotated tools at catalog gate
- Curation pipeline: Socket (behavioural malware) + Snyk (CVE) + custom prompt-injection scanner + Kata-Firecracker dry-run
- Three secret modes: `shared-platform` / `per-deployment` / `per-user-OAuth`
- Three tiers: platform-curated / community / deployment-proprietary
- Immutable publish per version; sunset 180d + opt-in auto-upgrade

### Observability hooks (any component)
- OTel spans tagged `(orgId, userId, projectId, agentRole, callType, model, cached-read, cache-write, uncached, latency, status)` for LLM calls
- Logs to Loki, traces to Tempo, metrics to Mimir
- PII / RLS-marked content redacted BEFORE LLM context (CROSS-6 + LLM-5)
- Audit-bound roles can request un-redacted view; the request is itself an audit event
- Per-route SLIs: P50/P95 first-token, dashboard load, voice end-to-end, errors per 1k

### Audit hooks (any component)
- Business writes + outbox writes commit in same Postgres transaction
- Outbox row carries `(orgId, projectSeq, three-field-actor, causedBy, kind, payload)`
- Per-kind validator registered at component-startup time (audit kinds are open-ended)
- `causedBy` UUID points to upstream audit row; recursive-CTE traversal retrieves the thread
- `act`-chain on wire format carries delegation through external systems (max 6 elements)

### Authorization hooks (any platform service)
- Set immutable session attributes on Postgres connection: `SET LOCAL app.org_id = …`, `app.user_id = …` with no-rewrite guard
- Postgres RLS does the tenancy enforcement — code does NOT do `WHERE org_id = ?`
- OPA evaluates retrieval-plane policy on chunks BEFORE they reach LLM context
- All downstream calls go through OBO via RFC 8693 — service-account-with-tenant-cookie permanently rejected
- `access = (tenant_match) ∧ (role_grant)` — independent dimensions, no composite enums

---

## 17. Mapping back to FinIQ today

FinIQ as it exists today (commit `c84b2ce` on `main` of `quantumdatatechnologies/fin_iq`) **pre-dates the platform** and does NOT yet conform. When we eventually port FinIQ to be the first platform-native customer app, the gaps:

| FinIQ today | Platform expectation | Notes |
|---|---|---|
| Next.js monolith with localStorage-only state | App generated by Build Agent; state in app's per-app Postgres | Per-app DB provisioning open per PERSIST-1 follow-up |
| Voice-server proxy as separate Azure web app | Service inside same app pod or separate pod in `org-<orgId>-app-<appId>-<env>` namespace | Companion-agent MCP server is a related but distinct primitive |
| OpenAI primary (`gpt-5.4-mini` + Realtime) | Anthropic primary via Claude Agent SDK; OpenAI is Phase 2 multi-LLM | LLM-6 + 14.8 |
| Direct PAT to Databricks via Azure Key Vault MI | Skill at tier `deployment-proprietary`; OBO from user; `per-deployment` secret mode | Cesar's `finiq-data-agent` semantic-layer YAMLs become the skill's data layer |
| QML / FMP fetched from inside the app | Skills at tier `deployment-proprietary`; reused across apps | This is the "every shipped app becomes a skill" framing on Slide 12/17 |
| Reference-data cache (`src/lib/reference-data.ts`) | Drift-detection agent at platform layer (the proposal from 2026-04-22) | Same primitive Cesar drove; aligns with platform-level governance |
| Auth.js v5 with Azure AD MI | Customer's IdP federated via Platform IdP (or for Mars-Amira: Mars Entra ID directly) | §5.5 |
| No audit ledger | Hash-chained ledger + WORM Merkle anchor | Becomes table-stakes when ported |
| No spec capability graph | `spec_capability_graph` populated by Spec Agent at lock | OPA gates write actions against it |
| No compliance matrix in production | `compliance_matrix_row` continuously re-evaluated on event + 6h scheduled | Our 67.5/80 work becomes platform-native |

The FinIQ port is NOT urgent — Mars accepted Phase 2 on 2026-04-28; the likely sequence is:
1. Dogfood Amira ourselves (Cesar onboarding Farzaneh today)
2. Ship next QDT-internal app on the platform to validate the build path
3. Port FinIQ as a second app (or rebuild it spec-first)
4. Eventually: Mars-Amira deployment (dedicated tier per §13)

---

## 18. Three things flagged back to Cesar (open follow-ups from 2026-04-29 review)

1. **§14.8 vs §13.1 LLM provider** — clarification footnote: per-deployment swap, not per-session selection within one deployment.
2. **§13.3 "no license enforcement"** vs Rajiv's 9:34 AM 2026-04-28 "3-month trial → annual contract" — flag in commercial discussions; trial governance is purely contractual without runtime enforcement.
3. **§14.3 verifier deferred** — connect to v0.7 SPEC_AGENT_DESIGN.md §11 learning loop. Same primitive when added; should capture rule extraction from user edits as double-duty.

---

## 17a. New visual overview (added 2026-04-29 afternoon, source: `05-architecture.html` §0)

The current spec's §0 has 5 inspectable Mermaid diagrams that the morning version lacked. Treat these as the canonical visual contract — when implementing components, the data flows below define what connects to what.

### 0.1 Whole architecture — single-picture view
- **Users** → `Platform UI + API` → branches to: Spec/Build/Deploy/Companion Agents → PostgreSQL+pgvector + WORM-anchored audit chain + Skill Catalog (MCP) + OPA + Grafana stack
- Agents → Anthropic API (model calls) + GitHub (two-way sync) + Customer data sources (OBO)
- Agents → file-ops API → Sandbox pods (Kata-Firecracker) — workloads cluster
- Agents → helm + kubectl → Argo Rollouts → Deployed customer apps + Companion MCP servers (Kata-Firecracker) — workloads cluster
- Sandbox + Apps → Artifactory (npm + PyPI mirror) for installs
- Apps → Customer data sources (OBO)
- All audit ledger rows → hourly Merkle anchor → Azure Blob Compliance Mode WORM
- Skill Catalog + Apps + Sandbox → Azure Key Vault (via external-secrets-operator)
- Both clusters → observability stack

### 0.2 Azure resource inventory (procurement view) — what to provision
- **Resource Group `amira-network`**: Azure VNet + peering + per-cluster subnets; Azure DNS zone (or NS-delegated from Namecheap) for `amira.qdt.ai` + `*.apps.amira.qdt.ai`
- **Resource Group `amira-platform`**: AKS cluster `amira-platform` (4 node pools: system 3× B-series, platform-svc D-series, runtime D-series larger, observability D-series); Azure DB for PostgreSQL Flexible Server + pgvector + geo-redundant backup; Azure Key Vault; Azure Container Registry
- **Resource Group `amira-workloads`**: AKS cluster `amira-workloads` with **Pod Sandboxing ON** (4 node pools: system 3× B-series, sandbox Ds-v5 nested-virt, workload Ds-v5 nested-virt, buildkit D-series burstable)
- **Resource Group `amira-storage`**: Azure Blob Storage account (containers: `specs`, `artifacts`, `cas`, `lockfiles`, `signatures`, `skill-bundles`); separate Compliance-Mode container for `audit-anchors` (7yr immutable, locked policy)
- **External SaaS**: Namecheap (registrar), GitHub (per-app repos), JFrog Artifactory (mirror), Anthropic API, Hosted IdP (Auth0 or WorkOS — and now Clerk per verbal addition), Sigstore (verification), Let's Encrypt (cert issuance)

### 0.3 Layered logical architecture — 8-layer stack
- L1 **Presentation**: Next.js Platform UI + Ask Amira drawer/`/chat`
- L2 **API + streaming**: FastAPI Platform API + SSE endpoint
- L3 **Agent runtime**: Spec / Build / Deploy + Companion drivers + Per-instruction classifier (edit/binding/OOS) + Reviewer Agent linter + LLM adapter (env-toggle)
- L4 **Skill + policy + identity**: Skill Catalog + MCP Registry + OPA + Platform IdP (OIDC/SAML/OBO via RFC 8693)
- L5 **Workflow + audit**: DBOS workflow engine + per-service outboxes + single-writer Audit Consumer + hash-chained ledger + hourly WORM anchor
- L6 **Data plane**: Postgres+pgvector + Azure Blob (specs/artifacts/cas/lockfiles/anchors) + Key Vault
- L7 **Workload plane** (`amira-workloads` cluster): Sandbox pods + Deployed apps `org-{orgId}-app-{appId}-{env}` + Companion MCP servers + Argo Rollouts + Buildkit
- L8 **External**: Anthropic / Bedrock / Vertex / Foundry; GitHub; Artifactory; Sigstore + LE

### 0.4 Network and ingress topology — how a request travels
- **Browser at `amira.qdt.ai`** → DNS (Azure DNS or NS-delegated) → nginx ingress on platform cluster (cert: Let's Encrypt HTTP-01)
- **End user at `*.apps.amira.qdt.ai`** (or custom domain) → DNS → nginx ingress on workloads cluster (wildcard via DNS-01 + per-domain via HTTP-01)
- **External API consumer** (audience-RBAC, per-app token) → workloads ingress
- **Platform cluster namespaces**: `platform-system` (Platform API, Agent runtimes, Skill Catalog, OPA, IdP integration); `platform-data` (Audit Consumer, WORM Anchor, DBOS workers, external-secrets); `observability` (Grafana/Loki/Tempo/Mimir/OTel)
- **Workloads cluster namespaces**: `sandbox-{sessionId}` short-lived Kata-Firecracker pods (NetworkPolicy default-deny + allowlist: Artifactory, KV, ACR, platform API); `org-{orgId}-app-{appId}-{env}` Kata-Firecracker pods (default-deny + spec-derived egress allowlist); `argo-rollouts`; `image-build` (Buildkit); `sandbox-system` (CRD controller + warm-pool managers)
- **Platform → Workloads** over VNet peering: kubectl + helm to `sandbox-system` + `argo-rollouts`; OBO call to `org-*-app-*-*`; file-ops API to `sandbox-{sessionId}`
- **Egress**: public-registry hostnames (npmjs.org, pypi.org) blocked at cluster egress; all installs route through Artifactory. Each deployed app's NetworkPolicy allowlist rendered from spec's resolved skill set (CROSS-4 layer 4) — only declared hostnames reachable.

### 0.5 Per-component internals — four diagrams a reader needs to picture inside the box

**0.5.1 Agent runtime (single agent session)**:
- User instruction → Platform API → Classifier model (edit/binding/OOS) — parallelized with Context assembly (spec, file tree, skill catalog, cached blocks)
- Both feed Claude Agent SDK tool-use loop:
  - Step: model call → emit search-replace blocks
  - Apply: file-ops strict-match `str.replace`, retry on no-match
  - Tool: MCP tool call (skill server) — OBO token issued
  - Compact: 5-stage compaction (budget · snip · microcompact · collapse · auto-compact)
- Apply → write+fsync+rename → Sandbox pod filesystem → framework HMR (Turbopack / uvicorn-hmr)
- Tool → OBO token → Skill MCP server
- Loop emits: DBOS step checkpoint → PostgreSQL; SSE narration → user browser; Audit outbox row (causedBy = parent step)

**0.5.2 Audit pipeline (write path)**:
- Each service (Spec runtime, Build runtime, Approval, etc.) writes business + outbox row in **same Postgres TX** (atomicity)
- Audit Consumer polls every outbox: `SELECT FOR UPDATE SKIP LOCKED` (single-writer)
- Per-kind validator (presence rules: userId / agentId / serviceId)
- Hash row: `row_hash = H(prev_hash ‖ payload)`
- Append to `audit_ledger` (monthly partitions; idx `(orgId, projectSeq)` + idx `causedBy`)
- Hourly: WORM Anchor Job (DBOS scheduled) reads chain tip → computes Merkle root → writes to Azure Blob Compliance Mode (7yr locked) → anchor digest fed back as next chain row's hash input

**0.5.3 Sandbox CRD (build / preview session)**:
- Session start → SandboxClaim CR (agent-sandbox CRD) → SandboxWarmPool (pre-baked Next.js + FastAPI pods, sub-1s cold-start) → Sandbox pod
- Pod: `RuntimeClass = Kata-Firecracker` (KVM microVM, per-pod kernel) + NetworkPolicy default-deny + allowlist
- Pod exposes file-ops API endpoint (write/replace/delete/read)
- Build Agent loop → write+fsync+atomic rename → file-ops API → pod filesystem → framework file watcher (Turbopack / uvicorn-hmr) → HMR rebuild + reload
- Pod → Preview Service `{appslug}-{orgslug}.apps.amira.qdt.ai`
- Pod → npm/pip install → Artifactory + Socket + Trivy + cosign
- Pod ↔ GitHub repo two-way sync (branch=spec-version, tag=build)

**0.5.4 Deploy pipeline (Build → Production)**:
- Build → Deploy hand-off envelope (specHash · approvalId · lockHash · buildN) → Deploy DBOS workflow
- Workflow renders Helm values (image tag · hostname · NetPol · ResourceQuota · skill-binding ConfigMaps · secret refs) IN PARALLEL with Buildkit pod (deps via Artifactory + Socket + Trivy + cosign on every install)
- Buildkit → ACR (image push)
- Render → `helm upgrade --install` → workloads K8s API → Rollout CR (BlueGreen)
- Rollout CR → Argo Rollouts controller → Preview ReplicaSet (new version, no traffic)
- Preview → `prePromotionAnalysis` AnalysisTemplate runs:
  - AC-runner (spec ACs as smoke tests, per DEPLOY-6)
  - k6 NFR latency probes
  - OPA Rego deploy-gate policies (Trivy CVE + dependency-policy bundle + compliance-score from Compliance Matrix)
- Pass → Service-selector flips → traffic to new ReplicaSet
- Concurrent: synthesize companion SKILL.md + MCP server → register `companion_agent_version` at tier `deployment-proprietary` → flip `companion_agent_active_pointer` atomically

These five Mermaid diagrams are the visual contract for what we're implementing. When working on any component, locate it in the relevant diagram first — it will tell you what it talks to and via which mechanism (file-ops API vs MCP tool vs Helm vs OBO vs SSE).

---

## 18a. Verbal clarifications from Cesar's 2026-04-29 architecture walkthrough call

Same-day team call after Cesar shipped the spec. Ale + Farzaneh + Cesar. Notes captured by Farzaneh; auto-transcription artifacts silently corrected. Treat these as supplements to the written spec — when written spec and verbal clarification disagree, written spec wins for low-level mechanics; verbal wins for sequencing / commercial nuance.

### Build sequencing + timeline (Cesar's commitments)

| Item | Cesar's commitment |
|---|---|
| **First sprint** | **Specification workflows — about one week of dedicated work.** High-priority feature. User types an idea → iterates with AI → locks in spec. |
| **After spec workflow** | **Deployment piece** — currently the main element missing from the app. Initial setup + deployment + one round of workflows = the foundation. Subsequent issues easier because the diagrams are clear. |
| **Full working version** | About **one month** for the cool, running version with all intended features. Leverages AI to simplify foundations. |
| **Mars expectation** | Update in **3–4 weeks** (~2026-05-19 to 2026-05-26 from this call). Show entire platform as something Mars can use to build internal projects. |
| **MVP demo loop** (Ale articulated, Cesar agreed) | User specifies app idea (e.g., mini weather app) → system generates code → deploys v1.0 → sends link to deployed app. **One-click from spec to deployed.** |
| **Repo update** | Cesar will update repo with current progress. We wait, then resume on the mockup. |

### Architecture methodology (how Cesar locked decisions)

Same approach we used for SPEC_AGENT_DESIGN.md, validated:
1. Built mockup of features
2. Ran through multiple agents that flagged important questions
3. Deep research with agents on specific features
4. Pulled patterns from **Replit and Lovable** (sandbox/preview decisions came from there)
5. Locked decisions traceable to `/architecture/04-decisions.md` (~50 IDs in the §15 coverage check)

### Spec-section clarifications (verbal supplements)

| Spec section | Verbal clarification | Action |
|---|---|---|
| **§13 (customer-deploy)** | Internal QDT use deploys FIRST with **unrestricted resources + network policies** — build + get comfortable with desired state, THEN layer Mars's constraints. Mars = encrypted object storage + pre-configured policies. QDT internal = private object storage. **Internal-first is deliberate**: don't constrain ourselves while building. | When working on internal QDT deploy: don't apply Mars-grade NetworkPolicy / RLS aggressiveness from day one. Apply Cesar's "build first, restrict later" pattern. |
| **§11.1 (two-cluster split)** | Reaffirmed verbatim: separate logical clusters / namespaces for platform functioning vs user workloads (sandbox/preview). Isolation + separation of concerns is the explicit principle. | None — confirms written spec. |
| **§13.1 LLM provider table** | **NEW NUANCE**: For Mars, AI Foundry preferred (commercial license + MS Azure servers handle token usage + costs). **For QDT internal, Cesar is considering routing Anthropic calls through AI Foundry too** (not just Anthropic direct), OR alternatives: OpenAI / DeepSeek / Grok / Gemini. **Possible operational divergence from §14.8 written spec which says "Anthropic API direct" as v1 default.** | **CONFIRM with Cesar before any LLM-adapter wiring.** Could be that Anthropic direct is dev-time / day-one and AI Foundry is operational target sooner than spec implies. Add to follow-up list. |
| **§5 (IdP)** | **Clerk added as third option** alongside Auth0 / WorkOS. Spec listed only first two. | Update IdP candidate list when working on §5 / §13.1 IdP row. |
| **§8 (deploy)** | Cesar's verbal description matches §8.1 verbatim: deploy NOT part of Kubernetes; user action → worker → grab code from GitHub → install refs (PyPI/npm) → Helm install in pods/services/ingress. DBOS drives, Helm + Argo Rollouts executes. | None — confirms written spec. |
| **§13.1 customer data sources** | Reaffirmed: Snowflake / Databricks integrate as skill MCP adapters at tier `deployment-proprietary`. Spec already covers this; verbal confirms. | None. |
| **UX detail** | Design intended responsive; works on iPad. Not in written spec. | Note for any frontend work — test iPad viewport. |
| **Redundancy / backup** | Ale flagged for later: replication different region, backup procedures. Spec covers in §14.1 (geo-redundant backup + PITR) + §11.6 (PV minimization). | None — operational follow-up, not architectural. |

### Object storage encryption — the Ale exchange

Ale's concern: data in object storage could be accessible by an Azure admin (proprietary data exposure). Cesar's commitments:
- **For Mars**: object storage **encrypted + pre-configured with policies** (the WORM Compliance-Mode account in §10.4 + Key Vault-managed CMK encryption is the realization)
- **For QDT internal**: private object storage with separate logical clusters / namespaces

Maps to written spec §4.3 (two storage accounts: general + Compliance-Mode for WORM) and §11.1 (two-cluster split). Ale's concern is satisfied by the namespace-per-org-per-app + NetworkPolicy default-deny + Key Vault separation in §11.3.

### What's missing TODAY in the platform (per Cesar + Ale agreement)

Ale: *"the deployment piece is the main element missing from the app's development."* Cesar agreed.

This maps to PR #1's batch progress: phases 1.0–1.5 done, 1.6 in progress (Lock + handoff Artifact contract), then **batches 2 + 3 are the deployment work** (Canvas IDE rebuild + E2B → Kata-Firecracker sandboxes + Deployment Agent + K8s preview infra). Cesar's "1 week spec workflow + then deployment + 1 month total" timeline implies:
- Week 1: finish 1.6 + open spec workflow path end-to-end
- Weeks 2–3: batch 2 (Canvas IDE, sandbox primitive, file-ops API, HMR)
- Weeks 3–4: batch 3 (Helm + Argo Rollouts BlueGreen, AC-runner, companion-agent registration, domain provisioning)
- End of month: full working version including the one-click "spec → deployed app" demo loop

### Updated "three things to flag back to Cesar" (now four)

| # | Topic | Origin |
|---|---|---|
| 1 | §14.8 vs §13.1 LLM provider — per-deployment swap vs per-session selection | 2026-04-29 morning architecture review |
| 2 | §13.3 "no license enforcement" vs Rajiv's 3-month-trial commercial framing | 2026-04-29 morning architecture review |
| 3 | §14.3 verifier-deferred — connect to v0.7 SPEC_AGENT_DESIGN §11 learning loop | 2026-04-29 morning architecture review |
| 4 | **NEW** — AI Foundry as default LLM route for QDT internal too (not just Mars) — written spec §14.8 says Anthropic direct, Cesar's verbal suggests Foundry sooner | 2026-04-29 architecture call |

Raise when Cesar drives, not unprompted. Per Farzaneh's standing rule.

---

## 19. Where this doc fits vs other artifacts

| Doc | Role | Status |
|---|---|---|
| `Amira_Architecture/amira-architecture_v2.html` (Cesar's) | Canonical authority on platform architecture | LOCKED (this is the spec) |
| `Amira_Architecture/amira-overview.png` (Cesar's) | Executive 1-pager for client/Mars audience | LOCKED |
| `SPEC_AGENT_DESIGN.md` v0.6 (ours) | Design doc for Spec Agent (Component #1) | Needs v0.7 update — see deltas in `project_spec_agent_design_doc.md` |
| `AMIRA_PITCH_DECK.md` + `.docx` (ours) | Pitch deck for Mars proposal | Sent to Rajiv 2026-04-27 |
| `Amira_Proposal_for_Mars_2026-04-28_FINAL_*.docx` (Rajiv's polished + Cesar's screenshots) | Mars-facing commercial proposal | Sent to Rajiv 2026-04-28 morning |
| `AMIRA_PLATFORM_VISION.md` (ours, Apr 15) | Strategy / spec process / OpenSpec mapping / Mini-App walkthrough | Partially stale — 4-stage model superseded by 3-agent lock; build-history narrative + ROI framing still useful |
| **This memory** | Build-ready reference distilled from Cesar's spec | LIVE — update when Cesar revs the spec |
