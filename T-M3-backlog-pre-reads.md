# T-M3 backlog pre-reads — 2026-05-19 EOD

Living dispatch playbook for our 7 remaining `owner:farzaneh` tickets + the 3 crossover candidates from Cesar's lane. **Authored while waiting for Cesar to push upstream deps**. When a ticket flips from WAITING → READY on `whats_next.py`, jump to its section and dispatch.

**State as of this writing**: Master at `2adf5ce`. Our PR #337 is `needs-review`. All 7 of our tickets WAITING. CI for our branch is green.

Sections ordered by likely-unblock-time (most-imminent first):

- §1 [#137 T-M3-44 OOS guard (Build-side)](#137-out-of-scope-guard-build-side) — **DEEP** — waits on T-M3-11 (Cesar, demo-related, likely soon)
- §2 [#138 T-M3-45 Build session checkpoint](#138-build-session-checkpoint) — **STREAMLINED** — same T-M3-11 unblock + T-M3-13
- §3 [#142 T-M3-49 Static-analysis probe](#142-static-analysis-probe) — **DEEP** — waits on T-M3-24 + T-M3-48 (both Cesar)
- §4 [#143 T-M3-50 LLM-judge wrapper](#143-llm-judge-wrapper) — **STREAMLINED** — same T-M3-24 unblock
- §5 [#144 T-M3-51 Detector orchestration](#144-detector-orchestration) — **STREAMLINED** — composes #142 + #143
- §6 [#140 T-M3-47 MCP Runtime Client](#140-mcp-runtime-client) — **STREAMLINED** — waits on T-M3-46 + T-M3-02
- §7 [#145 T-M3-52 QDL federation skill](#145-qdl-federation-skill) — **STREAMLINED** — waits on T-M3-32/34 (Ashwin); likely defer post-demo
- §8 [#133 T-M3-40 OOS detector (Spec-side, Cesar's)](#133-out-of-scope-detector-spec-side-crossover) — **DEEP** — immediate pickup candidate if Cesar greenlights; mirrors #137 on the Spec side
- §9 [#99 / #108 crossover candidates](#crossover-candidates-99--108) — **SCOUT**

---

## §1 — #137 Out-of-scope guard (Build-side) <a id="137-out-of-scope-guard-build-side"></a>

**T-M3-44** · `track:ai-agent` · `owner:farzaneh` · waits on **T-M3-11** (Cesar, OPEN — Build Agent Activity scaffolding)

### What it does (user-visible)

Every Build-chat instruction passes through a capability-graph check before the Build Agent acts on it. If the user types *"add a payment-processing endpoint"* against a spec that only locked reporting capabilities → instruction is BLOCKED, `out-of-scope-blocked` narration event sent to the SSE stream, no turn runs, no edits applied. Mirror of #133 (Spec-side OOS detector) but at the Build seam.

### Dependencies

| Dep | Status | What it ships |
|---|---|---|
| T-M3-37 (capability graph + Bloom) | ✅ Our PR #240 | `compute_membership_index`, `membership_index_contains` |
| T-M3-11 (#104 Build Agent Activity scaffolding) | ⏳ Cesar, OPEN | 7 Build tool Pydantic models + Activity stubs (apply_edits, wait_for_hmr, assemble_file_context, transcribe_voice, emit_*); BuildAgentWorkflow run-loop body |

**Why waiting matters**: today's master has only the BuildAgentWorkflow SHELL (`run()` waits for cancel + exits). No turn loop, no classifier, no Activities. #137 needs to wire `check_in_scope` INTO the turn loop — so the turn loop has to exist. T-M3-11 ships that.

### Files (path-corrected — ticket lists `apps/canvas/` which is pre-monorepo drift)

| Plan-prose path | Real path |
|---|---|
| `apps/canvas/guards/out_of_scope.py` | `apps/api/src/amira_api/runtime/agents/build/guards/out_of_scope.py` |
| `apps/api/src/amira_api/runtime/agents/build/activities/check_in_scope.py` | ✅ matches actual layout |
| `tests/canvas/guards/test_out_of_scope.py` | `apps/api/tests/runtime/agents/build/test_check_in_scope.py` |

Foundation-drift fix in same PR: update plan/08 §8 Task 8.5 path-list.

### Deliverable

```python
# domain layer
def check_in_scope(
    spec_capability_graph: SpecCapabilityGraph,
    candidate: BuildChangeCandidate,
) -> CheckInScopeResult:
    """Bloom-filter membership check.

    candidate carries: target_capability_ids, target_skill_ids,
    target_hostnames extracted from the instruction's classifier verdict.
    Returns (in_scope: bool, reason: str).
    """
```

```python
# Activity wrapper
@activity.defn
async def check_in_scope_activity(input: CheckInScopeInput) -> CheckInScopeResult:
    """Wraps domain.check_in_scope; loads the latest
    spec_capability_graph for project_id via repo; runs the Bloom check;
    returns typed result."""
```

Wiring: BuildAgentWorkflow.run() turn loop calls `check_in_scope_activity` BEFORE the `apply_edits` Activity. If `in_scope=False`, emit narration `out-of-scope-blocked` + skip the turn. T-M3-11 lands the turn-loop shape; #137 inserts the gate.

Additional wiring: `<AddResourceDrawer>` POST handler (skill / knowledge attach) pre-checks via the same function before binding. Out-of-scope → no row written, narration emitted.

### Anchor patterns to mirror

- **#133's OOS detector** (Spec-side) — same Bloom-then-judge pattern; #137 is Layer 1 only (no LLM judge — Build-side is decisive, deterministic).
- **classify_intent.py** — Activity wrapper template.
- **Our PR #240 `compute_membership_index`** — the Bloom helper to call.

### Tests (full-reality)

1. `test_check_in_scope_in_scope_capability_passes` — fixture graph with FinIQ capabilities; candidate matches; returns `in_scope=True`.
2. `test_check_in_scope_out_of_scope_capability_blocks` — candidate doesn't match Bloom; returns `in_scope=False` with structured reason.
3. `test_build_workflow_skips_turn_on_oos_verdict` — full `WorkflowEnvironment.start_local()` run; submit instruction → classifier returns OOS → check_in_scope confirms → narration `out-of-scope-blocked` emitted; no apply_edits Activity executed.
4. `test_add_resource_drawer_blocks_oos_skill_binding` — ASGI test against the resource-drawer POST route; cross-org-scope skill → 409 + narration.

### Size estimate

**Medium — ~4-5 hours.** Compare to:
- #314 Reviewer linter (~600 lines, 1 day) — similar shape but with pattern library
- #133 OOS detector (Spec-side, ~450 lines, half-day) — directly comparable; Build-side is Layer 1 only

Files: ~50 lines domain function + ~30 lines Activity + ~40 lines BuildAgentWorkflow edit + ~150 lines tests + ~30 lines migration if new audit kind needed = ~300 lines plus drift fix.

### Open questions / drift to flag at PR time

- **Audit kind**: `out-of-scope-blocked` — check if this is already registered (Cesar's PR #133 may register it; or it lives in our PR #337's migration since AC-SPEC-13 audit kind was added). If not registered, add to a new migration.
- **Classifier integration**: depends on what T-M3-11 ships — does it run the classifier first, or does the turn loop expect the OOS check to fire independently? Pattern from plan/05 §3.5 says classifier-verdict OOS triggers the check; verify on landing of T-M3-11.

### Dispatch checklist (when T-M3-11 closes)

1. `git pull --ff-only origin master`
2. Read the merged T-M3-11 PR diff — see what BuildAgentWorkflow.run() actually does now, where the classifier step is, where check_in_scope inserts
3. Read plan/08 §2.5 (`build-agent-activities`) + §8 Task 8.5 — full details
4. `git switch -c 137-t-m3-44-out-of-scope-guard-build-side`
5. Run the smoke-test pattern from `feedback_smoke_test_llm_tool_use_pre_commit.md` (Bloom-only here, no LLM call — but exercise the Activity once against a fixture graph)
6. Land in the order: domain function → Activity wrapper → workflow.py edit → tests → drift fix → REASONING REQUIREMENT paragraph → PR

---

## §2 — #138 Build session checkpoint <a id="138-build-session-checkpoint"></a>

**T-M3-45** · waits on **T-M3-11 + T-M3-13**

### What it does

Auto-snapshot Build session state at the end of each successful `apply_edits` (≤1/min, throttled). On pause / await-confirm. Snapshot is a reproducibility triple: `(spec_hash, skill_versions, build_inputs)` serialized to a CAS blob. Lets the user resume / replay a session.

### Files (path-corrected)

- `apps/api/src/amira_api/runtime/agents/build/checkpoint.py` ✅
- `apps/api/src/amira_api/canvas/api/checkpoints.py` — wait, `canvas/api/` doesn't exist on master. **Drift to fix**: probably `apps/api/src/amira_api/domain/canvas/checkpoint_routes.py` (Cesar's canvas tree already has `domain/canvas/repositories.py` + `domain/canvas/db.py` from #318 T-M3-09).
- `apps/api/tests/runtime/agents/build/test_checkpoint_policy.py` (path-corrected)

### Deliverable

- `write_checkpoint(session_id, spec_hash, skill_versions, build_inputs) -> CheckpointResult` Activity
- Policy: trigger at `apply_edits` completion + ≥60s since last + ≤1/min cap + on pause/await-confirm
- CAS payload via Azure Blob (or our existing blob store — `domain/spec/blob.py` pattern)

### Test (one — explicit per ticket)

`test_checkpoint_policy.py` — synthetic 5-minute / 6-edit session → exactly 5 checkpoints. AC-CV-18.

### Size estimate

**Medium — ~4-5 hours.** Mostly domain work — policy logic + blob serialization + one Activity wrapper.

### Open question

T-M3-13 is the second blocker — need to check what it ships (likely the `build_inputs` shape per BUILD-4). Look it up when dispatching.

---

## §3 — #142 Static-analysis probe + capability-graph reader <a id="142-static-analysis-probe"></a>

**T-M3-49** · waits on **T-M3-48** (Q-13-1 lock, Cesar) + **T-M3-24** (#117 compliance tables, Cesar)

### What it does (user-visible)

For every Functional Requirement / NFR / Acceptance Criterion in the locked spec, run a **pure-Python static probe** against the project's file tree to determine if the implementation MATCHES the requirement. E.g. for `FR-3: "QDL macro enrichment"`, probe checks: does `quandl` import exist? Is it called from a non-test file? Does the cited endpoint file exist? Returns `StaticProbeResult` with `inspected_paths`, `observed_skill_versions`, `probe_notes`, `missing_patterns`. This is the **deterministic half** of the compliance evaluator (the LLM judge in #143 is the other half).

### Dependencies

| Dep | Status | What it ships |
|---|---|---|
| T-M3-48 (#136 Q-13-1 lock) | ⏳ Cesar, OPEN | Decision lock on `expected_implementation: list[Pattern]` shape on `CapabilityNode` — needs Cesar's lock before we can write the probe-pattern matcher |
| T-M3-24 (#117 compliance tables) | ⏳ Cesar, OPEN | 5 compliance tables (`requirement_status`, `compliance_evidence_index`, `ac_runner_result`, `compliance_score_history`, `requirement_expected_implementation`) + Alembic migration |

**T-M3-48 is the more critical block** — without the `expected_implementation` schema lock, we don't know the shape of the pattern DSL to match against.

### Files (path-corrected — these match actual layout)

- `apps/api/src/amira_api/compliance/static_probe.py`
- `apps/api/src/amira_api/compliance/capability_graph_reader.py`
- `apps/api/src/amira_api/compliance/file_ops_reader.py`
- `apps/api/tests/integration/test_static_probe.py`

(New top-level `compliance/` package — confirm there's no existing one; if there is, append; if not, this PR creates it.)

### Deliverable

```python
def run_static_probe(
    req: CapabilityGraphNode,  # has expected_implementation: list[Pattern] after T-M3-48
    file_tree: FileTreeReader,
) -> StaticProbeResult:
    """Per-FR / NFR / AC pattern-string match.

    For FRs: component file exists, bound skill IDs resolve in-scope,
    required imports cross-reference bindings dir per CROSS-4.
    For NFRs: pattern check + lockfile inspection (NFR-1 RLS, NFR-2
    region-lock, NFR-4 audit-retention).
    For ACs: test-file presence + ac-runner-result lookup.
    """
```

### Tests

Golden FinIQ fixtures — replay every demo-theater #10 row's expected `implemented` + `status`. Real fixture, deterministic probe (no LLM), real file tree.

### Anchor patterns

- **Our static analyzers in #135** (`domain/reveng/static_analysis/py.py`) — pattern-matching against Python AST is exactly what we just shipped. Reuse the pattern.
- **#314 Reviewer linter** — YAML-driven pattern registry.

### Size estimate

**Medium-Large — ~6-8 hours.** Bigger than #137 because the rule registry is wider (FR/NFR/AC × multiple patterns each). Comparable to the 3 analyzers we shipped in #135.

### Open question

Q-13-1's lock matters HUGELY — the `Pattern` DSL shape determines the matcher. If Cesar picks "pattern strings" (likely from plan/13 §7), it's regex-style. If he picks "AST predicates" we'd need a small DSL parser. Hold off until T-M3-48 closes.

---

## §4 — #143 LLM-judge wrapper <a id="143-llm-judge-wrapper"></a>

**T-M3-50** · waits on **T-M3-24** (#117 compliance tables, Cesar) + **#6 LLM Adapter** (✅ shipped via PR #236)

### What it does

LLM-judged half of the compliance evaluator. When the static probe (#142) returns ambiguous or partial-match, escalate to Anthropic with `RecordRequirementStatus` tool-use. Two-tier escalation: Haiku first; if `confidence < 0.7` escalate to Sonnet. Loud rejection of evidence hallucination (paths not in `inspected_paths`).

### Files (path-corrected)

- `apps/api/src/amira_api/compliance/llm_judge.py`
- `apps/api/src/amira_api/compliance/prompts/v1.txt`
- `apps/api/src/amira_api/compliance/prompts/judge_user_template_v1.txt`
- `apps/api/tests/golden/test_judge_finiq_{nfr3,fr1,ac1}.py`

### Anchor patterns

- **Our `domain/reveng/inference.py`** (PR #337) — Anthropic tool-use with `cache_control` + evidence-hallucination check. Almost direct mirror.
- **`agents/spec/prompts/v1/readiness_tiebreaker.txt`** (#313 PR) — versioned-prompt loading pattern.

### Size estimate

**Medium — ~4-5 hours.** Tool-use call + evidence-check + 3 golden tests. Very similar shape to inference.py from #135.

### Verification note (ticket-stated)

> "golden-trace tests use deterministic mock returning canned tool-use blocks"

⚠️ This wording would normally be banned (mocking OUR code). Re-read at dispatch time — the ticket might mean monkeypatching the **Anthropic SDK boundary** (acceptable per locks), not our `LlmAdapter`. If the latter, push back.

---

## §5 — #144 Detector orchestration <a id="144-detector-orchestration"></a>

**T-M3-51** · waits on **T-M3-24** + **T-M3-49 (ours)** + **T-M3-50 (ours)**

### What it does

Top-level orchestrator composing #142 (static probe) + AC lookup + #143 (LLM judge). FastAPI router exposes `GET /matrix`, `POST /recompute`, `GET /requirements/{req_id}/evidence`. Incremental recompute on `file-written` events using `compute_affected_requirements`. Full recompute fallback above the 16-req cap.

### Files (path-corrected)

- `apps/api/src/amira_api/compliance/api.py`
- `apps/api/src/amira_api/compliance/detector.py`
- `apps/api/src/amira_api/compliance/affected_set.py`
- `apps/api/src/amira_api/compliance/score.py`
- `apps/api/tests/integration/test_recompute_{incremental,full,evidence_hallucination}.py`

### Anchor patterns

- **#142 + #143** — we'd write these first as the building blocks.
- **`domain/spec/routes.py`** — FastAPI router pattern.
- **#135's materialization** — atomic write + audit emit pattern (here: `compliance-re-evaluated` audit + narration outbox row per affected requirement).

### Size estimate

**Medium-Large — ~6-8 hours.** Orchestrator + 3 routes + affected-set algorithm + 3 integration tests. Mostly composition.

---

## §6 — #140 MCP Runtime Client <a id="140-mcp-runtime-client"></a>

**T-M3-47** · waits on **T-M3-46** (#119 Build Plan resolver, Ashwin probably) + **T-M3-02** (Cesar)

### What it does

A reusable Python library that the platform's runtime uses to call MCP-spec'd skill tools. Per-skill connection pool keyed by lockfile hash. Verifies tool surface hash against the lockfile (drift = every call fails closed). Per IDA-3 SIMPLIFY-IDA-2, principal propagation is in-process via workflow context, NOT wire-level OBO.

### Files (path-corrected from `libraries/mcp-runtime/`)

The ticket uses `libraries/mcp-runtime/` as a top-level lib dir. **Check at dispatch time** whether `libraries/` already exists on master (likely doesn't yet); first time we add it we set the convention. If Cesar prefers a different layout (e.g. `apps/api/src/amira_api/mcp_runtime/`), translate to that.

### Anchor patterns

- **mcp Python SDK** — `mcp.client.streamable_http.streamable_http_client` — context7-verify the API shape before pinning.
- **httpx connection pool patterns** — for the per-(skill_id, version) keying.

### Size estimate

**Large — ~8-10 hours.** New top-level library + connection pool + drift verification + 2 integration tests. Most surface area we'd build from scratch (no existing MCP code on master).

### Open question

The ticket body still has stale OBO wording (`<obo_token>`) per memory `project_prep_briefs_2026_05_06.md`. SIMPLIFY-IDA-2 stripped wire-level OBO from v1. **Foundation drift to fix in same PR**: rewrite the ticket's auth wording before adding the code. Already flagged in our 2026-05-06 prep notes.

---

## §7 — #145 QDL federation skill <a id="145-qdl-federation-skill"></a>

**T-M3-52** · waits on **T-M3-32 + T-M3-34** (data plane, Ashwin)

### What it does

Two MCP tools (`qdl.search` + `qdl.fetch`) on the QDL data lake. Routes through the Query Session Gateway. Each returned data point carries `classification` + `provenance` for compliance.

### Files (path-corrected from `backend/`)

- `apps/api/src/amira_api/data_plane/federation/qdl.py`
- `apps/api/src/amira_api/skills/builtin/qdl_manifest.json`
- `apps/api/tests/data_plane/test_qdl.py`

### Likely defer post-demo

This is data-plane plumbing for QDL — not on the Wed demo critical path. **Recommend defer to M6 (`deferred-post-demo` label)** if it doesn't unblock by Thu. Ashwin's queue has lots of data-plane work; he's the right person.

### Size estimate

**Medium — ~5-6 hours.** Two MCP tools + manifest + role-policy integration test.

---

## §8 — #133 Out-of-scope detector (Spec-side, Cesar's lane) <a id="133-out-of-scope-detector-spec-side-crossover"></a>

**T-M3-40** · `owner:cesar` · **already studied this morning** during the #133-vs-#137 evaluation

### Key facts (already verified)

- **All deps shipped (and most by us)**: T-M3-37 ✅ (PR #240) + T-M3-03 ✅ (PR #307)
- **4 files, ~450 lines** total
- **~4-6 hours** of work
- **Demo-critical** for DEMO_FLOW step 4 (replaces hard-coded `requiresArchitecturalChange` theater)
- **Bloom-then-LLM-judge** pattern: Layer 1 sub-µs membership; Layer 2 Haiku tool-use only on miss
- **3 audit kinds** to register: `out-of-scope-first-pass-block`, `out-of-scope-second-pass-block`, `out-of-scope-judge-allow`
- **AC-SPEC-14** verification gate

### Dispatch checklist (when Cesar greenlights via WhatsApp)

1. `gh issue edit 133 --add-label owner:farzaneh --remove-label owner:cesar` (REMOTE — Farzaneh confirm)
2. `git switch -c 133-t-m3-40-out-of-scope-detector`
3. Read plan/07 §2.6 + §3.4 + §6 SIMPLIFY-SPEC-2 + §8 SPEC-B-5 fully (most already in head)
4. Add the 3 audit kinds to a migration (chains off our latest revision `20260519100000`)
5. Land files in order: prompt → domain function → Activity → tests
6. Smoke-test pre-commit per `feedback_smoke_test_llm_tool_use_pre_commit.md`
7. PR with 6-section body + REASONING REQUIREMENT
8. **Important**: re-check the issue body's test #4 / #5 ("monkeypatch.setattr(LlmAdapter.tool_call, …)") — this is the boundary-stubbing pattern; document carefully in PR body so it doesn't get flagged as our-code-mocking

### Why this is the strongest crossover pick

- All deps shipped by us → fast dispatch
- Demo-critical (Wed) → high impact
- Same shape as work we've shipped 4 times → low surprise risk
- Cesar would otherwise have to do it himself during demo polish → saves him time

---

## §9 — Crossover candidates #99 + #108 <a id="crossover-candidates-99--108"></a>

### #99 T-M3-06 — KB attachment indexing

- **Source**: plan/07 §2.7 + §8 SPEC-B-10
- **Why a fit**: Direct build on our PR #307 schema (`kb_attachment` + `kb_chunk` + pgvector column)
- **Files**: `domain/spec/kb.py` (extract+chunk+embed pipeline), `domain/spec/kb_routes.py`, tests
- **Stack**: pypdf + python-docx + plain-text/csv stdlib for extraction; chunk strategy; embedding model (need to confirm — likely `text-embedding-3-small` or Anthropic's; check plan/06 §2.1)
- **Demo-relevant**: KB tab on Spec Workspace shows uploaded files indexed
- **Size**: Medium (~6-8 hours) — extraction + chunking + async indexing + 5 file-type tests

### #108 T-M3-15 — Spec → Build hand-off + Build → Deploy hand-off + Build → Compliance re-eval wiring

- **Source**: plan/08 + plan/13 cross-area
- **Why a fit**: Connects our Spec output to Build Agent input — the demo's "now build it" moment
- **Files**: probably `apps/api/src/amira_api/runtime/agents/spec/handoff.py` + Build-side receiver + audit kinds
- **Demo-relevant**: e2e demo step transition from Spec → Build
- **Size**: Medium (~5-7 hours) — workflow signal wiring + handoff envelope shape (per RUNTIME-7) + tests

---

## Sequencing logic (if multiple unblock at once)

| Scenario | Priority order |
|---|---|
| T-M3-11 lands (Build scaffolding) | #137 first (smaller, demo-relevant), then #138 |
| T-M3-24 lands (compliance tables) | #143 first (LLM judge, more modular), then #142 (needs T-M3-48 too — might still wait), #144 last (composes the others) |
| T-M3-48 lands (Q-13-1 lock) | #142 unblocks (still needs T-M3-24) |
| T-M3-46 + T-M3-02 land | #140 unblocks |
| Cesar greenlights #133 | Take immediately — it's the smallest, demo-most-impactful, and all-deps-shipped |
| Cesar greenlights #99 | Take if demo cares about KB tab being live |
| Nothing unblocks for 60+ min + Cesar silent | WhatsApp Cesar with the draft we have |

## Reading list at dispatch time (don't pre-read; load when needed)

Per the editorial-flag check + drift-patterns checklist, when a ticket flips to ready:
- The ticket's source area section in `plan/NN`
- `plan/00-engineering-standards.md` (always re-read — short)
- `CLAUDE.md` "Not in v1" + test rule + drift-patterns
- `architecture/CHANGELOG.md` grep for ticket-specific terms
- TECHNICAL_EXECUTION_PLAN.md search for the T-M3-NN entry
- Memory: `feedback_start_amira_issue_locks.md` (the pre-claim checklist)
