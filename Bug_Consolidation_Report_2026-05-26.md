# Consolidation Pass — 2026-05-26 testing sweep

**Prepared by:** Farzaneh (with Claude Code assistance)
**Date:** 2026-05-26
**Scope:** All 40 tickets filed today during the amira.qdt.ai live-cutover testing sweep — 28 filed by Cesar + 12 filed by Farzaneh. Includes `bug`-labeled regressions AND non-bug-labeled feature / architecture / UX scoping tickets that surfaced from the same sweep. Updated after Phase 12 Round-2 matrix walk + Round-3 multi-turn / OOS / DP-pick drives surfaced 7 additional findings (#619-#625).

---

## Summary

| Group | Count |
|---|---|
| Total tickets filed today | **40** |
| Filed by Cesar | 28 |
| Filed by Farzaneh | 12 (5 morning batch + 5 Round-2 findings + 2 Round-3 findings) |
| `bug`-labeled regressions | 29 (17 Cesar + 12 Farzaneh) |
| Non-bug-labeled feature / design tickets | 11 (all Cesar) |
| Pure duplicates found (one ticket fully subsumes another) | **0** |
| Reference / cluster groups | **11** |
| Already in flight (closed by PR #571) | 4 |
| Standalone (no cluster) | 2 |

**Conclusion:** Every ticket has a meaningful scope difference from its closest neighbour — no closures recommended. But the 40 tickets naturally form 11 thematic clusters where seeing the cluster map saves redundant work and lets fixes land in the right order. Each cluster has a recommended landing order to maximize parallelism without rework.

The 7 Phase-12-Round-2-and-3 findings (#619-#625) all sit in a single new cluster (Cluster 11 below). They were surfaced by:
- **Round 2** — programmatic Spec Agent drive against the post-#571 worker + Postgres SQL matrix walk
- **Round 3** — multi-turn refinement (validated F11 cumulative materialization), OOS prompt (surfaced F22 audit gap), decision-point pick (validated F14 resolve_decision_point end-to-end), explicit `resolve_gap` follow-up (validated F12 — works correctly when asked)

They represent the next-after-#571 backlog for the Spec Agent quality bar.

**Validated end-to-end during Round-3 drives — no bug tickets needed:**
- F11 cumulative materialization (version_seq increments 1 → 2 across multi-turn) ✅
- F12 `resolve_gap` tool + `resolution_note` enforcement ✅ (the tool works when the user explicitly asks for gap resolution; earlier observation of "0 calls" was the agent not naturally invoking it without user direction — that's correct behavior, not a bug)
- F14 `resolve_decision_point` tool + `spec.decision-point-resolved` audit + `selected_id` persistence ✅

---

## Clusters

### Cluster 1 — Sign-up & identity (7 tickets)

Surface area: pending-Org admin pipeline + email allowlist + Google sign-up gate + session lifecycle.

| # | Type | Title | Author |
|---|---|---|---|
| #585 | design (parent) | Sign-up control — invite-only / domain allowlist / operator-provisioned vs JIT | Cesar |
| #582 | design | Operator Admin UI — manage pending sign-ups + active users + roles + audit | Cesar |
| #592 | bug | /pending-approval has no sign-out | Cesar |
| #593 | bug | Sign-up flow accepts any Google account | Cesar |
| #594 | bug | Architectural: session factory should refuse to yield without tenant-context | Cesar |
| #595 | bug | Active sessions persist when operator reverts a user's Org to PENDING | Cesar |
| #596 | bug | `AMIRA_PLATFORM_ADMIN_EMAILS` allowlist is exact-match | Cesar |

**Sub-cluster (RLS / session plumbing):** #594 + #595 — both are architectural-level gaps in tenant-context discipline.

**Recommended order:** #594 (factory enforcement) → #595 (revoke active sessions) **before** #582 (admin UI) so the deactivate button there actually locks users out. #593 + #596 are independent allowlist regressions that can land in parallel. #585's design brainstorm should block #582's UI scope so they're shaped together.

---

### Cluster 2 — Onboarding & docs (2 tickets)

Surface area: first-time user experience + documentation site.

| # | Type | Title | Author |
|---|---|---|---|
| #583 | design (parent) | Onboarding UX — first-time user flow + pending-approval screen + welcome tour | Cesar |
| #590 | bug | Platform user documentation site — replace /docs fluff | Cesar |

**Cross-cluster ties:** #592 (Cluster 1 — /pending-approval polish), #605 (Cluster 6 — Help button opens docs).

---

### Cluster 3 — Quota system (1 ticket)

Standalone parent ticket; loose ties only.

| # | Type | Title | Author |
|---|---|---|---|
| #584 | design | Quota system — per-user / per-Org caps + plan tiers + enforcement points + UI | Cesar |

**Loose ties:** #583 (plan-tier surfacing in onboarding), #582 (operator-side quota visibility in admin UI).

---

### Cluster 4 — Workspaces & org-admin (4 tickets)

Surface area: personal vs business workspace, org-switcher, member roles, invite flow.

| # | Type | Title | Author |
|---|---|---|---|
| #614 | design (parent) | Organization workspace admin UX — full design (create workspace · invite · roles · approver) | Cesar |
| #602 | design | Workspaces / Org-switcher UX — personal + business org pattern (Notion / Claude.ai shape) | Cesar |
| #603 | design | Invite team UX — full design + implementation of the team-invite flow | Cesar |
| #613 | bug | Personal workspace e-signature — user should sign their own spec (no 'Authorized Approver' placeholder) | Cesar |

**Cross-cluster ties:** #585 (Cluster 1 — sign-up gate that gates Org creation), #586 (Cluster 5 — email channel for invite flow), #588 (Cluster 9 — explicitly names #613 in item 5).

**Recommended order:** #614 (root design) → #602 (switcher UX) + #603 (invite UX) can branch off in parallel → #613 is a small correctness fix that probably lands inside #614's broader work but can also ship alone.

---

### Cluster 5 — Notifications (2 tickets)

| # | Type | Title | Author |
|---|---|---|---|
| #586 | design (parent) | Notification system — operator alerts + user emails + in-app inbox + channel adapters | Cesar |
| #604 | design | Notification bell — full architecture + design + implementation (real-time + history) | Cesar |

**The seam:** #586 owns channels + backend adapters; #604 owns the in-app bell UI surface. Scope them together so the contract between layer is clear.

---

### Cluster 6 — Top-bar polish (4 tickets)

Surface area: top-right header surfaces (notification bell + Help button + Profile dropdown + global search).

| # | Type | Title | Author |
|---|---|---|---|
| #601 | bug | Profile dropdown menu items don't navigate | Cesar |
| #604 | design | Notification bell *(cross-cluster — also in Cluster 5)* | Cesar |
| #605 | bug | Help (?) button next to notification bell is empty | Cesar |
| #610 | bug | Global search — top-bar search is a non-functional stub | Cesar |

**Recommended order:** All four can land independently. #601 is the smallest fix (route the existing menu items); #605 needs design before code; #610 is its own deep-research scope; #604 is the largest. Cluster ties them so they ship as one coherent header layer.

---

### Cluster 7 — Home & project entry (4 tickets)

Surface area: what happens when a user lands on /home and types a prompt.

| # | Type | Title | Author |
|---|---|---|---|
| #606 | bug | Home 'What would you like to build?' takes to New Project instead of Spec Agent | Cesar |
| #607 | design (parent) | New Project page redesign — Spec → Build → Deploy settings surface | Cesar |
| #609 | bug | Project / spec auto-naming — LLM-derived title from first prompt | Cesar |
| #610 | bug | Global search *(cross-cluster — also in Cluster 6 — search jumps here)* | Cesar |

**Recommended order:** #606 (routing fix) is small and unblocks; #609 (auto-naming) ships with #607's redesign — they share the same surface.

---

### Cluster 8 — Chat consolidation (3 tickets)

Surface area: chat surfaces across the platform — Ask Amira drawer + Spec Agent chat panel + streaming behaviour.

| # | Type | Title | Author |
|---|---|---|---|
| #611 | design (parent) | Chat surface consolidation — Ask Amira drawer is broken + unify chat UX | Cesar |
| #600 | bug | Streaming text_delta chunks render as separate chat bubbles | Farzaneh — **closing via PR #571** |
| #608 | bug | Spec chat panel: composer + late messages fall below viewport (min-h-0) | Farzaneh — open |

**Recommended order:** PR #571 takes care of #600 (already merge-ready). #608 is a CSS-level fix that can land independently. #611 is the broader unification — should be designed AFTER #600 and #608 land so the shared primitives are clear.

---

### Cluster 9 — FinIQ vocabulary leak + skills surface (4 tickets)

Surface area: residual FinIQ-era mocks, vocabulary, and Skills-view filters that don't belong on a generic platform.

| # | Type | Title | Author |
|---|---|---|---|
| #588 | design (parent) | FinIQ root-cause cleanup — strip BUId / FINIQ_* mocks / business-unit user metadata | Cesar |
| #615 | bug | 'Edit governance' link is hardcoded to `/projects/<demo-app>/governance` → 404 | Cesar |
| #616 | bug | Skills view — drop Mars APIs / Pet Care / HR FinIQ-era filters | Cesar |
| #617 | bug | Skill Creator — 'Create new skill' button is dead | Cesar |

**Cross-cluster:** #613 (Cluster 4 — personal-workspace approver) is named in #588 item 5.

**Recommended order:** #588 (vocabulary sweep) lands first or in parallel since #615 / #616 / #617 reference assumptions #588 fixes. #617 (Skill Creator) is its own design scope and can land last.

---

### Cluster 10 — Spec Agent activity layer (4 tickets) — IN FLIGHT

Surface area: Spec Agent's elicit-turn tool dispatch + audit emission. **All four closing via PR #571** — no action needed on Cesar's side beyond review/merge.

| # | Type | Title | Author |
|---|---|---|---|
| #597 | bug | `emit_spec_audit` raises TypeError — AuditActor missing required service_id | Farzaneh — **closing via PR #571** |
| #599 | bug | `propose_requirement` silently fails — agent claims FRs staged, spec_requirement = 0 rows | Farzaneh — **closing via PR #571** |
| #600 | bug | Streaming text_delta chunks render as separate chat bubbles *(also Cluster 8)* | Farzaneh — **closing via PR #571** |
| #612 | bug | `lookup_skill` tool dispatch crashes with AttributeError | Farzaneh — **closing via PR #571** |

---

### Cluster 11 — Spec Agent Phase 12 Round-2 + Round-3 findings (7 tickets) — NEW, post-#571

Surface area: Spec Agent quality findings surfaced by driving full Spec Agent sessions end-to-end against the post-#571 worker + walking the Phase 12 capability audit matrix via Postgres SQL. Three drive scenarios — habit-tracker multi-turn (Round 3 A), OOS prompt (Round 3 C), URL-shortener with DP-pick (Round 3 D), explicit gap-resolution follow-up (Round 3 iii) — surfaced 2 additional findings beyond the original Round-2 batch. These are the next-after-#571 backlog. All small wiring or prompt fixes — no architectural changes — but cumulatively they determine whether the Spec Agent is "ready for Mars" or still needs polish.

| # | Type | Title | Severity | Surfaced by | Author |
|---|---|---|---|---|---|
| #620 | bug | Spec Agent `request_lock` always refuses — `compute_readiness_activity` never wired into workflow | **HIGH (blocks lock CTA entirely)** | Round 2 | Farzaneh |
| #621 | bug | Lock-request refusal logs to workflow logger only — no audit emission, observability gap | MEDIUM | Round 2 | Farzaneh |
| #619 | bug | Spec Agent audit emissions never thread `caused_by` — Spec-side mirror of T-M3-96 (#403) missing | MEDIUM | Round 2 | Farzaneh |
| #622 | bug | Spec Agent never proposes capability_graph edges — F13 DAG wiring incomplete (0 edges across 6 sessions) | MEDIUM | Round 2 + reaffirmed Round 3 | Farzaneh |
| #624 | bug | OOS prompt refused via agent prose only — no `classifier-verdict-applied` / `out-of-scope-blocked` audit emitted | MEDIUM | Round 3 C | Farzaneh |
| #625 | bug | Spec Agent refinement turn produces 0 acceptance predicates — quality drops sharply on multi-turn | MEDIUM | Round 3 A | Farzaneh |
| #623 | bug | `track_progress` tool dispatch occasionally fails Pydantic validation — agent emits empty `{}` input | LOW | Round 2 | Farzaneh |

**Recommended landing order** (loosely sequential, parallelism marked):

1. **#620 first** — without this, no lock attempt can ever succeed, so #621 can't be validated end-to-end and the lock-chain Layer 4 of the matrix stays 0%. ~2-4 hours scope: register `compute_readiness_activity` in `worker.py` + call it from the workflow after each turn. No schema change.
2. **#621 with #620** — replace the three `workflow.logger.info` refusal lines (readiness / consistency / scorecard) with `emit_spec_audit` calls + register the new audit kinds via Alembic migration. ~1-2 hours. Lands the observability hooks needed to verify #620 actually works.
3. **#619 in parallel with #620/#621** — independent backend wiring (Spec-side mirror of T-M3-96's `caused_by` threading). ~30-60 min. Touches different call sites; no merge conflicts.
4. **#624 in parallel** — OOS audit wiring. Wire the existing `out_of_scope_check.py` activity into the elicit-turn flow + register the OOS audit kinds. ~1-3 hours.
5. **#622 + #625 together** — both are Spec Agent prompt / multi-turn quality issues. #622 is "edges never proposed"; #625 is "ACs dropped on refinement turn." Same v1.txt prompt edit pass likely covers both. ~1-3 hours.
6. **#623 last** — minor LLM-input-shape nudge (prompt change). 30 min. Lowest leverage; can ship any time.

**Static-analysis confirmation from Round 3 (i) investigation:** When #620 lands, the downstream lock gates (consistency check + 7-dim scorecard) should fire correctly — both activities are properly registered in `worker.py` and called from the workflow. The only break point is the first gate (readiness rubric).

**`lock_now_override` is a dead column:** Investigation surfaced that `app.spec_version.lock_now_override` exists in the schema (Pydantic + DB + view layers) but is never read by any workflow code. Either vestigial scaffolding or a planned escape hatch that never landed. Noted on #620 — not filed as a separate ticket.

**Cross-cluster ties:**
- **#619 + Cluster 10** — same audit-shape theme as #597 (shipped in PR #571); together they harden Spec Agent audit fidelity.
- **#624 + #619** — same audit-completeness theme; both reflect that the Spec Agent has multiple places where signals are missing vs the Build Agent's audit pattern.
- **#622 + #625** — same Spec Agent multi-turn quality theme; both reflect quality degradation between turn 1 and subsequent turns.

**Surface area gates Mars-readiness:** the Phase 12 matrix Layer 4 rows (readiness rubric / lock-chain / build-readiness scorecard) all sit at 0% green today and ALL depend on #620 landing. Without this cluster, the operational-validation matrix can't progress past ~70%. With this cluster done, target is ~85-90%.

---

## Standalone tickets (no cluster)

| # | Type | Title | Author |
|---|---|---|---|
| #589 | design | Theme: System / Light / Dark — cookie persistence + remove legacy 'auto' option | Cesar |
| #584 | design | Quota system *(loose tie to onboarding and admin UI — see Cluster 3)* | Cesar |

---

## Pure duplicates found

**None.** Closest call was #586 (notification system) vs #604 (notification bell) — but #586 is broader (backend channels + emails + operator alerts) while #604 is specifically the in-app bell UI surface. Both should land; they define different layers of the same stack.

---

## Recommended assignment shape

Given Cesar filed 28 and Farzaneh filed 10, the natural assignment shape across the 38 tickets:

| Track | Tickets |
|---|---|
| **Spec Agent / AI track (Farzaneh) — already in PR #571** | #597, #599, #600, #612 |
| **Spec Agent / AI track (Farzaneh) — next-after-#571 backlog** | **#620 (HIGH)**, #621, #619, #624, #622, #625, #623 *(Cluster 11 — recommended order: #620 → #621 → #619/#624 (parallel) → #622+#625 (combined prompt edit) → #623)* |
| **Spec Agent / AI track (Farzaneh) — standalone** | #608 (chat CSS min-h-0) |
| **Backend / RLS / identity (Cesar or backend track)** | #585, #582, #593, #594, #595, #596 (sign-up + session plumbing) |
| **Frontend polish (Cesar or frontend track)** | #592, #601, #604, #605, #606, #609, #610, #613, #615 |
| **Skills surface** | #588, #616, #617 |
| **Workspaces / Org admin** | #602, #603, #614 |
| **Notifications** | #586, #604 *(also frontend polish)* |
| **Chat unification (after #600 + #608 land)** | #611 |
| **Onboarding + docs** | #583, #590 |
| **Standalone** | #584 (quota), #589 (theme), #607 (new project redesign) |

**Critical path for Mars-readiness:** Cluster 11 (#620 first) is the gate to the Phase 12 capability audit matrix moving past ~70% green. Without #620, the lock-chain audit rows (Layer 4) stay 0%. Without the lock-chain rows, no end-to-end Spec → Build → Deploy validation is possible through the user-facing CTA path.

---

## What was done on GitHub

29 of the original 33 tickets received a top-level comment from `farfar1985`:

```
Consolidation pass (2026-05-26 cutover sweep) — <cluster name>. Related: #N1 #N2 ...
```

so anyone opening one ticket sees the cluster topology immediately. No tickets closed or edited — Cesar decides closures and assignments from here.

**4 tickets did NOT receive a consolidation comment** because they're already cross-referenced via PR #571's `Closes` keywords:
- #597, #599, #600, #612 — Spec Agent fixes shipping in PR #571.

**7 NEW tickets (#619-#625) filed post-original-consolidation** during the Round-2 drive + matrix walk + Round-3 drives (multi-turn / OOS / DP-pick / explicit resolve_gap). They sit in Cluster 11 above. They do NOT yet have inline cross-reference comments (the cluster appears in this tracking issue's body).

---

## Next steps for Cesar

1. Open any ticket → consolidation comment shows the cluster.
2. Decide which clusters get worked on in parallel and which are sequenced (recommended orders above).
3. Assign owners / mark as `ready` for whoever picks up.
4. If any pair should be a true duplicate, close one with `Duplicate of #N — closing as duplicate.` — but the analysis flagged no such pairs.

---

*Report end.*
