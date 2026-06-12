# feedback: Matrix-walk backend-first when UI is blocked

**Banked 2026-05-26 Monday late-EOD during Phase 12 capability audit matrix walk (Ticket #572).**

When validating an end-to-end agent workflow (Phase 12 matrix-style capability audit), the
default mental model is "drive a real session through the UI + watch each row light up." That
works UNTIL the UI is wedged by something outside your lane — Cesar's modal regression, a
build cache that won't clear, a third-party auth flow you can't unstick locally.

**Pivot rule**: when UI is blocked, the matrix walk does NOT stop. ~80% of rows can be
validated purely from the backend by querying the persistence tier + outbox + Temporal SDK
signal scripts directly. Don't wait for the UI fix.

## Tonight's empirical (2026-05-26)

F16 frontend modal crash blocked every UI-rendered row of the Phase 12 audit. Instead of
sitting idle until Cesar fixes the modal, I pivoted to backend-only validation and banked
**12 of ~24 backend-testable rows green in ~90 minutes**.

## What backend-only validation covers

Direct Postgres queries via `docker exec amira-dev-postgres psql -U amira_dev -d amira_dev`
cover the following capability-matrix dimensions:

| Matrix dimension | Backend probe |
|---|---|
| Workflow lifecycle (kickoff → elicit → persist → outbox) | `SELECT kind, ts FROM app.audit_event WHERE spec_version_id = '...' ORDER BY ts` |
| Tool dispatch (which of the 10/11 ReAct tools fired) | `SELECT context->>'tool_name', count(*) FROM app.audit_event WHERE kind='spec.tool-called' GROUP BY context->>'tool_name'` |
| Multi-turn cumulative state | `SELECT version_seq, graph->'add_capability_nodes', graph->'add_acceptance_predicates' FROM app.spec_capability_graph WHERE spec_version_id = '...' ORDER BY version_seq` |
| Gap resolution + resolution_note | `SELECT gap_id, resolved, resolution_note FROM app.gap WHERE spec_version_id = '...'` |
| Decision-point resolution | `SELECT decision_id, selected_id, resolution_rationale FROM app.spec_capability_graph WHERE graph @> '{...}'::jsonb` (DPs live INSIDE the graph JSONB, not in a separate table) |
| Readiness / scorecard / consistency gate outcomes | Read the `app.audit_event` row for the relevant gate kind |
| Cross-agent causedBy DAG | `SELECT count(*) FILTER (WHERE caused_by IS NOT NULL), count(*) FROM app.audit_event` |
| State transitions (DRAFT → ITERATING → APPROVAL_REQUESTED) | `SELECT state, state_transitioned_at FROM app.spec_version WHERE id = '...'` |
| Outbox dispatch + payload shape | `SELECT kind, payload FROM app.outbox_event WHERE spec_version_id = '...' ORDER BY ts` |

Direct Temporal SDK scripts cover signal-flow validation when HTTP routes are missing or
broken (e.g., F17 lock-route signal wiring not yet wired):

```python
# apps/api/scripts/send_request_lock.py
from temporalio.client import Client

async def main(workflow_id: str) -> None:
    client = await Client.connect("localhost:7233", namespace="default")
    handle = client.get_workflow_handle(workflow_id)
    await handle.signal("request_lock")
```

This bypasses HTTP auth + the missing route handler entirely; lets you exercise the
workflow's signal handler in isolation. The outbox + audit_event tables then show you the
3-gate chain firing (or not).

## What backend-only validation does NOT cover

The remaining ~20% of matrix rows genuinely require the UI:

- **Streaming SSE rendering** — backend can prove the stream emits the right kinds; only
  the UI proves the user sees chunks render in order without flicker.
- **Decision-point UI card** — backend can prove the DP is persisted; only the UI proves
  the card renders with the right alternatives + the click-to-select wires through.
- **Chart / table / code render fidelity** — only the UI proves these.
- **Scroll behavior / auto-scroll / modal layout** — pixel-level concerns by definition.
- **Auth flow round-trips with real Auth0** — sometimes browser-only (cookie + storage
  state).
- **Frontend error boundaries firing on real API errors** — needs the real frontend.

These rows STAY deferred to when the UI is unblocked. Don't fake them with backend-only
evidence; that's the "real-behavior gate" lock.

## Mechanical pre-flight when UI breaks mid-walk

1. **Confirm the breakage is NOT in your lane.** `git log --follow <broken_file>` — if it's
   100% the other person's commits, file it as a finding + pivot. If it's mixed, you may
   need to bisect.
2. **Send a heads-up to the owner.** WhatsApp / Teams — short, file path + line number +
   stack trace, no speculation about fix.
3. **Pivot to backend probes.** Use the table above. Each row that's "backend-testable"
   flips ✓ as soon as the SQL proves the assertion.
4. **Bank UI-rows as DEFERRED, not ❌.** They're not failing — they're untestable until
   the upstream regression is fixed.
5. **Do NOT push to commit backend-only matrix evidence as "complete."** Findings doc must
   be explicit: "X of Y backend rows green; UI rows DEFERRED on F<NN> (Cesar's lane)."

## Tooling notes banked

- `docker exec amira-dev-postgres psql -U amira_dev -d amira_dev -c "SQL HERE"` — the
  fastest way to query the live local DB from Bash on Windows. `amira_dev` is the
  dev-loop DB; `amira_test` is the pytest fixture-managed DB.
- `tctl` (Temporal CLI) connecting to localhost:7233 was flaky on Windows tonight (refused
  connection); use the Python SDK script pattern instead.
- Workflow IDs follow the predictable pattern `spec-{spec_version_id}-{turn_n}` — read
  the latest from `app.audit_event WHERE kind='spec.session-kickoff'` rather than guessing.
- JSONB key drift catches: decision-points live INSIDE `spec_capability_graph.graph->
  'add_decision_points'`, NOT in a top-level `spec_decision_point` table. Capability
  nodes live under `graph->'add_capability_nodes'`, NOT `graph->'nodes'`. ACs under
  `graph->'add_acceptance_predicates'`, NOT `graph->'acceptance_predicates'`. The
  materialized `nodes/edges/acceptance_predicates` lists only exist AFTER
  `load_materialized_snapshot()` replays the deltas.

## When to NOT pivot

If the UI is blocked by something YOU can fix in <30 min — do that instead of pivoting.
The pivot is for "the breakage is in someone else's lane and the round-trip to get it
fixed is hours away."
