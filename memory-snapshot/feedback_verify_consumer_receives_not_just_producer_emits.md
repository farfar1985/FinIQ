---
name: feedback-verify-consumer-receives
description: "A producer creating rich data ≠ the consumer receiving it. When evaluating a pipeline (Spec Agent → Build Agent, exporter → reader, API → client), VERIFY the depth actually reaches the consumer — read the serializer/handoff that bridges them, not just the producer's store. 2026-06-04: the Spec Agent builds a 21-node/31-edge capability graph + 31 acceptance predicates, but the Spec→Build handoff (render_spec_markdown → spec.md) renders only FR/NFR/decisions/gaps and reads ACs from the wrong table → the Build Agent receives 0 ACs + no architecture. Also surfaced earlier: the native panel export drops the same graph + ACs (2026-06-04 PDF investigation)."
metadata:
  node_type: memory
  type: feedback
  created: 2026-06-04
  updated: 2026-06-04
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The lesson
**A rich artifact is worthless if the handoff doesn't carry it.** Twice in the Spec Agent work, the producer (Spec Agent) created deep, grounded structure that the *consumer never received* because the **serializer/handoff in between silently dropped it**:

1. **Spec→Build handoff** (`domain/spec/serialize.py::render_spec_markdown` → `/workspace/.amira/spec.md`, the Build Agent's primary context): renders FRs / NFRs / decisions / unresolved gaps — but **drops the capability graph (nodes/edges)** and reads ACs from `spec_requirement` (kind=AC) while the Spec Agent stores ACs as graph `acceptance_predicates`. Net on a real spec: **0 acceptance criteria + no architecture reach the build.**
2. **Native panel export** (same family): the "Export draft" PDF/DOCX/MD also omits the graph + ACs (found during the 2026-06-04 PDF investigation).

In both cases the *spec* was excellent (31 ACs, full DAG) but the *thing that consumes it* got the thin version.

## The rule
When you assess or improve any producer→consumer pipeline:
- **Don't conclude from the producer's store.** "The Spec Agent has 31 ACs" / "the DB has the graph" tells you nothing about what the build/exporter/client actually gets.
- **Read the bridge** — the serializer, handoff, export renderer, API projection — and check it carries the producer's richness. Mismatches hide here (e.g., ACs stored in table A, serializer reads table B).
- **For the Spec→Build pipeline specifically:** the depth metric that matters is *what's in spec.md*, not what's in the spec_version's graph. Verify before claiming "the build will get X."

## Why it matters
We nearly shipped an evaluation ("every requirement has a testable AC") that was *true of the spec but false of the build* — the build never saw the ACs. Tracing the pipeline end-to-end to the consumer turned a vague "add more capabilities" ask into a precise, code-grounded fix (render the graph + ACs in the serializer), which is a far stronger, more credible finding.

## Related
- `project_empowered_spec_agent_spike.md` — the full spike + the handoff finding (bug #4).
- The export-omits-graph/ACs finding is also why the IEEE PDF we ship is a *custom* render, not the native export.
