---
name: Mars Deployment Architecture lock — binding constraints for all amira-mars code from 2026-05-08 onward
description: Cesar published the Mars Deployment Architecture on 2026-05-08 EOD. Locks PydanticAI as agent runtime (NOT Anthropic SDK), Mars AI Foundry as the LLM endpoint (OpenAI/Gemini, NEVER Anthropic models), Mars Okta as IdP, Mars Azure Repos for per-app code, Workload Identity federation for Databricks (NO long-lived PATs), zero public-internet path, Mars-Azure-US-East geography lock, and a fixed compliance pin set. All future code in `apps/api/` must align with these.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
Any code I write or modify in `D:/amira-mars/` from 2026-05-08 onward MUST follow these constraints.

**Source documents** (saved at `C:/Users/farza/Downloads/`):
- `05-mars-architecture.html` — full Mars Deployment Architecture spec, 12 sections + 5 §0 visual diagrams
- `STAKEHOLDER_ROADMAP.html` — 7-phase roadmap with per-phase Mars-side prerequisites + exit criteria, plus the §10 changelog noting the 2026-05-08 plan changes

## LLM layer

- **Agent runtime is PydanticAI**, not Claude Agent SDK / Anthropic SDK. Every agent (Spec / Build / Deploy / Companion driver, plus the per-instruction classifier and the Reviewer Agent) is a `pydantic_ai.Agent` instance running inside a Temporal workflow worker on the `runtime` nodepool.
- **Provider is Mars AI Foundry's OpenAI-compatible endpoint** via PydanticAI's `OpenAIProvider`. The canonical pattern (per arch §6.1):

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

foundry_provider = OpenAIProvider(
    base_url=settings.foundry_endpoint,   # https://mars-foundry.<region>.privatelink.openai.azure.com/
    api_key=settings.foundry_api_key,     # mounted from Mars Key Vault via CSI driver
)
agent = Agent(
    model=OpenAIModel(settings.foundry_model_deployment, provider=foundry_provider),
    system_prompt=...,
    tools=[...],
    output_type=PydanticModel,            # structured output enforced
)
```

- **Models**: OpenAI GPT-5.x family or Gemini family. **NEVER `claude-*` models** — Anthropic blocked by Mars policy.
- **Structured output**: PydanticAI `output_type=<PydanticModel>` or typed `@agent.tool` decorators. **NEVER** Anthropic-style `tool_choice={"type":"tool", "name":...}`.
- **No `anthropic` Python SDK imports.** No `AsyncAnthropic` / `AsyncAnthropicBedrock` / `AnthropicFoundry` constructors.
- **No Anthropic-style prompt cache markers** (`cache_control: {"type": "ephemeral", "ttl": "1h"}`). OpenAI handles prompt caching transparently — no explicit markers.
- **Token redaction** runs as PydanticAI middleware at the Foundry adapter (§6.9 of arch). Not a standalone pre-call function. PII detection on inputs and outputs; redaction patterns rehydrated on the way back out.
- **Cost attribution**: invoice path runs through Mars Foundry billing into Mars cost centers (FN-2401 Finance, MK-3122 Marketing, etc.). Platform's `/settings/usage` view is observability-only — does not bill.
- **Concurrency**: PydanticAI worker per-route concurrency caps sized below Foundry's published rate limit so we saturate our own caps before hitting Foundry's.

## Identity + data plane

- **Identity propagates via Temporal workflow context (in-process)**, NOT wire-level OBO bearer tokens. Per `IDA-3` reformulated under `SIMPLIFY-IDA-2` and reaffirmed in the new arch §5.4. Issue bodies that still reference `obo_token` (T-M3-32, T-M3-47, T-M5-16) are drift to flag, not to implement.
- **Mars-Azure data sources** (Databricks first; others as Mars adds them): per-source service principal + Workload Identity federation. AKS pod ServiceAccount annotated with SP's `client-id` + Mars `tenant-id`; Workload Identity webhook projects a short-lived federated token at pod start; pod exchanges it for an Azure AD access token. **NEVER long-lived PATs in Key Vault.**
- **Sign-in**: Mars Okta OIDC. First-login JIT-creates the user row only if a matching invite exists in Amira's Postgres. Amira owns user management above the sign-in gate (users, BU memberships, role grants, project governance assignments — all rows in Amira's Postgres; Okta has no visibility into the internal user model).
- **Two admin tiers** above per-project governance roles: Super User (configurable; defaults to Cesar) for invites + deployment configuration; Authorized Approver (per-project) for spec/deploy e-signatures.
- **Per-project governance roles**: Authorized Approver, Lead Developer, Product Manager, Compliance Auditor.

## Repo layout

- All platform code lives at **`apps/api/src/amira_api/<area>/...`** — NEVER the `services/<area>/...` or `backend/<area>/...` paths the plan docs reference. This is per Cesar's PR #232 src-layout rebase. All 7 of our shipped tickets followed this layout. When a plan doc says `services/skill-catalog-svc/...`, lift to `apps/api/src/amira_api/skill_catalog/...` and flag the divergence in PR body.
- **Per-app code** (deployed Mars apps) lives in **Mars Azure Repos** (replaces GitHub). The platform's per-app two-way sync is to Mars Azure Repos.
- **Pydantic discipline**: `model_config = ConfigDict(frozen=True, extra="forbid")` on every contract shape. Version-row tables + atomic active-pointer flip pattern (see `CompanionAgentManifest`, `ComplianceMatrix`, `BuildPlanLock`, `SpecCapabilityGraph` precedent).

## Network + compliance

- **Zero public-internet path** in either direction. Mars-internal DNS (`amira.mars.internal` + per-app wildcard `*.amira.mars.internal`); nginx-ingress terminates TLS using a Mars-internal-CA cert.
- **Egress** allow-list reaches: Mars AI Foundry private endpoint, Mars Databricks workspace endpoint, QDL data API, FMP API, Mars Azure Repos, Mars-internal package mirrors. Egress to non-Mars geographies blocked at the VNet allow-list.
- **Geography lock**: Mars-Azure-US-East per FinIQ NFR-2. All nodepools pinned.
- **Compliance pin set** (deployment-fixed, loaded at session start; every data-plane request policy-evaluated before LLM context):
  - **SOX** — Sarbanes-Oxley financial controls; binding for Mars Finance + any project touching Mars financials
  - **GDPR** — EU data subject rights; binding when data crosses into Mars EU geography
  - **Mars Data Classification** — Public / Internal / Confidential / Restricted; Restricted content filtered before retrieval
  - **Row-Level Security (RLS)** — Mars RLS rules at query time; FinIQ NFR-1: restricted accounts filtered out of agent context before generation
  - **Audit Retention 7yr** — every `audit_log` row retained for 7 years per Mars Data Retention Policy
  - **Mars Data Lake Access Policy** — geography- and BU-scoped data lake access

## Cluster topology

- **One AKS cluster** in Mars Azure subscription with five nodepools: `system` (3× B-series), `platform` (D-series), `runtime` (D-series, larger; PydanticAI workers), `workload` (D-series; sandbox + deployed apps), `buildkit` (D-series, burstable).
- Tenant separation is at the data plane (per-org Postgres row rules + immutable session attributes), NOT at the pod runtime. The Mars deployment is **single-tenant** — `org_id = "mars"`, BU scoping via `workspace_id`.

## Per-PR fate (our 7 shipped, post-architecture-publish)

| PR | Status under new architecture |
|---|---|
| T-M2-23 (#236) LLM Adapter facade | **Needs fundamental rewrite** — Anthropic SDK constructors → PydanticAI `OpenAIProvider`. Cesar already wired the LLM bits in his env per his 2026-05-08 EOD WhatsApp. |
| T-M2-24 (#242) Cache breakpoint planner | **Likely deletion** — Anthropic `cache_control` doesn't apply to Foundry's OpenAI endpoint. |
| T-M2-25 (#243) Pre-LLM redaction | **Concept survives** — token redaction is now at Foundry adapter layer (§6.9). Pydantic field-tag pattern likely reusable as PydanticAI middleware. |
| T-M2-26 (#244) Classifier | **Rewrite as PydanticAI Agent** — `Literal["edit","binding","oos"]` structured output via PydanticAI, NOT Anthropic `tool_choice`. Prompt body + 30-fixture verification harness likely reusable. |
| T-M2-17 (#237) NarrationEvent union | **Unaffected** — provider-agnostic Pydantic ✅ |
| T-M2-27 (#235) Versioned prompt registry | **Unaffected** — file system + SHA-256 ✅ |
| T-M3-37 (#240) Spec capability graph | **Unaffected** — Pydantic + xxhash Bloom ✅ |

## Posture (locked)

- **DO NOT preemptively edit shipped code** to align with the new architecture
- **DO NOT file follow-up PRs** without Cesar's explicit ask
- **DO NOT raise** the "we already shipped this pattern" angle unless Cesar asks
- When Cesar opens his PR with the wired LLM bits, pull + read to see what survives vs what gets replaced
- Continue HOLD until Cesar gives an explicit assignment

## Why the lock matters

Cesar's 2026-05-07 *"hang on, I'll review the outputs… will message you later"* + his 2026-05-08 EOD WhatsApp *"the fastapi, auth and llm bits are wired with the UI"* together mean: he has been doing the LLM-adapter rewrite himself in his working environment. Editing our adapter code in parallel would have collided with his work. The architecture publish is the merge-point — going forward, any new code I produce against `D:/amira-mars/` must speak the new dialect (PydanticAI + Foundry + Mars-Okta + Mars-Repos + Workload-Identity-federation), not the old one (Anthropic SDK + Auth0 / Bedrock options + GitHub + long-lived PATs).
