---
name: empowered-spec-agent-spike
description: "2026-06-04 — LOCAL spike (NO git push) of the Empowered/Autonomous Spec Agent (Rajiv-approved proposal). Prompt-only changes: completeness-checklist v2 (data-model / domain-content / deployment / etc. as structured sub-trees + a #669 grounding hook) + 2 reliability fixes (kickoff cap; OOS fail-open-on-judge-error). Drove 2 full grounded financial specs via Temporal signals (headless). Final spec e9fd5072 = 63 reqs (53 FR + 10 NFR) / 21 nodes / 31 edges / 31 ACs / 4-4 gaps + 1-1 dp resolved, grounded in real FinSight schema → ~88-92% of FinIQ depth, EXCEEDS on rigor. IEEE PDF on Desktop (Amira_SpecAgent_Spec_IEEE.pdf, 17pg). BIG finding: the Spec→Build handoff (serialize.py → spec.md) DROPS the capability graph + graph-stored ACs → the build receives 0 ACs + no architecture. Future steps (pending decision): P0 = handoff serializer fix (Cesar's seam → file a FINDING ticket, don't fix ourselves); P1 = add UI/UX capability to the Spec Agent + the empowered-agent roadmap (package for Cesar); P2 = machine contracts / e2e scenarios / edge cases. All spike edits LOCAL + UNCOMMITTED."
metadata:
  node_type: memory
  type: project
  created: 2026-06-04
  updated: 2026-06-04
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## ⭐ 2026-06-09 UPDATE — PR #728 MERGED + DEPLOYED; empowered interviewer LIVE on `amira.qdt.ai`, validated on the cluster

Cesar **merged #728** (squash `ce0f9f0`), **sharpened our OOS cap-fix** (`23784d0`), and **redeployed** the cluster. The empowered interviewer is now live on `amira.qdt.ai`. Full log: **CLAUDE.md `2026-06-09` entry**.
- **His cap-fix improvement (`23784d0`):** our PR *raised* the OOS judge caps (rationale 500→2000, remediation 300→600); Cesar **REMOVED them entirely** — `rationale: str = Field(min_length=1)`, `suggested_remediation: str = Field(default="")` — because raising "only moved the wall (800 tokens ≈ 3200 chars), removing it kills the class — same as the #681 regex removal." **He also caught a SECOND latent cap I missed:** `agents/spec/out_of_scope.py` `OutOfScopeVerdict.reason` (the per-turn detector, runs every refinement) capped at 160 chars → removed. **Lesson:** REMOVE the cap (don't raise), and trace BOTH OOS schemas (judge + detector). Banked in `feedback_smoke_test_llm_tool_use_pre_commit.md`.
- **LIVE cluster validation — simple to-do spec (`amira.qdt.ai/spec/db2cf350`):** interviewed to completeness, reached terminal *"v1 spec is COMPLETE and ready to lock … 14 FRs, 4 NFRs, 13 ACs, 11 nodes (10 edges), data model FR-11, PWA deploy FR-9/10, no open gaps/DPs. Use the Route for E-Signature control."* — the **terminal-message UX fix works live** (declares complete + points to the button, no chat-lock invite). 0 false-blocks; proportionate.
- **State:** #728 done; spike work is now production via Cesar's merge. **NEXT = test a MEDIUM-sized prompt on `amira.qdt.ai`** (Farzaneh drives, screenshots; no cluster DB → Temporal UI is the backup), then demo with Rajiv. The 4 adjacent findings + #725 (handoff serializer) + #726 (roadmap) remain Cesar's lane / open. Spike-branch edits below stay LOCAL/uncommitted (revert later); worktree `D:/amira-mars-interviewer` can be torn down.

---

## ⭐ 2026-06-08 UPDATE — the spike became **PR #728** (empowered interviewer shipped + live-validated)

The spike (this doc, 2026-06-04/05) was turned into a **real, clean PR for Cesar** — the path to getting the empowered Spec Agent onto `amira.qdt.ai`. Full log: **CLAUDE.md `2026-06-08` entry**. Key deltas from the spike:

- **Built off FRESH master, not the spike branch.** New git worktree `D:/amira-mars-interviewer`, branch `spec-agent-empowered-interviewer`, off **`ec40bec`**. Spike tree `D:/amira-mars` (`spec-agent-completeness-spike`, uncommitted) left untouched. **PR #728**, 2 commits, clean FF, ruff-clean, backend-only.
- **The spike's OOS fail-open was DROPPED** — confirmed it's a genuine **ORCH-4 inversion** (the workflow verdict really carries `judge_error_detail`), so it does not belong in the PR. The live test then found the **real root cause** of the false-blocks: the OOS judge (`oos_judge.py`) caps `rationale` at `max_length=500` but has `_OOS_JUDGE_MAX_TOKENS=800`, so on a deep spec Sonnet's rationale overflows → Pydantic-fail → judge-error-block → legit refinement rejected. **Fix = raise the cap (500→2000, remediation 300→600)** to match the budget. Latent on master too. This REPLACES the fail-open with a clean root-cause fix (no ORCH-4 sign-off needed). Lesson: `feedback_smoke_test_llm_tool_use_pre_commit.md`.
- **Two prompt clauses added from the live test:** a **self-limiting clause** (cap ~6-8 entities/turn, group large item-sets, smaller turns as the spec grows — mitigates the `elicit_turn` 12-iteration over-bloom we hit when the agent tried "one FR per artifact" × 18 prompts) + a **terminal-message rule** (on completion: stop, declare ready-to-lock, point to the Route-for-E-Signature button, never invite a chat-"lock it").
- **Live-validated end-to-end (real Opus, real services):** deep financial spec (`d7306519`, 33 FR / 17 nodes / 22 ACs grounded in real FinSight schema, **9 OOS allows / 0 blocks**) + simple tip calc (`a1c76506`, 11 FR, proportionate, **reached "ready to lock"**). The exact instruction that false-blocked now passes.
- **The P0 HANDOFF FINDING (#725) is still separate + open** — NOT in this PR. PR #728 is the interviewer + OOS hardening; the Spec→Build serializer dropping the graph + ACs remains Cesar's seam (#725 filed). #726 (capability roadmap) also still open.
- **State:** PR #728 awaiting Cesar's review → merge → redeploy. If deployed → test the interviewer with Rajiv. 4 adjacent findings flagged in the PR body (iteration-cap / control-command OOS / Retry-no-op+queue / no ready-to-lock UI signal). The spike-branch edits below remain LOCAL/uncommitted (revert later) — the PR is the canonical home for this work now.

## What this was
Rajiv approved trying the **Empowered/Autonomous Spec Agent** proposal (`D:/Amira FinIQ/Spec_Agent_Autonomous_Proposal.md`). Farzaneh's directive: build it as a **LOCAL spike, test it, evaluate the generated spec vs FinIQ — without pushing anything to git**. If good → package for Cesar (he tickets/assigns the production build). We did the spike end-to-end on 2026-06-04.

## What we built (LOCAL, prompt-only — no new tools, no migrations, no git push)
All in `D:/amira-mars` working tree (DIRTY, uncommitted):
1. **`agents/spec/prompts/v1.txt` — completeness-checklist v2.** Extended the spike-1 interview checklist: added aspect 12 (Domain content library) + a **"Going deep — INTERVIEW TURNS ONLY"** block that drives **data model / integrations / domain-content** as structured sub-trees (parent FR + one child per entity/artifact) AND a **#669 grounding hook** ("ASK the user for their schema/API-doc/report-list; ground the spec in real names, never invent"). Also **hard-capped the kickoff** to a baseline (6-10 top-level FRs + immediate sub-FRs; NOT the deep aspects) — the depth work is interview-turn-only.
2. **OOS fail-open (`runtime/agents/spec/workflow.py`)** — the OOS gate now **proceeds instead of block-loud when the judge ERRORS** (`judge_error_detail` set) rather than returning a real out-of-scope verdict. A genuine OOS verdict still blocks; kickoff still blocks-loud. (Inverts ORCH-4 "block-loud on error" — flagged as Cesar's call.)
3. **OOS judge timeout** (`agents/spec/out_of_scope.py`) — `_JUDGE_TIMEOUT_SECONDS` 8.0 → 60.0 + `_OOS_CHECK_TIMEOUT` 30→90s (belt-and-suspenders; the 8s soft timeout was the proximate cause of intermittent error-blocks).
4. **Driver scripts** (`apps/api/scripts/`, untracked): `phase12_drive_spec.py` (kickoff), `spike_followup.py` (one interview turn via Temporal signal + poll; has OOS-block fast-exit), `spike_export_ieee.py` (IEEE-830 reportlab PDF from the live spec), `spike_native_export.py` + `spike_export_spec.py` (export experiments).

**Spike fidelity (honest):** #668 (section tools) = prompt-driven sub-trees via the EXISTING `propose_requirement`, NOT real typed tools. #669 (grounding) = instruction-injection (I pasted the real FinSight schema + the analytical-content set as the user's answers), NOT a wired KB-attach. The OUTPUT is real; the production build is the real work.

## The result — methodology VALIDATED
Two full grounded drives (financial brief, headless via Temporal signals; org-orphaned org `ceb0981f`, not viewable in the UI):
- **`acae0c10`** (first drive) — grounded data model + content library landed, but deployment/compliance/risks got OOS-blocked → **~78%, incomplete**.
- **`e9fd5072`** (second drive, after the OOS fail-open fix) — **uniformly complete**: 63 reqs (53 FR + 10 NFR), 21 nodes / 31 edges / 31 ACs, **4/4 gaps + 1/1 dp resolved (lock-eligible)**. 14 top-level FRs incl. FR-10 data model [7 grounded `finsight_core_model` entities], FR-11 content library [11 — 6 KPIs formula-bound + 5 report templates], FR-12 redaction, FR-13 risks register [7], FR-14 deployment [4]. **IEEE PDF on Desktop: `Amira_SpecAgent_Spec_IEEE.pdf` (17 pages).**
- **The fail-open fix was verified live**: deployment/compliance/risks (blocked 4× in the poisoned first session) ALL landed cleanly in the fresh session.

**% vs FinIQ: ~88-92%, exceeds on rigor** (31 measurable ACs, 21-node/31-edge DAG, KPIs bound to real `finiq_account_formula` rows, every gap/dp resolved with provenance). The last ~8-12% FinIQ edges = expert-curated taste (the exact 18 prompts, KPI nuance). KEY reframe: **FinIQ's "spec" was a multi-document suite** (SRS + Frontend Design Guideline + Testing Agent SRS + architecture doc, multi-author, multi-week). The Spec Agent's value = **consolidate that suite into one grounded spec in ~30 min.** Produced from 1 sentence + ~6-7 grounded interview answers.

## Bug ledger (the real packaging value)
| # | Finding | Status |
|---|---|---|
| 1 | **Kickoff over-bloom** — depth pressure made the kickoff try the whole spec (46 FRs) → elicit timeout → 0 persisted | ✅ FIXED (kickoff cap in v1.txt) |
| 2 | **OOS judge false-blocks legit refinements** — root cause: 8s soft timeout (`out_of_scope.py`) on a Sonnet judge whose input = the FULL (growing) capability list → latency scales with spec size → intermittent error → ORCH-4 block-loud. Bumping the timeout (8→25→60s) did NOT fully fix it. | ✅ FIXED + VERIFIED via **fail-open-on-judge-error** (workflow.py). Real production fix = fail-open-on-refinement **+ stop re-reading the whole graph each turn** (Cesar/ORCH-4 call). |
| 3 | **FR-ID / AC-ID collision** — agent reuses already-taken IDs (it can't see the full taken set); risks register reused FR-13 and **clobbered the deployment FR-13** → deployment silently lost until re-added as FR-14. Ties to **#681 principle: IDs are system concerns, the LLM shouldn't mint/pick them.** | ⚠️ NOT fixed — worked around by pinning numbers; **next must-fix** (system should assign IDs). |
| 4 | **HANDOFF FIDELITY (the big one)** — `domain/spec/serialize.py` `render_spec_markdown` → `/workspace/.amira/spec.md` (the Build Agent's "primary context") renders FRs / NFRs / decisions / open gaps ONLY. It **DROPS the capability graph (nodes/edges = architecture + dependencies)** AND reads ACs from `spec_requirement` (kind=AC) while the Spec Agent stores ACs as graph `acceptance_predicates` → a real spec hands the build **0 acceptance criteria + no architecture.** UI: spec.md has **no design/component/screen section** → the build guesses the frontend. | 🔴 Surfaced (code-evidenced). **P0 future step — Cesar's seam.** |
| 5 | Agent refused a mismatched dp-1 resolution + flagged it | ✅ POSITIVE — honesty behavior working |

## Future steps (UPDATE 2026-06-04 — Bucket C/D FILED + spike shared with team)
**STATUS:** IEEE PDF cleaned (trimmed derived front-matter §1.3 glossary + §2 Overall Description, renumbered 1/2/3, fixed a literal-markup render bug in `spike_export_ieee.py`; 15pg, valid) + **shared with the team** (Amira GenAI) → **strong reaction**: Rajiv *"exactly what we need / we need this in the Amira flow / nice job"* (awaiting Ale; Farzaneh has minor tweaks in mind). Message reframed to comparable requirement coverage (53 FR vs FinIQ's 52), NOT page-for-page, to pre-empt the 75-vs-15-page question. **The handoff finding + loophole list were kept OFF the team thread — Cesar only.**
**FILED (per-action confirmed):**
- **#725** — P0 handoff finding (`needs-design` + `track:backend`, framed as a QUESTION). **Re-verified on current master `4004337`** (Cesar's #719 Build Agent redesign did NOT change it): `render_spec_markdown` (`serialize.py`) is the build's only spec context (sole consumer = `build/activities/seed_spec_in_sandbox.py`), never loads `spec_capability_graph`, reads ACs from `spec_requirement(kind=AC)` while the agent stores them as graph `acceptance_predicates`. Live DB on `e9fd5072`: `spec_requirement` FR 53 / NFR 10 / **AC 0** vs graph **31 ACs** → build receives **0/31 ACs + 0/21 nodes**. Body carries the recommended fix (load materialized graph → render Architecture section + ACs from `acceptance_predicates`).
- **#726** — P1/P2 empowered-agent capability roadmap (`needs-design` + `track:ai-agent`): web grounding + UI/UX aspect + system-assigned IDs; cross-links #669/#668/#670/#689 + references #725.
**Full Cesar plan:** A = merge **#689** (built CRUD + nested sub-FRs) · B = existing **#669** (KB, top value) / **#668** (section tools) / **#670** (doc chrome) · C/D = **#725 / #726**. Suggested order: #669 → #725 → #668 → UI/UX → web grounding → system-IDs → #670.
**NEXT (Friday):** test the empowered-interview capability in the LOCAL UI (interview prompt is local-spike-only) to feel the UX. Then await Cesar's review of #725/#726 + merge of #689.

Governance: **P0 + P1 are Cesar's territory** (his Spec/Build contract + Spec-Agent-core). We propose; he tickets/assigns. We're well-positioned to be ASSIGNED. Do NOT fix his core seams ourselves (not even prototype P0 in the spike as "the fix").
- **P0 (highest ROI, lowest effort, HIS seam):** fix the handoff serializer so spec.md carries the **acceptance criteria** (serialize graph `acceptance_predicates`) + the **capability graph** (components + dependencies). The depth the Spec Agent already builds is currently invisible to the build. → **File a FINDING ticket** (framed as a question — "is this intentional?" — not "bug"), with the `serialize.py` evidence + recommended fix. Don't fix ourselves.
- **P1 (genuine missing CAPABILITY):** add a **UI/UX aspect** to the Spec Agent (design system / screen inventory / flows / states) + serialize it → the build has no design input today. Part of the empowered-agent roadmap package.
- **P2:** machine-readable contracts (real schemas/types, not prose) · system-level e2e acceptance scenarios · edge-case / unhappy-path pass.
- **The package for Cesar:** the spike result (PDF as proof) + validated methodology + this bug ledger (P0 handoff = headline; system-assigned IDs = next) + the P1/P2 roadmap. Decision pending on file-ticket-now vs assemble-full-package.

## Local-stack / hygiene state at session pause
- **Working tree DIRTY + UNCOMMITTED** (no git push, per Farzaneh): edits to `v1.txt`, `out_of_scope.py`, `workflow.py` + 5 untracked scripts in `apps/api/scripts/`. **To be reverted later** (production = Cesar's tickets). The fail-open + timeout + prompt edits exist ONLY in this local tree.
- Local stack still up: Docker (postgres/temporal/minio), backend (WSL uvicorn :8000), worker v7 (WSL, fail-open loaded), frontend (Node 20 :3000). DB creds amira_dev/amira_dev_pwd/amira_dev.
- Two spec_versions live in local Postgres: `acae0c10` (incomplete) + `e9fd5072` (complete) — both org `ceb0981f` (org-orphaned, not in the UI). The IEEE PDF on Desktop is from `e9fd5072`.
- The first session (`d85090e8` / the poisoned one) has 7 OOS-block events in its Temporal history → CANNOT be continued with the fail-open code (replay non-determinism). Fresh sessions only. (Rollout note for Cesar: in-flight sessions need Temporal's versioning API.)

## Source of truth
- `D:/Amira FinIQ/Spec_Agent_Autonomous_Proposal.md` — the approved proposal.
- `D:/Users/farza/Desktop/Amira_SpecAgent_Spec_IEEE.pdf` — the final complete grounded spec (the artifact).
- CLAUDE.md `2026-06-04` entry — session summary + pointer here.
- `feedback_verify_consumer_receives_not_just_producer_emits.md` — the handoff lesson.

## LIVE-UI validation (2026-06-05) — 7-property PASS, driven in the actual product UI
Beyond the headless drives above, ran the empowered agent **live in the local UI** (Farzaneh typed in the chat; I watched each turn land via DB polling + read the spec via Claude-in-Chrome). Three fresh sessions under Farzaneh's real org (UI-visible, unlike the headless org-orphaned `e9fd5072`):
- **`b13f1703` (financial)** — interview → **37 FR / 7 NFR / 14 nodes / 20 edges / 14 ACs**, grounded in real Databricks / `finiq_account_formula`; agent declared **"spec is complete and ready to lock"** (~9-10 rounds; every turn landed, no over-bloom).
- **`e4859560` (tip calculator)** — **8 FLAT FRs** (agent narrated the "simple = flatness signal" reasoning), N/A'd warehouse/compliance/RLS/KPI/roles, **"complete, ready to lock" in ~2 rounds**. Then "currency → USD-only" → **updated FR-7 in place** (no append; FR count stayed 10) + cascaded to FR-9 + superseding ACs. **Proportionality + editability proven.**
- **`b94b06b3` (haiku)** — off-topic kickoff **BLOCKED** by the empty-graph judge (#624): 0 spec content; `spec.out-of-scope-kickoff-block` + `out-of-scope-blocked` emitted. (Saw `out-of-scope-second-pass-block` fire too — both OOS paths work.)

**Scorecard:** deep ✓ · proportionate ✓ · terminates ✓ · editable ✓ · honest-at-limits ✓ · non-coder-friendly ✓ · scope-guarded ✓. The completeness checklist is a **fixed 12 aspects** that skips N/A and has a terminal "ready to lock" state (not infinite); **no coding questions** (Build Agent owns the HOW).

**New finding (the graph half of #681's "finish CRUD") → commented on #681** (issuecomment-4633346303): the agent can edit **requirements** but has **no tool to deprecate capability nodes/edges/ACs** → an edit that supersedes a capability orphans graph artifacts. The agent **honestly raised `gap-cleanup-currency`** rather than faking the delete (C1 working at a real limit). Backend already supports it (**#693** closed — `apply_delta` deprecation + orphan-AC cleanup); only the agent **tool surface** is missing. Ties to **#725** (orphans reach the build).

**UI/UX candidates (NOT filed — Cesar's frontend/state lane; ask Farzaneh first):** stuck "Responding…" survives page refresh after a completed turn · double-rendered agent summary (#653-class) · stale spec-doc panel needs manual refresh (#690) · kickoff AC `assertion_kind` invalid-then-retry (self-recovers) · `spec_chat_message` table empty mid-session (chat = outbox reconstruction; no durable transcript).

**Tooling banked:** browser `javascript_tool` chat reads get privacy-blocked on the session UUID (`[BLOCKED: Cookie/query string data]`) → DB-poll instead (`spec_chat_message` is empty; outbox payload doesn't carry the spec_version_id literally). Worker needs `.env` sourced (reads `AMIRA_DB_DSN` from os.environ directly). **Spike edits remain LOCAL + uncommitted (revert later); local stack left up.**
