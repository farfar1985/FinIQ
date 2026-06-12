---
name: Amira platform repos — old `amira` repo (PR #1) AND new `amira-mars` repo (Mars deployment)
description: 2026-05-05 — TWO repos now exist. Old `quantumdatatechnologies/amira` had PR #1 with 4-tab Spec/Canvas/Artifacts/Chat shell (phases 1.0–1.6). New `quantumdatatechnologies/amira-mars` is the Mars deployment with 17-area plan and simplified architecture. Read each section for which repo applies.
type: project
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
## Two repos now (since 2026-05-05)

| Repo | Purpose | Status |
|---|---|---|
| `quantumdatatechnologies/amira` | Original platform — 4-tab UI shell + Spec Agent (phases 1.0–1.6) | **Predecessor**. PR #1 still on `feat/batch1-foundation-spec-agent` branch. Many patterns carried into `amira-mars`. Local clone: `D:/amira-platform-readonly/amira/`. |
| `quantumdatatechnologies/amira-mars` | **Mars deployment** — comprehensive 17-area plan + simplified architecture | **Active**. This is what gets built and shipped to Mars. Local clone: `D:/amira-mars-readonly/`. |

For build-time reference on the new repo, see [project_mars_deployment_plan.md](project_mars_deployment_plan.md). The rest of this file documents the OLD `amira` repo for historical context.

---

## OLD `amira` repo — what Cesar built before Mars green-lit deployment

**This is preserved for context.** Many patterns from PR #1 (12 MCP-wired tools, 10 DB tables, 4-tab UI, Spec Agent self-check) carry forward into `amira-mars` area 07 (Spec Workspace + Spec Agent), area 03 (Persistence Substrate), area 15 (Frontend Shell). The architecture itself was simplified significantly between this state and the new one — see CHANGELOG note below.

### Architecture simplifications between OLD and NEW

The amira-mars `architecture/CHANGELOG.md` documents 6 iterations that simplified the architecture significantly:

| Was in OLD `amira` (per 2026-04-29 canonical spec) | Now in NEW `amira-mars` |
|---|---|
| Two AKS clusters (`amira-platform` + `amira-workloads`) | ONE AKS, 9 namespaces, 5 nodepools |
| Kata-Firecracker microVMs | Standard AKS pods |
| Hash-chained ledger + WORM Merkle anchor + Cohasset/SEC 17a-4(f)/FINRA/CFTC framing | Plain append-only Postgres `audit_log` (REVOKE UPDATE/DELETE + trigger). No compliance branding. |
| DBOS workflow engine | Temporal |
| 3-tier skill curation + Sigstore + JFrog full curation pipeline | 2-class skills (external + platform-authored) + registry-URL config |
| OPA Rego policy engine | Typed Python predicates |
| Step-up MFA (auth-time) | No MFA in v1, plain OIDC (Mars Entra MFAs upstream) |
| Grafana / Loki / Tempo / Mimir + OpenTelemetry collector | Existing Mars Elasticsearch + Fleet-managed Elastic Agents |
| PgBouncer connection pool | Supavisor |
| Claude Agent SDK + DBOS-native | Anthropic SDK + Temporal Python SDK |

**Documented drift**: `docs/implementation/TECHNICAL_EXECUTION_PLAN.md` (in amira-mars) still references step-up MFA. CHANGELOG iteration 4c removed MFA from plan files but not this doc. Flag if it comes up in planning conversations.

### Phase progress on the OLD repo (snapshot from 2026-04-27)

Active branch was `feat/batch1-foundation-spec-agent` (PR #1, 100 commits ahead of master, 209 files changed, +21K / −10K lines).

| Phase | Tag | Status | What landed |
|---|---|---|---|
| **1.0** | `phase-1.0-clean` (`5fd3bca`) | ✅ Done | Cleanup + Alembic squash |
| **1.1** | `phase-1.1-shell` (`daa90c4`) | ✅ Done | New 4-tab shell (Spec / Canvas / Artifacts / Chat), dark-mode tokens + next-themes integration, contextual sidebar, user menu popover, status dots |
| **1.2** | `phase-1.2-data-and-apis` (`dcb34c1`) | ✅ Done | 10 new tables (verbatim from v0.6 §12.5), `/api/specs` CRUD, `/api/uploads`, `/api/skills` |
| **1.3** | `phase-1.3-paper-thin` (`8d6191b`) | ✅ Done (with caveats) | Paper-thin Spec tab. 2 SDK call bugs masked by import-site mocks; phase 1.4 task 1.4.0 fixed both + replaced bad tests |
| **1.4** | `phase-1.4-tool-driven` (`06ed2ad`) | ✅ Done | **Tool-driven elicitation.** `spec_mcp.py` with 12 MCP-wired tools. SSE turn endpoint. 13 architectural decisions B-1..B-13. Self-check evaluator covering AC-1..AC-7 + AC-10. |
| **1.5** | `phase-1.5-dock-and-kb` (`635aad4`) | ✅ Done | Right-edge dock UI (Tracker / Skills / KB drawers, ProgressPill, multi-GapTag). Two-pass dogfood + corrective sweep. |
| **1.6** | (in progress at last read) | ⏭ Active | Lock + handoff CONTRACT — reshape from original "wire to legacy canvas" plan. Tasks 1.6.1–1.6.5. |

### The 12 MCP-wired tools (in OLD `amira`, area 07 of NEW will likely echo these)

In `apps/api/amira/services/spec_mcp.py`:

`update_spec_section` · `flag_gap` · `resolve_gap` · `record_assumption` · `add_open_question` · `list_available_skills` · `attach_skill_reference` · `read_kb_file` · `list_attached_uploads` · `run_self_check` · `render_markdown` · `lock_spec`

**Deferred per "no stubs" rule**: `propose_alternatives`, `record_decision`, `submit_compliance_matrix`, `request_revision_from_canvas`.

### 10 Postgres tables (will likely echo in `amira-mars` area 03)

`spec`, `spec_version`, `conversation_turn`, `spec_approval`, `user_upload`, `session_upload`, `skill_reference`, `compliance_matrix`, `compliance_matrix_entry`, `outcome_metadata`.

### Stack (OLD repo)

| Layer | Tech | Port |
|---|---|---|
| Frontend | Next.js 16 + React 19 + shadcn/ui + Tailwind v4 | 3000 |
| Backend | FastAPI + Python 3.12+ + uv | 8000 |
| Audio | Node.js + OpenAI Realtime | 3001 |
| Database | PostgreSQL 16 + pgvector | 5434 |
| Builder | Claude Agent SDK (`ClaudeSDKClient` + in-process MCP) | n/a |
| Auth | Auth.js v5 (JWE) → internal headers (`X-Internal-User-*`) → FastAPI | n/a |

NEW `amira-mars` keeps Next.js + FastAPI + Postgres but swaps:
- Claude Agent SDK → **Anthropic SDK** (with Temporal as the workflow engine, not DBOS)
- Auth.js v5 → **Auth0** (federated to Mars Entra ID)
- pgvector still in (per area 03)

## Hard project discipline (codified by Cesar in OLD `amira` `state.md`, carried into NEW `amira-mars` `plan/00-engineering-standards.md`)

1. **Tests verify real behavior, never mock behavior.** Mock at the integration boundary.
2. **Fail loud — never fall back silently.** No `except Exception: pass`. *(FinIQ April 14 lineage.)*
3. **Phase-completion gate is mandatory MANUAL Playwright dogfood.**
4. **No phase handoff with smells.** Pre-existing isn't exempt.
5. **Production-grade by default.** No backwards-compat shims, no half-finished implementations.
6. **Phase-handoff attestation** required.
7. **No timelines or fake estimates.**

In NEW `amira-mars`, these are the 7 binding engineering standards:
1. Fail loud
2. Senior code quality
3. AI prompt discipline (Anthropic tool-use + Pydantic schemas)
4. context7 library verification
5. Realistic e2e Playwright tests
6. Retry / timeout discipline
7. Structured logging (stdlib `logging` + `python-json-logger`)

## Where v0.7 SPEC_AGENT_DESIGN deltas land

OLD framing — they were future-batch in old `amira`:

| v0.7 delta | Where in NEW `amira-mars` |
|---|---|
| 3-layer knowledge model (per-user / per-project / per-company) | Likely emerges via tenancy model (area 02) + skill catalog + spec/upload scoping |
| Karpathy graph approach for company tier | Likely deferred / future-phase |
| Promotion-flow governance | Implied in area 09 (approval + governance) |
| E-sign approval flow | Area 09 explicitly covers this |
| Apps-Become-Agents auto-companion-agent generation | **Area 12** (companion agents) — fully covered |
| Compliance matrix as Spec phase input | **Area 13** (compliance matrix + continuous eval) — Rajiv's task |

## Lessons reinforced

1. **`state.md`-first reading is the right pattern.** It compressed 100 commits + 209 files into ~170 lines. Saved hours.
2. **Cross-project lessons travel when written down.** "Fail loud" came from FinIQ April 14; now codified as Amira's top platform rule.
3. **Bold pivots beat cautious extensions.** Both Cesar's gut-and-rebuild on OLD `amira` (phase 1.0) and the simplification cascade between OLD and NEW (one cluster, no Kata, no WORM, Temporal not DBOS) follow the same principle.
4. **The "no stubs" rule is a forcing function.** Tools deferred until they're needed for real, not before.
5. **Dogfood discovers what tests can't.** Phase 1.5's three backend bugs all passed pytest + frontend build cleanly; only Playwright manual walkthrough surfaced them.

## Related memories

- [project_mars_deployment_plan.md](project_mars_deployment_plan.md) — **CURRENT BUILD REFERENCE** for amira-mars
- [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md) — Architecture spec from 2026-04-29; partially superseded by amira-mars `architecture/` after 6 simplifications
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Mars commercial track
- [project_amira_pitch_deck.md](project_amira_pitch_deck.md) — Pitch deck V3 (post 2026-04-27)
- [project_amira_vision.md](project_amira_vision.md) — canonical 3-agent + 3-layer vision
- [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) — v0.6 design doc (the spec Cesar implemented near-verbatim in OLD `amira`)
- [project_knowledge_layers.md](project_knowledge_layers.md) — 3-layer knowledge model (later batches)
