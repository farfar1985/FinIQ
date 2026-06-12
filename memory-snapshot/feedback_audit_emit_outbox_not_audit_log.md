---
name: audit-emit-writes-to-outbox-event-not-audit-log
description: "2026-05-26 banked after a misdiagnosis. When verifying that Spec Agent (or any\nagent) audit events are persisting in dev, query `app.outbox_event` not\n`app.audit_log`. The `emit()` helper in `audit/emit.py:54` writes to\noutbox_event in the caller's transaction; `audit_log` is a downstream\npartitioned table populated by a separate projection consumer not running in\ndev by default. Mistaking 0-rows-in-audit_log for \"audits are broken\" wasted\n~20 min today.\n"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The mistake

While testing Spec Agent on 2026-05-26 PM, I queried `app.audit_log` repeatedly
to verify audit emits were persisting. Saw 0 rows despite many `audit.emit`
log lines firing from the backend. Initially diagnosed as candidate-bug B4
("audit log persistence broken") — wrong table.

## The truth

`apps/api/src/amira_api/audit/emit.py:48-114` — `emit()` function docstring is
explicit:

> *"Append one audit event into `app.outbox_event` in the caller's transaction."*

Implementation at line 95-114:

```python
row = OutboxEvent(
    id=outbox_id,
    org_id=request.org_id,
    service=request.actor.service_id,
    ...
)
session.add(row)
await session.flush()
```

Audit events land in `app.outbox_event`. The `app.audit_log` partitioned table
is populated by a separate **outbox→audit_log projection consumer** that
processes the outbox + writes the canonical audit rows. That consumer
- (a) doesn't run by default in `make dev` / `make worker`
- (b) may be a Temporal scheduled workflow OR a dedicated consumer process
- (c) hasn't been needed in dev because direct outbox queries are sufficient

## Live verification this session

```sql
SELECT count(*) total, count(DISTINCT kind) distinct_kinds FROM app.outbox_event;
-- total = 110, distinct_kinds = 14

SELECT count(*) FROM app.audit_log;
-- 0
```

Despite audit_log being empty, audits ARE persisting correctly to outbox_event:
- `text-chunk` (38)
- `spec.tool-called` (27) — agent tool dispatches
- `spec.streaming-elicit-completed` (9) — ticket 9 streaming
- `spec.gap-added` (3), `spec.elicit-turn-evaluated` (2) — ticket 10 evaluator
- `spec.decision-point-emitted` (2), `spec.capability-graph-appended` (2)
- `auth.id-token-invalid` (4) — earlier auth failures
- etc.

## Canonical queries going forward

**To verify audit emits are firing**:
```sql
SELECT kind, count(*) c FROM app.outbox_event
WHERE created_at >= '<session_cutoff>'
GROUP BY kind ORDER BY c DESC;
```

**To verify specific tool calls fired**:
```sql
SELECT payload->'context'->>'tool_name' tool, count(*) c
FROM app.outbox_event
WHERE kind = 'spec.tool-called' AND created_at >= '<cutoff>'
GROUP BY tool ORDER BY c DESC;
```

**To check audit_log** (only meaningful if the projection consumer is running):
```sql
SELECT count(*) FROM app.audit_log;
-- Likely 0 in dev — that's by design, not a bug
```

## Pre-flight check during testing

When a test session is producing UI activity but `app.outbox_event` shows 0
rows since cutoff → that's a real persistence bug (likely RLS-GUC or session
rollback). When outbox_event has rows but audit_log is empty → that's just
the projection consumer not running, NOT a bug.

## Related

- Cesar's PR #591 ("Systemic RLS-GUC fix on outbox + user_session") fixed the
  ONLY recent audit-write bug. The `with_check` policy on outbox_event was
  rejecting writes when `app.org_id` GUC was unset. Fix sets the GUC
  defensively in `emit()`. After #591 merged, outbox_event writes succeed.
- F18-candidate from `project_phase12_observations.md` (audit `caused_by`
  always NULL) — that's still about outbox_event rows, not audit_log.

## Banked

2026-05-26 PM — Farzaneh's session diagnosing B4. Lesson: read the function
docstring before assuming which table receives writes. `audit_log` is the
*name people use* for audit storage; `outbox_event` is *where writes actually
go* in the current architecture.
