---
name: phase-12-spec-agent-test-drive-checklist-companion-to-capability-matrix
description: "2026-05-23 evening. Canonical exercise prompt + step-by-step verification checklist designed to flip as many ❌ → ✓ rows in the Phase 12 Capability Audit Matrix as one live UI drive can. Used in conjunction with `project_phase12_observations.md` Capability Audit Matrix section. Win condition: every row in the matrix moves to ✓ with banked evidence."
metadata: 
  node_type: memory
  type: project
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## Purpose

Single coordinated test drive that exercises the maximum number of Capability Audit Matrix rows in 4-6 turns. Use AFTER tomorrow's clean start (Windows reboot + Node MSI reinstall if F7 still wedged, or directly if frontend stays up).

## Pre-drive infrastructure check

```bash
# All 5 should return healthy
docker ps --format "{{.Names}}\t{{.Status}}"
# All three should respond
curl -s -m 3 -o /dev/null -w "backend=%{http_code}\n" http://localhost:8000/healthz
curl -s -m 3 -o /dev/null -w "worker=%{http_code}\n" http://localhost:8081/
curl -s -m 3 -o /dev/null -w "frontend=%{http_code}\n" http://localhost:3000
# Worker should show recent start (with F1/F4/F6/bug#344 fixes loaded)
wsl -d Ubuntu -- bash -c "ps -eo pid,etime,cmd | grep amira_api.runtime.worker | grep -v grep"
# DB at head migration 20260523040000
docker exec amira-dev-postgres psql -U amira_dev -d amira_dev -c "SELECT version_num FROM public.alembic_version;"
```

## Canonical test prompt (turn 1)

> **Build a habit-tracking app where users can log daily check-ins, see streaks, and get reminders. Should support email + push notification channels, work on mobile + desktop, integrate with Apple HealthKit and Google Fit, store user data per-account with row-level isolation, and provide a weekly summary dashboard. Use AWS Lambda for the backend and OpenAI GPT-4 for the LLM features.**

Why this prompt:
- **Non-finance domain** — exercises V1 (no FinIQ bias)
- **Vendor names** (AWS Lambda, OpenAI GPT-4) — should trigger `scan_for_leaks` (10-of-10 tools)
- **Multi-feature** — habit CRUD + streaks + reminders + summary + integrations → 6-8 FRs natural
- **Cross-platform** — naturally requires mobile + desktop FRs separately
- **Auth + RLS hint** — "per-account with row-level isolation" forces auth model + RLS policies
- **External integrations** — HealthKit + Google Fit force integration-contract FRs

Expected turn 1 yield:
- Spec Agent should auto-propose 4-6 capability nodes (CRUD UI, check-in flow, streak compute, reminder dispatch, summary dashboard, integration adapters)
- 4-6 FRs in `pending-confirmation` status (multi-feature spec)
- 1 decision point (channel preference? push primary vs email primary?)
- ≥1 critical gap (data model? auth IdP?)
- **`scan_for_leaks` should fire** with WARN on "AWS Lambda" + "OpenAI GPT-4" (model should not lock in specific vendor names)

## Turn 2 refinement message

> Confirm push notifications as primary delivery channel with email as fallback. Use Apple's APNs for iOS push, FCM for Android, and SendGrid for email. Resolve the auth IdP gap with Auth0 + Sign in with Apple + Google OAuth. Add NFRs: streak compute latency p95 ≤200ms, reminder delivery within ±60s of scheduled time, 99.9% uptime SLA, full encryption at rest, and audit retention 90 days. Add acceptance criteria for: (1) reminder fires only on scheduled days when habit not yet checked, (2) streak resets correctly when a day is missed, (3) cross-device sync within 5 seconds, (4) gracefully handle HealthKit/Google Fit auth revocation. Also: please scan the spec for any vendor lock-in and replace with platform-neutral skill references where possible.

This turn exercises:
- Multi-turn refinement (bug #344) — confirm we don't regress
- `propose_requirement op="update"` on multiple existing FRs
- 5 new NFRs at once (forces multi-NFR proposal)
- 4 ACs covering non-happy paths
- Skill rebinding to platform-neutral skills (V1 stress test on vendor lock-in handling)
- `scan_for_leaks` follow-through

## Turn 3 (only if needed)

If after turn 2 the Spec Readiness badges still aren't ~6/6 FRs / 4/4 NFRs / 8+/8+ ACs, drive turn 3 with:

> Add FRs for: weekly summary dashboard rendering, habit archive/restore (soft delete), admin console for KPI definitions, and audit-log access for users. Then we're ready to lock — please tighten any remaining 'pending-confirmation' status fields.

## Pre-lock checkpoint (before clicking Request Lock)

Query Postgres to confirm content state:

```sql
SELECT
  (SELECT COUNT(*) FROM app.spec_requirement WHERE spec_version_id = '<your-session>' AND kind = 'FR') AS frs,
  (SELECT COUNT(*) FROM app.spec_requirement WHERE spec_version_id = '<your-session>' AND kind = 'NFR') AS nfrs,
  (SELECT COUNT(*) FROM app.spec_requirement WHERE spec_version_id = '<your-session>' AND kind = 'AC') AS acs,
  (SELECT COUNT(*) FROM app.spec_capability_graph WHERE spec_version_id = '<your-session>') AS capability_versions,
  (SELECT COUNT(*) FROM app.gap WHERE spec_version_id = '<your-session>' AND resolved=false) AS open_gaps,
  (SELECT COUNT(*) FROM app.decision_point WHERE spec_version_id = '<your-session>' AND resolved=false) AS open_dps;
```

Healthy pre-lock targets:
- frs ≥ 6
- nfrs ≥ 4
- acs ≥ 6
- open_gaps = 0
- open_dps = 0

If any of those are short, drive another turn before requesting lock.

## Lock request (the BIG moment — fires all 3 gates)

Click "Request Lock" / "Route for E-Signature" in the UI top-right.

### Expected event sequence (query Postgres ~30s after click):

```sql
SELECT kind, created_at FROM app.outbox_event
WHERE kind IN (
  'spec.readiness-checked',
  'spec.consistency-checked',
  'spec.build-readiness-scored',
  'spec.lock-ready-for-evaluator',
  'spec.lock-evaluated',
  'spec-build-readiness-iteration-needed',
  'session-state-changed'
)
AND correlation_id = '<your-correlation-id>'
ORDER BY created_at;
```

Three outcomes:

### A) All 3 gates PASS → state APPROVAL_REQUESTED

- 🎉 Spec is build-ready in v1 form
- Click Approve in UI → state → APPROVED
- Check if `spec.md` export button is now active → click + download
- Verify the markdown file is well-formed + Build-Agent-consumable
- Banks: Layer 3 rows 3.1-3.8 all ✓

### B) Gate fails with EXPLAINABLE findings (most likely on first attempt)

This is the Path B test — agent should self-iterate.

- Workflow stays in ITERATING state (NOT failed)
- New `spec-build-readiness-iteration-needed` narration appears in chat panel
- Findings list specific gaps (e.g., "narrative-completeness=58, missing data model"; "fr-tool-mapping=70, no skill bindings"; "platform-locks-alignment=68, AWS Lambda conflicts with Mars/Azure architecture lock")
- **Do NOT type a reply** — the test is whether the agent autonomously addresses findings in its next turn
- Trigger the next turn by clicking Re-request Lock or by sending a brief ack like "address the findings"
- Verify the agent reads its own scorecard's findings + proposes fixes
- Re-lock; repeat until pass
- Banks: Layer 3 rows 3.1-3.5 ✓; Layer 4 row 4.4 (explainable findings) ✓

### C) Gate fails LOUDLY (workflow goes to FAILED state)

- ⚠️ Something is wrong with the gate machinery itself — bank as new finding
- Pull worker log for traceback
- Compare to bug #344 / F6 diagnosis chain
- May indicate scorecard config error or missing dep

## Cross-cutting tests after lock attempt

### Layer 4 — V1 / V2 / V3 validation

After completing the test drive above on a habit-tracking app, run a SECOND test drive on a different domain to validate V1:

> **Build a logistics dispatch app for last-mile delivery — drivers see route assignments on a mobile app, dispatchers manage exception flows from a desktop console, customers track package status via a public link. Should integrate with Stripe for COD payments and SMS for customer notifications.**

If that produces a sensible spec with composite ≥75, V1 (not FinIQ-biased) is validated.

### Layer 1 row 1.12 — OOS Layer-2 judge

Start a fresh spec session with an off-topic prompt:

> **Tell me a joke about cats.**

Expected: workflow should route to OOS-blocked narration (not start spec elicit). Bank as evidence for row 1.12.

### Layer 1 row 1.9 — KB attachment

In an active spec session, click the "+" attach button → upload a markdown file (e.g., paste Mars's existing PES documentation as a .md). Verify agent cites it in next turn.

### Layer 1 row 1.11 — Repo import

From Projects landing page, try "Import from repository" (visible on the new-spec page). OAuth flow → pick a public repo → watch the import workflow + verify it generates initial spec content.

## Banking after the drive

For every row flipped, add a one-liner to the Capability Audit Matrix in `project_phase12_observations.md`:

```
| 1.12 | OOS Layer-2 judge fires on off-topic | ✓ | Session abc123 — "tell me a joke about cats" prompt → workflow OOS-blocked at 17:42 |
```

For every NEW finding discovered, file F9 / F10 / etc. in the F-numbered findings section with full diagnosis chain (same shape as F1/F4/F6/bug#344).

## Win condition

When all 35+ rows in the Capability Audit Matrix are ✓ with banked evidence:
- WhatsApp Cesar with the matrix link + "Spec Agent end-to-end validated; 0 unverified rows"
- Update CLAUDE.md with the Phase 12 GREEN checkpoint
- Tag the session ID + commit SHA as the validation baseline
- Move on to Build Agent integration testing (the next phase)

## Failure-mode pre-commitments (Karpathy keep-or-revert)

Before driving, lock these decisions in advance to avoid mid-test rationalization:

1. **If scorecard plateaus at 75-82 instead of 85**: that's evidence for v1.1 tuning, NOT for re-driving. Bank as V2 finding; v1.1 will lower threshold to 75 + tighten per-dim floor.
2. **If composite ≥85 but a single dim <70 fails the floor**: that's evidence the per-dim AND-gate is too strict (Rajiv V3). Bank as V3 finding; v1.1 will switch to "composite ≥85 OR (composite ≥75 AND all findings have suggested_fix)".
3. **If a dimension judge LLM call fails loudly**: that's a code bug, file as F-numbered finding immediately. Don't catch + degrade silently (violates ORCH-4 + Standard #1).
4. **If `scan_for_leaks` STILL doesn't fire on AWS Lambda / OpenAI GPT-4**: bank as F-numbered finding — the tool's regex patterns may be too narrow. Suggested fix: expand patterns to cover common cloud-vendor + LLM-vendor names.
5. **If `propose_requirement` regresses to is_error=true**: F6 fix has regressed somehow. Investigate `_dispatch_tool` JSON-unwrap logic; verify worker bytecode includes the latest fix.

## Estimated time

- Pre-drive infrastructure check: 2 min
- Turn 1 (habit-tracking prompt): ~45s for the agent to complete
- Turn 2 (refinement): ~60s
- Turn 3 (if needed): ~45s
- Pre-lock Postgres check: 1 min
- Lock request + 3-gate wait: ~60s for scorecard
- Iteration loop (Path B, if needed): 2-3 more turns × ~60s each
- Cross-cutting tests (V1 logistics + OOS + KB + repo import): ~10 min combined
- Banking findings into matrix: 5 min

**Total**: 25-40 minutes for the full Phase 12 drive if no infrastructure surprises.

## File touch points

- `project_phase12_observations.md` (Capability Audit Matrix section) — update each row as validated
- This file (`phase12_test_drive_checklist.md`) — reference during the drive
- CLAUDE.md — update when Phase 12 is fully green
- WhatsApp draft to Cesar — when Phase 12 is fully green