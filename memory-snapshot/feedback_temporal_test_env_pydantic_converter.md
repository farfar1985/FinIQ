# feedback: Temporal Test Environment + Pydantic data converter + alembic state pollution

**Locked 2026-05-26 (T-M5-17 ship; 3 real bugs caught pre-commit by the test gate).**

When writing Temporal `WorkflowEnvironment.start_local()` integration
tests + Pydantic v2 Workflow/Activity arg models against the
`amira_test` Postgres DB, three gotchas show up CONSISTENTLY and
will silently waste 30-60 minutes per occurrence if not banked.

## 1. `pydantic_data_converter` is REQUIRED on the test env

Production `runtime/temporal_client.py:69` already uses
`data_converter=pydantic_data_converter` from
`temporalio.contrib.pydantic`. Tests MUST mirror this — the default
JSON converter does NOT round-trip Pydantic v2 models reliably; it
warns + may deserialize as plain dicts inside the Worker, which
makes Workflow `isinstance(...)` checks + Activity `model_validate`
fail unpredictably + the Activity hangs waiting on input.

**Wrong (hangs / warns):**
```python
async with await WorkflowEnvironment.start_local() as env:
    yield env, env.client
```

**Right:**
```python
from temporalio.contrib.pydantic import pydantic_data_converter

async with await WorkflowEnvironment.start_local(
    data_converter=pydantic_data_converter,
) as env:
    yield env, env.client
```

Precedent: `apps/api/tests/api/conftest.py:163-178` (existing test
conftest). Look there before copying any WorkflowEnvironment pattern.

## 2. `WorkflowFailureError` import path

When asserting a workflow raised `ApplicationError(non_retryable=True)`,
the wrapping exception caught at the test layer is `WorkflowFailureError`.
It lives in `temporalio.client`, NOT `temporalio.exceptions`.

**Wrong (ImportError):**
```python
from temporalio.exceptions import ApplicationError, WorkflowFailureError
```

**Right:**
```python
from temporalio.client import WorkflowFailureError
from temporalio.exceptions import ApplicationError
```

The `cause` attribute on the caught `WorkflowFailureError` carries the
inner `ApplicationError`:

```python
with pytest.raises(WorkflowFailureError) as exc_info:
    await client.execute_workflow(MyWorkflow.run, kickoff, ...)
cause = exc_info.value.cause
assert isinstance(cause, ApplicationError)
assert "expected string" in str(cause)
```

## 3. alembic state pollution between branches

`amira_test` DB's `public.alembic_version` table tracks the
last-applied revision. When you switch branches that diverged on
migration timestamps (e.g., Phase 12 stash with `20260523040000` then
back to master at `20260525250000`), alembic looks at the recorded
revision and starts applying FROM THAT POINT, which causes errors
like:

```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable)
relation "app.audit_kind_validator" does not exist
LINE 2: INSERT INTO app.audit_kind_validator ...
```

This is alembic trying to run a `register_*_audit_kinds` migration
before the `CREATE TABLE audit_kind_validator` migration. The CREATE
already ran on a different branch's earlier revision; alembic skipped
it because its revision pointer says "we're already past base."

**Recovery (one-shot reset, runs in seconds):**

```bash
docker exec amira-dev-postgres psql -U amira_dev -d amira_test -c \
  "DROP SCHEMA IF EXISTS app CASCADE; CREATE SCHEMA app; \
   DROP TABLE IF EXISTS public.alembic_version CASCADE;"
```

Then re-run pytest — `schema_at_head` fixture in `tests/conftest.py`
runs `alembic upgrade head` from base, which now lands the full
chain cleanly.

**Symptom to recognize**: tests under `apps/api/tests/` error with
"relation X does not exist" on a `register_*_audit_kinds` migration
+ `git log` shows you recently switched branches.

## Mechanical pre-flight gate

Before running any Temporal-test-gated integration suite on a
freshly-switched branch:

1. `docker ps | grep amira-dev-postgres` — confirm Postgres is up.
2. If migrations recently changed: run the reset SQL above.
3. Confirm test fixture uses `pydantic_data_converter` (grep
   `data_converter=` in the conftest).
4. Confirm exception imports are `from temporalio.client import
   WorkflowFailureError` not `from temporalio.exceptions ...`.

Doing these 4 checks upfront saves the ~30-60 min iteration loop of
"run test → hang or error → diagnose → re-run." Banked because all
three bit me on T-M5-17 ship (PR #553), all three are deterministic
once you know the symptom.
