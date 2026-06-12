# Spec Agent — Mars Demo (amira.qdt.ai)

Two prompts, demoed as a matched pair. **Pre-build each spec ~20 min before — never run a kickoff live** (a cold kickoff is only ~50% reliable; it can over-bloom/stall). Reuse the saved session and run the resolution turns live.

---

## Prompt B — RFNova (in-building wireless) — PRIMARY

**Demo spec → reuse the saved session:** `https://amira.qdt.ai/spec/cf2147ef-f6cb-4107-9084-98e176108da8`
(8 FRs FR-1…FR-8 · 3 NFRs · 8 ACs · dp-1 + 3 gaps unresolved — clean, no sort bug.)
**Open it, show the spec, then post the two resolution turns live and refresh to reveal the adjustment.**

**① dp-1 → Sionna RT** (run first — the technical wow):
> Resolve the propagation-engine decision point (dp-1): use NVIDIA Sionna RT — an open-source, GPU-accelerated differentiable ray-tracing engine — as the RF propagation engine. It runs per band across the FR-2 technology layers, and because it is differentiable, its gradients drive the FR-5 placement optimizer directly. Resolve dp-1 only — don't change anything else.

**② gap-1 → regulatory jurisdictions** (optional second beat):
> Resolve the regulatory-jurisdictions gap (gap-1): the initial launch jurisdictions are the US (FCC), EU (ETSI), Canada (ISED), and UK (Ofcom). The FR-7.3 compliance engine enforces per-jurisdiction band availability, EIRP limits, and required public-safety bands (such as FirstNet 700 MHz in the US) before a design can pass. Resolve gap-1 only — don't change anything else.

**Backup kickoff** (only if you ever need a fresh RFNova spec — this hardened version is reliable + includes NFRs):
> Build a tool called RFNova — an AI-native, browser-delivered platform for designing in-building wireless networks across multiple radio technologies (5G, private LTE/5G, Wi-Fi 6/7, and public-safety bands) in a single converged workflow, used by RF engineers and enterprise IT integrators. It matches and extends the in-building RF design workflow of established commercial tools such as iBwave (iBwave.com) and Ranplan. Core capabilities: model a building as a multi-floor environment with wall materials and signal-attenuation properties; describe the target network in natural language and have an AI design assistant propose an initial antenna and access-point layout; simulate RF coverage and capacity across the building using ray-tracing propagation for each supported band; optimize antenna and access-point placement against coverage, capacity, and interference targets; validate predicted coverage against real-world site-survey measurements and calibrate the model; produce design deliverables (coverage heatmaps, an equipment bill-of-materials, and compliance reports); and manage everything in a browser-based project workspace with no desktop install. Organize the specification around these capability areas as seven to eight top-level functional requirements (FR-1 … FR-8). Because requirement IDs are flat integers, write each FR's sub-requirements as a numbered list inside that requirement's detail text (e.g. "FR-1.1 …", "FR-1.2 …") — do not create separate top-level requirement entries for sub-requirements. Also include three to four non-functional requirements (NFR-1, NFR-2, …) covering performance/latency, security and tenant isolation, auditability, and accessibility, each with a measurable target. Give each top-level FR a measurable acceptance criterion.

---

## Prompt A — Financial analytics platform — SECONDARY

Same pattern: pre-build a clean session, reuse it, resolve the Databricks gap live.

**A1 — Kickoff:**
> Build a unified financial analytics platform for an enterprise finance team that consolidates period-end performance summaries and competitive-intelligence reporting into one hub. Core capabilities: natural-language querying over the financial data warehouse with row-level access by business unit; an analyst job board with SLAs; configurable executive dashboards; single sign-on; and an immutable audit trail. Organize the specification around these major capability areas as the top-level functional requirements (roughly seven to eight), and decompose each into numbered sub-requirements (FR-1.1, FR-1.2, …) with measurable acceptance criteria.

**A2 — Gap resolution (Databricks):**
> Resolve the warehouse-source gap only: the warehouse is Databricks Unity Catalog (`corporate_finance_analytics_prod.finsight_core_model`). The corporate GL/ERP loads the FinSight fact + dimension tables daily; competitive-intel comes from a licensed vendor feed; ingestion authenticates via Azure managed identity (no PATs). Resolve that gap only — don't change anything else.

**A3 — Extend (optional):**
> Add a commodity-price forecasting capability: analysts project the P&L impact of commodity-price moves (cocoa, sugar) over the next four quarters, with confidence bands and the macro drivers. Decompose it into sub-requirements with measurable acceptance criteria.

---
## Demo reminders
- **Reuse the saved spec — no live kickoff.** Keep `cf2147ef` pristine (rehearse resolutions on a throwaway, never on it).
- **Refresh after every resolution turn** — the spec doc doesn't auto-update (#690). Resolve → wait ~1 min → refresh → *then* show the adjusted FRs.
- **Keep the "resolve X only — don't change anything else" tail** on every resolution — that's what keeps the turn fast and stops it over-blooming.
- Gaps/decision-points vary per run, so the resolution wording above is tied specifically to `cf2147ef`'s dp-1 + gap-1.
