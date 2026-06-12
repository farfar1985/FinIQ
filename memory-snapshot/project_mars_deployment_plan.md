---
name: Mars deployment — Cesar's amira-mars repo, milestones, our 18-ticket queue, per-ticket workflow
description: Canonical build reference for amira-mars. **HOLD ENDED 2026-05-13 mid-morning**. Original 18 tickets (M2/M3/M5 `track:ai-agent`): 7 shipped (4 need PydanticAI rework), 11 remaining `ready`. **NEW POOL: 6 of Ashwin's M1 backend tickets** opened to us by Cesar in WhatsApp (T-M1-21 identity, T-M1-31 tenancy, T-M1-44 fixtures, T-M1-47 blob-lint, T-M1-49/50 persistence ACs). Cesar's binding caveat: "review every diff, no spaghetti code." Time pressure: Rajiv wants deployed version this week + Mars training dates mid next week. Strategic frame: code must be exactly what Cesar wants, easier-not-harder.
type: project
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---

## 2026-05-14 status delta — MIDDAY (PR #264 MERGED + Cesar shipped T-M1-21 + group-chat schedule)

- **Master at `7513cd4`** (4 new commits since `a4084fa` yesterday EOD).
- **PR #264 (T-M1-31 tenancy) MERGED** 14:42 UTC by Cesar — `6b01f60` on master.
- **Cesar shipped T-M1-21** himself (PR #266 `aeabd18`) — User + 5 identity tables on master. Foundational-surfacing rule validation 2.
- **PRs #259 (T-M1-44) + #262 (T-M1-47) still OPEN** — Cesar hasn't reviewed yet.
- **Cesar critique of OUR T-M1-31** captured in CLAUDE.md `7513cd4`: "schema correct but only one assertion ran in default CI." 3 specific tests we should have added: OrgConfig round-trip, lifecycle_state enum round-trip, slug uniqueness violation. Discipline gap captured in `feedback_cesar_quality_bar_m1_backend.md` as binding rule #5 (adversarial review).
- **3 new CLAUDE.md rules** added by Cesar today: no-simulation-in-demo + adversarial-review + trust-area-file-prose-not-Depends-on.
- **Cesar's group-chat update (10:56 AM)**: infra LIVE (AKS/Postgres/Temporal/Auth0/TLS), database layer merged today, next is OIDC sign-in (T-M1-22), explicitly LEFT test usecases for Farzaneh (T-M1-49 + T-M1-50 still labeled `owner:farzaneh, ready`).
- **Training session locked Thu 5/21** with Mars; cadence Mon/Tue push, Wed test, Thu train.
- **Pool state**: 3 shipped by us (T-M1-44 + T-M1-47 still in review; T-M1-31 merged), 1 by Cesar (T-M1-21), 2 held for Farzaneh (T-M1-49 + T-M1-50), 1 deferred (T-M1-20 per no-simulation rule).
- **Farzaneh away today 2026-05-14, back tonight**. Earliest realistic ticket claim window: Monday 5/18 once T-M1-22 sign-in lands.

---

## 2026-05-13 status delta — EOD-FINAL (Cesar resolved, FULL HOLD)

- Cesar's WhatsApp 3:08 PM resolved both queued questions:
  - **T-M1-21**: Cesar takes it himself ("I'll pick on these ones")
  - **T-M1-49 + T-M1-50**: deferred — "test issues better suited for when previous pieces of the code are plugged in"
  - **3 PRs (#259/#262/#264)**: still open, awaiting review
  - **Next**: "I'll message you"
- **Foundational-ticket-surfacing discipline VALIDATED** — asked Cesar about T-M1-21, he wanted it himself; zero wasted work. Rule confirmed in `feedback_cesar_quality_bar_m1_backend.md`.
- **3 of 6 Ashwin-lane tickets shipped** by us (T-M1-44, T-M1-47, T-M1-31); 1 taken by Cesar (T-M1-21); 2 deferred (T-M1-49, T-M1-50 — locked plans saved in next-session memory).
- **FULL HOLD until Cesar pings.** Different from earlier HOLDs — well-defined, not "waiting for him to surface a signal." We can fully step away.

---

## 2026-05-13 status delta — EOD LATE (all 3 remaining plans LOCKED, 2 WhatsApp questions queued)

- 3 PRs queued (#259 T-M1-44, #262 T-M1-47, #264 T-M1-31). Cesar mid-review on #264.
- **All 3 remaining tickets pre-studied with locked execution plans** (full detail in `project_next_session.md`):
  - **T-M1-49** (concurrency test, 1 file, ~100-150 lines, ~2hr, no functional blockers)
  - **T-M1-50** (blob parity test, 1 file with parametrize-over-providers, ~200-250 lines, ~3hr)
  - **T-M1-21** (identity skeleton, ~13 files / 5 SQLModel tables / Pydantic contracts, ~1500-1800 lines, ~6-8hr, **functionally blocked on PR #264 merging**)
- **Two WhatsApp questions queued** for Farzaneh to send Cesar:
  1. "continue with remaining 3 or pause for your reviews?"
  2. "want to do T-M1-21 yourself given it's foundational? We're happy with the 2 test tickets."
- **NEW discipline rule captured** in `feedback_cesar_quality_bar_m1_backend.md`: surface foundational tickets to Cesar BEFORE claiming. T-M1-21 was the case that locked this — `require_principal` dependency is repo-wide; spaghetti risk on misaligned agent code is highest of all 6 tickets.
- Standing by for Cesar's responses. Decision tree captured in `project_next_session.md` — once he answers, execution is fast (all plans locked, drift flags identified, second-pass evals done).

---

## 2026-05-13 status delta — EOD (T-M1-31 SHIPPED, 3 PRs queued)

- Master at `a4084fa`. New since afternoon: **#263 T-M1-18** (Cesar's docker-compose dev mirror finalization) + **`a4084fa`** CLAUDE.md tweak adding "deprecation banners are signal" discipline rule (T-M1-18 caught `tctl` 7+ months post-EOL inside otherwise-current `temporalio/auto-setup` image).
- **T-M1-31 PR #264 OPEN + MERGEABLE** at https://github.com/quantumdatatechnologies/amira-mars/pull/264. Commit `cf5f576`. Labels: `track:backend`, `owner:farzaneh`, `needs-review`.
- 5 files, +1024 lines (5 SQLModel tables in `app` schema + `OrgLifecycleState` StrEnum + Alembic baseline + idempotent seed loading 5 mockup workspaces for u-current + 5 tests passing against real Postgres). 5 ruff violations all matching Cesar's pre-existing patterns.
- **3 PRs queued** for Cesar (PR #259 T-M1-44 fixtures, PR #262 T-M1-47 blob lint, PR #264 T-M1-31 tenancy). Cesar started reviewing #264 — asked "what is this M31 about"; Farzaneh sent brief summary.
- **Pool state**: 3 of 6 Ashwin-lane tickets shipped (T-M1-44, T-M1-47, T-M1-31). 3 remaining: T-M1-21 identity (big; Auth0-side per QDT-vs-Mars anti-leak rule), T-M1-49/50 persistence ACs (functionally easier once PR #259 merges).
- **Pending Farzaneh's next WhatsApp**: "continue with remaining 3 or pause for your reviews?" — answer shapes next-pick decision.
- **Comprehensive codebase tour completed** and stored in `project_cesar_codebase_tour.md` — future ticket study starts there.

---

## 2026-05-13 status delta — AFTERNOON (T-M1-47 SHIPPED)

- **T-M1-47 PR #262 OPEN + MERGEABLE** at https://github.com/quantumdatatechnologies/amira-mars/pull/262. Commit `e35ddec`. Labels: `track:backend`, `owner:farzaneh`, `needs-review`.
- 2 files, +234 lines (1 pytest AST-walk lint test + 1 CI workflow). **CI passed in 17s on first run** — `blob-abstraction lint` workflow validated against real GitHub Actions.
- 9 tests total (1 main + 8 helper-level edge-case unit tests). 4 design choices surfaced in PR body for Cesar's review (pytest AST-walk vs custom ruff rule, no noqa escape, TYPE_CHECKING caught, ruff check omitted from CI).
- **Pool state**: 2 of 6 Ashwin-lane tickets shipped (T-M1-44 + T-M1-47). 4 remaining: T-M1-21 identity skeleton (big, high arch-lock drift), T-M1-31 tenancy SQLModel (big, moderate arch-lock drift), T-M1-49 + T-M1-50 (AC tests — **BLOCKED on PR #259 merging**, need our fixtures).
- **No Cesar review yet** on either PR #259 or PR #262.
- **Process discipline lesson captured** in `feedback_cesar_quality_bar_m1_backend.md`: match-precedent ≠ match-coverage; calibrate test depth to problem-shape complexity. Farzaneh's prompt caught this on T-M1-47 — initial submission had 1 test + 1 probe (mirroring Cesar's pattern) but the import-parsing problem had more AST shapes than the precedent's downgrade-body check warranted.

---

## 2026-05-13 status delta — MIDDAY (T-M1-44 SHIPPED)

- **T-M1-44 PR #259 OPEN + MERGEABLE** at https://github.com/quantumdatatechnologies/amira-mars/pull/259. Commit `2302ec8`. Labels: `track:backend`, `owner:farzaneh`, `needs-review`.
- 9 files, +771/-1. 8 contract tests + 5 integration tests pass. Container teardown clean. Ruff clean.
- **Cold diff review caught 10 issues before push** — process discipline paying off. Captured detail in [project_next_session.md](project_next_session.md).
- Farzaneh WhatsApp'd Cesar: *"PR #259 for T-M1-44 ready when you have time. let me know if it looks good"* + asking permission to start T-M1-47 in parallel.
- **Next pick proposed**: T-M1-47 (blob lint enforcement) — small mechanical AST-walk, independent of T-M1-44 review, closes the `*/testing/*` exemption loop we flagged in PR #259. Pending Cesar's WhatsApp greenlight.
- **Of our 6-ticket Ashwin-lane pool**: 1 shipped (T-M1-44), 5 remaining (T-M1-21 + 31 foundational/big, T-M1-47 small, T-M1-49 + 50 medium AC tests that functionally need our T-M1-44 fixtures merged).

---

## 2026-05-13 status delta — LATE-MORNING (first pick locked)

- Master at `1e1c0ad` — T-M1-14 Buildkit #258 just merged. Writable clone refreshed and clean.
- **Cesar's review-before-merge directive (9:39 AM WhatsApp)**: *"Farzaneh if you pick one, let me know when you're done and leave the PR open in github, I'll take a look at it."* This OVERRIDES the 05-06 self-merge directive for these tickets. Captured in [feedback_cesar_quality_bar_m1_backend.md](feedback_cesar_quality_bar_m1_backend.md).
- **First pick locked: T-M1-44** (canonical pytest fixtures, issue #43) as calibration ticket.
- **Two WhatsApp messages sent**: (1) T-M1-44 pickup announcement, (2) boundary-check offering Cesar veto on which tickets to keep.
- **Pre-flight findings from writable clone inspection**: src-layout confirmed at `apps/api/src/amira_api/<X>/`; path divergence is REAL vs plan's `services/<X>/`; `tests/conftest.py` already exists (T-M1-44 extends it, doesn't create); neighbor tests already on master.
- **Standing by** for Cesar's reply before study phase + claim. Do NOT auto-claim or read issue body cold yet.

---

## 2026-05-13 status delta — MID-MORNING (HOLD ENDED)

- Master at `6561f84`. T-M1-13 merged overnight, T-M1-14 in flight, T-M1-15/16 next per Cesar.
- **Temporal LIVE at `https://temporal.amira.qdt.ai/`** — workflow engine deployed externally.
- **HOLD ENDED at 9:27 AM ET** when Farzaneh said *"yes sure"* to Rajiv's *"Farzaneh, are you able to pick up these tickets?"*
- **NEW POOL** — 6 of Ashwin's M1 backend tickets opened by Cesar via WhatsApp:

| # | Ticket | Type | Key downstream impact |
|---|---|---|---|
| #21 | T-M1-21 — `services/identity/` skeleton + SQLModel tables | Foundational | every `require_principal` handler |
| #30 | T-M1-31 — Tenancy SQLModel + Alembic + seed | Foundational | RLS context everywhere |
| #43 | T-M1-44 — Canonical pytest fixtures (`pg_url`, `session`, `blob`) | Mechanical | every test in `apps/api/` |
| #46 | T-M1-47 — Blob abstraction lint enforcement | Mechanical | lint gate on Blob touches |
| #48 | T-M1-49 — Monotonic project sequence (AC-PERSIST-2) | Test-heavy | CI gate |
| #49 | T-M1-50 — MinIO ↔ Azure Blob parity (AC-PERSIST-3) | Test-heavy | CI gate |

- **Cesar's binding quality bar** (captured in [feedback_cesar_quality_bar_m1_backend.md](feedback_cesar_quality_bar_m1_backend.md)): *"please be careful with how the agents code these pieces, they need to be fully aligned with the system and code needs to make sense... otherwise we will end up with lots of spaghetti code."*
- **Farzaneh's strategic frame**: *"it is very critical that the code we submit to cesar for the M1s are exactly what he wants to make his job easier not harder."*
- **Time pressure**: deployed version this week + Mars training mid next week. ~2-3 working days for clean ticket ship.
- **Pre-flight flags**: path divergence (`services/<X>/` → `apps/api/src/amira_api/<X>/`), wire-level OBO dead in v1, Mars architecture lock applies (Okta OIDC + WI federation + Supavisor).
- **Action**: APPROACH-DISCUSSION-PENDING with Farzaneh before any ticket claim. Working hypothesis order: T-M1-44 → T-M1-21 → T-M1-31 → others. Communication plan: ping Cesar with intended order before claiming first ticket.

---

## 2026-05-13 status delta (Wednesday early-morning)

- Master at `6561f84`. **1 commit since 05-12 EOD** — T-M1-13 #257 agent-sandbox CRD merged overnight (as predicted).
- **Open PR**: #258 T-M1-14 Buildkit deployment in `image-build` (opened ~08:00 ET).
- **No pivot**: Cesar moved straight T-M1-13 → T-M1-14. Continuing M1 in numerical order.
- **Still untouched**: `apps/api/` (no PydanticAI rewrite), our 7 shipped PRs (0 reviews/comments), our 13 open tickets (all `ready`).
- **Yesterday's "restart-signal rising" call was wrong on timing**. Substrate is ready (Temporal + ESO installed) but Cesar's behavior says he's continuing M1 first.
- **Realistic estimate**: 2-5 more working days of Cesar M1 grind, or Mars SOW unblocks M2, or he sends a side-task ping.
- **Action**: Farzaneh planning to ping Cesar (WhatsApp) to ask for productive in-meanwhile work. Open-ended ask, not pre-prescribed.

---

## 2026-05-12 status delta (Tuesday EOD)

- Master at `b2b5e6a`. 7 commits + **5 PRs merged today**, all Cesar.
- **Merged today**:
  - **#251 T-M1-12** External Secrets Operator + ClusterSecretStore bound to Key Vault
  - **#252 T-M1-09** ingress-nginx + cert-manager + external-dns
  - **#253** docs(claude-md): ResourceQuota + chart-values pattern
  - **#254 T-M1-10** Argo Rollouts cluster-scoped (SIMPLIFY-INFRA-1 dashboard disabled)
  - **#255** Strip regulatory/supply-chain/residency vocab from Compliance Matrix + deploy gate — re-anchors plan/13 as pure spec-coverage scoring. Affects our T-M3-22/49/50/51 area.
  - **#256 T-M1-11** Temporal Server 1.2.0 backed by shared Postgres
- **Open right now**: **#257 T-M1-13** agent-sandbox CRD controller — MERGEABLE, will land 05-13.
- **M1 critical-path complete**: Cluster, VNet/DNS, Workload Identity, KV+Blob+ACR+Postgres, Namespaces, Ingress, Argo Rollouts, **Temporal Server**, **External Secrets Operator**. Substrate to run our M2/M3/M5 workflows is real.
- **Code-handoff framing locked (commit `bb0b443`)**: Mars's near-term focus = BUILD capability (Spec→Build artifact to Mars Azure Repos), NOT in-Amira deploy. Mars deploys those artifacts via their own Azure Web App + CI/CD. **Implication**: M3 Spec/Build Agent work (mostly ours) prioritized over M4 deploy + M5 Companion (Mars may skip M5 for their apps entirely).
- **Code review status of our 7 shipped PRs**: 0 reviews, 0 comments, 0 Cesar issue comments across #235/236/237/240/242/243/244. Zero touch to `apps/api/` by anyone since our 05-06 ship. Expected per `feedback_self_merge_pattern.md` (batch review at phase boundaries). Cesar's PydanticAI rewrite not yet in repo — still in his "working env" per 05-08 WhatsApp.
- **HOLD continues**. Reconnecting 05-13 for restart-signal check. Full snapshot in [project_next_session.md](project_next_session.md).

---

## 2026-05-11 status delta (Monday)

- Master at `6389083`. 55 commits since 05-08 EOD, all Cesar.
- **Merged 05-11**: #249 T-M1-07 (Azure managed services: Key Vault + Blob + ACR + Postgres Flex), #250 T-M1-08 (namespace Helm chart).
- **In flight on remote (no PR)**: T-M1-05 VNet+DNS, T-M1-12 External Secrets Operator.
- **Mars Deployment Architecture doc** fully fleshed out §0-§15 over 05-08 → 05-11 — hand-rendered HTML + hero SVG + answered Kumar's (Mars infra) Q&A on SP granularity, Databricks auth flow, delegated trust.
- **File rename**: `plan/01-platform-identity-and-obo.md` → `plan/01-platform-identity.md` (OBO formally gone from v1).
- **Roadmap flips**: `okta-oidc` + `sp-workload-identity` marked complete since 05-08.

---

## Current state (2026-05-05 afternoon)

**Mars formally green-lit Amira platform deployment** (today's call: Cesar + Rajiv + Ale + Farzaneh). 4-week build window starting mid-May post contract signing. Track 1 (Cesar's locked cloud architecture) is the build target.

**NEW repo**: `github.com/quantumdatatechnologies/amira-mars` (separate from older `amira` repo). Local read-only clone: `D:/amira-mars-readonly/`.

**We've been assigned 18 tickets** across M2 (4), M3 (11), and M5 (3) — every single one is `track:ai-agent` status `ready`. Cesar has us owning **the entire AI brain of the platform**: LLM adapter integration, Spec Agent, Build Agent spec-side guards, Skills runtime, capability graph, detectors, Repo-import, and Companion agents.

**M1-window homework** (Cesar's explicit ask, M1 has no AI tickets for us):
1. Read `plan/05-agent-runtime-and-job-communication.md` in full
2. Verify Anthropic Python SDK + Temporal Python SDK against current docs (binding rule #4: context7 verification)
3. Sketch T-M2-17 (NarrationEvent union) — design artifact for someone else's ticket so M2 lands fast

**Cesar's group-chat update at session time**: *"a few more mins and the plan is nearly split! then we can start working on it."* That message landed at 11:44 AM; he then assigned ~169 tickets across M1-M4 within the next ~30 min. M5 issues (3 ours) followed shortly after.

## Repo facts

- **URL**: `github.com/quantumdatatechnologies/amira-mars` (private, 404 to unauthenticated)
- **Local read-only clone**: `D:/amira-mars-readonly/` (do not modify; for reading only)
- **Need a writable clone before opening PRs**: `gh repo clone quantumdatatechnologies/amira-mars D:/amira-mars` when ready
- **State**: Next.js 15 + React 19 mockup UI is built. FastAPI backend is what the 17 area plans implement.
- **Master coordination**: `PLAN.md`. **Engineering standards**: `plan/00-engineering-standards.md`. **Plan-writer dispatch**: `plan/_DISPATCH.md`.

## Milestone structure (corrected from earlier inference)

| Milestone | Theme | Areas | Open issues |
|---|---|---|---|
| **M0** | Plan lock — no code. Confirm contracts + simplifications + open questions before any milestone opens. | (governance gate) | 0 (intentional) |
| **M1** | Foundation: identity, tenancy, persistence, audit, cluster | #1, #2, #3, #4, **#16** | **63** |
| **M2** | Agent runtime + LLM adapter | #5, #6 | **30** |
| **M3** | Spec → Build loop: Spec Agent, Canvas, Skills, Compliance, Data Plane | #7, #8, #10, #13, #14 | **64** |
| **M4** | Governance, e-signature, deploy pipeline | #9, #11 | 12 |
| **M5** | Companion Agents, Ask Amira, read views, observability | #12, #15, **#17** | (~3+ split so far) |
| **M6** | Demo / pilot hardening — full golden path repeatable | — | 0 (final) |

**Important corrections to earlier mapping**:
- Area #17 (observability) is in **M5**, NOT M1 (telemetry needs real workflows running before tuning).
- M3 is the **biggest milestone** (64 issues) — and it's our milestone.

## Our 18-ticket queue (all `owner:farzaneh` + `track:ai-agent` + `ready`)

### M2 — Agent runtime + LLM adapter (4 tickets)

| # | Title |
|---|---|
| **T-M2-21** | Classifier Activity (`RUNTIME-4` per-instruction routing) (runtime side) |
| **T-M2-24** | Prompt-cache breakpoint planner (`LLM-CACHE-1`) |
| **T-M2-27** | Versioned prompt registry with startup presence check |
| **T-M2-28** | Wire adapter into #5 Agent Runtime Activities (cross-area integration) |

### M3 — Spec → Build loop (11 tickets — our biggest chunk)

| # | Title |
|---|---|
| **T-M3-38** | Spec Readiness rubric + LLM tie-breaker |
| **T-M3-39** | `SpecAgentWorkflow` shell + `elicit_turn` Activity |
| **T-M3-41** | Reviewer Agent linter library |
| **T-M3-42** | Repo-import pipeline (`RepoImportWorkflow`) + sandbox clone Activity |
| **T-M3-44** | Out-of-scope guard (Build-side capability-graph layer-1 check) |
| **T-M3-45** | Build session checkpoint policy + Activity |
| **T-M3-47** | MCP Runtime Client library + tool-surface-hash drift verification |
| **T-M3-49** | Static-analysis probe + capability-graph reader |
| **T-M3-50** | LLM-judge call wrapper + tool-use schema + prompt v1 |
| **T-M3-51** | Detector orchestration + recompute API + affected-set computation |
| **T-M3-52** | QDL federation skill with `qdl.search` / `qdl.fetch` MCP tools |

### M5 — Companion Agents (3 tickets)

| # | Title |
|---|---|
| **T-M5-15** | `CompanionAgentManifest` synthesis Activities (Build Agent manifest from spec graph) |
| **T-M5-16** | Companion MCP handler with permission intersection + OBO routing |
| **T-M5-17** | `CompanionAgentWorkflow` (per-turn) + Activities + structured-output schemas |

### What we own across the platform

| Area | Our tickets | What we're building |
|---|---|---|
| LLM adapter integration | M2-21, 24, 27, 28 | Classifier + prompt cache + prompt registry + adapter wiring |
| Spec Agent | M3-38, 39, 41 | Workflow shell + elicit_turn + readiness rubric + Reviewer linter |
| Build Agent (spec-side) | M3-44, 45 | Out-of-scope guard + session checkpoint policy |
| Skills runtime | M3-47, 52 | MCP Runtime Client + first federation skill (QDL) |
| Capability graph | M3-49 | Static-analysis probe + reader |
| Detectors / LLM judge | M3-50, 51 | LLM-judge wrapper + detector orchestration |
| Repo-import | M3-42 | RepoImportWorkflow + sandbox clone |
| Companion agents | M5-15, 16, 17 | Manifest synthesis + MCP handler + per-turn workflow |

### What we DON'T own (Cesar's tracks)

- Foundation infra (Auth0, Postgres, RLS, audit_log, AKS — M1)
- LLM adapter shell itself (M2)
- Build Agent emit_edit (M3)
- Build Plan resolver (M3)
- Spec Workspace UI (M3)
- Out-of-scope detector itself (T-M3-40)
- Governance + e-sig + deploy pipeline (M4)
- Frontend shell + read views (M5)
- Demo polish (M6)

## Per-ticket workflow (canonical — from `docs/implementation/HOW_WE_WORK.md`)

Every ticket follows this loop. **Memorize it.** Authoritative source: `D:/amira-mars/docs/implementation/HOW_WE_WORK.md` (Cesar codified the workflow there 2026-05-05 in commit `bfff88f`).

```
1. ./scripts/whats_next.py farzaneh                                        # READY vs BLOCKED queue
2. gh issue view <NUMBER>                                                   # read the contract
3. gh issue develop <NUMBER> --checkout                                     # creates branch + auto-links to issue
4. Open Claude Code in the repo (terminal: `claude`)
5. Paste the canonical prompt (see below)
6. gh issue edit <NUMBER> --add-label in-progress --remove-label ready      # claim it (label transition #1)
7. Implement files listed in issue's "Files to create / modify"
8. Run the exact command in issue's "Verification (this is the 'done' gate)"
9. git push + gh pr create --title "T-MX-NN — <full title>"                 # PR body must include "Closes #N"
10. gh issue comment <NUMBER> --body "<test output>"
11. gh issue edit <NUMBER> --add-label needs-review --remove-label in-progress   # label transition #2
12. Wait for Cesar's review
13. gh pr merge <N> --squash --delete-branch                                # squash + branch cleanup
14. PR merges → linked issue auto-closes (because of "Closes #N") → milestone auto-progresses
15. ./scripts/whats_next.py farzaneh                                        # see what's now unblocked, loop
```

**Two label transitions** (we initially missed step 11 — `in-progress → needs-review`):
- Step 6: `ready → in-progress` (when claiming)
- Step 11: `in-progress → needs-review` (when PR opens)

### Canonical Claude Code prompt (paste verbatim per HOW_WE_WORK.md §"During the day")

> *"We're working on issue #<NUMBER>. Read it via `gh issue view <NUMBER>`. Follow `plan/00-engineering-standards.md` as binding standards. The source area file is linked in the issue body — read that too. Implement the deliverable into the listed files. Verify per the issue's Verification section. When tests are green, open a PR titled with the ticket ID and comment the test output on the issue."*

Note: every issue body ALSO has its own paste-and-go prompt embedded under "Claude Code prompt — paste this into your session" — that's the per-ticket version (slightly more detailed). Use whichever is in the issue.

### Blocker handling (per HOW_WE_WORK.md §"Evening")

If a ticket is blocked:

```
gh issue edit <NUMBER> --add-label blocked --remove-label ready
gh issue comment <NUMBER> --body "Blocked: waiting on T-MX-NN to merge first"
```

Cesar sees this in his morning sweep and unsticks it.

### `whats_next.py` sister scripts (also in `scripts/`)

- `seed_github_issues.py` — Cesar's one-time tool: 7 milestones + 11 labels + 228 issues from TICKETS.csv
- `advance_milestone.sh M<from> M<to>` — verifies milestone closure + advances + prints WhatsApp kickoff
- `sync-roadmap-html.sh` — keeps STAKEHOLDER_ROADMAP.html in sync

**`./scripts/whats_next.py <name>`** (`cd1530b` 2026-05-05) — 192-line Python tool. KNOWN_OWNERS = `{cesar, ashwin, farzaneh, ale, rajvi}`. Auto-detects the active milestone (lowest-numbered open with at least one open issue). Walks repo-wide closed-tickets set; parses `**Depends on:**` from each open issue body; computes READY (all deps closed) vs BLOCKED (with unmet dep IDs printed). Sort by ticket ID. Calls `gh` shell-out under the hood — requires `gh` installed + authenticated.

**Label transition `ready → in-progress` is part of the workflow.** Step 4 above. We flip the label ourselves when we claim a ticket. The `ready` label isn't just a status; it's a queue marker. Other people's `whats_next.py` runs see our claimed tickets as in-progress, not grabable.

**Sister scripts** (also in `scripts/`):
- `seed_github_issues.py` — Cesar's tool to populate issues from plan files
- `advance_milestone.sh` — Cesar's tool to flip milestone active status
- `sync-roadmap-html.sh` — keeps STAKEHOLDER_ROADMAP.html in sync

**Named-first-ticket pattern**: when a milestone opens for an owner, Cesar pings WhatsApp with the explicit first-ready ticket + paste-and-go prompt (e.g., for Ashwin 2026-05-05 noon: *"Your first ready ticket is T-M1-41 (issue #40). Run: gh issue view 40 / gh issue develop 40 --checkout / Open Claude Code in the repo and paste: 'We're working on issue #40 (T-M1-41 — ...)'"*). Expect the same when M2 opens for us.

### Issue body structure (every ticket has this template)

- **Track** — e.g., AI/Agent Engineering, Platform Infra
- **Owner** — `owner:farzaneh` label
- **Source area** — exact plan file + section, e.g., `plan/12-companion-agents-and-ask-amira.md §8 T-CMP-4, §2.3, §3.1`
- **Depends on** — list of upstream tickets that must merge first
- **Files to create / modify** — exact paths
- **Deliverable** — concrete description of what "done" looks like
- **Verification ("done" gate)** — exact command(s) and expected output
- **Standards (binding)** — always `plan/00-engineering-standards.md`
- **Claude Code prompt** — drop-in paragraph for the agent
- **Quick links** — deep ticket reference + area file

The issue body IS the contract. We don't have to figure out anything ourselves.

## Dependency-aware execution order

Don't pick randomly. Follow the order:

```
NOW (M1 window — Cesar's explicit ask, no tickets to open yet)
├── Read plan/05 in full
├── Verify Anthropic SDK + Temporal Python SDK
├── Sketch T-M2-17 (NarrationEvent union) — design only
└── (bonus) deep-read plan/06, 07, 10, 12, 13 — feeds future tickets

WHEN M2 OPENS (4 tickets)
├── T-M2-27 Versioned prompt registry      # foundational data layer
├── T-M2-24 Prompt-cache breakpoint planner # uses registry
├── T-M2-21 Classifier Activity            # per-instruction routing
└── T-M2-28 Wire adapter into Agent Runtime # last — integrates everything

WHEN M3 OPENS (11 tickets)
├── Library-shape (parallelizable, no runtime needed):
│   ├── T-M3-47 MCP Runtime Client library
│   ├── T-M3-49 Static-analysis probe + capability-graph reader
│   └── T-M3-41 Reviewer Agent linter library
├── Workflow shells (need Temporal worker pool from M2):
│   ├── T-M3-39 SpecAgentWorkflow shell + elicit_turn
│   ├── T-M3-42 RepoImportWorkflow + sandbox clone
│   └── T-M3-45 Build session checkpoint policy
├── Orchestration / logic:
│   ├── T-M3-50 LLM-judge call wrapper + prompt v1 (feeds 38 + 51)
│   ├── T-M3-38 Spec Readiness rubric + LLM tie-breaker (uses 50)
│   ├── T-M3-44 Out-of-scope guard (uses 49)
│   └── T-M3-51 Detector orchestration (uses 50)
└── Skill leaf:
    └── T-M3-52 QDL federation skill (uses 47)

WHEN M5 OPENS (3 tickets)
├── T-M5-15 CompanionAgentManifest synthesis (depends on Build Agent in M3)
├── T-M5-17 CompanionAgentWorkflow per-turn (uses M5-15)
└── T-M5-16 Companion MCP handler with permission intersection + OBO
   (Note: T-M5-17 also depends on T-M5-03, T-M5-07 — Cesar's companion infra tickets)
```

## What we explicitly do NOT do

- **Pre-pick tickets** — Cesar drives via `owner:` label assignment.
- **Update milestones manually** — they auto-progress when issues close.
- **Skip dependencies** — `Depends on:` line is law.
- **Skip the verification gate** — it's the contract.
- **Touch other tracks** — foundation infra, deploy pipeline, governance, frontend shell are Cesar's.

## 7 binding engineering standards (`plan/00`)

Floor-level. Reviewers reject PRs that violate them.

1. **Fail loud — never fall back silently.** No `except Exception: pass`. *(FinIQ April 14 lineage.)*
2. **Senior code quality.** Type-hinted, docstring-discipline, structural fits the codebase.
3. **AI prompt discipline** — Anthropic tool-use + Pydantic schemas. No string-parsing of LLM output without a validated schema.
4. **`context7` library verification.** Verify any 3rd-party API call against current docs before writing it. No stale snippets.
5. **Realistic e2e Playwright tests.** Real browser, real DOM, real network, real backend.
6. **Retry / timeout discipline.** Every external call has a sane timeout + bounded retry + backoff.
7. **Structured logging.** stdlib `logging` + `python-json-logger`. JSON only. Correlation IDs via context vars.

## Locked tech stack

| Layer | Choice |
|---|---|
| Python runtime | Python 3.13 + uv |
| API | FastAPI |
| Validation | Pydantic v2 |
| ORM | SQLModel |
| Migrations | Alembic |
| DB driver | psycopg3 |
| HTTP client | httpx |
| LLM SDK | Anthropic SDK |
| Workflow engine | Temporal Python SDK |
| Logging | stdlib logging + python-json-logger |
| Tests | pytest + anyio |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn-style primitives |
| E2E tests | Playwright via MCP |
| Connection pool | Supavisor (NOT PgBouncer) |

## Major architectural simplifications since 2026-04-29

Cesar iterated 6 times in `architecture/CHANGELOG.md`. Headlines:

- Two AKS clusters → **ONE cluster** (9 namespaces, 5 nodepools)
- Kata-Firecracker microVMs → **standard AKS pods**
- Hash-chained ledger + WORM Merkle anchor + Cohasset/SEC 17a-4(f) → **plain append-only Postgres `audit_log`** (REVOKE UPDATE/DELETE + trigger). Compliance branding dropped.
- DBOS → **Temporal**
- 3-tier skill curation + Sigstore + JFrog → **2-class skills** + registry-URL config
- OPA Rego → **typed Python predicates**
- Step-up MFA → **no MFA in v1, plain OIDC** (Mars Entra MFAs upstream)
- Grafana/Loki/Tempo/Mimir → **existing Mars Elasticsearch + Fleet-managed Elastic Agents**
- PgBouncer → **Supavisor**

**Drift status post-`0a4abbe` strip (2026-05-05 afternoon scan)** — Cesar's commit was a partial sweep. Verified categories:
- ✅ **OPA / Rego / OpenFGA / Cedar policy language** — fully stripped, zero hits.
- ⚠ **Step-up MFA** — residue in `plan/11-deployment-pipeline.md` lines 183 + 1026 (`require_step_up_mfa` dependency). Plus ambiguous reference in `plan/10` line 536 (`step_up_required(user_id) -> bool` — could be auth-without-MFA). Plus customer-facing `STAKEHOLDER_ROADMAP.html` lines 1429/1593 mention "step-up authentication primitive / verified" (might be intentional v1). Cesar should sweep plan/11 explicitly.
- ⚠ **Terraform** — one residual reference in `architecture/05-architecture.html` line 1308 ("every box maps to a Terraform resource"). Likely stale HTML render.
- ⚠ **PgBouncer → Supavisor lock** — plan/03 LOCKED Supavisor (line 450) and plan/03 line 453-454 EXPLICITLY lists the master-doc-update TODO. Has not propagated yet — 17 places still say "PgBouncer / Supavisor" (across `04-decisions.md`, `05-architecture.md`+`.html`, plan/02/04/05/08/16, TECHNICAL_EXECUTION_PLAN, superpowers specs, PLAN.md). Known TODO. **When implementing T-M2-02 / similar tickets, treat references as "Supavisor (PgBouncer fallback)" per plan/03 line 450.**
- ⚠ **DBOS** — historical context in CHANGELOG/decisions/questions is fine. **Real drift in `architecture/mars/02-mars-conversation-agenda.md` lines 316-317** ("platform recommends DBOS") — needs update before next Mars-facing call. Research files (A, B, DEPLOY-1, SANDBOX-RUNTIME) still describe DBOS as the locked workflow engine — should be re-headered as "frozen pre-decision research, superseded by RUNTIME-1 Temporal lock" or rewritten.
- ⚠ **`workflow.RetryPolicy` doc nit** — `plan/05` line 938 + `plan/11` line 1231 should both be `temporalio.common.RetryPolicy`. Trivial.

## Dependency analysis — which of our 18 tickets can start when

Pulled `Depends on:` lines for all 18 of our tickets via `gh issue list --label owner:farzaneh --json number,title,body` 2026-05-05 evening. Result:

### T-M2-27 is the ONLY ticket with zero upstream deps

```
T-M2-27 (issue #90) — Versioned prompt registry with startup presence check
  Depends on: —
```

Likely our first ticket once Cesar ships the `apps/api/` skeleton (T-M1-41 — Ashwin's). Simplest data-layer + REST route shape.

### All other 17 have upstream ticket deps

**M2 chain (Cesar's M2 tickets gating our M2):**
- T-M2-21 → T-M2-05 + T-M2-26 (Cesar's LLM Adapter + classifier pieces)
- T-M2-24 → T-M2-23 (Cesar's adapter shell)
- T-M2-28 → T-M2-23 + T-M2-18/06/07 (multi-dependency integration ticket — last in M2)

**M3 chain (mostly gated by Cesar's T-M3-03 + T-M3-37):**
- T-M3-41 (Reviewer linter) — only depends on T-M3-03. **Simplest M3 entry.**
- T-M3-38, 39, 42, 44 — depend on T-M3-37 + T-M3-03 + sometimes T-M3-05/11
- T-M3-39 also depends on **our** T-M3-38 (intra-queue chain)
- T-M3-42 also depends on **our** T-M3-39
- T-M3-45 → T-M3-11 + T-M3-13
- T-M3-47 → T-M3-46 + T-M3-02
- T-M3-49 → T-M3-48 (Q-13-1 lock) + T-M3-24
- T-M3-50 → T-M3-24 + **#6 LLM Adapter (M2!)** — cross-milestone dep, M2 must close first
- T-M3-51 → T-M3-24 + **our** T-M3-49 + T-M3-50
- T-M3-52 → T-M3-32 + T-M3-34

**M5 chain (all 3 depend on T-M5-07 audit kinds):**
- T-M5-15 → T-M5-01 + T-M5-07
- T-M5-16 → T-M5-02 + T-M5-07
- T-M5-17 → T-M5-03 + **our** T-M5-16 + T-M5-07

### Critical path for our work

```
T-M1-41 (Ashwin)              ← apps/api/ skeleton lands
   ↓
T-M2-27 (us, NO deps)         ← "first ticket" — Cesar likely names this
   ↓
T-M2-24 + T-M2-21 (us)        ← parallel, gated on Cesar's M2 adapter pieces
   ↓
T-M2-28 (us, integration)     ← last in M2
   ↓ (M2 closes)
T-M3-41 (us, simplest M3)     ← only one with single upstream
T-M3-47, T-M3-49 (us)         ← libraries, parallelizable
   ↓
T-M3-39, T-M3-50, T-M3-44, T-M3-38, T-M3-51 (us) ← orchestration cascade
T-M3-42, T-M3-45, T-M3-52 (us) ← parallelizable later
   ↓ (M3 closes)
T-M5-15 → T-M5-17 → T-M5-16 (us) ← Companion agents
```

**Implication**: zero of our 18 can start TODAY. T-M2-27 is closest (zero ticket deps) but still has implied infra dep on `apps/api/` from T-M1-41. We genuinely wait for Cesar's named-first-ticket trigger.

## "Not in v1" — formal red lines (CLAUDE.md `bfff88f` 2026-05-05)

Cesar codified our drift findings as canonical "not in v1" guardrails. Cesar's words: *"if they reappear in plan / architecture / runbooks, it's drift — remove, don't preserve as 'history'"*. The list:

| Banned | Replacement |
|---|---|
| **MFA / step-up / TOTP / factor enrollment** | E-signature gate is session + role + audit row only |
| **Rego / OPA / Cedar / OpenFGA** | Deploy gate + compliance evaluator + Data Plane authz are **typed Python predicates** |
| **Terraform for v1 infra** | Hand-provision via Azure CLI / Portal; capture commands + outputs in `infra/runbooks/<topic>.md` |
| **Grafana / Loki / Tempo / Mimir / OTel** | V1 observability is structured `logging` → Elastic Agent / Fleet → Kibana → Postgres rollups |

**Heroku Cedar/Fir** in research notes is OK — different Cedar (Heroku runtime generation, not the policy language). Leave it.

**This formalizes the residual drift list above.** When implementing tickets, if any reference to MFA / OPA / Terraform / Grafana stack appears in source area files we read, treat it as drift to flag (not as guidance to follow).

**AGENT-4 vs Q-RT-1**: NOT a conflict. AGENT-4 locks **thread identity** (per-user-always); Q-RT-1 is about **workflow lifetime** (per-turn vs long-lived). Orthogonal axes. Q-RT-1 remains genuinely open for Cesar to lock.

**Local dev stack** (commit `58af02f` 2026-05-05): `infra/dev/docker-compose.yml` + `infra/dev/postgres-init.sql`. Run for local development. Postgres pinned to rolling `pg18`, MinIO `latest` (commit `3444b79`).

**Owner labels expanded** (commit `f630d0d` 2026-05-05): KNOWN_OWNERS in `whats_next.py` is `{cesar, ashwin, farzaneh, ale, rajvi}`. Ale = CTO, Rajvi = CEO (lowercase `rajvi` is the canonical label spelling).

**Local dev stack lands** (commit `58af02f` 2026-05-05 *"feat(dev): minimal local docker-compose stack — Postgres + MinIO + Temporal CLI"*, refined in `bfff88f` with documented commands): `infra/dev/docker-compose.yml` + `infra/dev/postgres-init.sql`. **Canonical doc**: [`docs/implementation/LOCAL_DEV.md`](D:/amira-mars/docs/implementation/LOCAL_DEV.md).

**Daily commands**:
```bash
make dev          # boot Postgres+MinIO containers
make temporal     # Temporal CLI dev mode (separate terminal, foreground)
make psql         # psql into the dev DB
make stop         # stop containers, keep volumes
make reset        # nuke volumes — fresh on next `make dev`
make logs         # tail container logs
make mock-frontend  # → http://localhost:3000
```

**Service ports + dev creds**:
| Service | Address | Credentials |
|---|---|---|
| Postgres | `localhost:5432` | `amira_dev / amira_dev_pwd / amira_dev` (db). App role: `amira_app / amira_app_pwd` |
| MinIO S3 API | `localhost:9000` | access key `amira_dev` / secret `amira_dev_pwd` |
| MinIO web console | http://localhost:9001 | same creds |
| Temporal gRPC | `localhost:7233` | (no auth in dev) |
| Temporal web UI | http://localhost:8233 | — |
| Frontend mockup | http://localhost:3000 | — |
| Backend (FastAPI) | `localhost:8000` (lands with T-M1-41) | — |

**Image tags** (rolling major tags for dev — security patches auto):
- `pgvector/pgvector:pg18`, `minio/minio:latest`, `minio/mc:latest`. Production pinning happens via Helm/Azure provider for T-M1-07/T-M1-11.

**What's NOT yet in the local stack**: Auth0 sign-in (lands with T-M1-22), audit consumer (T-M1-56), Compliance/Skills/Build sandbox (M3), production-grade docker-compose mirror (T-M1-02 + T-M1-18).

**Owner labels expanded** (commit `f630d0d` 2026-05-05): `owner:ale` (Ale, CTO) and `owner:rajvi` (Rajvi, CEO — note canonical spelling is `rajvi` lowercase in the label, not `rajiv`). KNOWN_OWNERS list in `whats_next.py` is now `{cesar, ashwin, farzaneh, ale, rajvi}`. Ale + Rajvi may pick up tickets in upcoming milestones.

## Locked decision IDs (~73, in `architecture/04-decisions.md`)

Cite when implementing.
- **RUNTIME-1**: Temporal (replaces DBOS)
- **DEPLOY-2 + DEPLOY-1**: One AKS cluster
- **PERSIST-2 + AUDIT-1**: Plain Postgres append-only `audit_log` (REVOKE UPDATE/DELETE + trigger)
- **SKILL-1**: 2-class skill model (external / platform-authored)
- **MTEN-1**: Multi-tenant SaaS at `amira.qdt.ai`
- **STANDARDS-1**: The 7 engineering standards
- **PERSIST-3**: Supavisor
- **IDA-3**: RFC 8693 OBO with cumulative `act` claim, capped at 6
- **RUNTIME-4**: Per-instruction routing (T-M2-21 references this)
- **AGENT-4**: One workflow per turn (T-M5-17 references this)
- **LLM-CACHE-1**: Prompt-cache breakpoint policy (T-M2-24 references this)

## One AKS cluster — 9 namespaces, 5 nodepools

**Namespaces**: `platform-system`, `platform-data`, `temporal-system`, `observability`, `ingress-system`, `sandbox-system`, `sandbox-<sessionId>`, `org-<orgId>-app-<appId>-<env>`, `argo-rollouts`, `image-build`

**Nodepools**: `system`, `platform`, `runtime`, `workload`, `buildkit`

## 6-phase customer-facing deployment (STAKEHOLDER_ROADMAP)

P0 → P6 → P7. Not the same as M0-M6 milestones; the customer-facing tracker is at `C:/Users/farza/Desktop/STAKEHOLDER_ROADMAP.html`.

## Setup we still owe future-us

Before opening the first PR:

1. **Install `gh` CLI**: `winget install --id GitHub.cli` (Windows) or `apt install gh` (WSL)
2. **Authenticate**: `gh auth login` → GitHub.com → HTTPS → browser auth
3. **Writable clone**: `gh repo clone quantumdatatechnologies/amira-mars D:/amira-mars` (separate from the read-only one)
4. **Local dev stack**: `cd D:/amira-mars/infra/dev && docker compose up -d` — Postgres + MinIO + Temporal CLI (commit `58af02f` 2026-05-05). Required before running e2e tests on any ticket.
5. **Optional: Superpowers** — Cesar-endorsed structured-flow skill (*"the skill that I normally use when I need some structured flow so the AI doesn't produce slop or inconsistent results"*). Install paths attempted today both failed on marketplace schema errors:
   - Windows native v2.1.7 + official marketplace → `.claude → aclaude` path-mangling bug
   - WSL Ubuntu v2.1.29 + official marketplace → marketplace-schema validation errors
   - **Untried paths**: WSL alt-marketplace (`/plugin marketplace add obra/superpowers-marketplace`); manual `git clone https://github.com/obra/superpowers ~/.claude/plugins/installed/superpowers`

For today's M1-window prep (read plan/05 + verify SDKs + sketch T-M2-17), none of these were needed — read-only clone + Claude Code session was sufficient.

## Cesar's Superpowers install philosophy (from WhatsApp 2026-05-05 ~1:02-1:03 PM)

**Install scope**:
- **Cross-project / personal skills (incl. Superpowers)**: user-scoped at `cesar/.claude/` (his home dir's `.claude/`). Available across ALL his Claude Code sessions; not entangled with any one project.
- **Per-org / project-family skills**: at `workspaces/qdt/.claude/` (or similar — outside the repo). Keeps QDT-specific tooling isolated; doesn't mess other users' skills if they clone the repo.
- **Skill *outputs* (specs, plans, handoff prompts, iteration artifacts)**: committed to git in the repo at `docs/superpowers/`. The artifacts the skill produces ARE part of the project record; the skill itself isn't.

**For us**: install at `~/.claude/` (Windows: `C:\Users\farza\.claude\`) — user-scoped, NOT repo-scoped. When we use Superpowers on amira-mars, the iteration outputs land in `docs/superpowers/` of that repo (matches what we observed in OLD `amira` repo's `docs/superpowers/{plans,specs,handoff-prompts}/` directory structure).

**Invocation**: slash-commands per skill — `/brainstorming` then your prompt, `/writing-plans` for multi-step task breakdown, `/executing-plans` for impl with checkpoints, `/test-driven-development` for TDD discipline, etc. Cesar's quote: *"depending on the skill from superpowers you can do `/brainstorming` and then your prompt."*

**Useful when**: design-heavy / open-ended tickets (T-M3-39 SpecAgentWorkflow shell, T-M3-50 LLM-judge prompt v1, T-M3-44 out-of-scope guard algorithmic design, T-M3-51 detector orchestration). Less useful for mechanical "wire X into Y" tickets.

## All-owners ready pool extension (Cesar 2026-05-05 ~12:40 PM)

Cesar opened the all-owners ready pool to Ale + Rajvi via WhatsApp:

> *"@Mr Savino also here If you want to grab a ticket and code: `./scripts/whats_next.py ale` — That prints the full ready pool with owner labels visible. Pick anything that fits your hour. Run: `gh issue edit <NUMBER> --remove-label owner:cesar --add-label owner:ale` (For Rajiv is the same, substituting your name for `owner:rajvi` label) Then in Claude Code paste the prompt from the issue body."*

**For us**: not addressed to us — we have our own queue. Don't grab from the cross-owner pool unless explicitly asked. Stay in our AI-track lane (M2/M3/M5).

**However**: this means tickets currently labeled `owner:cesar` may get re-labeled `owner:ale` or `owner:rajvi` mid-flight. Don't be surprised if `whats_next.py cesar` queue shrinks unexpectedly — Cesar's tickets may shift to Ale/Rajvi.

## What "AI/LLM track" means in Amira (the framing Cesar handed us)

Cesar asked us 2026-05-05 evening: *"Did you want to take some AI/LLM related code bits or pure backend is fine?"* — we said yes to AI/LLM. Worth being explicit about what that scope actually covers since "AI/LLM" gets thrown around loosely.

**Our 18 tickets cover the entire intelligence layer of the platform.** If you stripped them out: auth/persistence/audit/deploy still work, but nothing intelligent happens — no specs get elicited, no code gets generated, no skills get called, no companion agents exist. Cesar handed us the AI brain.

### Layer 1 — How agents talk to LLMs (M2 — 4 tickets)

The plumbing under every LLM call:
- **T-M2-21** Classifier Activity — Haiku-class call routing each instruction (`edit` / `binding-or-schema` / `out-of-scope`). Cost gate before full-class model runs.
- **T-M2-24** Prompt-cache breakpoint planner — Anthropic `cache_control: {type: "ephemeral"}` per session.
- **T-M2-27** Versioned prompt registry — prompts as versioned files (`agents/spec/prompts/v1.txt`) with startup presence check + audit-tracked version per call.
- **T-M2-28** Adapter wiring — integration of LLM adapter (Cesar's shell) into agent runtime activities.

### Layer 2 — The three agents (M3 — 11 tickets)

**Spec Agent (T-M3-38, 39, 41)** — turns vague ideas into locked IEEE-830 specs via interactive elicitation.

**Build Agent guards (T-M3-44, 45)** — keeps Cesar's emit_edit/apply backend honest. Out-of-scope guard checks every tool call against the spec's capability graph.

**Skills layer (T-M3-47, 52)** — MCP Runtime Client + first concrete skill (QDL federation `qdl.search`/`qdl.fetch`).

**Compliance evaluators (T-M3-50, 51) + capability graph (T-M3-49)** — LLM-judge wrapper + detector orchestration that runs static-analysis + AC-tests + LLM judge per FR. T-M3-49 reads the capability graph that the out-of-scope guard checks against.

**Repo-import (T-M3-42)** — reverse direction: existing repo → inferred spec via AST + LLM analysis. Useful for migrating legacy apps to the platform.

### Layer 3 — Companion Agents (M5 — 3 tickets)

After an app deploys, every app gets a companion agent auto-synthesized at deploy time:
- **T-M5-15** `CompanionAgentManifest` synthesis — Build Agent emits manifest from spec graph
- **T-M5-17** `CompanionAgentWorkflow` (per-turn) — Temporal workflow running Anthropic Agent SDK loop against the synthesized MCP server, emits structured forced-tool calls (`emit_chart`, `emit_table`)
- **T-M5-16** Companion MCP handler — permission intersection (user's BU exposure ∩ spec's authorized capabilities) + OBO routing per call

### Day-to-day work breakdown

- **~70% Python backend code** — FastAPI handlers, SQLModel + Alembic migrations, Pydantic v2 schemas, httpx clients, MCP server impls
- **~20% Temporal workflow + Activity code** — workflows, signals, queries, retry policies, workflow.patched versioning
- **~10% prompt design + LLM tool-use schemas** — focused in T-M2-21, T-M3-50, T-M3-38

So "writing prompts" is real but a minority slice. Most work is code that orchestrates LLM calls and supports the agentic flow.

## Cesar's prerequisite pattern (2026-05-05 evening)

**Observed**: when Cesar's about to assign a ticket whose `Files to create / modify` list depends on something not yet in the repo, he ships the dependency FIRST and tells us to "take over after". 2026-05-05 evening example:

> *"let me see that there's a dependency for having the fastapi structure inplace... one sec I'll ship that and you take over after"*

So Cesar is shipping the `apps/api/` skeleton (main FastAPI app entry, configuration via pydantic-settings, routers/dependency-injection wiring) before assigning us our first AI/LLM ticket. Most likely ticket sequencing after his FastAPI skeleton lands:
1. **T-M2-27** Versioned prompt registry — simplest data-layer + REST route ticket; foundational for T-M2-24 + T-M2-21
2. Then T-M2-24 (cache planner uses registry) + T-M2-21 (classifier loads its prompt from registry)

## Our local Superpowers skill (2026-05-05 evening)

We wrote our own Mars-tailored Superpowers skill at `C:/Users/farza/.claude/skills/superpowers/SKILL.md`. It's a single skill (not 14 separate skills like the obra plugin) combining:
- The 4-phase Superpowers methodology (Brainstorming → Planning → TDD → Systematic Debugging) extracted from the WSL Claude
- Mars-build adaptations: per-ticket lifecycle ↔ Superpowers phases mapping; Cesar's 7 binding standards baked in; drift-flag discipline; dependency-aware execution order via `whats_next.py`; list of which of our 18 tickets benefit most from Phase 1 brainstorm vs which are mechanical

**Belt-and-suspenders**: the SKILL.md may or may not auto-discover in Claude Code Desktop (uncertain — `/plugin install` was disabled in v2.1.7). Backup is pasting the WSL Claude's extraction (`C:/Users/farza/Desktop/superpowers-custom-instructions.md`) into Claude Desktop's Settings → Custom Instructions.

WSL Claude Code already has the full obra/superpowers plugin v5.1.0 installed (via alt-marketplace path: `/plugin marketplace add obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace`). For Mars build work, recommend launching Claude Code in WSL, not Desktop.

## Cluster access (granted 2026-05-05 evening by Cesar)

Cesar made Farzaneh **admin on the `amira` AKS cluster** in QDT's Azure tenant. Setup details for `kubectl` access captured here for future sessions.

### Cluster identifiers

| Field | Value |
|---|---|
| Cluster name | `amira` |
| Resource group | `qdt-prod-amira` |
| Subscription | "Main QC Subscription" |
| Subscription ID | `9929674f-cd69-42d4-af13-4a24606ffe76` |
| Tenant ID (QDT) | `3239d969-53f5-49a6-91ec-43bf93d76714` |
| Region | East US |
| API server | `amira-suy26z03.hcp.eastus.azmk8s.io` |
| Kubernetes version | 1.35.3 |
| Network | Azure CNI Overlay, Pod CIDR `10.244.0.0/16`, Service CIDR `10.0.0.0/16` |
| Created by | cesar@qdt.ai |
| Created | 2026-05-05 ~3:00 PM EDT |

### Node pools verified via `kubectl get nodes`

5 declared, 4 visible (buildkit autoscales to 0):

| Pool | Nodes | Notes |
|---|---|---|
| `system` | 3 | k8s control-plane workloads |
| `platform` | 2 | FastAPI + Spec/Build/Deploy workers |
| `runtime` | 2 | Temporal worker pods |
| `workload` | 2 | Sandbox + deployed customer apps |
| `buildkit` | 0 (autoscale-to-zero) | Spins up on image build, scales back to 0 when idle |

### Local Windows CLI tools installed

| Tool | Path | Notes |
|---|---|---|
| Azure CLI (`az`) | Standard install (Program Files) | v2.86.0 — installed via MSI from `aka.ms/installazurecliwindows` (silent install required UAC; GUI install worked) |
| `kubectl` | `C:/Users/farza/.azure-kubectl/kubectl.exe` (newer v1.36.0) PLUS older v1.30.2 already on PATH (probably Docker Desktop) | Both work; older one wins on PATH order — fine for our purposes |
| `kubelogin` | `C:/Users/farza/.azure-kubelogin/kubelogin.exe` | v0.2.17 |
| `gh` CLI | `C:/Users/farza/bin/gh.exe` | v2.92.0, authenticated as `farfar1985`, scopes `gist, read:org, repo, workflow` |

### Access gap (deferred)

Cesar granted **cluster-resource RBAC** only — no Reader role at subscription or resource group scope. Local `az` CLI can't discover the subscription, so `az aks get-credentials --subscription 9929674f-...` returns *"Subscription not recognized"* even after `az login --allow-no-subscriptions`. Three confirmations of this gap:
1. Local CLI fails subscription discovery
2. Azure Portal panels for the cluster show "does not have authorization to perform `Microsoft.Resources/subscriptions/resourceGroups/read` over scope `MC_qdt-prod-amira_amira_eastus`" (the AKS auto-managed sibling RG)
3. Cloud Shell setup dialog only showed "Main QC Subscription" because Cloud Shell uses a different auth context than local az

**Workaround that worked**: Azure Portal → cluster overview → **Connect** button → **"Open Cloud Shell"** → pick PowerShell + "No storage account required" + Subscription "Main QC Subscription" → Apply. Cloud Shell auto-runs the 3 setup commands (`az account set` → `az aks get-credentials` → `kubelogin convert-kubeconfig`). `kubectl get nodes` then works in Cloud Shell.

**Optional fix to make local CLI work too** (deferred — not blocking): ask Cesar to grant Reader on `qdt-prod-amira` RG. After that, local `az aks get-credentials --subscription 9929674f-cd69-42d4-af13-4a24606ffe76 --resource-group qdt-prod-amira --name amira` would succeed. Cloud Shell works fine for now; only worth pursuing if local terminal becomes the friction point.

### Cloud Shell URL + namespace registration warning

Cloud Shell flagged the QDT subscription with: *"Subscription 9929674f-... is not registered to Microsoft.CloudShell Namespace. Please follow these instructions ... to register. In future, unregistered subscriptions will have restricted access to CloudShell service."* Doesn't block today; flagged to Cesar in passing — he can register the namespace when he has time.

### What kubectl access unlocks for our work

| Use case | Phase |
|---|---|
| Verifying cluster sanity (already done — 9 nodes Ready) | Now |
| Reading logs from our deployed services after PR merges + Argo Rollouts deploy | M2 onward (when our first ticket lands) |
| Debugging crashloop pods, missing service registrations, network policy issues | M2 onward |
| Watching Argo Rollouts BlueGreen progress + AnalysisRun (AC-runner) outputs | M3 / M4 |
| Sandbox-controller debugging for T-M3-42 (RepoImportWorkflow) | M3 |
| Companion MCP server pod inspection for T-M5-15/16/17 | M5 |

**Important nuance**: per architecture, **production observability lives in Kibana** (Elasticsearch + Fleet-managed Elastic Agents) — kubectl is the TACTICAL debug tool, not the primary log surface. M5 brings the observability infra; before that, kubectl is the only way. After that, Kibana for queries + retention + dashboards, kubectl reserved for crashloop / k8s-event / pod-state debugging that Kibana can't show.

**Self-sufficiency win**: the FinIQ-on-Mars pattern of "ping Cesar to send me the logs" is over for QDT-internal Amira deploys. We read logs ourselves. Mars's eventual deployment is separate (different cluster in Mars's Azure subscription) — that path TBD when Mars takes the platform live.

## Today's deliverable: T-M2-17 NarrationEvent sketch

**File**: `D:/Amira FinIQ/T-M2-17_NarrationEvent_Sketch.md` (local only, NOT in repo).

**Contents**:
- File layout (`apps/runtime/narration/{events.py, envelope.py, encoder.py, tests/}`)
- Implementable Pydantic v2 discriminated union lifted verbatim from plan/05 §3.1 (14 event subclasses + `NarrationEnvelope` wrapper)
- Tests outline (round-trip per kind, exhaustive-discriminator test, encoder test, golden-trace `narration_envelope_v1.json`)
- Acceptance criteria mapped to plan/05 §9 ACs (AC-RT-1, AC-RT-2, AC-RT-7)
- Estimated implementation effort: ~4 hours focused work post-Cesar-resolution-of-open-questions
- 6 open questions (G-1 through G-6) for Cesar to sign off on before lock:
  - **G-1**: `args_preview` redaction — producer's contract or encoder's? **Recommended**: producer redacts; encoder ships verbatim
  - **G-2**: Voice instruction text — on `InstructionReceived` or follow-up event? **Recommended**: follow-up event after transcription Activity
  - **G-3**: Should `kind` distinguish chat/tool-confirm/decision/voice? **Recommended**: single event + `instruction_kind` field at v1
  - **G-4**: Outbox `kind` column tagging convention vs `NarrationEvent.kind` discriminator — **Recommended**: producer tags outbox row `audit-<event_kind>` when audit-relevant
  - **G-5**: `NarrationEnvelope` schema versioning — **Recommended**: `schema_version: int = 1`; TS hook log-and-skips unknown kinds
  - **G-6**: TypeScript types — codegen or hand-mirror? **Recommended**: hand-mirror at v1; codegen when union grows past ~20 kinds

**Status**: ready to share with Cesar via WhatsApp attachment. Offered in the M1-window-wrap message sent end-of-session 2026-05-05.

## Files we've already read (some partial)

- `README.md`, `CLAUDE.md` (repo's), `PLAN.md`
- `plan/00-engineering-standards.md` (full)
- `plan/_DISPATCH.md` (full)
- All 17 area files (most full; areas 05/08/11 partial; 14/15/16/17 read fully)
- `architecture/00-context.md` (full, 491 lines)
- `architecture/04-decisions.md` (full, 742 lines, all ~73 decision IDs)
- `architecture/05-architecture.md` (full, 2,129 lines)
- `architecture/01-feature-inventory.md` (full, 1,512 lines, 107 capabilities)
- `architecture/01b-demo-theater-inventory.md` (full)
- `architecture/02-questions.md` (full, 1,436 lines, 56 questions)
- `architecture/CHANGELOG.md` (full — the 6 simplification iterations)
- `architecture/mars/01-mars-deployment-profile.md` (full)
- `architecture/mars/02-mars-conversation-agenda.md` (full — 12 tracks)
- `architecture/03-research/MTEN-1-multi-tenancy-boundary-model.md` (full)
- `architecture/03-research/A-agent-runtime-orchestration-skill-execution.md` (full — 1050 lines)
- `architecture/03-research/B-build-preview-deploy-infrastructure.md` (full)
- `architecture/03-research/C-persistence-and-audit.md` (full)
- `architecture/03-research/DEPLOY-1-deployment-topology.md` (full)
- `architecture/03-research/K8S-TOPOLOGY-engineering-frame.md` (full)
- `DEMO_FLOW.md`, `DEMO_VALIDATION_REPORT.md`, `DESIGN.md`, `DECK_RECONCILIATION_REPORT.md`
- `docs/implementation/TECHNICAL_EXECUTION_PLAN.md` (full)
- `docs/implementation/STAKEHOLDER_ROADMAP.html`

## Files still pending read (resume when useful)

- `architecture/03-research/LLM-1-llm-key-management.md` — relevant to T-M2 work
- `architecture/03-research/SANDBOX-RUNTIME-engineering-frame.md` — relevant to T-M3-42 sandbox work
- `docs/AMIRA_PITCH_DECK.md`
- `docs/superpowers/plans/*` (3 files)
- `docs/superpowers/specs/*` (4 files)
- `docs/implementation/STAKEHOLDER_ROADMAP.md` and `.status.json`
- `lib/mocks/*` (16 data shape files), `lib/theme/routeMap.ts`, `lib/utils.ts`
- `app/` route structure
- `components/` composition primitives
- `package.json` and root config files
- **`plan/05-agent-runtime-and-job-communication.md` — full read** (we had partial coverage; this is Cesar's M1-window homework #1)

## Related memories

- [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md) — superseded by amira-mars `architecture/` directory. Use for historical context only.
- [project_amira_platform_repo.md](project_amira_platform_repo.md) — old `amira` repo with PR #1 (Phases 1.0–1.6). Many patterns carry into amira-mars.
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Mars commercial track. This deployment is the implementation of that.
- [project_next_session.md](project_next_session.md) — current standing-by/build state.
- [project_distributed_agents_track.md](project_distributed_agents_track.md) — Track 2 distributed agents (paused; Mars on Track 1).
