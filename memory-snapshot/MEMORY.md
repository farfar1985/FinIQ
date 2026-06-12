# Memory Index — Amira FinIQ

## Project resources
- [project_temporal_ui_access.md](project_temporal_ui_access.md) — Temporal Web UI `temporal.amira.qdt.ai` + Cesar's shared team creds (use when workflows stuck). Personal-only; never echo password.

## Feedback
- [feedback_language_tone.md](feedback_language_tone.md) — Never "replace"/"fragmented" in Mars-facing docs.
- [feedback_no_timelines_costs.md](feedback_no_timelines_costs.md) — No timelines or cost estimates in SRS.
- [feedback_anthropic_key.md](feedback_anthropic_key.md) — Claude Code overrides OPENAI/ANTHROPIC_API_KEY — use FINIQ_-prefixed fallbacks.
- [feedback_repo_separation.md](feedback_repo_separation.md) — Personal repo gets CLAUDE.md+memory; QDT repo gets code only.
- [feedback_qml_confidential.md](feedback_qml_confidential.md) — QML API doc + key confidential; never in code/git/docs.
- [feedback_no_push_without_cesar.md](feedback_no_push_without_cesar.md) — No git push while Cesar is deploying without his confirmation.
- [feedback_git_push.md](feedback_git_push.md) — GCM Avalonia crash fixed via `gh auth setup-git` (token in keyring); pushes from amira-mars clone work clean.
- [feedback_no_premature_commits.md](feedback_no_premature_commits.md) — Don't ask to commit during testing — user says when ready.
- [feedback_mars_query_scale.md](feedback_mars_query_scale.md) — Mars Databricks scans billions of rows (2-5 min); poll ≥10 min, throw QueryStillComputingError not [], cache 4hr.
- [feedback_llm_json_output_modes.md](feedback_llm_json_output_modes.md) — In a JSON-output LLM prompt cover ALL modes as JSON (refusal/capability/data) + branch on key; plain-text refusal silently conflicts.
- [feedback_word_unlicensed_toc.md](feedback_word_unlicensed_toc.md) — Word "Unlicensed Product" mangles TOC field on save; prefer static TOC or user-rebuild. + macOS zip sidecar, send-both-formats.
- [feedback_local_clone_freshness.md](feedback_local_clone_freshness.md) — Always `git fetch + pull --ff-only origin master` before any read/plan; Cesar pushes all day, clones go stale fast.
- [feedback_whats_next_windows_encoding.md](feedback_whats_next_windows_encoding.md) — Run amira-mars `whats_next.py` with `PYTHONUTF8=1` on Windows (cp1252 garbles gh em-dashes → phantom 0/0).
- [feedback_no_remote_writes_without_confirm.md](feedback_no_remote_writes_without_confirm.md) — **Per-action confirm EVERY mutating remote cmd** (push/PR/issue/label/comment/merge/close); never bundle. gh authed as farfar1985.
- [feedback_avoid_jargon_amira_mars.md](feedback_avoid_jargon_amira_mars.md) — No "triage/north star/swimlane/circle back/synergy"; plain language. Keep exact project terms (Authorized Approver, e-signature, MCP, capability graph).
- [feedback_self_merge_pattern.md](feedback_self_merge_pattern.md) — Cesar's ship→push→PR→squash-merge pattern. NOTE current rhythm = Cesar reviews+merges; don't self-merge unless he says. Per-action confirm.
- [feedback_pr_base_deletion_autocloses.md](feedback_pr_base_deletion_autocloses.md) — `--delete-branch` auto-closes PRs based on it (can't reopen); recovery = rebase orphan + skip merged commit + force-push + fresh PR.
- [feedback_uv_lock_conflict_strategy.md](feedback_uv_lock_conflict_strategy.md) — pyproject.toml conflict = keep-both; uv.lock = take master's + `uv lock` to regen. Never hand-merge uv.lock. `--ours/--theirs` invert in rebase.
- [feedback_mars_architecture_lock.md](feedback_mars_architecture_lock.md) — Mars-side (`architecture/mars/`) = PydanticAI + Foundry OpenAI endpoint, never Anthropic/claude-*; Okta OIDC, Azure Repos, WIF tokens, US-East, SOX/GDPR/MDC pin.
- [feedback_test_shape_rule.md](feedback_test_shape_rule.md) — No decorator/Pydantic-shape/caplog/schema-introspection tests; each asserts user-visible behaviour vs real system. PR body: 1 sentence/test + `Catches:`.
- [feedback_start_amira_issue_locks.md](feedback_start_amira_issue_locks.md) — Per-ticket pre-flight: scan body for [EDITORIAL FLAG]/[STOP]; `## How this PR integrates` first; no AsyncMock/mock-our-code/skip/Playwright; never `git add -A`; 6-section PR body.
- [feedback_smoke_test_llm_tool_use_pre_commit.md](feedback_smoke_test_llm_tool_use_pre_commit.md) — Before committing LLM tool-use code, run real-Anthropic smoke. Free-text caps vs token budget: REMOVE the cap, don't raise it; trace BOTH OOS schemas.
- [feedback_python_import_collision.md](feedback_python_import_collision.md) — Don't re-export a function whose name matches its module name in `__init__.py` (breaks monkeypatch + `import X.Y.Z as alias`).
- [feedback_cesar_quality_bar_m1_backend.md](feedback_cesar_quality_bar_m1_backend.md) — 8 rules; #8 = pull upstream into the SAME PR, no carve-outs by default (only on explicit lead OK). Banned: "future ticket/deferred to/will run on CI".
- [feedback_probe_real_behavior_not_local_smoke.md](feedback_probe_real_behavior_not_local_smoke.md) — PR verification = probe real behavior vs real services (PG/Anthropic/Temporal/K8s), not "ran a smoke on my laptop".
- [feedback_no_skip_scaffolded_tests.md](feedback_no_skip_scaffolded_tests.md) — Never `mark.skip("when X lands")` + follow-up ticket; ship the harness in the same PR or delete the test. No Windows-only/simulated tests.
- [feedback_pre_flight_lock_ack_required.md](feedback_pre_flight_lock_ack_required.md) — "ACK reading X before first code edit" = hard gate: pull→rebase→read cited files→draft ACK (lock→decision pairs)→send→then code.
- [feedback_library_vs_consumer_dependency_direction.md](feedback_library_vs_consumer_dependency_direction.md) — "wire into X" often reverses: check Depends-on on BOTH; if X depends on THIS → X imports the lib, wiring is in X's PR not ours.
- [feedback_claude_md_management_skill.md](feedback_claude_md_management_skill.md) — CLAUDE.md edits: (1) weekly cadence not per-session; (2) ALWAYS surface quality report + diff BEFORE editing, no exceptions. CLAUDE.md=patterns / team-locks=process / memory=prefs.
- [feedback_brainstorm_skill_manual_when_cesar_unavailable.md](feedback_brainstorm_skill_manual_when_cesar_unavailable.md) — Ambiguous design + Cesar away → manual brainstorm: per ambiguity give 2-3 options+tradeoffs+rec anchored to locks; Farzaneh picks; execute.
- [feedback_pre_build_comprehensive_audit_workflow.md](feedback_pre_build_comprehensive_audit_workflow.md) — Before code on a non-trivial ticket: 5-phase audit (pre-claim study → brainstorm → adversarial 8-lock review → 🟢/🟡/🔴 table → execute).
- [feedback_house_style_beats_best_practice.md](feedback_house_style_beats_best_practice.md) — On owner:cesar tickets, codebase precedent beats best-practice instinct. "Are you confident?" = re-run audit phase 3.
- [feedback_shape_bridge_in_consumer_not_upstream.md](feedback_shape_bridge_in_consumer_not_upstream.md) — Downstream Protocol wants richer shape than upstream class → bridge in the CONSUMER's home (1 Pydantic wrapper + vocab map), not by editing either shipped surface.
- [feedback_assessment_deep_study_workflow.md](feedback_assessment_deep_study_workflow.md) — "Should we overhaul X / compare to ref" = 5-phase study (framing → lock-read → code-map → reference clones at D:/refs/ → gap matrix + Cesar Qs). Never skip to direction-pick.
- [feedback_anthropic_sdk_stays_qdt_pydanticai_for_mars.md](feedback_anthropic_sdk_stays_qdt_pydanticai_for_mars.md) — QDT `apps/api/` stays raw Anthropic SDK; Mars `architecture/mars/` = PydanticAI. Never framework-swap mid-feature. Triple-confirmed.
- [feedback_bidirectional_spec_build_loop.md](feedback_bidirectional_spec_build_loop.md) — Spec→Build is bidirectional: Build replan signal → Spec workflow (#388 handler + Cesar's T-M3-95 trigger). Assume bidirectionality unless one-way-locked. 3-emit cap.
- [feedback_never_print_env_values.md](feedback_never_print_env_values.md) — NEVER print .env contents (any filter). Safe: `awk -F= '/^[A-Z]/{print $1}'`, `grep -c`, presence-check. On slip: stop+tell+rotate.
- [feedback_build_readiness_scorecard_pattern.md](feedback_build_readiness_scorecard_pattern.md) — Quality-gate: composite 0-100 across N orthogonal dims + categorical feedback + keep-or-revert loop. PRIMARY judges fail loud, SUPPLEMENTAL fail soft.
- [feedback_wsl_node_corruption_after_dirty_reboot.md](feedback_wsl_node_corruption_after_dirty_reboot.md) — V8 turbofan crash in `next dev` post-dirty-reboot: common workarounds DON'T work; real fix = Windows Node MSI reinstall + clean node_modules.
- [feedback_temporal_test_env_pydantic_converter.md](feedback_temporal_test_env_pydantic_converter.md) — Temporal tests: `start_local(data_converter=pydantic_data_converter)`; `WorkflowFailureError` in `temporalio.client`; alembic-pollution recovery = drop app+audit+alembic_version, re-pytest.
- [feedback_matrix_walk_backend_first.md](feedback_matrix_walk_backend_first.md) — When a UI regression blocks a matrix walk, validate backend-only via Postgres SQL on outbox_event/spec_capability_graph JSONB + Temporal signal scripts (~80% of rows).
- [feedback_ci_is_lint_only_dont_chase_green.md](feedback_ci_is_lint_only_dont_chase_green.md) — amira-mars CI is lint-only (Cesar): IGNORE openapi-drift red (master #697); real-services runs (PG+Temporal) are the gate.
- [feedback_two_sided_llm_calibration.md](feedback_two_sided_llm_calibration.md) — Tuning LLM default via prompt → build the SYMMETRIC eval-rubric penalty SIMULTANEOUSLY (prompt criterion + worked examples; eval-side penalty).
- [feedback_audit_emit_outbox_not_audit_log.md](feedback_audit_emit_outbox_not_audit_log.md) — Audit emits write `app.outbox_event` NOT `app.audit_log` (downstream projection consumer not running in dev). 0 rows in audit_log ≠ bug.
- [feedback_cesar_bug_pattern.md](feedback_cesar_bug_pattern.md) — Bug-issue shape: `[bug] <imperative>` + bug/track:/owner: labels + Repro/Expected/Actual/Why/Fix-sketch/Related/Refs. PR body = 1-3 sentences → commit body.
- [feedback_cesar_pre_split_tickets_check_related_first.md](feedback_cesar_pre_split_tickets_check_related_first.md) — Cesar pre-splits cross-boundary work into library + wiring tickets; don't bundle. `gh issue list --label owner:cesar --search <topic>` before scoping a PR touching his files.
- [feedback_deconflict_stale_branch_for_maintainer.md](feedback_deconflict_stale_branch_for_maintainer.md) — De-conflict a stale PR for the maintainer: merge master INTO branch (not rebase); graft conflicted test files; re-point first migration down_revision to new head; regenerate artifacts; verify real-services. Goal = clean FF.
- [feedback_browser_mcp_live_diagnosis.md](feedback_browser_mcp_live_diagnosis.md) — Diagnose live frontend bugs via Claude-in-Chrome MCP (DOM/console: disabled/readOnly/computedStyle/elementFromPoint/ancestor-walk); test fix inline before editing source; `navigate` forces https → pass explicit http://.
- [feedback_spec_agent_kickoff_prompt_hardening.md](feedback_spec_agent_kickoff_prompt_hardening.md) — Deployed Spec Agent kickoffs: `(FR-1.1,…)` triggers over-bloom→ActivityError (~50%) → harden with flat-IDs + sub-reqs-in-detail + NFR clause; ≤9 FRs dodges sort bug; "raise unspecified deps as gaps" creates a live-resolvable gap; demos NEVER cold-kickoff live — reuse saved spec.
- [feedback_verify_consumer_receives_not_just_producer_emits.md](feedback_verify_consumer_receives_not_just_producer_emits.md) — A producer creating rich data ≠ the consumer receiving it; read the serializer/handoff between them (Spec→Build spec.md dropped 31 ACs + the whole graph).
- [feedback_llm_judge_conditional_rubric_injection.md](feedback_llm_judge_conditional_rubric_injection.md) — Every static-rubric paragraph makes an LLM judge stricter on UNRELATED dims (~17% control flake → 40-50%); fix = code-side precheck + conditional rubric injection; align cross-file defs by reference; baseline controls 6-10 runs before calling regression.
- [feedback_verify_subagent_claims.md](feedback_verify_subagent_claims.md) — Verify a study subagent's LOAD-BEARING claims at the source before publishing a proposal (#756: "companion leaks O(N)/turn" was actually a cap BYPASS — the inverse; routes.py read flipped it).
- [feedback_headless_drive_ops_gotchas.md](feedback_headless_drive_ops_gotchas.md) — Headless agent-drive ops: identify workers via /proc/PID/cwd (pgrep self-matches thru wsl wrappers); re-query seed ids after DB reseeds; worktree-upgrade mid-session OK; script poll ≠ verdict (read DB+log+reassembled reply).
- [feedback_github_safety_import_testing.md](feedback_github_safety_import_testing.md) — Repo-import testing NEVER touches the QDT repo (public/sample repos only, e.g. miguelgrinberg/microblog). Keep this concern PRIVATE — out of PRs/tickets/Cesar comms. Farzaneh's explicit constraint.
- [feedback_split_local_stack_pin_ports_first.md](feedback_split_local_stack_pin_ports_first.md) — Local stack may be SPLIT across worktrees/branches; before a live drive pin which dir+branch serves :3000/:8000 (Get-NetTCPConnection + pgrep -af amira_api + /proc/PID/cwd), else edits land in a tree that isn't running.

## Active Work (amira-mars — current)
- [project_next_session.md](project_next_session.md) — **CURRENT RESUME STATE (2026-06-11 EOD).** HUGE day: #767 shipped (PR #768) **AND #770 BUILT+SELF-TESTED-BY-FARZANEH (PR #775, Closes #770+#769)** — import→interviewer orientation works end-to-end (she drove the SSO pivot + 3-answers-3-gaps turn live). **3 PRs OPEN+MERGEABLE: #766 (#669 — was ALREADY built, not "awaiting locks"), #768, #775; merge order #768→#775.** #773 (repo-in-KB) + #774 (Build→repo push, tmp-secrets pre-lock) filed. CI openapi-drift red on ours = snapshot not regenerated, deferred. **NEXT: #761 → #756 → #773.** Stack UP (split worktrees).
- [project_spec_agent_repo_import_roadmap.md](project_spec_agent_repo_import_roadmap.md) — Spec-Agent maturity roadmap around repo-import: Q1-Q4 + status (Q3/#770 BUILT → PR #775; Q4 sharpened → #773 filed; write-half → #774 filed). For planning with Cesar.
- [project_773_build_blueprint.md](project_773_build_blueprint.md) — **#773 LOCKED build blueprint** (Phase 0 + design done 06-11 night): digest = deterministic renderer of StaticAnalysisOutput → normal KB attachment → existing index/retrieval rails ride free. 6 pieces in commit order + all conventions verified. Worktree D:/amira-mars-773 ready (venv + .env). Implementation NOT started.
- [project_empowered_spec_agent_spike.md](project_empowered_spec_agent_spike.md) — 2026-06-04 spike record: prompt-only empowered interviewer + grounded drives + bug ledger (over-bloom / OOS false-blocks / FR-ID collision / handoff fidelity → #725) + roadmap → #726. 06-05 live-UI 7-property PASS. Superseded by #728 merge — interviewer now on master + deployed.
- [project_companion_mcp_206_recon.md](project_companion_mcp_206_recon.md) — Pre-build read of #206/T-M5-16 (Companion MCP handler, last open milestoned ticket): ~80% clear; gate = permission-intersection contract needs Cesar sign-off; 3 files + 4 real-services tests ~2-2.5d; build vs FRESH master (spike branch regressed companion workflow.py).
- [project_spec_agent_sweep_2026_05_28.md](project_spec_agent_sweep_2026_05_28.md) — Spec Agent audit: B/F/P/E/I/N findings + status dashboard. 2026-05-29: #698 merged (B1/B2/P1 done), #689 mergeable, #695 closed, #694 tracker.
- [project_spec_agent_redesign_map.md](project_spec_agent_redesign_map.md) — Spec Agent Direction-D execution map; 12 tickets shipped; Phase 12 bugs surfaced+fixed (F1/F4/F5/F6 detail).
- [project_phase12_observations.md](project_phase12_observations.md) — Phase 12 keep-or-revert log + ~35-row Capability Audit Matrix (4 layers). F1-F15 findings; cumulative-materialization/AC-continuity/gap-note fixes validated.
- [phase12_test_drive_checklist.md](phase12_test_drive_checklist.md) — Single coordinated test-drive to flip max matrix rows in 4-6 turns; canonical habit-tracker exercise prompt + 3-gate lock attempt.
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Mars green-lit deployment; Cesar's 17-area plan in amira-mars; 4-week build window; we own AI/LLM track. Track 1 (cloud) is what's built.
- [project_m2_critical_scan.md](project_m2_critical_scan.md) — Adversarial M2 scan (runtime/AI/Spec). Path divergence everywhere → real layout `apps/api/src/amira_api/...`. OBO→OPAQUE rename. (Partly resolved by Cesar back-prop.)
- [project_prep_briefs_2026_05_06.md](project_prep_briefs_2026_05_06.md) — Pre-stage digest (plan/10-14). 3 cross-cutting findings still valid: `services/`→`apps/api/...` layout, wire-OBO dead per SIMPLIFY-IDA-2, `expected_implementation` shape.
- [project_distributed_agents_track.md](project_distributed_agents_track.md) — Rajiv's Track-2 distributed/remote agents proposal. Mars builds on Track 1; Track 2 parked in Cesar's "think separately" file.
- [project_knowledge_layers.md](project_knowledge_layers.md) — 3-layer knowledge model (user/project/company) + Karpathy graph for company tier. Phase 3+ feature; promotion-flow governance open.
- [project_amira_pitch_deck.md](project_amira_pitch_deck.md) — Mars proposal FINAL delivered 2026-04-28 (Word narrative, $1M + $300K/yr, 28 demo screenshots, INLINE + APPENDIX). At `D:/Amira FinIQ/Amira_Proposal_for_Mars_2026-04-28_FINAL_*.docx`.
- [project_qdl_data_guide.md](project_qdl_data_guide.md) — QDL_DATA_GUIDE.md (project root): 18-col dictionary schema + 2 API patterns + search/fetch impl + LLM orchestration.

## Build setup / environment
- [project_local_dev_setup.md](project_local_dev_setup.md) — Local-dev boot recipe: Docker/Python 3.14/uv/Node 22, port map, dev creds (amira_dev), `make dev`→seed→backend→frontend, Auth0 onboarding, Windows gotchas.
- [project_cesar_codebase_tour.md](project_cesar_codebase_tour.md) — **Before-any-ticket map of amira-mars master.** QDT-side=Auth0+Anthropic (Mars lock is `architecture/mars/` only); backend code map, Cesar's patterns, 7 standards, locked decisions, "not-in-v1" list.
- [project_cesar_deploy_skill.md](project_cesar_deploy_skill.md) — Cesar's `deploy-project` Claude Code plugin (qdt-claude-plugins). Installed WSL 2026-04-22; requires WSL + `conda deactivate` before launching CLI.
- [project_npm_workaround.md](project_npm_workaround.md) — System npm broken (NVM); workaround via ~/.npm-install/.

## Reference (historical / data)
- [project_real_databricks.md](project_real_databricks.md) — Real Databricks: 5.7B-row tables, column mapping (Entity→Unit, Account→RL), warehouse ID.
- [project_schema_discovery.md](project_schema_discovery.md) — Deep schema analysis: relationships, view SQL, 725 formulas, 766 units.
- [project_new_databricks.md](project_new_databricks.md) — New paid Databricks (2026-04-17) `qdt_mars_findiq_workspace.finsight_core_model`; SHOW CATALOGS/SCHEMAS via REST when creds lack them.
- [project_reference_data_cache.md](project_reference_data_cache.md) — `src/lib/reference-data.ts`: runtime cache discovers real Mars Account/Entity/Date values at boot → LLM prompt. First drift-agent MVP; self-heals in 6hr.
- [project_mars_deployment_plan.md](project_mars_deployment_plan.md) — **Partly stale (5/14).** amira-mars plan inventory, locked stack, decision IDs, 6 customer phases. Current status lives in project_next_session.
- [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md) — **HISTORICAL (2026-04-29 spec).** Superseded by 6 simplifications (one AKS, Temporal, plain audit_log, typed predicates, no MFA, Elastic). Context only.
- [project_amira_platform_repo.md](project_amira_platform_repo.md) — Two repos: OLD `amira` (PR #1, 4-tab shell) historical; NEW `amira-mars` active. PR #1 patterns (12 MCP tools, 10 tables, self-check) carried into area 07.

## FinIQ (predecessor work — historical)
- [project_srs_v31.md](project_srs_v31.md) — SRS v3.1 (CURRENT FinIQ): 52 FRs, CI/FMP API, suggested prompts, Appendix C.
- [project_srs_v2.md](project_srs_v2.md) — SRS v3.0 (50 FRs, base + Addendum A + dual-mode).
- [project_team_competition.md](project_team_competition.md) — 3-way merge COMPLETE on main; 85% compliance (68/80).
- [project_vibe_coding.md](project_vibe_coding.md) — Purely-vibe-coding approach: agent builds from specs, no manual coding.
- [project_infra_decisions.md](project_infra_decisions.md) — Azure OpenAI Foundry, GitHub farfar1985/FinIQ, Databricks workspace.
- [project_frontend_spec.md](project_frontend_spec.md) — Alessandro's Bloomberg-inspired frontend design spec.
- [project_build_prompt.md](project_build_prompt.md) — BUILD_PROMPT.md: 80-item compliance matrix, 8 batches, target 95+.
- [project_review_pass1.md](project_review_pass1.md) — Claude review pass 1: 6 critical bugs, ~55-65% SRS coverage.
- [project_cesar_semantic_layer.md](project_cesar_semantic_layer.md) — Cesar's finiq-data-agent: YAML semantic layer over real Databricks.
- [project_persistence_decision.md](project_persistence_decision.md) — Session persistence handled by Amira platform, not the FinIQ app.
- [project_meeting_20260327.md](project_meeting_20260327.md) — 2026-03-27 call: compliance matrix loop, fresh start, VM provisioned.
- [project_meeting_20260331.md](project_meeting_20260331.md) — 2026-03-31 call: reusable agent platform, A2A/MCP, April-21 MLT demo, ROI.
- [project_qdl_macro.md](project_qdl_macro.md) — QML macro enrichment, 3 modes (auto-enrich / "Why" chip / pure-macro route).
- [project_bug_audit.md](project_bug_audit.md) — FinIQ bug waves 1-4 (Apr 14-20) + Azure stale-voice-image diagnosis.
- [project_rajiv_requests.md](project_rajiv_requests.md) — Rajiv's 4 FinIQ requests + Ale's dual-mode ask.
- [project_voice_ui_fidelity.md](project_voice_ui_fidelity.md) — Voice-vs-typed parity phases A+C (table + provenance + chips). Shipped `a14f91c`.
- [project_fmp_timeout.md](project_fmp_timeout.md) — 8s AbortController + Promise.allSettled on FMP; prevents dev-server hangs. `a14f91c`.
- [project_ticker_chatbox_polish.md](project_ticker_chatbox_polish.md) — Ticker only on CI page; chatbox flush to viewport bottom. `a14f91c`.
- [project_architecture_diagram.md](project_architecture_diagram.md) — Rajiv's FinIQ block diagram for Mars deck; needs Databricks/QML/Key Vault additions.
- [project_amira_first_deployment.md](project_amira_first_deployment.md) — First Amira deploy `amira.qdt.ai` (2026-05-15). "Farzaneh will bring the magic" quality bar; live-UI decode; 6 production lessons.
- [project_friday_morning_readiness.md](project_friday_morning_readiness.md) — 2026-05-14 prep: QDT-side = Anthropic SDK + Claude; Cesar's coding patterns, OIDC callback, RLS+audit, test fixtures, Alembic style (commit list stale).

## Planned / parked features
- [project_post_demo_todo.md](project_post_demo_todo.md) — Post-April-21 roadmap (Track A Spec Agent + Track B FinIQ improvements). Canonical at `D:/Amira FinIQ/POST_DEMO_TODO.md`.
- [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) — Spec Agent design v0.6 shipped to Cesar 2026-04-24; v0.7 deltas tracked (not yet revised).
- [project_spec_agent_plan.md](project_spec_agent_plan.md) — **SUPERSEDED.** Original 14-Q interrogation list + hard rules (survived into SPEC_AGENT_DESIGN.md §3.3).
- [project_spec_kit_patterns.md](project_spec_kit_patterns.md) — github/spec-kit patterns for Spec Agent ([NEEDS CLARIFICATION] markers, Constitution Check gate, FR/SC IDs) — cherry-pick reference.
- [project_schema_drift_agent.md](project_schema_drift_agent.md) — **PROPOSED (not greenlit).** Platform-level schema-drift detector + auto-resolver + log; three-bucket design.
- [project_quantumai_exploration.md](project_quantumai_exploration.md) — Quantum AI / Noname read-only review: Pydantic AI, ActionBroker, page context. Voice proposal at `D:/Amira FinIQ/QuantumAI_Voice_Integration_Proposal.md`.
- [project_plan_docs.md](project_plan_docs.md) — Two project plan docs (detailed + simple checklist) shared with Cesar.
- [project_correlation_queries.md](project_correlation_queries.md) — Parked: true parallel Databricks+QML correlation handler. Deferred post-April-21.

## Vision
- [project_amira_vision.md](project_amira_vision.md) — Canonical 3-agent pipeline: Spec → Build → Deploy, sequential-but-reversible. Canvas + Deploy operational; Spec Agent = Spec tab.
- [project_amira_platform_vision_doc.md](project_amira_platform_vision_doc.md) — AMIRA_PLATFORM_VISION.md (~5000w). **Partly stale** — OpenSpec/4-stage superseded by 3-agent + IEEE 830. Build-history/ROI/Mini-App walkthrough still useful.
- [project_agent_frameworks_2026.md](project_agent_frameworks_2026.md) — April-2026 agent-framework landscape (ADK/OpenAI SDK/CrewAI/LangGraph/Pydantic AI + A2A/MCP). If forced to one: Google ADK.
- [project_mars_google_preference.md](project_mars_google_preference.md) — Mars prefers Google ("as much as possible"), preferred not mandatory. Shapes post-demo migration.
- [project_voice_architecture.md](project_voice_architecture.md) — Two-layer voice: platform voice (Layer A) delegates to app voice (Layer B) via A2A. FinIQ = clean A2A-callable specialist.
- [project_bill_amira_architecture.md](project_bill_amira_architecture.md) — Bill's Amira Meet Desktop (clone deleted): bespoke Node+Python+HTML+OpenAI Realtime, monolithic ToolRegistry. `navigate_page`/self-modifying-pipeline/Discovery-Agent patterns worth copying.

## User
- [user_github.md](user_github.md) — Personal GitHub: farfar1985.

## Historical notes (no topic file — folded from inline entries 2026-05-29)
- **Cesar's 2026-05-22 → 26 sprint:** ~90 PRs merged in ~4 days (entire Build Agent + Deploy Agent + approval flow + frontend mocks removed + 6 UI read endpoints). Approval flow is DOWNSTREAM of our Spec Agent. Shared agent-runtime harness `runtime/agents/_shared/agent_runtime/loop.py` — our hand-rolled loop may refactor onto it later. (Full text in MEMORY.md.bak.2026-05-29.)
