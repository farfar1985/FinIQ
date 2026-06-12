# Spec Agent Redesign Map — Direction D as Locked 2026-05-21

**Status (2026-05-23 morning): DIRECTION D EXECUTION COMPLETE. 12 of 12 execution tickets shipped (originally 11; ticket 12 added this morning during Phase 12 design study). ASSESSMENT PR #376 MERGED 2026-05-23 morning as `93170ef`. ALL 12 EXECUTION PRs (#377-#385, #387, #388, #390) OPEN in Cesar's review queue — verified 0 reviews + 0 comments. Phase 12 e2e testing in progress — dev stack live in WSL Ubuntu.**

## Today's additions (2026-05-23 morning)

**Ticket 11** (PR #388 commit `afabcd2`) — bidirectional Build → Spec replan signal per Cesar's Q4 lock. New `SpecAgentWorkflow.request_spec_replan` signal handler + Build-side `signal_spec_replan` Activity using Temporal `client.start_workflow` with `start_signal` + `start_signal_args` for atomic signal-with-start. Predictable workflow_id pattern `spec-replan-from-build-{build_session_id}-{count}`. 3-emit cap with `agent.replan-cap-reached` audit. 8-pick brainstorm; D4 picked "reuse ITERATING state" (NOT new `iterating-replan` enum value). 4 real-Postgres tests 3× green on Windows.

**Ticket 12** (PR #390 commit `c40d026`) — build-readiness scorecard, **last-minute addition by Farzaneh** during Phase 12 study. 5-phase deep study with 5 parallel research agents pulling from spec-kit `/analyze` + Karpathy eval framework + FinIQ compliance matrix. 7-dimension weighted scorecard as the **THIRD lock-gate** inside `request_lock` (after readiness + consistency). 4 Haiku judges + 5 deterministic dims. Composite ≥85 + no dim <70 → pass; failure → workflow stays RUNNING + emits findings narration + Spec Agent iterates (Karpathy keep-or-revert). 6 real-Postgres tests 3× green on WSL Python 3.13. Design doc at `docs/superpowers/specs/2026-05-23-build-readiness-scorecard.md`. Pattern banked as `feedback_build_readiness_scorecard_pattern.md`.

**Phase 12 setup**: dev stack booted in WSL Ubuntu (Windows-side blocked by aiohttp + Python 3.14 incompatibility — known bleeding-edge issue with aiohttp wheel). WSL venv at `apps/api/.venv-wsl` (Python 3.13.11). All ports open: backend :8000, worker :8081, frontend :3000, Postgres :5432, Temporal :7233, MinIO :9000. Farzaneh logged into UI. **F1 banked** in `project_phase12_observations.md`: ticket 1's `lookup_skill` tool hard-deps on PR #374 (Skill Catalog read APIs, currently OPEN). Ticket 12's dim 2 has same dep + gracefully degrades to score=70 floor.

**Phase 12 testing target**: validate the assessment doc's claim *"Spec Agent exceeds Build Agent in 18 capabilities"* with real sessions via 5 e2e scenarios. Karpathy keep-or-revert log into `project_phase12_observations.md`.

---

**Original status (2026-05-22 EOD, preserved for history): 8 of 11 execution tickets shipped. ASSESSMENT PR #376 + EXECUTION PRs #377/#378/#379/#380/#381/#382/#383/#384 all OPEN in Cesar's review queue. 3 remaining tickets (9, 10, 11) deferred to fresh-context morning session 2026-05-23 + day of Spec Agent end-to-end testing.**

Cesar delegated Spec Agent strategic assessment 2026-05-21 morning. Phases 1-9 done same day (framing + lock reading + code mapping + 5 parallel reference studies + gap matrix synthesis + Direction D thesis writeup + plan/arch back-prop + manual e2e plan + PR #376 opened). All 4 Cesar questions answered same evening. **Execution tickets 1-8 shipped 2026-05-22**, all chained PRs auto-rebasing to master when upstream merges.

## Direction D — Synthesis

**Keep:** workflow shell + classifier dispatch + domain layer (capability graph DSL, 6-row readiness rubric, 10 SQLModel rows, two-pass OOS detector, Bloom filter — all locked, all good).

**Change:** move ReAct tool-use loop INSIDE `elicit_turn` Activity using Anthropic SDK (not PydanticAI — per Cesar's Q2 flip). Mirror Build Agent's pattern from `process_build_instruction.py`.

**Add:** compaction + checkpoint policy + turn-cap (mirror Build Agent's compaction.py and T-M3-45 checkpoint pattern I shipped 2026-05-21). Wire classifier verdict (closes T-M3-40). Wire readiness (closes T-M3-38). Wire Layer-2 OOS judge. Steal `/analyze` consistency check from spec-kit; `assume-and-propose with decision_point markers` from Cesar's Build Agent WhatsApp (NOT spec-kit's `/clarify` batch — Cesar's pattern wins).

## Cesar's 4 answers (received 2026-05-21 evening)

| Q | Answer | Implication |
|---|---|---|
| Q1: AGENT-TOPO-1 amendment or new AGENT-TOPO-2 | Amend AGENT-TOPO-1 to cover both agents | Drop "via PydanticAI Agent" from amendment text; use "single-agent ReAct loop with tools, inside Activity boundary, classifier-routed for chat-mode agents" |
| Q2: PydanticAI codebase-wide | NO — stay on Anthropic SDK; PydanticAI separately for Mars-prep | All 11 tools hand-rolled with Anthropic SDK; no framework swap in this iteration. See `feedback_anthropic_sdk_stays_qdt_pydanticai_for_mars.md` |
| Q3: Cross-spec learning from org history | OUT of scope; file follow-up ticket for post-demo | Drop from Direction D (was 19 capabilities, now 18); file `Spec Agent — cross-spec learning from org history (RLS-scoped within-org)` for post-demo |
| Q4: Build → Spec replan signal (Cline pattern) | YES v1 — "what makes specs → development loop bidirectional" | New `SpecAgentWorkflow.request_spec_replan` signal (handler on Spec; emit from Build). See `feedback_bidirectional_spec_build_loop.md` |

## 18-capability AFTER table vs Build Agent

| Capability | Build today | Spec today | Spec after D |
|---|---|---|---|
| Loop topology | ReAct + 9 tools (Anthropic SDK) | 5-Activity chain, 1 forced tool | ReAct + 11 tools (Anthropic SDK, mirroring Build pattern) |
| Compaction | 100K tok / 50 turns | none | 80K tok / 50 turns (mirrored) |
| Token-budget tracking | per-turn 8K + cumulative | none | per-turn + cumulative + cache_read |
| Max-turns cap | 50 | none | 50 + extension prompt |
| Checkpoint policy | none | none | mirror T-M3-45 (apply-mutation-60s + paused + awaiting-confirm) |
| Tool surface | 9 file-ops | 1 forced | 11 spec-tools |
| Permission gates | 3-mode + confirm | none | 3-mode + confirm + LM-ergonomic I/O audit |
| Audit kinds | 11 | 8 | 8 + 8 new = 16 |
| Classifier verdict | N/A | discarded | wired to sub-prompt persona |
| Streaming to UI | NO | NO | YES (Anthropic streaming + thinking) |
| Extended thinking | NO | NO | YES (budget=10K, summarized) |
| Parallel tool calls | sequential | N/A | YES (Anthropic API native, hand-rolled dispatch) |
| Prompt caching tiers | 1-level | none | 4-breakpoint: tools 1h + system 1h + KB 5m + conv auto |
| Pre-lock consistency check | NO | NO | `verify_spec_consistency` Activity (spec-kit `/analyze`) |
| Layer-1 Bloom OOS | NO | YES locked | YES kept |
| Layer-2 LLM OOS judge | NO | stubbed | YES wired |
| Typed capability graph | consumes | produces | produces (richer — mid-turn proposals via tool) |
| Readiness rubric | NO | stub | LIVE (wired to workflow + UI) |
| Reviewer linter | side-call | side-call | tool-callable mid-turn (`scan_for_leaks`) |
| Spec.md companion export | NO | NO | YES on lock (Cursor pattern) |
| Current-vs-Proposed diff at lock | N/A | NO | YES (Copilot Workspace pattern) |
| Build→Spec replan signal | NO | NO | YES v1 (Cline pattern, locked by Cesar's Q4) |
| Phase: commentary/final_answer SSE | NO | per-envelope | YES (OpenAI o1 pattern) |
| Capability graph visual UI | N/A | NO | YES (Cytoscape or D3) |
| Per-token streaming UI | NO | per-envelope | per-token into single bubble |
| Thinking panel UI | N/A | NO | YES collapsible reasoning log |
| Evaluator-Optimizer pass | NO | NO | YES after `finalize_turn` |
| Plan-as-checklist at turn 1 | analogous | NO | YES (Cesar's Build Agent WhatsApp pattern) |

## 11 Tools inside elicit_turn (Anthropic SDK, hand-rolled schemas)

1. `query_capability_graph(node_id?, kind?)` — read current graph state
2. `lookup_skill(skill_id_or_query)` — uses PR #374 skill catalog APIs
3. `fetch_kb_chunk(query, top_k=5)` — KB indexing pipeline (T-M3-06)
4. `propose_capability_node(node)` — append to capability_graph_delta
5. `propose_acceptance_predicate(predicate)` — append to capability_graph_delta
6. `raise_decision_point(decision_point)` — emit decision-point
7. `raise_gap(gap)` — emit gap
8. `finalize_turn(reply_text, kind_hint)` — close the loop
9. `scan_for_leaks(section, prose)` — call reviewer linter mid-turn (T-M3-41)
10. `lookup_reference_architecture(query)` — pattern matching from `agents/spec/templates/`
11. `propose_template(template_id)` — seed SpecCapabilityGraphSeed from starter

## 11-ticket execution sequence

Backend (sequential — each builds on previous):
1. ~~**Ticket 1: Anthropic SDK ReAct loop in elicit_turn + 10 tools.**~~ **✅ SHIPPED 2026-05-22 as PR #377.** Combined original tickets 1+2 into one PR (loop + all 10 v1 tools; 3 deferred tools per `feedback_tool_surface_no_not_wired_slots`). Plus migration foundation-drift-fix bundled (5 activities to nested dir). 3× green real-Anthropic verification. Brainstorm flips during build: dropped `finalize_turn` tool (Build Agent house-style); max-iterations 12 (not 8); full activities migration.
2. ~~**Add 8 more tools.**~~ **MERGED INTO TICKET 1.**
3. ~~**Spec session compaction Activity** mirroring Build Agent's compaction.py. 80K threshold, tool-pair boundary safety.~~ **✅ SHIPPED as PR #378.**
4. ~~**continue_as_new wrapper + observable session counters.**~~ **✅ SHIPPED as PR #379** (redirected from CAS Blob checkpoint — Spec Agent's DB IS its checkpoint; no Build-side sandbox lease equivalent).
5. ~~**Soft turn-cap audit + token-budget tracking.**~~ **✅ SHIPPED as PR #380** (`spec.turn-cap-reached` audit at 30 instructions).
6. ~~**T-M3-40 classifier verdict wiring (closes inline).** Route based on label; emit `spec.classifier-verdict-applied`.~~ **✅ SHIPPED as PR #381** (observability only — scoped down from routing after re-reading the discard comment about false-positives).
7. ~~**T-M3-38 readiness wiring (closes inline).** Compute after each `persist_spec_turn`; emit `spec.readiness-computed`.~~ **✅ SHIPPED as PR #382** + retroactive gap fixes commit `3748aa4` for tickets 1-5 (spec.tool-called audit kind + progress_todos surfacing + 4 audit-emit integration tests; no carve-outs per Cesar rule).
8. ~~**Layer-2 OOS LLM judge** for spec-chat OOS detection (mirror Build-side T-M3-44, closes #133/T-M3-40).~~ **✅ SHIPPED as PR #383 (2026-05-22 EOD).** Branch `spec-agent/ticket-7-layer-2-oos-judge` at `660fcef` chained off ticket-6. 13 files / +1755 LOC. Spec-side fails OPEN on empty-graph kickoff (opposite default from Build-side fail-closed). 3 audit kinds. 6 tests, 3× green on Windows (3.47s / 2.9s / 2.85s).
9. ~~**verify_spec_consistency Activity** as pre-`lock_request` gate (spec-kit `/analyze`).~~ **✅ SHIPPED as PR #384 (2026-05-22 EOD).** Branch `spec-agent/ticket-8-verify-spec-consistency` at `5f47fb6` chained off ticket-7. 12 files / +2491 LOC. **Path C hybrid** (locked by Farzaneh): deterministic-first (6 checks: required-field / coverage-gap / graph-integrity / decision-resolution / ambiguity-regex / placeholder-regex) + LLM supplemental (4 categories: semantic-duplicate / semantic-conflict / terminology-drift / underspecified-verb). Deterministic CRITICAL hard-blocks; LLM findings advisory in v1 (Phase 12 may promote); **LLM-call failure blocks loud per ORCH-4 matching ticket 7 OOS judge contract** — no asymmetry between Spec Agent's two LLM-judge surfaces. 1 audit kind `spec.consistency-checked`. 6 tests, 3× green (3.38s / 3.3s / 3.37s). New TEP entry T-M3-VSC.
10. **PENDING — ticket 9: Streaming + extended_thinking in elicit_turn.** Anthropic streaming SDK; thinking block as separate SSE channel. **External-docs-driven** — no Build Agent or compliance precedent; need `context7`-verified Anthropic SDK study fresh. Estimated 800-1200 LOC, ~1 day. 6 design decisions need brainstorm (SSE event shape / outbox storage / ReAct interleaving / thinking handling / tool-use streaming / SDK surface verification).
11. **PENDING — ticket 10: Evaluator-Optimizer pass + spec.md export + Current-vs-Proposed diff at lock.** 3 sub-features bundled (~1300-1900 LOC total): (A) spec.md export at lock (Cursor pattern — Markdown renderer of persisted rows; internal-driven; ~400-600 LOC); (B) Current-vs-Proposed diff at lock (Copilot Workspace pattern — diff between two spec_version snapshots; ~300-500 LOC backend); (C) Evaluator-Optimizer pass (OpenAI o1 / Anthropic published pattern — after elicit_turn output, evaluator LLM reviews + optimizer loop refines; external-docs-driven; ~600-800 LOC). ~1.5-2 days.
12. **PENDING — ticket 11: Bidirectional replan signal** — new `SpecAgentWorkflow.request_spec_replan` signal handler + Build-side emit. Cesar's Q4 lock (Cline pattern). ~0.5 day.

Plus: **frontend tickets** (file separately for frontend-owner) — 5 new UI components: ToolCallCard, DecisionPointCard, CapabilityGraphVisual, SpecDiffView, SpecPlanChecklist + per-token streaming + thinking panel + live readiness wiring. ~2-3 days frontend.

**Backend total:** ~7-9 working days.
**Frontend total:** ~2-3 working days.
**Calendar:** ~2-3 weeks including verification gates + likely rework.

## v1.5 deferred (filed as follow-up tickets)

- Cross-spec learning from org history (RLS-scoped within-org)
- Per-tenant `project_charter` preamble (NOT "constitution" naming)
- MCP read-tools at elicitation (Continue.dev pattern)
- Audio input via Whisper transcription
- Spec templates as v0.1 starters

## Branch + PR target

- **Branch:** `assessment/spec-agent-2026-05-21` off master `b2e730f`
- **Single PR, docs-only:** assessment markdown + plan/07 + arch/04 + arch/05 + CHANGELOG + TEP + ticket updates. NO code in `apps/`.
- **Execution PRs:** one per ticket in the 11-ticket sequence above; each with own verification gate.

## Hard gate

**Do not start Phase 6 thesis writeup or any execution work until Farzaneh's explicit go.** Locked 2026-05-21 evening.

## Tomorrow's plan (2026-05-23 — locked 2026-05-22 EOD)

**Morning fresh-context start**: tickets 9, 10, 11, 12 (per Farzaneh's framing tonight — "do 9 to 12 tomorrow morning, fresh"). Note: only 11 tickets in the locked plan; "12" likely refers to Phase 12 (eval + tuning iteration) per the framing. Treat as ticket 9 → 10 → 11 → Phase 12 kickoff (drive 5-10 scenarios manually + tune prompt).

**Rest of day**: spend testing the Spec Agent end-to-end. Real chat sessions, real Postgres, real Anthropic, real workflow runs. Catch any drift between the shipped pieces (tickets 1-11). This is Option B (informal eval-during-demo-prep) of the Phase 12 plan.

**Why pause was the right call (notes for tomorrow's re-read)**: tickets 7 + 8 succeeded because they MIRRORED shipped internal precedent (compliance llm_judge + readiness rubric + Build-side OOS pattern). Tickets 9 + 10 do NOT have that scaffolding — they're external-docs-driven (Anthropic streaming SDK + extended_thinking; Evaluator-Optimizer pattern). Risk of design churn if rushed at end of long session is real. Fresh head + context7-verified Anthropic SDK study + proper brainstorm per sub-feature is the higher-EV play.

## Phase 12 — eval + tuning iteration (added 2026-05-22 by Farzaneh)

After all 11 execution tickets ship, run the eval + tuning phase. The 11 tickets ship INFRASTRUCTURE; this phase makes it actually GOOD.

**Option C picked** (informal + formal combined):

- **Option B during demo prep** — drive 5-10 canonical scenarios manually, note failure modes, patch the prompt + tool descriptions iteratively. 1-2 days.
- **Option A formal eval harness post-demo as v1.5** — 10-20 canonical scenarios + per-scenario quality rubric + automated metric capture. Karpathy-style keep-or-revert loop. 2-5 days dedicated work.

**Quality dimensions to measure**:
- Spec completeness — did all critical FRs/NFRs/ACs land?
- Tool usage efficiency — did the LLM use tools purposefully or noisily?
- Decision-point quality — are alternatives clear + actionable?
- Gap detection — did it catch real ambiguities?
- Capability graph quality — nodes well-structured, edges meaningful, ACs measurable?
- Conversation length — turns to lock-ready (target: 5-15 turns for simple, 15-30 for complex)
- Token usage — baseline for COST-CONC-1
- User-perceived "expert feel" — subjective but real

**Likely tuning targets (almost certain to need adjustment after first e2e drives)**:
- System prompt `agents/spec/prompts/v1.txt` (102 lines; evolves to v2/v3 based on observed failure modes)
- Tool descriptions in `runtime/agents/spec/tools.py` (LLM behavior shifts with wording)
- Max-iterations cap (currently 12)
- Compaction threshold (currently 80K input tokens; tune based on real session shapes)
- `kind_hint` derivation heuristic
- Decision-point alternative generation (might need few-shot examples)
- Readiness rubric thresholds
- `verify_spec_consistency` check rules (start simple, add as we see real failures)
- Layer-2 OOS judge prompt (calibration against real edge cases)

**Karpathy's eval-driven loop pattern**: drive → measure → identify gap → tune (single change) → re-run → measure again. Cycle should take hours-days, not weeks.

**Connects to**: FinIQ project's Testing Agent SRS v1.1 quantitative-metrics framework already establishes the philosophical foundation. Apply the same pattern here.

**Not in scope of Phase 12**: building infrastructure (that's Phase 1-11 already shipped). This phase is pure observation + iteration.


## Mental model for next session

"Direction D = keep what's locked + add structural parity with Build Agent + steal good ideas from references where they don't contradict locks." If a future redesign decision requires re-litigating a lock, that's a red flag — re-read this file + the assessment thesis + ask Cesar.
