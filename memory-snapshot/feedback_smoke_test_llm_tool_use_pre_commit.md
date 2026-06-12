---
name: smoke-test-llm-tool-use-pipelines-pre-commit
description: "Before committing LLM tool-use code, run a real-integration smoke test against the production Anthropic client. Catches TWO schema-validation bug classes: (1) LLM-can't-emit-deterministic-field shapes (use a <Name>Seed subset); (2) a free-text tool-arg field whose max_length is tighter than the model's max_tokens budget — a valid response overflows the cap and fails validation (REMOVE the cap, don't raise it — raising just moves the wall; bound by max_tokens, re-truncate downstream for display; and trace EVERY schema on the path, not just one. e.g. the OOS judge rationale 500-cap vs 800-token budget false-block, PR #728 → Cesar's 23784d0 removed caps in BOTH OOS schemas)."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

For any code that asks an LLM to emit a structured Pydantic shape via tool-use, run a real-integration smoke test against the production Anthropic client BEFORE staging the commit. The smoke test:

1. Builds the inputs (in-process or via real fixture).
2. Calls the production LLM client (real `get_llm_client()`, real `client.messages.create(...)`, real `cache_control`).
3. Validates the response via the production Pydantic shape's `model_validate()`.
4. Asserts the output has plausible structure (counts in range, key fields populated, etc.).

If the schema includes fields the LLM can't reasonably emit, validation fails AT THE BOUNDARY and the bug surfaces in minutes — not as a downstream materialization error after the PR's been reviewed and merged.

# Anti-pattern caught by this rule

**LLM-can't-emit-deterministic-fields**: When a Pydantic tool-schema includes fields whose values are:

- Cryptographic hashes computed from other fields (e.g., a Bloom filter over a node set).
- UUIDs the LLM can't know (e.g., `spec_version_id` assigned at materialization time).
- IDs from databases the LLM has no read access to.
- Anything with a strict `pattern=` regex that the model would have to fabricate matching content for.

The LLM dutifully tries to emit a value matching the schema. It generates something — usually zeros, placeholders, or hallucinated UUIDs — that fails the Pydantic validation. The bug is invisible until the call actually runs.

# Real case caught — T-M3-42 (2026-05-19)

`InferenceOutput.capability_graph_seed: SpecCapabilityGraph`. The `SpecCapabilityGraph` shape required `out_of_scope_membership_index_hash: str = Field(pattern=r"^[0-9a-f]{1024}$")` — a deterministic 4096-bit Bloom filter computed from the node set via `compute_membership_index(graph)`.

Real Anthropic call returned an `InferenceOutput` where the model had filled `out_of_scope_membership_index_hash` with all zeros — close but not matching the regex (wrong length). Pydantic validation failed:

```
ValidationError: 1 validation error for InferenceOutput
capability_graph_seed.out_of_scope_membership_index_hash
  String should match pattern '^[0-9a-f]{1024}$'
```

**Fix**: introduce `SpecCapabilityGraphSeed` Pydantic shape — the LLM-emitable subset (just `nodes` + `edges` + `acceptance_predicates`, no IDs, no hash). Change `InferenceOutput.capability_graph_seed: SpecCapabilityGraphSeed`. Materialization step lifts seed → full `SpecCapabilityGraph` by assigning IDs + computing the bloom hash via `compute_membership_index()`. Same pattern applies to any LLM-tool-use schema that includes deterministic / cryptographic / unknowable-to-LLM fields.

# Pattern: name the "seed" subset explicitly

For any persistence-bound Pydantic shape used in LLM tool-use, define a sibling `<Name>Seed` shape:

```python
class SpecCapabilityGraph(BaseModel):
    """Full row — written to spec_capability_graph table."""
    spec_version_id: UUID
    graph_id: UUID
    version_seq: int
    nodes: list[CapabilityNode]
    edges: list[CapabilityEdge]
    out_of_scope_membership_index_hash: str = Field(pattern=r"^[0-9a-f]{1024}$")

class SpecCapabilityGraphSeed(BaseModel):
    """LLM-emitable subset — fields the model can plausibly generate."""
    nodes: list[CapabilityNode] = []
    edges: list[CapabilityEdge] = []
    acceptance_predicates: list[AcceptancePredicate] = []
```

The tool-use schema points at `<Name>Seed`. The Activity that materializes the row lifts seed → full shape:

```python
seed = inference.capability_graph_seed
placeholder = SpecCapabilityGraph(
    spec_version_id=spec.id,
    graph_id=uuid4(),
    nodes=seed.nodes,
    edges=seed.edges,
    acceptance_predicates=seed.acceptance_predicates,
    out_of_scope_membership_index_hash="0" * 1024,  # placeholder passes regex
)
bloom_hex = compute_membership_index(placeholder)
final = placeholder.model_copy(update={"out_of_scope_membership_index_hash": bloom_hex})
```

# Smoke-test script template

```python
# Save NOT in the repo (outside tests/) — this is pre-commit verification, not a regression test.
# Save as e.g. ./scratch_smoke_test_<feature>.py and delete after commit.
import asyncio
from amira_api.domain.<feature>.inference import infer_x

async def smoke():
    inputs = build_realistic_inputs()  # in-process fixture
    result = await infer_x(
        ...,
        org_id=str(uuid4()),
        user_id=str(uuid4()),
        ...,
    )
    # Validate plausibility
    assert len(result.x) > 0
    assert <each-required-shape-invariant>

asyncio.run(smoke())
```

Run BEFORE `git add` of the LLM code. Requires `ANTHROPIC_API_KEY` in shell env (NEVER committed). Real call takes 30-60s; one run is sufficient — if the schema mismatches the LLM-emit shape, it fails on the first call.

# Why this rule exists

The full-reality test rule (`feedback_test_shape_rule.md`) requires tests against real Anthropic with `@pytest.mark.integration`. Those tests run in CI / Cesar's local — usually NOT during the agent-coding session because:

1. Test infrastructure (Postgres + Workflow harness + AKV mock + ASGI client) often needs setup the local Windows dev env doesn't have.
2. Anthropic API key may not be in the local shell env.
3. The agent session usually doesn't run `make test` between every code edit.

The smoke test fills the gap: it's the cheapest possible end-to-end exercise of the LLM-tool-use path, run from the agent's working session before the commit. Catches the class of bug above in minutes, not after PR review.

# Trigger

Any time you write:

- `tools=[ToolDef(input_schema=<MyShape>.model_json_schema(), ...)]`
- `tool_choice=ToolChoice(mode="tool", name=...)`
- `<MyShape>.model_validate(tool_use.input)`

…run the smoke test before the commit.

# Second anti-pattern — free-text field `max_length` tighter than the model's token budget

A distinct schema-validation bug, same boundary: a **free-text field** (a rationale, summary, explanation) given a `max_length` SMALLER than what the model's `max_tokens` budget can produce. The model writes a perfectly valid, in-spec response that simply runs longer than the char cap → the tool-use input fails Pydantic validation → surfaces as an error (and, if the call is a gate, a fail-loud BLOCK of legitimate input).

**Rule: REMOVE the `max_length` on a free-text tool-arg field — do NOT just raise it.** Raising the cap to match `max_tokens` only *moves the wall*: an 800-token budget is ≈3200 chars, so even a 2000-char cap can be exceeded by a verbose-but-valid response. The bug class only dies when the cap is gone. Drop to `Field(min_length=1)` (require non-empty), let `max_tokens` be the real bound, and **truncate downstream at render time** if the surface is user-facing-bounded. (Same call as #681's regex removal: a gate the model naturally over-runs must go *away*, not be loosened.) NEVER lower `max_tokens` to fit a cap — that risks cutting the model off mid-structure.

**Also: trace EVERY schema on the path, not just the one that threw.** A false-block in an OOS/gate path can come from more than one Pydantic shape. When you fix one, grep for sibling shapes with the same free-text-cap pattern in the same subsystem and fix them in the same pass — otherwise the next deep run hits the one you missed.

**Real case caught — OOS judge false-block (2026-06-08, live UI test).** `runtime/agents/spec/oos_judge.py`: `OutOfScopeJudgeOutput.rationale: str = Field(min_length=1, max_length=500)`, but `_OOS_JUDGE_MAX_TOKENS = 800`. On a DEEP spec the Sonnet judge wrote a >500-char rationale (well within 800 tokens), the forced `record_oos_verdict` tool input failed validation, the pure module translated that into a **judge-error-block**, and ORCH-4 block-loud rejected a **legitimate in-scope refinement**. Audit payload symptom: `pass_used=judge-error`, `judge_error_detail="...rationale: String should have at most 500 characters..."`. **Fix:** PR #728 first *raised* `rationale` 500→2000 + `suggested_remediation` 300→600 — a half-fix. **Cesar's merge (`23784d0`) REMOVED the caps entirely** (`rationale: str = Field(min_length=1)`, `suggested_remediation: str = Field(default="")`) — raising only moved the wall. **He also found a SECOND latent cap I'd missed: `agents/spec/out_of_scope.py` `OutOfScopeVerdict.reason` capped at 160 chars** — the *per-turn detector* that runs on every refinement (not just the judge), so it was its own live false-block source. **Two lessons: (a) REMOVE the cap, don't raise it; (b) when the false-block is in an OOS path, trace BOTH schemas — the `oos_judge.py` judge AND the `out_of_scope.py` per-turn detector.** Latent on master — independent of the feature that exposed it.

Same family as the **T-M2-26 classifier** (real Haiku didn't honor a 240-char `rationale` cap → defensive truncation). The smoke-test rule above catches BOTH classes — but for THIS one the smoke input must be **large/verbose** (a trivial input never overflows the cap; only a deep/complex one does). When running the pre-commit smoke on a gate that summarizes a growing context (a judge, an evaluator), exercise it on a LARGE context, not just a toy one.

# Related memories

- [[feedback_test_shape_rule]] — full-reality tests in the test suite
- [[feedback_start_amira_issue_locks]] — the standards smoke-test verifies against
- [[feedback_cesar_quality_bar_m1_backend]] — Rule #5 (adversarial review) the smoke test operationalizes
