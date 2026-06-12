# Amira Spec Agent output vs. the FinIQ SRS — comparison

 how does the spec Amira's Spec Agent generated from a build prompt compare to the real FinIQ SRS?

**What was compared:**
- **Generated spec** — produced by the Spec Agent from a single 3-sentence build prompt ("a unified financial analytics platform consolidating period-end summaries + competitive intel, with NL querying over the warehouse, an analyst job board with SLAs, executive dashboards, SSO, and an audit trail"). ~90 seconds, one turn.
- **FinIQ SRS v3.1** — the hand-authored IEEE-830 spec that drove the FinIQ build, evolved over many iterations (v1 → v3.1).

---

## TL;DR

The Spec Agent, from three sentences, **independently reconstructed the same capability map** the team spent weeks specifying — with measurable acceptance criteria, an explicit gap list, and a capability graph. It is **a strong first-draft scaffold, not yet build-ready depth**: ~22 requirements vs the SRS's 52, and it's missing the concrete substance (data model, integration specifics, prompt library, deployment). Crucially, **that gap closes as you ground it** — when fed the real Databricks schema in a follow-up turn, it generated a correctly-grounded connector requirement (catalog/schema/auth named). So the right read is: *structural scaffold + elicitation engine in minutes → deepened toward SRS-grade through refinement.*

---

## Side-by-side

| Dimension | Generated spec (1 prompt, ~90s) | FinIQ SRS v3.1 (weeks, iterated) |
|---|---|---|
| Functional requirements | 16 (8 top-level + 8 sub-reqs) | **52** across 8 groups |
| Non-functional | 6 (latency, security, audit, faithfulness, a11y, availability) | 7 (quantified perf, RBAC, etc.) |
| Acceptance criteria | 20, measurable, attached to capabilities | Per-requirement, throughout |
| Capability map | 17-node DAG, 22 edges (explicit) | Implicit in prose |
| Open gaps / decisions | **6 gaps + 1 decision point, surfaced automatically** | Resolved in-doc |
| Data model | — (until grounded) | Section 4: 14 entities + Databricks mapping |
| Warehouse schema | — (until grounded) | Section 6: 20-object FinSight inventory, view→PES map |
| CI / competitor depth | 1 requirement | Section 7: FMP, 10 competitors, SWOT, Porter's 5 Forces, earnings-call NLP, benchmarking, M&A tracker |
| Prompt library | — | Appendix C: 18 curated prompts |
| Dual-mode / deployment / phasing | — | Sections 8–10 |

---

## Where the generated spec is genuinely strong

1. **Coverage of the capability surface.** Its 8 top-level FRs land on the *same* areas the SRS organizes around — period-end summaries, competitive intel, NL querying, job board, dashboards, macro enrichment, identity/RBAC/audit. Nothing major was missed at the headline level.
2. **Measurable acceptance criteria** — e.g. NL-query latency bounds, audit retention, answer-faithfulness — the kind of testable criteria the SRS also insists on, generated automatically.
3. **It surfaces what it doesn't know.** It raised 6 gaps (warehouse source, IdP protocol, SLA matrix, CI ingestion path, export controls) and 1 decision point (RLS enforcement layer) instead of silently guessing — exactly the discipline you want before a build.
4. **Structured, not prose.** The capability DAG + gap/decision objects are machine-usable downstream (the Build Agent reads them), which the Word-based SRS isn't.

## Where the SRS is deeper (what the generated spec lacks)

1. **Concrete grounding** — the real FinSight tables/columns/views, the KPI→account-code mappings, the 14-entity data model. The generated spec stays at the "what," not the "against which tables."
2. **Integration specifics** — FMP (the 10 competitors, SWOT/Porter's/earnings views), QML macro sources. The generated spec names the *capability* but not the *implementation*.
3. **The prompt library, dual-mode operation, deployment/infra, and phased rollout** — none present.
4. **Granularity** — ~1–3 requirements per area vs the SRS's 4–11. The SRS is exhaustive; the generated spec is a skeleton.

## The key insight: the gap closes when you ground it

This isn't a static skeleton. In a live follow-up turn we fed the agent the real Databricks schema (catalog `corporate_finance_analytics_prod`, schema `finsight_core_model`, the `finiq_vw_pl_entity` / `finiq_dim_*` objects, service-principal auth). It **resolved the warehouse gap and wrote a grounded connector requirement** — naming the actual catalog/schema, service-principal auth, and Unity Catalog row filters for RLS — and tied it to the row-level-access requirement. That is the mechanism by which a 22-requirement skeleton moves toward SRS-grade depth: refinement turns + grounding (schema feed / KB attach), not a one-shot.

## Bottom line

- As a **one-shot draft**, the generated spec is ~1/3–1/2 the depth of the hand-built SRS — but it reaches a coherent, gap-aware, testable skeleton of the *same* system in minutes instead of weeks.
- The remaining depth (data model, integrations, prompt library, deployment) is the part that comes from **domain grounding + iteration** — and the live demo shows the agent absorbs that grounding correctly when given it.
- Practical framing: the Spec Agent gets you to a solid, structured first draft + an elicitation partner that *knows what it's missing*; a human + the agent then iterate it toward build-ready. The FinIQ SRS is the end-state of exactly that loop, done by hand.
