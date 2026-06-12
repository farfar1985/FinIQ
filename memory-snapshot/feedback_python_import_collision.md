---
name: python-import-collision
description: 2026-05-18 — file-name vs function-name collision in __init__.py re-exports breaks monkeypatch.setattr AND import-as. Hit twice on PR
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## The trap

When you have:
- A module file `foo.py`
- A function `def foo(...):` defined in `foo.py`
- A package `__init__.py` that re-exports the function via `from package.foo import foo`

The package's `__init__.py` namespace ends up with **two competing bindings** at the name `foo`:
1. The submodule `package.foo` (auto-bound by Python when the module is imported)
2. The function `foo` (explicitly imported by `from ... import foo`)

The explicit `from ... import` runs AFTER the auto-binding, so **the function wins**. `package.foo` (as an attribute access) resolves to the function — the module is hidden behind it.

## What breaks

**`monkeypatch.setattr("package.foo.attr", new_value)`** — pytest resolves the dotted-path string by attribute access. `package.foo` → the function. Then `.attr` lookup fails because functions don't have arbitrary attributes:

```
AttributeError: 'function' object at package.foo has no attribute 'attr'
```

**`import package.foo as foo_module`** — Python's `import X.Y.Z as alias` does **attribute traversal**, not `sys.modules[X.Y.Z]` lookup. So `foo_module` also gets the function, not the module:

```
AttributeError: <function foo at 0x...> has no attribute 'attr'
```

Both natural approaches to module-level patching fail.

## What still works (escape hatches)

`sys.modules["package.foo"]` always returns the module, regardless of `__init__.py` shadowing:

```python
import sys
import package.foo  # ensure module is in sys.modules
foo_module = sys.modules["package.foo"]
monkeypatch.setattr(foo_module, "attr", new_value)  # works
```

Or `importlib.import_module("package.foo")` — same mechanic via the stdlib SDK.

Both are ugly. Better to avoid the trap entirely.

## The fix

**Don't re-export the function from `__init__.py`** when the function name == the module file name. Re-export only the supporting types (which have different names, so no collision). Callers import the function directly from its module:

```python
# __init__.py — avoid the collision
from package.foo import FooInput          # type — different name — fine

__all__ = ["FooInput"]

# Caller code
from package.foo import foo                # function — direct from module
```

This pattern came up on **PR #299** (T-M2-21 classifier Activity, 2026-05-18 rebase):
- File: `apps/api/src/amira_api/runtime/activities/classify_intent.py`
- Function: `classify_intent`
- Original (buggy): `__init__.py` re-exported BOTH `ClassifyIntentInput` (type, OK) and `classify_intent` (function, **COLLISION**)
- Fix: dropped the function re-export, kept the type re-export. Documented the asymmetry in the `__init__.py` docstring.

## Where the same trap waits in `amira-mars`

Cesar's `emit_event` Activity has the **identical structural collision** (`emit_event.py` defines `def emit_event(...)`, `activities/__init__.py` re-exports `emit_event` via PR #298). His tests don't monkeypatch (they use real Postgres for `pg_notify` verification), so the collision is dormant. Anyone trying to add a unit test that mocks `emit_event`'s internals will hit the same wall.

Worth flagging in code review when reviewing new `runtime/activities/*.py` PRs that have the file-name == function-name shape.

## Quick discriminator

When adding a new `runtime/activities/<thing>.py` Activity:

| Function name vs file name | Re-export the function from `__init__.py`? |
|---|---|
| Same (e.g., `classify_intent` in `classify_intent.py`) | **No** — collision will bite any monkeypatching test |
| Different (e.g., `route_turn` in `classify_intent.py`) | Yes — no collision, safe |

If you're naming the function the same as the file (often the right choice for readable callers), accept the asymmetric `__init__.py` re-export discipline as the cost of that naming.

## Related memories

- [[feedback_test_shape_rule.md]] — when unit/introspection tests are required, this collision matters
- [[feedback_cesar_quality_bar_m1_backend.md]] — rule #5 (no test thinness) — workaround must not be `pytest.skip` to avoid the collision
- [[project_next_session.md]] — 2026-05-18 EOD captures the original hit + rebase fix

## Validation history

- **2026-05-18 PR #299 review**: Cesar reviewed our `runtime/activities/__init__.py` (with the asymmetric re-export — ClassifyIntentInput re-exported, classify_intent function NOT) and **merged without comment** on the import discipline. Quiet validation that the workaround is acceptable.
- **2026-05-18 PR #300 (T-M3-39 elicit_turn)**: applied this rule **proactively** — `ElicitTurnInput` (type) re-exported from `runtime/activities/__init__.py`; `elicit_turn` function NOT (file `elicit_turn.py` + function `elicit_turn` collision). The pattern is now established across two leaf Activities in the same package; future leaf Activities should follow.
