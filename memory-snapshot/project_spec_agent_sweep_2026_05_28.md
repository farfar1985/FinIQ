---
name: spec-agent-sweep-2026-05-28
description: "Comprehensive Spec Agent audit run 2026-05-28 via 4 parallel investigators (backend code + prompts + frontend + Phase 12 matrix walk). 9 real bugs (3 backend / 3 frontend / 3 prompt), 13 edge cases worth tests, 11 improvements, 11 notes banked + Phase 12 matrix walk. Tracking artifact — mark items 🟢 as they ship. Stable IDs: B1-B3 (backend bugs) / F1-F3 (frontend bugs) / P1-P3 (prompt bugs) / E1-E13 (edge cases) / I1-I11 (improvements) / N1-N11 (notes)."
metadata:
  node_type: memory
  type: project
  created: 2026-05-28
  updated: 2026-05-28
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## Status dashboard

Update this row-by-row as items ship. Counts auto-derived from sections below.

| Category | Total | 🟢 Done | 🟡 In flight | 🔴 Open (design-locked) | ⏸️ Deferred / moved |
|---|---|---|---|---|---|
| 🔴 Real bugs (B/F/P) | 9 | 3 (B1, B2, P1 — PR #698 MERGED 2026-05-29) | 1 (B3=#699 → PR #712, in review) | 2 (P2=#701, P3=#702 — gated on #689 *merging*) | 3 (F3=#695 CLOSED·superseded by #611; F1=#694 OPEN tracker → Ask-Amira #611 slice; F2=#700 Cesar's) |
| 🟡 Edge cases worth tests (E) | 13 | 0 | 0 | 13 (5 gated on #689) | 0 |
| 🟢 Improvements (I) | 11 | 0 | 1 (I1 — paired w/ B1 in PR #698) | 10 | 0 |
| 🔵 Notes — banked (N) | 11 | — banked — | | | |
| **Total actionable** (excl. N) | **33** | **0** | **4** | **26** | **3** |

**Phase 12 matrix walk findings** tracked separately at bottom of this doc + cross-referenced with `project_phase12_observations.md`.

### 2026-05-28 evening update — Cesar reviewed; PR #698 reworked + Tier 2 designs LOCKED

- **PR #698 reworked** per Cesar's review → now **P1 (`b1fa6a1`) + B2 (`d194953`) + reworked-B1 (`51e2817`)** only, zero frontend/zero schema. **B1 reworked**: idempotent resolve + audit-only-on-row-change + raise-only-on-genuinely-missing (the original raise-on-already-resolved was wrong — broke Temporal at-least-once; Cesar caught it). openapi commit dropped (master-level red, #697; reformat parked on local branch `openapi-reformat-standby`).
- **F1 (#694) + F3 (#695) moved to #611** (Cesar's chat-components rebuild on prompt-kit/assistant-ui) — they patch chat components #611 deletes+rebuilds. F3 was additionally a no-op as written.
- **F2 (#700) is Cesar's** — folded into #611.
- **B3 (#699)** ✅ **SHIPPED as PR #712** (2026-05-28 night) — transactional outbox + relay: `instruction_delivered_at` migration + `instruction_relay/consumer.py` (mirrors recompute_consumer, runs as `amira_app`) + handler write-as-source-of-truth (deterministic `event_id` → one bubble on retry + best-effort signal) + `make instruction-relay`. 6 tests vs real PG + real Temporal. In Cesar's review queue alongside #698. openapi-drift red = master-level #697, lint-only per Cesar (ignore).
- **P2 (#701)** locked = two-sided multi-action fidelity (v1.txt rule + evaluator Completeness + real-LLM test). **P3 (#702)** locked = one shared sub-requirement definition (align evaluator wording → v1.txt criterion). **BOTH GATED on #689 (#681) merging** — master has no split criterion / over-decomposition penalty (grep = 0) and #689 edits the exact 3 files. Ship as ONE PR / two commits once #689 lands. Do NOT build off master.

### 2026-05-29 update — #698 MERGED · #689 de-conflicted (mergeable) · #695 closed · #694 parked

- **PR #698 MERGED 2026-05-29** (P1 + B2 + reworked-B1) → **B1, B2, P1 (+ I1) are now 🟢 Done.** The top-row dashboard "Done=0" predates this; this dated block is authoritative.
- **#689 (#681) DE-CONFLICTED + pushed** → now `MERGEABLE / CLEAN` (merge-base == master tip → clean fast-forward into master, zero conflicts), merge commit `577cc38`, **42/42 real-Postgres verified** (incl. the grafted #698 B1/B2 tests). **NOT merged — Cesar owns it.** When it merges, **P2/P3 + the 5 #681-gated edge cases (E3/E7/E9/E10/E13) unblock.** De-conflict method banked in `feedback_deconflict_stale_branch_for_maintainer.md`.
- **#695 (F3) CLOSED** as superseded by #611 — STREAM-3 reversed its direction (composer is never-disabled now: Send→Stop + queue-next). It had been reworked-out of #698.
- **#694 (F1) LEFT OPEN as a tracker** — the ask-amira `es.onmessage` bug is still live (`ask-amira-provider.tsx:199` drops named `event: narration` events), but #611 left **Ask-Amira un-migrated** ("the one un-migrated chat surface — own slice"). Resolves as a side-effect when that 4th #611 slice moves ask-amira to AmiraChat (`useChat` + projector). **Revisit-trigger = that slice merging; do NOT hand-patch (Cesar's chat territory).**
- **#611 status**: OPEN; 3/4 slices merged 2026-05-29 (#711/#715/#718 — Spec + Build on AmiraChat); Ask-Amira/Companion slice remaining.

---

## Context — how this audit was run

**Date**: 2026-05-28 morning PT.

**Triggers**:
- PR #689 (#681 implementation) in Cesar's review queue, no review yet (CI green).
- Issue #690 design pick surfaced via comment, gated on Cesar.
- `whats_next.py farzaneh` returns "TO DO: nothing".
- Farzaneh asked "can we maybe find more issues or bugs in the Spec Agent that we can improve?".

**Method**: 4 parallel general-purpose subagents, each briefed self-contained, each returning categorized findings under 1500-1800 words.

| Subagent | Angles covered | Files scanned |
|---|---|---|
| Backend code | A (just-shipped #681 code) + C (workflow edge cases) + G (recently-merged Spec PRs from PR #672) | `persist_spec_turn.py`, `turn_types.py`, `capability_graph.py`, `persistence.py`, `workflow.py`, `elicit_turn.py`, `compute_readiness_activity.py`, 5 recent migrations |
| Prompts | B (4 prompt files) | `agents/spec/prompts/v1.txt`, `v1/evaluator.txt`, `v1/oos_judge.txt`, `v1/oos_empty_graph.txt`, `classifier/prompts/v3.txt` |
| Frontend code | D (Spec workspace + chat) + E (PR #688 SSE pattern mirror) | All `components/spec/*.tsx`, `lib/streams/*.ts`, `components/ask-amira/*.tsx`, `lib/canvas/use-build-session.tsx` |
| Phase 12 matrix walk | F (all ~35 rows) | `project_phase12_observations.md` + current `apps/api/src/amira_api/runtime/agents/spec/` code |

**Constraints honored**:
- Investigation only, no code edits
- No architecture-change recommendations made unilaterally
- Per-action confirmation rule respected (only 1 GitHub mutation today: #690 comment)
- Stayed within Farzaneh's brief

---

## 🔴 Real bugs (9)

### B1 — `_apply_decision_resolve` silently no-ops + emits misleading audit on re-resolve

- **Status**: 🔴 Open
- **Tier**: 1 (ship-now, fix-class)
- **Severity**: 🔴 HIGH — data integrity (audit log diverges from DB state)
- **File:line**: `apps/api/src/amira_api/runtime/agents/spec/activities/persist_spec_turn.py:559-588`
- **Repro**: Resolve a DP (`dp-1`) → succeeds. Later turn, resolve `dp-1` again with a different `selected_alternative_id`. The UPDATE clause is `WHERE ... AND resolved_at IS NULL`; matches 0 rows. But `_audit_emit` is unconditionally called below the UPDATE — an audit row lands claiming a resolution that didn't happen, with the new (ignored) `selected_alternative_id`. The accumulator-side guard at `elicit_turn.py:479-483` only catches same-turn double-resolve; cross-turn re-resolution is unguarded because `DecisionPoint` DTO has no `resolved` field.
- **Fix sketch**: Mirror existing `_apply_requirement_update` pattern (which already fails loud at line 302-307): add `RETURNING id` to the UPDATE + raise `ValueError("decision point already resolved or missing")` if missing. Also: surface `resolved_at` into the `DecisionPoint` DTO so the elicit dispatcher can reject up-front with `is_error=true`. ~10 lines + 1 test.
- **Linked**: (none yet)

### B2 — Orphan acceptance predicates after node deprecation

- **Status**: 🔴 Open
- **Tier**: 1 (ship-now, fix-class)
- **Severity**: 🔴 HIGH — data integrity (dangling ACs in materialized snapshots, counted by Overview + scorecard)
- **File:line**: `apps/api/src/amira_api/domain/spec/capability_graph.py:apply_delta` Step 5 (around line 497-499)
- **Repro**: When `delta.deprecate_node_ids=["X"]`, edges referencing X are cleaned transitively (line 493-494). But ACs whose `capability_id="X"` survive in `new_acs` — Step 5 builds new_acs by id-set subtraction only, never cross-checks `capability_id`. Result: dangling AC visible in `acceptance_predicates` API, counted by `derive_overview` AC counter, and used by the build-readiness scorecard. Likely already hit during last night's "remove FR-7" live drive — bears spot-check in DB.
- **Fix sketch**: In Step 5, filter `new_acs` to drop any AC whose `ac.capability_id in deprecated_nodes`. OR raise `OrphanACError` analogous to existing `OrphanEdgeError` when a surviving AC references a deprecated node. ~5 lines + 1 test.
- **Linked**: (none yet)

### B3 — `instruction-received` outbox emit + Temporal signal NOT atomic

- **Status**: 🔴 Open
- **Tier**: 2 (surface to Cesar — concurrency semantics borderline architectural)
- **Severity**: 🟠 MEDIUM — concurrency (race between outbox commit and Temporal signal, or retry duplicates)
- **File:line**: `apps/api/src/amira_api/agents/instructions.py:462-477`
- **Repro**: Flow is `emit_event_in_session(...) → session.commit() → handle.signal("submit_instruction", body)`. (a) If Temporal signal fails after the outbox commit (worker rebalance, gRPC blip): user sees their instruction bubble in chat, agent never receives it. (b) If client retries (network 502 + double-tap): workflow LRU dedup catches the signal, but a SECOND `instruction-received` envelope lands in outbox → chat shows user's message twice.
- **Fix sketch (options)**: (1) Swap order — signal first, emit second; workflow-side dedup is already idempotent on `instruction_id`. (2) Add a `processed_at` column on `outbox_event` rows + reconcile on cold-load. **Cesar's design pick before implementing.**
- **Linked**: (none yet — surface via PR comment or new ticket)

### F1 — Ask Amira drawer STILL has the PR #688 SSE bug Cesar just fixed in Skill Creator

- **Status**: 🔴 Open
- **Tier**: 1 (ship-now, fix-class — mirror exact same fix Cesar shipped 4h ago)
- **Severity**: 🔴 HIGH — broken feature (Ask Amira drawer never appears to respond)
- **File:line**: `components/ask-amira/ask-amira-provider.tsx:199-240`
- **Repro**: Uses `es.onmessage = (ev) => {...}` (line 199, never fires because backend tags every frame `event: narration`). Reads `env?.payload?.text` and `env?.kind` (top-level, lines 206 + 226) instead of nested `envelope.event.text` / `envelope.event.kind`. PR #688's commit message even names `apps/api/src/amira_api/agents/sse_envelope.py::render_envelope` as the source-of-truth for the nested shape — this code violates both rules. Open Ask Amira drawer, send a turn — agent never appears to respond (text never accumulates, thinking spinner hangs).
- **Fix sketch**: Mirror exactly the post-#688 pattern from `components/skill-creator/live-skill-creator-workspace.tsx:65-105`. Best path: replace the inline EventSource setup with `useEventSource` hook (`lib/streams/use-event-source.ts`) which already does the canonical pattern. ~10 lines net change (deletion + hook adoption).
- **Linked**: (none yet — Cesar already fixed Skill Creator in #688; same pattern applies)

### F2 — Thinking indicator never stops on SSE permanent error; user input bubble lingers

- **Status**: 🔴 Open
- **Tier**: 2 (surface to Cesar — adds error UX, mild design class)
- **Severity**: 🟠 MEDIUM — UX (user has no signal that the agent died; no retry path)
- **File:line**: `components/spec/live-spec-workspace.tsx:252-255` + `use-event-source.ts:75-89`
- **Repro**: Submit a turn → backend SSE route dies → `useEventSource.status` flips to `"error"` (permanent CLOSED state). `showThinkingIndicator` is gated on `narration.status === "open"` so spinner stops immediately. But `pendingUserTurns` is never cleared — user's input bubble lingers indefinitely with NO error indicator and NO way to retry.
- **Fix sketch**: When `narration.status === "error" && narration.error !== null && pendingUserTurns.length > 0`, render `<AlertBanner role="alert">` above the thread with a Retry CTA that re-POSTs the last instruction. Clear `pendingUserTurns` on permanent errors so the same input isn't double-rendered after a manual reconnect. ~15-20 lines + a new banner component. **Borderline ship-vs-surface**: ask Cesar if he wants this in our hands or if he's planning a broader SSE/chat rebuild (per his 2026-05-27 mention of www.prompt-kit.com).
- **Linked**: (none yet)

### F3 — Composer not disabled while previous turn in flight; interleaved chunks corrupt chat

- **Status**: 🔴 Open
- **Tier**: 1 (ship-now, fix-class)
- **Severity**: 🟠 MEDIUM — broken UX (text-chunk streams interleave when user submits during agent reply)
- **File:line**: `components/spec/spec-chat-pane.tsx:46-50` + `components/spec/live-spec-workspace.tsx:343-350`
- **Repro**: Submit long turn ("expand all FRs into sub-requirements", 30s LLM call). After ~200ms the POST returns; `onChatSubmit` resolves immediately. `chat-composer.tsx`'s local `submitting` state clears — composer re-enables. User submits second turn ("remove FR-1"). Both turns stream their `text-chunk` envelopes concurrently into ONE growing bubble keyed on `firstSeq` of whichever stream wins the seq race.
- **Fix sketch**: Gate `composerDisabled` on `pendingUserTurns.length > 0 || agentThinking`. Pass `disabled={agentThinking}` from workspace. ~3 lines.
- **Linked**: (none yet)

### P1 — `oos_empty_graph.txt:13` carries FinIQ-specific "period-end summary app" example

- **Status**: 🔴 Open
- **Tier**: 1 (ship-now, fix-class — same leak-strip pattern as #681 C5)
- **Severity**: 🟠 MEDIUM — §0 platform lock violation (customer-domain anchor in PLATFORM prompt)
- **File:line**: `apps/api/src/amira_api/agents/spec/prompts/v1/oos_empty_graph.txt:13`
- **Repro**: Line 13 includes the in-scope example *"We need a period-end summary app for our finance team."* — "Period-end summary" / PES is the Mars FinIQ predecessor product's domain taxonomy. Per Cesar's §0 platform lock + the #681 leak audit, customer-domain anchors must be stripped from PLATFORM prompts. Same class as `oos_judge.txt:24` ("dynamic ui") and `classifier/v3.txt:11` ("KPI from the Mars finance skill") that we fixed in #681.
- **Fix sketch**: Replace line 13 with domain-neutral example: *"Help me spec a daily standup tracker for my team."* or *"I want an internal tool to track maintenance tickets."* One-line edit.
- **Linked**: (none yet)

### P2 — Multi-action turn scoring under-specified in evaluator.txt

- **Status**: 🔴 Open
- **Tier**: 2 (surface to Cesar — touches evaluator rubric, platform contract)
- **Severity**: 🟠 MEDIUM — eval calibration (agent could silently skip half a user instruction and score well)
- **File:line**: `apps/api/src/amira_api/agents/spec/prompts/v1/evaluator.txt` line 11
- **Repro**: v1.txt §44-47 teaches `propose_requirement` is a discriminated union over `op="add"/"update"/"remove"`, callable many times per turn. Evaluator dim-2 (Completeness) describes a "refinement turn" as proposing "the right deltas (FR/NFR/AC adds or updates, gaps raised on ambiguity)" but never names mixed add+remove turns. A turn like *"add FR-8 for password reset and remove FR-3"* has no scoring guidance: dim-5 narration honesty (line 15) does check `remove` ops, but dim-2 (line 11) only weighs additions.
- **Fix sketch**: Extend evaluator.txt dim-2 with explicit rule: *"Multi-action turns (a single turn carrying both add + update or add + remove ops) are scored on whether the agent honoured the user's full instruction, not just one half of it. A turn that adds FR-8 but silently skips the user's 'remove FR-3' ask scores 1-2 on Completeness."* + 1 real-LLM regression test against a mixed-action prompt.
- **Linked**: (none yet)

### P3 — Hierarchical-split (v1.txt) and over-decomposition (evaluator.txt) tests are NOT perfectly symmetric

- **Status**: 🔴 Open
- **Tier**: 2 (surface to Cesar — touches both prompt files in coordinated edit)
- **Severity**: 🟡 MEDIUM — calibration drift risk (two-sided LLM calibration could disagree)
- **File:line**: `v1.txt §249-263` vs `evaluator.txt §12`
- **Repro**: v1.txt criterion #3 says split when "each sub-item's `detail` field adds NEW measurable behaviour the parent doesn't specify." Evaluator says "score low if a sub-FR whose detail could be deleted without losing information distinct from the parent." Asymmetry: v1.txt is paraphrase-test (new measurable behaviour), evaluator is information-delta-test (could be deleted without losing info). A sub-FR could pass v1.txt (carries new measurable behaviour) yet fail evaluator (the "information" is restating parent's intent in different words).
- **Fix sketch**: Tighten evaluator.txt line 12 to mirror v1.txt criterion #3 verbatim: *"a sub-FR whose `detail` paraphrases the parent's `detail` without adding NEW measurable behaviour the parent doesn't already specify."* Two-side-of-same-coin pattern banked in `feedback_two_sided_llm_calibration.md`.
- **Linked**: (none yet)

---

## 🟡 Edge cases worth tests (13)

Each is a real scenario not covered by current tests. Status starts 🔴 Open; flip to 🟢 Done when a deterministic or real-LLM regression test lands.

### E1 — Circular parent chain detection
- **File:line**: `persist_spec_turn.py:232-253` (parent-exists check) + `_apply_requirement_update`
- **Scenario**: LLM emits `UPDATE FR-1.parent=FR-2` then `UPDATE FR-2.parent=FR-1`. Nothing rejects the cycle. Renderer's parent-chain walk hangs.
- **Test shape**: Inject in-spec circular references; assert `ValueError` on second update OR cycle detection at depth ≤ 8.
- **Status**: 🔴 Open

### E2 — Partial-write atomicity on `_audit_emit` failure under retry storm
- **File:line**: `persist_spec_turn.py:134-150`
- **Scenario**: Activity throws mid-loop (row 7 of 13). Temporal retries 3x. First attempt's rows rolled back (good). Retry re-applies all 13 — first 6 hit ON CONFLICT DO NOTHING, row 7 succeeds — BUT all 13 audit emits fire again each retry. Same `correlation_id`, no outbox dedup.
- **Test shape**: Deterministic test forcing exception on `_apply_requirement_add` for delta-index=7. After 3x retry, assert audit row count = 13, not 39.
- **Status**: 🔴 Open

### E3 — UPDATE → REMOVE → ADD cycle on same `requirement_id`
- **File:line**: `persist_spec_turn.py:255-274` + partial unique index `uq_spec_requirement_live_id`
- **Scenario**: ADD FR-5 in turn 1, REMOVE FR-5 in turn 2, ADD FR-5 again in turn 3. Partial unique index permits — second add row has fresh UUID + fresh `created_at`. UI consumers ordering by `created_at` see FR-5 jump to bottom on re-add.
- **Test shape**: Drive 3-turn cycle; assert (a) second add succeeds, (b) two rows exist (`removed_at IS NOT NULL` + `removed_at IS NULL`), (c) ordering semantics documented.
- **Status**: 🔴 Open

### E4 — `Workflow.continue_as_new` mid-pending-deque silently drops instructions
- **File:line**: `workflow.py:442-456`
- **Scenario**: Signal arrives between `popleft()` and the threshold check; appended to `_pending` after the check evaluates. New generation kicks off; `carry_forward` does NOT include `_pending` (only `kickoff`). Instruction silently dropped.
- **Test shape**: Drive 100 instructions; race a 101st signal in the same tick; assert new generation receives it.
- **Status**: 🔴 Open

### E5 — Empty turn (LLM returns `reply_text=""`) → silent retry storm
- **File:line**: `turn_types.py:269` (Field validator `min_length=1`)
- **Scenario**: LLM produces zero text (all tool calls, no narration). `SpecTurnOutput` validation fails → `ElicitTurn` Activity raises → `_ELICIT_RETRY` retries 3x → workflow Activity error. User sees nothing.
- **Test shape**: Integration test with prompt biased toward tool-only output; current behaviour is silent retry storm. Fix path: either allow empty reply_text or have the agent always narrate something.
- **Status**: 🔴 Open

### E6 — Read-only meta-questions have no classifier landing
- **File:line**: `classifier/prompts/v3.txt` (3 categories: edit / binding / out-of-scope)
- **Scenario**: User asks *"what's the status of FR-7?"* or *"show me all open gaps"*. Routes to `edit` with low confidence; wrong category — it's neither editing nor binding nor OOS.
- **Test shape**: 5 meta-question variants; assert classifier confidence ≤0.5 on `edit` OR adds a new `read-only-meta` category. **Note**: design pick — surface to Cesar before adding a 4th category.
- **Status**: 🔴 Open

### E7 — Kickoff bloom vs over-decomposition guard collision on "simple X" prompts
- **File:line**: `v1.txt §234-246` (bloom mandate) + `§283-285` (simple X bias FLATTER) + `evaluator.txt §11` (1-2 FR scores 1-2)
- **Scenario**: User: *"build me a simple to-do list app"*. What's the floor? 5/5-ratio drives today landed 18-20 reqs / 28-30% sub-FRs. But a kickoff that lands 6 atomic FRs + 0 sub-FRs ("user said simple") could score 2 ("partial") or 3 ("baseline acceptable") on dim-2.
- **Test shape**: Real-LLM regression — drive 3 "simple X" prompts; assert evaluator score ≥3 on dim-2 even when sub-FRs=0. Documents the "simple X floor" empirically.
- **Status**: 🔴 Open

### E8 — Empty-graph judge threshold edge with 1-2 nodes
- **File:line**: `oos_judge.py:363` (`_is_empty_graph` keys on Bloom hash == zeros) + `oos_judge.txt`
- **Scenario**: Turn 1 adds 1 node. Turn 2 routes to non-empty-graph judge with `in_scope_capabilities` containing 1 entry. Judge fires with effectively no comparison context.
- **Test shape**: Drive 2-turn scenario; turn 1 creates exactly 1 node, turn 2 asks for adjacent capability; check oos_judge correctly handles thin-graph OR add convention "≤2 nodes → still kickoff-bloom, default in-scope."
- **Status**: 🔴 Open

### E9 — Tool-error narration check doesn't cover partial-success turns
- **File:line**: `v1.txt §324-356` (C1 narration honesty)
- **Scenario**: Turn with 5 `propose_requirement` calls where 4 succeed, 1 errors. Does agent need to surface the 1 error even when reply_text says "Added FR-2..FR-5"? v1.txt suggests yes but only shows total-failure examples.
- **Test shape**: Real-LLM scenario forcing 1-of-5 validation error (e.g., `parent_requirement_id` pointing at in-flight unpersisted parent). Assert reply_text mentions both 4 successes AND 1 failure.
- **Status**: 🔴 Open

### E10 — 100+ requirement scale, no virtualization, O(N²) orphan check
- **File:line**: `components/spec/spec-document.tsx:293-444` ReqList
- **Scenario**: No virtualization, no `React.memo`, no key on `byParent` Map. Recursive `renderItem` constructs `byParent` map + filters `items.some(...)` for orphan check on every render — O(N²) for orphan-check across N items. At 200 FRs = 40k `some()` walks per render. Each persist-side envelope causes a refresh which re-runs this.
- **Test shape**: Render 200 FRs (10 deep, 20 wide); measure render time + simulate 50 sequential SSE envelopes; assert no frame >50ms.
- **Improvement-pair**: Precompute `byParent` with `React.useMemo` on `[items]`; replace `items.some(...)` orphan-check with `Set<string>(items.map(i=>i.id))` lookup. Drops to O(N). See **I-extra-1** below.
- **Status**: 🔴 Open

### E11 — Long-detail overflow not handled
- **File:line**: `spec-document.tsx:421-428` (`<p>` for `r.detail`)
- **Scenario**: Pasted 2000-char detail with no whitespace overflows the `max-w-3xl` article container horizontally (no `overflow-x-auto` on wrapper at line 117).
- **Test shape**: Render FR with 2000-char detail; assert no horizontal scroll on article wrapper; assert wrapped text via `break-words`.
- **Fix-pair**: Add `break-words` to the `<p>` and title `<span>` at line 393. Optional `line-clamp-6` with "Read more" toggle for >300 chars.
- **Status**: 🔴 Open

### E12 — Tab background → return without `visibilitychange` handler
- **File:line**: `lib/streams/use-event-source.ts:46-104`
- **Scenario**: Chrome aggressively throttles background tabs after 5min. On return, SSE may have closed. Hook sets `status: "error"` but never re-fires `streamUrl` change → no new EventSource. User-visible: frozen workspace requiring full page reload.
- **Test shape**: jsdom + simulate `document.visibilityState = 'hidden'` 5min + EventSource close, then `'visible'`; assert reconnects within 2s.
- **Fix-pair**: Add `visibilitychange` listener in `useEventSource` — when `'visible'` and `status === 'error'`, bump re-key tick to force fresh EventSource.
- **Status**: 🔴 Open

### E13 — Orphan hierarchy children silently become roots (no UI signal)
- **File:line**: `spec-document.tsx:340-352`
- **Scenario**: When `parent_requirement_id="FR-99"` for never-existed parent (LLM hallucination), child silently promoted to root — user sees no indication.
- **Test shape**: Render FR with orphan parent ref; assert renders with a visible "↑ FR-99 (missing)" badge next to ID, NOT silently as root.
- **Fix-pair**: When `parentInList=false && parentId !== null`, render inline badge "↑ FR-99 (missing)". Adds confidence without breaking layout.
- **Status**: 🔴 Open

---

## 🟢 Improvements (11)

### I1 — `_apply_gap_resolve` defensive gap (milder form of B1)
- **File:line**: `persist_spec_turn.py:601-613`
- **Sketch**: Same shape as B1. No `RETURNING id` check; resolving an already-resolved or non-existent gap is a silent no-op. Accumulator-side guard catches in-turn but not cross-turn. Promote to fail-loud.
- **Status**: 🔴 Open

### I2 — `_audit_emit` uses `uuid4()` (not deterministic) → retry duplicates outbox rows
- **File:line**: `persist_spec_turn.py:727`
- **Sketch**: On Activity retry the audit row's `id` is fresh each time. No ON CONFLICT clause on outbox insert → duplicate audit rows accumulate on retry. Use `event_id = uuid5(NAMESPACE_URL, f"{correlation_id}/{kind}/{target}/{action}")` for deterministic dedup.
- **Status**: 🔴 Open

### I3 — `derive_overview` doesn't filter `removed_at` (defensive belt)
- **File:line**: `apps/api/src/amira_api/domain/spec/views.py:355`
- **Sketch**: `fr_count = sum(1 for r in requirements if r.kind.value == "FR")` — relies on caller to pre-filter. Add defensive `and r.removed_at is None` predicate.
- **Status**: 🔴 Open

### I4 — `derive_overview` edge_count edge case
- **File:line**: `views.py:358`
- **Sketch**: Sessions written pre-#664 (Cesar's Bloom hash fix) may have stale `edge_count=0`. Add one-liner surfacing "edges may be 0 for sessions pre-2026-05-26."
- **Status**: 🔴 Open

### I5 — `decision_resolutions: dict[str, dict[str, str]]` loose typing
- **File:line**: `turn_types.py:285`
- **Sketch**: Two nested untyped strings — `selected_alternative_id` and `rationale`. Promote to `DecisionResolution(BaseModel)` with `model_config = ConfigDict(frozen=True)` so persist layer can `model_validate` and refuse malformed shapes loud rather than silently passing empty string on missing key.
- **Status**: 🔴 Open

### I6 — v1.txt §11 says "12 tools" but only enumerates 11
- **File:line**: `v1.txt §11` + lines 13-148 inline
- **Sketch**: Cosmetic — line 7 says "12 tools below"; lines 13-148 enumerate 11 (`propose_capability_edge` is mentioned inline under #6 but not separately numbered). Either renumber to 12 explicit entries or change "12" → "11".
- **Status**: 🔴 Open

### I7 — v1.txt §429-435 stale "10-tool ReAct loop"
- **File:line**: `v1.txt §429-435`
- **Sketch**: Says "The 10-tool ReAct loop" but the loop is now 12 tools. One-line edit.
- **Status**: 🔴 Open

### I8 — evaluator.txt dim-4 `acs >= nodes/2` vs v1.txt `1:1`
- **File:line**: `evaluator.txt §13` vs `v1.txt §193-206`
- **Sketch**: v1.txt teaches "every NEW node added in THIS turn needs its own AC(s)" — 1:1. evaluator phrases as `acs >= nodes/2`. Evaluator is more lenient than the agent prompt. Cesar's pick: align either direction.
- **Status**: 🔴 Open (borderline 🔴 — both interpretations defensible)

### I9 — `RouteForESignatureModal` + `ApprovalActionCard` can both render
- **File:line**: `live-spec-workspace.tsx:369-394`
- **Sketch**: `RouteForESignatureModal` renders in header always (just `disabled={!canRequestLock}`); `ApprovalActionCard` renders conditionally. When `spec.state === "approval-requested" && isAuthorizedApprover`, BOTH show simultaneously. Visually noisy but not broken. Hide `RouteForESignatureModal` entirely when `spec.state !== "iterating"`.
- **Status**: 🔴 Open

### I10 — Empty-state copy for NFR + AC could explain what to do
- **File:line**: `spec-document.tsx:178-180` (NFR) + `:192-194` (AC)
- **Sketch**: Currently both just say "None yet." Should mirror the FR-section's helpful copy: NFR — "None yet. NFRs (performance, security, accessibility) land here as the agent extracts them." AC — "None yet. ACs pair with new capability nodes — they'll land as the agent stages each."
- **Status**: 🔴 Open

### I11 — `lifeline-stepper.tsx` swallows `"superseded"` state silently
- **File:line**: `lifeline-stepper.tsx:14-21`
- **Sketch**: `const idx = STAGES.findIndex(...)` returns `-1` when `current` is anything other than the 3 known stages. All three render as "upcoming". `live-spec-workspace.tsx:438-444` defends by mapping `superseded → "approved"` — but new states would silently go blank. Add `"superseded"` explicitly OR `assertNever`-default-loud.
- **Status**: 🔴 Open

### I-extra-1 — ReqList O(N²) → O(N) refactor (paired with E10)
- **File:line**: `spec-document.tsx:293-444`
- **Sketch**: See E10. `useMemo` on `byParent` + `Set`-based orphan lookup.
- **Status**: 🔴 Open

---

## 🔵 Notes — banked for future (11)

These are observations worth recording but no immediate action. Banked here so future debugging doesn't have to rediscover them.

| ID | Note | Where | Why it matters |
|---|---|---|---|
| **N1** | `removed_at` has no index | migration `20260528100000` | Future restore tooling ("show soft-deleted FRs") will need one |
| **N2** | `_INSTRUCTION_KIND_FOR_WIRE` missing `system-note` + `build-readiness-iteration-needed` | `instructions.py:445-449` | Server-only narration kinds today; if ever user-callable, mapping raises |
| **N3** | Soft-delete cascade not implemented (orphan children retain dead `parent_requirement_id`) | `persist_spec_turn` | UI shows orphaned children. Cesar may want cascade-soft-delete or reject-if-children-live |
| **N4** | `_apply_decision_point` has no UPDATE path (only add + resolve) | `persist_spec_turn.py:476-491` | If Cesar wants to amend DP `context` text later, the symmetric pattern is missing |
| **N5** | `oos_empty_graph.txt:28-30` casual-chat OOS examples ("Hi", "I'm tired") | prompt file | User saying "Hi" gets banner instructing them to describe a product — jarring as first response. Post-demo UX brainstorm |
| **N6** | v1.txt has no rule about `track_progress` interaction with the ~10-tool budget | `v1.txt §312-322` | Implied that `track_progress` doesn't count toward 10 but unstated. Bank as candidate clarification |
| **N7** | v1.txt §158-162 "Call tools in any order, multiple times" vs §95 "Before proposing a new node, call query_capability_graph" | `v1.txt` | Soft ordering implied. Worth tightening if agent skips read on kickoff (graph is empty so read is wasted anyway) |
| **N8** | `FINIQ_RUBRIC` still hardcoded in `spec-readiness.tsx:24-30` | frontend | Already known (#588 item 5 — Cesar's FinIQ-strip cleanup). Confirmed still on master |
| **N9** | `KB_ITEMS` mock data still rendered in mockup mode | `spec-context-panel.tsx:34-39 + :104` | Live mode shows real upload panel. Gated correctly today |
| **N10** | `FINIQ_GOVERNANCE` placeholder in `RouteForESignatureModal` | `route-for-esignature-modal.tsx:37` | Empty assignments correctly fall back to `pending` approver. Pre-existing tech debt |
| **N11** | Spec workspace "thinking spinner stop" idiom differs from Skill Creator | `live-spec-workspace.tsx:252-255` | Spec uses `agentEnvelopeCount === 0 && narration.status === "open"`; Skill Creator uses `setIsAgentThinking(false)` on text-chunk. Functionally equivalent but two idioms. Worth banking that spec pattern WILL keep showing spinner if SSE goes to `status === "error"` (see F2) |
| **N-extra** | `setTimeout(onRefresh, 1500)` at `live-spec-workspace.tsx:347-350` — useless GET 1.5s after instruction submit (BEFORE persist completes) | live-spec-workspace.tsx | Squarely in Issue #690's lane; will be cleaned up when his pick lands |

---

## Phase 12 matrix walk — summary

Full row-by-row walk in `project_phase12_observations.md`. Headline:

| Layer | GREEN | YELLOW | RED | Stale evidence (re-drive needed) |
|---|---|---|---|---|
| **1** (LLM/tool/narration) | ~10/17 | 5 | 3 | 3 rows (1.5, 1.7, 1.8) |
| **2** (persist) | ~9/12 | 0 (2 promotable) | 5 | 3 rows (2.1, 2.5, 2.6) |
| **3** (lock chain) | 2/10 | 2 | **8 — ALL gated by F17 lock-chain UI wiring missing on master** | — |
| **4** (frontend) | 4/10 | 2 | 4 | — |

**Key callouts**:
- Matrix row 1.2 says "10/10 tools" — actually 12 now (`propose_capability_edge` + `resolve_decision_point`). **Needs renumbering.**
- 2.3 (AC coverage) + 2.4 (capability graph DAG) + 2.1 (FR coverage depth) **likely promotable to GREEN** with post-#681 evidence.
- Layer 3 is gated end-to-end on Cesar's F17 (lock-chain UI wiring missing on master). Keystone.
- 14 missing surfaces identified the matrix doesn't cover (compaction, lock-refusal audit, e-sign decline, cross-tenant isolation, etc. — full list in the agent's report).

---

## Roadmap

### Phase A — TODAY/TOMORROW (while waiting on Cesar's #690 pick + #689 review)

**Tier 1 batch PR**: 5 fix-class findings, ~50-80 LOC + ~5 tests. Each as one commit.

| ID | Title | LOC | Tests |
|---|---|---|---|
| B1 | `_apply_decision_resolve` fail-loud | ~10 | 1 |
| B2 | Orphan ACs on node deprecation | ~5 | 1 |
| F1 | Ask Amira drawer #688 mirror | ~10 | smoke |
| F3 | Composer disabled while thinking | ~3 | 1 |
| P1 | `oos_empty_graph.txt:13` FinIQ leak strip | 1 line | smoke |

Title: *"5 carve-out fixes from comprehensive Spec Agent sweep"*. Per `feedback_self_merge_pattern.md` — self-merge eligible once green.

### Phase B — Next 1-2 days

**Tier 2 surface to Cesar** via comment(s) on #690 follow-up OR new tickets:
- B3 (instruction-received atomicity — concurrency)
- F2 (thinking indicator SSE error UX — mild design)
- P2 (multi-action turn scoring — prompt edit)
- P3 (hierarchical-split symmetry — prompt alignment)
- I8 (evaluator dim-4 vs v1.txt 1:1 alignment — Cesar's pick on direction)

Implement Cesar's #690 pick (A/B/C) when it lands.

### Phase C — Next week

- Add **Tier 5 deterministic + real-LLM test batch** for E1-E13 — ~13 tests, ~2-3 hours
- Update **Phase 12 matrix**: renumber 1.2 to 12/12, promote 2.3 + 2.4 + 2.1 to GREEN, mark Layer 3 gated on F17, add 14 missing surfaces
- Re-drive stale-evidence rows (1.5, 1.7, 1.8, 2.1, 2.5, 2.6) against post-#681 master
- Cleanup batch PR for I1-I11 improvements (~50-80 LOC total)

### Phase D — Medium term (gated on Cesar's F17 lock-chain UI wiring)

- Live-drive full lock → e-sign → approval → Build handoff once F17 lands
- Address Tier 2 prompt edits per Cesar's picks
- Add missing matrix surfaces (compaction, lock-refusal audit, e-sign decline, RLS isolation)

---

## Coverage history

Append a row each time an item moves from 🔴 → 🟢 OR a re-drive validates a stale row OR a new finding surfaces.

| Date | Action | IDs | Linked |
|---|---|---|---|
| 2026-05-28 | Audit created via 4-investigator sweep | B1-B3, F1-F3, P1-P3, E1-E13, I1-I11, N1-N11 | (this file) |
| 2026-05-28 | Tier 1 ship-now batch filed as 5 GitHub issues (gh issue create per-action confirmed each) | B1→#692 / B2→#693 / F1→#694 / F3→#695 / P1→#696 | https://github.com/quantumdatatechnologies/amira-mars/issues/692-696 |
| 2026-05-28 | PR #698 opened with 5 commits (P1, F1, F3, B1+I1 paired, B2) + 6th openapi-snapshot regen commit to absorb inherited drift from master (skill-creator + DeleteOrgResponse from Cesar's overnight merges). All Tier 1 5 fix-class items + I1 now 🟡 in flight in Cesar's review queue. Both CI checks (blob-abstraction lint + openapi snapshot drift) PASS. Verification: 3× deterministic 31/31, broader sweep 151/159 (8 pre-existing failures verified), tsc clean. Awaiting Cesar's review + squash-merge (which will auto-close all 5 issues via `Closes #N` keywords). | B1+I1, B2, F1, F3, P1 → PR #698 | https://github.com/quantumdatatechnologies/amira-mars/pull/698 |
| 2026-05-28 | Tier 2 surface — 4 design-class follow-ups filed as separate `needs-design` tickets (one per bug, no `owner:farzaneh` — Cesar picks the design first). Each carries A/B/C `## Design options` instead of `## Fix sketch` since the fix shape depends on his pick. | B3→#699 / F2→#700 / P2→#701 / P3→#702 | https://github.com/quantumdatatechnologies/amira-mars/issues/699-702 |
| 2026-05-28 | **Cesar's reply (WhatsApp)** — guidance on the Tier 2 tickets: **#700 (F2) is HIS** (folding into "AI chat components integration" big ticket; don't touch — validates F2 ticket's option B); **cosmetic tickets deferred**; *"pick any you like haha except for the cosmetic ones."* Also deploying our PRs (#698 + likely #689) + his work to cluster for a **Mars demo TOMORROW 2026-05-29**, and **sending review comments back on PR #698**. | F2/#700 → Cesar's; cosmetics deferred | (WhatsApp) |
| 2026-05-28 | **B3 (#699) DEFERRED** despite being the only clean unblocked needs-design ticket: (a) not a demo blocker — race condition needs network instability; (b) recommended option-A "swap order" is incomplete (fixes stuck-agent not duplicate-message; complete fix needs idempotency + migration + fault-injection test); (c) chat-submit-adjacent (`instructions.py`) = collision risk with Cesar's active chat-components ticket. Revisit after #689 merge + chat-components scope clarity. | B3 → deferred | — |
| 2026-05-28 | **Edge-case gating confirmed** — 5 of 7 (E3/E7/E9/E10/E13) reference #681-only code not on master (verified 0 grep matches for `removed_at` / `parentRequirementId` / `honest,sub-fr,fail-loud`). Only E11 (cosmetic-ish, deferred) + E12 (chat-adjacent, collision risk) master-assessable, neither worth a separate PR now. **All 13 edge cases deferred until #689 merges.** | E1-E13 → deferred pending #689 | — |
