---
name: llm-judge-conditional-rubric-injection
description: "Every paragraph added to an LLM judge's static rubric makes it globally stricter on UNRELATED dimensions — inject conditional rubrics via code-side precheck instead, and baseline-sample controls 6-10 runs before calling a regression"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

Discovered building PR #758 (#701 multi-action fidelity, 2026-06-10) on the Spec Agent's `evaluator.py` judge.

**The effect:** the evaluator's pre-existing healthy-turn controls (#625 balanced-AC + single-FR refinement) flake **~17% at baseline on untouched master** — they were never deterministic. Adding static rubric paragraphs (even well-scoped ones) pushed them to ~40-50% failure, with critiques dinging orthogonal dimensions while explicitly noting the new criterion was satisfied. Rubric length itself makes the judge stingier everywhere.

**Why:** an LLM judge treats the whole rubric as evaluation pressure. More text = more things to find wanting, regardless of relevance to the turn being judged.

**How to apply:**
1. **Conditional injection, not static text** — write a cheap code-side routing heuristic (e.g. `_looks_multi_action()`: ≥2 op-verb families hit) and append the extra rubric to the judge's user message ONLY when it applies. Single-action turns then score against the rubric the controls were calibrated on. Same family as FinIQ's multi-period targeted-injection fix (2026-04-23): code-detected precheck → targeted prompt addition.
2. **Align cross-file definitions BY REFERENCE** — when two prompts must share a definition (v1.txt's sub-FR split criteria ↔ evaluator's penalty), keep master's text byte-for-byte in one place and add a one-line pointer clause naming the canonical source, instead of copying the paragraph (which doubles the rubric-length pressure and drifts).
3. **Baseline before blaming yourself** — for LLM-judged "score ≥ N" tests, run the UNTOUCHED control 6-10 times first. A 2-run sample cannot distinguish your regression from baseline flake; we nearly reverted a correct change over noise.

Related: [[two-sided-llm-calibration]] (symmetric penalties), [[build-readiness-scorecard-pattern]].
