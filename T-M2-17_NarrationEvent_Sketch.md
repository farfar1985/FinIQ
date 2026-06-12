# T-M2-17 — NarrationEvent union — sketch

**Status**: design draft. Pre-implementation deliverable produced during M1-window per Cesar's 2026-05-05 ask: *"sketch T-M2-17 (NarrationEvent union) before M2 opens."*

**Source authority**: `plan/05-agent-runtime-and-job-communication.md §3.1` (lines 583-674). The discriminated union is fully drafted there; this file lifts it into implementable shape, lays out the file/test layout, and flags gaps for Cesar's review.

**Owner**: T-M2-17 is M2 (areas 5+6 — agent runtime + LLM adapter), `track:ai-agent`. Per Cesar's WhatsApp this morning, T-M2-17 owner is *not* us — but the sketch lets the implementer ship fast when M2 opens.

**Relationships**:
- Consumed by every other T-M2 / T-M3 / T-M5 ticket that emits narration (which is most of them).
- Wire-format contract for the SSE broker (`agent-sse-broker`, plan/05 §2.6) and the UI's `useEventSource` hook (Task 8.19).
- Audit subset: outbox rows tagged `kind LIKE 'audit-%'` are also drained by the global Audit Consumer (`#4`).

---

## 1. File layout

```
apps/runtime/narration/
├── __init__.py                # public re-exports
├── events.py                  # NarrationEvent subclasses + NarrationEventUnion
├── envelope.py                # NarrationEnvelope wrapper
├── encoder.py                 # JSON encoder for SSE id: + data: line construction
└── tests/
    ├── __init__.py
    ├── test_events_roundtrip.py        # Pydantic round-trip per kind
    ├── test_discriminator_exhaustive.py # ensure every NarrationEvent subclass appears in the union
    ├── test_encoder.py                  # SSE id: + data: serialization shape
    └── golden/
        └── narration_envelope_v1.json  # frozen golden trace, one per kind
```

Notes on placement:
- Sits under `apps/runtime/` so workflows + activities can import without circulars; the SSE broker in the API tier imports through `apps/runtime/narration` — public re-exports only.
- **Not** under `apps/api/` because it's a domain primitive shared by emit_event Activity (Task 8.11), Workflow types, and the UI consumer hook (Task 8.19's TypeScript types are codegen'd from this file via `datamodel-code-generator` or hand-mirrored — open question, see §6).

## 2. `events.py` — implementable Pydantic v2 union

Lifted from plan/05 §3.1, with explicit imports + `Annotated[Field(discriminator=...)]` form per Pydantic v2 idiom. Comment annotations call out which agent class(es) each event applies to so the UI can pre-filter.

```python
"""
NarrationEvent discriminated union — wire format for SSE narration over
the agent-platform-api SSE channel (plan/05 §2.2 GET /sessions/{id}/stream).

Authority: plan/05 §3.1. Every UI consumer pattern-matches on `kind`.
Every Workflow Activity that emits narration constructs one of these
subclasses and hands it to the `emit_event` Activity (Task 8.11).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Shared base — every event has a `kind` discriminator.
class NarrationEvent(BaseModel):
    kind: str
    model_config = ConfigDict(extra="forbid")


# ---- Lifecycle / instruction events ----------------------------------------

class InstructionReceived(NarrationEvent):
    """Emitted when a user instruction Signal arrives at a Workflow.
    Applies to: Spec, Build, Companion. (Deploy is system-driven.)"""
    kind: Literal["instruction-received"] = "instruction-received"
    instruction_id: UUID
    text: str | None = None  # None when the instruction is a tool-confirm or decision-point


class SessionStateChanged(NarrationEvent):
    """Emitted on every state transition: pending→running, running→paused,
    paused→running, running→awaiting-confirm, etc."""
    kind: Literal["session-state-changed"] = "session-state-changed"
    state: Literal[
        "pending", "running", "paused", "awaiting-confirm",
        "awaiting-approval", "completed", "failed", "cancelled",
    ]
    reason: str | None = None


# ---- Classifier (RUNTIME-4) -------------------------------------------------

class ClassifierVerdict(NarrationEvent):
    """Per-instruction routing verdict. Confidence range [0.0, 1.0]."""
    kind: Literal["classifier-verdict"] = "classifier-verdict"
    intent: Literal["edit", "binding-or-schema", "out-of-scope"]
    confidence: float = Field(ge=0.0, le=1.0)


# ---- Skills layer / Build agent --------------------------------------------

class BindingResolved(NarrationEvent):
    """Emitted when the runtime resolves a skill reference to a concrete
    MCP endpoint via Build Plan lockfile (plan/10)."""
    kind: Literal["binding-resolved"] = "binding-resolved"
    skill_id: str
    skill_version: str
    resolved_endpoint: str


class FileWritten(NarrationEvent):
    """Emitted when the Build Agent's apply_edits Activity successfully
    writes a file in the sandbox (plan/08 file-ops API)."""
    kind: Literal["file-written"] = "file-written"
    path: str
    bytes_written: int
    apply_strategy: Literal["search-replace", "create", "delete"]


class FileWriteFailed(NarrationEvent):
    """Emitted on a deterministic apply failure. Not retried automatically
    (per RUNTIME-2); the model must re-emit on the next loop iteration."""
    kind: Literal["file-write-failed"] = "file-write-failed"
    path: str
    reason: Literal["search-string-not-found", "ambiguous-match", "io-error"]


class HotReloadApplied(NarrationEvent):
    """Emitted by the wait_for_hmr Activity when the framework's HMR
    completes (or after a full restart fallback)."""
    kind: Literal["hot-reload-applied"] = "hot-reload-applied"
    duration_ms: int
    reload_kind: Literal["hmr", "full-restart"]


# ---- Compliance + context-management ---------------------------------------

class ComplianceReevaluated(NarrationEvent):
    """Emitted when the Build Agent's reevaluate_compliance Activity
    updates one or more FR statuses (plan/13 evaluator)."""
    kind: Literal["compliance-re-evaluated"] = "compliance-re-evaluated"
    fr_id: str | None = None  # None = whole-spec rescore
    new_status: Literal["passing", "warning", "failing"]
    score_delta: int


class CompactionStageEntered(NarrationEvent):
    """Emitted when the Claude Agent SDK reports it crossed a context-
    compaction stage boundary (RUNTIME-6: Snip → Microcompact →
    Context-collapse → Auto-compact)."""
    kind: Literal["compaction-stage-entered"] = "compaction-stage-entered"
    stage: Literal["snip", "microcompact", "context-collapse", "auto-compact"]


# ---- Tool confirm + scope guard --------------------------------------------

class ToolConfirmRequested(NarrationEvent):
    """Emitted when the Build Agent loop hits a tool with sideEffect of
    'write' or 'external-write' (AGENT-GUARD-1). Workflow waits on
    confirm_tool_call Signal."""
    kind: Literal["tool-confirm-requested"] = "tool-confirm-requested"
    tool_call_id: UUID
    tool_name: str
    side_effect: Literal["read", "write", "external-write"]
    args_preview: dict[str, Any]  # redacted at #6 boundary; safe to ship


class OutOfScopeBlocked(NarrationEvent):
    """Emitted when the Build-side capability-graph layer-1 check (T-M3-44)
    blocks an instruction. capability_graph_miss=False with reason set
    means a check-failed inconclusive case (still blocks; fail-loud)."""
    kind: Literal["out-of-scope-blocked"] = "out-of-scope-blocked"
    reason: str
    capability_graph_miss: bool


# ---- Spec / Deploy domain-specific -----------------------------------------

class SpecRubricUpdate(NarrationEvent):
    """Emitted by SpecAgentWorkflow when readiness rubric (T-M3-38) updates."""
    kind: Literal["spec-rubric-update"] = "spec-rubric-update"
    score: int = Field(ge=0, le=100)
    open_gaps: int


class DeployStepProgress(NarrationEvent):
    """Backs the Deploy modal progress list (build → scan → deploy →
    smoke-test → companion-registered). One event per step transition."""
    kind: Literal["deploy-step-progress"] = "deploy-step-progress"
    step: Literal["build", "scan", "deploy", "smoke-test", "companion-registered"]
    status: Literal["upcoming", "current", "done", "failed"]
    failing_ac_id: str | None = None


# ---- Generic agent text ----------------------------------------------------

class TextChunk(NarrationEvent):
    """Streaming text from the agent's natural-language response.
    Multiple chunks per turn; UI concatenates."""
    kind: Literal["text-chunk"] = "text-chunk"
    role: Literal["agent", "spec-agent", "build-agent", "deploy-agent", "companion-agent"]
    text: str


# ---- The discriminated union -----------------------------------------------

NarrationEventUnion = Annotated[
    InstructionReceived
    | ClassifierVerdict
    | BindingResolved
    | FileWritten
    | FileWriteFailed
    | HotReloadApplied
    | ComplianceReevaluated
    | CompactionStageEntered
    | ToolConfirmRequested
    | OutOfScopeBlocked
    | SpecRubricUpdate
    | DeployStepProgress
    | TextChunk
    | SessionStateChanged,
    Field(discriminator="kind"),
]
```

## 3. `envelope.py`

```python
"""SSE envelope — what the broker actually ships per `data:` line."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from .events import NarrationEventUnion


class NarrationEnvelope(BaseModel):
    """One per SSE event. The `seq` matches the SSE `id:` field; the UI
    sends it back as `Last-Event-ID` on reconnect (plan/05 §2.6)."""
    seq: int
    session_id: UUID
    correlation_id: UUID
    ts: datetime
    event: NarrationEventUnion
```

## 4. `encoder.py`

```python
"""SSE wire encoding. The broker calls `format_sse_event(envelope)` to
produce the bytes shipped on a single SSE message."""
from __future__ import annotations

from .envelope import NarrationEnvelope


def format_sse_event(env: NarrationEnvelope) -> bytes:
    """Returns the bytes for one SSE message:
        id: <seq>\\n
        event: narration\\n
        data: <json>\\n
        \\n

    The `event: narration` field lets the UI pin a single EventListener
    rather than relying on the default 'message' channel.
    """
    payload = env.model_dump_json()
    return (
        f"id: {env.seq}\n"
        f"event: narration\n"
        f"data: {payload}\n"
        f"\n"
    ).encode("utf-8")
```

## 5. Tests (sketch)

### `test_events_roundtrip.py`
- One `pytest.mark.parametrize` test per subclass: build a sample, JSON-dump, JSON-load through the union, assert `==`.
- Asserts each event's `kind` Literal matches its class.
- Asserts `model_config = ConfigDict(extra="forbid")` rejects unknown fields (so a typo in the producer surfaces immediately, not silently).

### `test_discriminator_exhaustive.py`
Ensures every `NarrationEvent` subclass defined in `events.py` appears in `NarrationEventUnion`. Without this, adding a new event class but forgetting to wire it into the union is a silent failure.

```python
import inspect

from apps.runtime.narration import events as ev


def test_every_subclass_in_union() -> None:
    """Every concrete NarrationEvent subclass MUST be a member of the
    NarrationEventUnion. Adding a class but forgetting the union is the
    canonical 'silent skip' regression."""
    declared = {
        cls for _, cls in inspect.getmembers(ev, inspect.isclass)
        if issubclass(cls, ev.NarrationEvent) and cls is not ev.NarrationEvent
    }
    union_members = set(ev.NarrationEventUnion.__metadata__[0].discriminator and
                        ev.NarrationEventUnion.__args__)
    # Walk the Annotated tuple structure; concrete check elided in this sketch.
    missing = declared - union_members
    assert not missing, f"NarrationEvent subclasses missing from union: {missing}"
```

(The `__metadata__` walk is sketchy — Pydantic v2's reflection on `Annotated[Union[...], Field(discriminator=...)]` is doable; the test as written is an outline. The implementation pass should use `typing.get_args` on the inner union directly.)

### `test_encoder.py`
- Round-trips one envelope through `format_sse_event`, asserts the four expected lines are present, terminated by `\n\n`.
- Asserts `id:` matches `env.seq`, `event: narration`, `data:` is valid JSON parseable back to a `NarrationEnvelope` with the same field values.

### Golden trace — `golden/narration_envelope_v1.json`
- One JSON object per event kind, captured from a real Workflow run.
- `tests/runtime/golden/` referenced in plan/05 §5.5 — co-locate or add a `narration/` subdir.
- Golden test: load each line, parse through `NarrationEnvelope`, assert no validation errors. This catches schema drift between producer and consumer code.

## 6. Open questions (flag to Cesar before locking)

### G-1: Is `args_preview` redaction part of the producer's contract?

`ToolConfirmRequested.args_preview: dict[str, Any]` ships through the SSE channel to the UI. Plan/05 §3.1 says "args_preview" without specifying what gets shipped vs. redacted. Plan/05 §5.7 logging discipline says *"args hash (not args themselves; sensitive payloads redacted at the #6 boundary)"* — but that's about LOG records, not the SSE narration the user sees in the UI.

**Sub-question**: should `args_preview` always be a redacted preview (e.g., first 64 chars per string field, JSON-truncated), or is the producer trusted to ship full args because the user sees the same args anyway when confirming the tool call? The Build Agent's confirm UI literally needs the args to render. So full args probably must ship — but that means **the producer is responsible for redacting before constructing the event**, not the encoder. Worth pinning so the implementing ticket doesn't either ship secrets or render an unusable confirm UI.

### G-2: Is `text` on `InstructionReceived` always shipped?

When the user sends a chat instruction, `text` is the user's message — fine to ship. When it's a tool-confirm response or decision-point, `text` is `None`. But for a **voice instruction** (per Q-RT-3), what gets shipped — the transcribed text? The blob key? Both? plan/05 §2.4 says voice transcription happens early in the loop; the resulting text would naturally land on a *subsequent* event, not the original `InstructionReceived`. Recommend: original `InstructionReceived` carries the kind hint (`"voice"` if applicable, but currently the kind is just `"instruction-received"` — see G-3), and a separate event ships the transcript when ready.

### G-3: Should the `kind` discriminator distinguish chat / tool-confirm / decision / voice?

Currently `InstructionReceived` collapses all four input paths into one event. The UI may want to render differently per source. Two design options:
- **(a)** Single event, add `instruction_kind: Literal["chat", "tool-confirm", "decision", "voice"]` field
- **(b)** Four separate event subclasses (`InstructionReceived`, `ToolConfirmReceived`, `DecisionReceived`, `VoiceReceived`)

Recommend **(a)** for v1 — keeps the union flat and lets the UI's `kind`-switch stay shallow. Promote to (b) only if a per-source event grows different fields.

### G-4: Where does the actual narration/audit overlap live?

Plan/05 §3.4 says *"Any row inserted into `agent_runtime_outbox` with `kind LIKE 'audit-%'` is consumed by the global Audit Consumer."* But every event in this union has a `kind` value like `"instruction-received"`, `"file-written"` etc. — none start with `audit-`.

Two readings:
- **(a)** The `agent_runtime_outbox.kind` column carries a *different* tag than the `NarrationEvent.kind` discriminator. Some narrations are also audited; the row's `kind` column gets `audit-<event_kind>` for those, plain `<event_kind>` for narration-only. The producer is responsible for picking which.
- **(b)** All rows are audited; the consumer just reads what it cares about and ignores the rest.

Plan/05 §2.7 says *"every row is narration; only a subset is also audit"* — that confirms reading (a). The producer (`emit_event` Activity, Task 8.11) should accept an `also_audit: bool` flag and tag the outbox row's `kind` column accordingly. Worth pinning the convention here so audit-relevance isn't decided downstream.

### G-5: Should NarrationEvent be versioned?

Plan/05 doesn't put a `schema_version` field on `NarrationEnvelope`. If the union changes after deployment (e.g., a new event kind is added), old UI clients will fail closed (`extra="forbid"` rejects unknown keys, but Python pydantic on the server is the producer here, not the consumer — the consumer is JS/TS in the browser). The browser will see an unknown `kind` in the discriminator and... do whatever the TS hook decides (skip? error?). Recommend the TS-side hook log-and-skip unknown kinds, and add a `schema_version: int = 1` to `NarrationEnvelope` so the browser can fast-fail when the version is incompatible. Minor — not a blocker.

### G-6: TypeScript codegen vs hand-mirror?

The UI's `useEventSource` hook (Task 8.19) is parameterized on this discriminated union. Two options:
- **(a)** Codegen TS types from the Pydantic models via `datamodel-code-generator` reverse path or `pydantic-to-typescript`
- **(b)** Hand-mirror in `apps/web/src/types/narration.ts`

(a) is more disciplined; (b) is faster for the first version. Recommend hand-mirror at v1 since the union is small and stable; revisit when it grows past ~20 kinds.

## 7. SDK drift to flag (separately, not blocking T-M2-17)

From verification done alongside this sketch:

- **Anthropic Python SDK v0.99.0 released 2026-05-05 (today).** Plan/05's verification claim is dated 2026-04-28. Re-check no breaking changes in v0.97→0.99 before locking the agent runtime tickets in M2.
- **Plan/05 §4 line 938** writes `retry_policy=workflow.RetryPolicy(...)`. The actual import is `from temporalio.common import RetryPolicy`; lives at `temporalio.common.RetryPolicy`, not `temporalio.workflow.RetryPolicy`. Doc-only nit; spec is otherwise accurate.

Both items are in `project_mars_deployment_plan.md` for handoff continuity.

## 8. Acceptance criteria (when the ticket actually opens)

Lifted/derived from plan/05 §9 ACs that intersect this work:
- AC-RT-1 — `<ConsoleTab>` renders one line per event in `instruction-received → classifier-verdict → file-written → compliance-re-evaluated → hot-reload-applied` order from a real Build session. **Implementation gate**: the union covers every kind needed for AC-RT-1's golden trace.
- AC-RT-2 — Reconnect via `Last-Event-ID` replays cleanly. **Implementation gate**: encoder produces stable `id:` lines that match Postgres seq.
- AC-RT-7 — Seeded **Enlarge chart** → **Add Working Capital KPI** sequence on `/canvas/finiq` produces a NarrationEvent stream that matches the seeded `FINIQ_BUILD_CHAT` order **without** the in-memory mockup. **Implementation gate**: every event the mockup renders has a NarrationEvent shape that fits.

## 9. Estimated implementation effort (when ticket lands)

- `events.py` — 1 hour (mostly mechanical, the design is already drafted)
- `envelope.py` + `encoder.py` — 30 min
- Tests — 2 hours (round-trip per kind, exhaustive-discriminator test, encoder test, golden-trace test)
- Open questions G-1 through G-6 — half day if any get answered late
- Total: ~4 hours of focused work post-Cesar-resolution-of-open-questions.

## 10. Handoff status

- Design lifted from plan/05 §3.1: ✅ complete
- File layout proposed: ✅ complete
- Pydantic v2 implementable shape: ✅ complete
- Tests drafted: ✅ outline
- Open questions surfaced for Cesar: ✅ G-1 through G-6
- SDK drift flagged: ✅ two minor items
- **Sign-off needed**: Cesar's call on G-1 through G-6, in particular G-3 (single vs split InstructionReceived) and G-4 (audit-relevance tagging convention).

When M2 opens and T-M2-17 is assigned, the implementer can start at §1 and ship in roughly half a day assuming open questions are answered.
