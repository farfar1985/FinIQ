---
name: spec-agent-repo-import-roadmap
description: "Spec Agent maturity roadmap around repo-import (#767/#768 shipped) — Farzaneh's Q1-Q4 design questions + recommended directions, for planning with Cesar."
metadata: 
  node_type: memory
  type: project
  created: 2026-06-11
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

Shipped 2026-06-11: **repo-import → spec + editable chat** (#767 pipeline + #768 chat handoff). Building on that, Farzaneh raised four capabilities she considers **a must** for the Spec Agent. Captured here for planning (she'll bring "many questions"; we walk them one by one). All largely live in Cesar's runtime/OOS territory + the import pipeline we built → `needs-design`, his sign-off, but we're well-positioned to build (we own both halves: import #767 + we know the empowered interviewer #728). Cross-links: **#726** (empowered Spec Agent roadmap), **#668** (section tools), **#669** (KB grounding), **#725** (Spec→Build handoff), **#769** (idle-attach composer).

## The unifying fact
The empowered interviewer's richness is **independent of how the spec baseline was seeded.** It runs inside the Spec Agent session, loads whatever spec is currently materialized (by `spec_version_id` via `assemble_spec_context`), and walks the 12-aspect completeness checklist as Q&A to deepen it. So a **repo-import baseline + interviewer-on-top = the same FinIQ-grade depth** the prompt approach gives. Both engines exist; the missing wire is making the interviewer *start* on top of an imported draft.

## Q1 — Give FinIQ's repo → reverse-engineer a RICH spec (NOT the Build Agent)
- **Answer: yes, via chaining.** import = breadth/structure from code; interviewer = depth/intent from human. Import alone has a static-analysis ceiling (can't see business rules / why); the interviewer on top closes it. Proven: prompt-interviewer already reached ≈53 FR vs FinIQ's 52; repo baseline gives MORE grounding (real file names/structure) → should match or exceed, and be more accurate.
- **Design fork to name:** (i) "spec this repo as-is" (intent = the repo) vs (ii) "build something new on top" (intent = new, repo = seed). One flow handles both if the interviewer opens with "Is this meant to spec this app as-is, or are you building something new on top?" and adapts.
- **Recommendation = Option A:** import → materialize baseline → session opens with the **interviewer in repo-aware mode** (summarize what was found + the gaps → orienting question → run completeness checklist on top). Reuses import (#767) + interviewer (#728) + the handoff wire. **Option B** (prompt + repo attached together at genesis, simultaneous) = phase-2 power path (more genesis-orchestration + import-latency complexity).
- **Bonus:** Option A IS the #769 fix — make the opening post-import turn the interviewer's orienting question; it completes (→ composer "ready") and is in-scope (→ sidesteps the OOS guard the passive greeting tripped).
- **Build NOT in scope:** rebuilding FinIQ as a working app is gated on Build Agent maturity (it builds greenfield simple apps; can't reconstruct live Databricks/QML/voice integrations) + #725 (handoff drops graph+ACs). Import→spec = yes; import→rebuilt-app = no.

## Q2 — Can the repo spec be as detailed as possible, then interviewer asks more?
Same as Q1's core: yes — import gives the code-grounded baseline, interviewer deepens to FinIQ-grade. Falls out of building Option A (Q3).

## Q3 — After import, does the interviewer kick in when you enter the chat?
- **Today: NO.** #768 attaches an idle session (and it's stuck "Responding…" per #769). The agent waits for the user's instruction; it does NOT proactively read the imported draft and run the interview.
- **The highest-value next build.** Wire the post-import session to START in interviewer mode oriented to the imported draft (the agent already loads the spec via `assemble_spec_context`). Needs: (a) an interviewer entry-mode for "deepen an existing imported draft" (vs from-scratch) in `v1.txt`; (b) the handoff wire that starts it; (c) the OOS-guard interaction (same as #769). This = the merge of Q2+Q3 and the answer to "FinIQ-grade from a repo."

## Q4 — Reference a repo from inside the chat (prompt approach), like before
- **Today: NO.** KB grounding (#669) reads attached *docs*, not repos. No in-chat repo-reference tool.
- **Buildable, reuses #767 machinery** — expose the clone+analyze pipeline as a *mid-chat grounding action* (point at a repo → clone+analyze → feed into the current spec's context) rather than only as session genesis. Complements #669 (doc grounding) + #767 (from-scratch import).

## Status table (updated 2026-06-11 EOD)
| # | Capability | Status |
|---|---|---|
| — | Import a repo → draft spec + editable chat | **Shipped** (#767 → PR #768, open) |
| Q3 | Post-import → interviewer auto-deepens the draft | **BUILT** (#770 → **PR #775**, open; closes #769 too; live-verified + Farzaneh self-tested: orientation → as-is/build-on-top → adaptive deepening, FR rewrites in place, disposition-correct gaps, #733 assumption-prefix rendering) |
| Q2 | Result reaches FinIQ-grade depth | demonstrated via Q3's interview loop (her 3 answers → 3 gaps resolved + FRs confirmed with the answers written into the details) |
| Q4 | Reference a repo mid-chat (selective chunk grounding) | **Designed + filed → #773** (repo-as-KB-attachment, reveng analyzer as indexer, #669 retrieval rails, MANDATORY mediation per #733, provenance-stamped; prereq = #669/PR #766 — which is BUILT, awaiting merge) |
| Write-half | Build Agent publishes built project to a Git repo | **Filed → #774** (Cesar's idea/lane; create-new-repo v1; his tmp-secrets pre-lock: ephemeral k8s secrets per push job, never stored write tokens; browser-IDE prior-art lead; feeds #633 CI/CD; completes the flywheel build→repo→re-import→evolve) |
| Q1-build | Rebuild a complex app from import | gated on Build Agent maturity (long-term) |

**Key build notes from #770 (for #773 and future work on this seam):**
- The orientation instruction uses `kind="kickoff"` (T-M3-75 synthetic auto-start; no InstructionReceived envelope → no user bubble). **Never key an OOS skip on instruction kind — kickoff is mintable from the public wire** (`_INSTRUCTION_KIND_FOR_WIRE` in `agents/instructions.py`); a kind-keyed skip = client-reachable bypass. Scope-anchor the text instead (embed real req/gap titles) — passes the gate honestly (`spec.out-of-scope-kickoff-allow` verified).
- An imported spec has a populated graph → the empty-graph kickoff judge doesn't fire; the per-turn detector is the relevant gate. #761 (iterating-vs-locked judge distinction) further future-proofs this seam.
- Test pattern: route-level real-Temporal tests assert orientation receipt via the workflow `counters()` query (`total_instructions_received`) — no LLM key needed; turn *behavior* is live-verified separately.

**Sequencing now:** Cesar merges #768 → #775 (+#766) → redeploy → then build **#773** on the merged rails. #774 is his to drive.
