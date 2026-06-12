---
name: LLM JSON-output prompts must cover ALL response modes as JSON
description: When prompting an LLM for JSON-only output, any "plain-text refusal" or alternative-response instruction in the system prompt WILL conflict with the JSON constraint and produce unreliable behavior. Refusals and capability answers must also be JSON shapes, with the handler branching on which key is present.
type: feedback
originSessionId: 703a7113-29be-4087-85ba-c27e34fbdc47
---
Any time an LLM is instructed to "return only JSON" AND separately instructed to "for off-topic respond with exactly [plain-text phrase]", the two instructions conflict. The LLM will inconsistently pick one or the other, and the handler's JSON parser will fail on the plain-text branch, which typically silently falls through to a generic error path.

**Why:** LLMs optimize output to satisfy the most recent / most emphatic instruction. JSON constraints like "Return ONLY a JSON object with fields X, Y, Z" are strong structural signals. Plain-text refusal instructions buried earlier in the prompt get downweighted. When the LLM encounters an off-topic input, it either:
- Emits plain text (obeying the refusal) → handler's JSON parse fails → null return → downstream error fallback hides the refusal from users
- Emits JSON with bogus values to satisfy the constraint → downstream acts on garbage → wrong or broken result

**How to apply:**

1. Whenever a system prompt asks for JSON output, explicitly enumerate ALL valid response shapes as JSON, including refusals, capability answers, and any other alternative modes.
2. In the handler, branch on which key is present (`parsed.refusal`, `parsed.answer`, `parsed.sql`, etc.) BEFORE any downstream processing that assumes the primary shape.
3. When adding a new "special case" response to an LLM prompt, check if the output format is still honored — never add plain-text instructions to a JSON-mode prompt.

**Reference incident (FinIQ, 2026-04-22):** commit `2347fbe` (April 20) added a scope guardrail that instructed the LLM to respond with a plain-text refusal phrase for off-topic queries. It worked in isolated testing (10 test cases passed). Two days later, after Phase 1/2 reference-data rewrites tightened the JSON output constraint, the refusal path silently broke — "tell me a joke" fell through to the generic "Could not retrieve data from Databricks" error. Fix shipped in `cfc4b3d`: restructured the LLM output schema to cover three modes (data query / refusal / capability answer) all as JSON, with the handler branching on which key is present.

**Generalizes beyond FinIQ:** this pattern applies to any LLM-driven pipeline where the primary output is structured (tool calls, JSON, function arguments) and the prompt needs to also support scope enforcement, capability answers, meta-introspection, or any "short-circuit" response modes.
