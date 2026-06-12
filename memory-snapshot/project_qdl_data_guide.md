---
name: QDL Data Guide — comprehensive reference doc for Cesar/QDT
description: 2026-04-23 midday. Wrote D:/Amira FinIQ/QDL_DATA_GUIDE.md (~500 lines) covering data dictionary schema, two API patterns, search/fetch implementation, LLM orchestration, and platform-level split. Requested by Cesar for his Amira work.
type: project
originSessionId: 5392bc4f-29c8-4e9d-ac1d-dc209c410846
---
**Origin**: Cesar asked Farzaneh on 2026-04-23 whether we had any markdown doc or skill that explains how to read the QDL data dictionary and pull data from QDL. He remembered doing this work for Q last year but figured it had evolved.

**Canonical file**: [QDL_DATA_GUIDE.md](D:/Amira FinIQ/QDL_DATA_GUIDE.md) in project root.

## What's in it

~500 lines, 10 sections, internal-team-only (not Mars-facing):

1. **Mental model** — Two layers: the catalog (113k+ rows describing symbols) and the time-series data (actual values). Every interaction = search dictionary → fetch series.
2. **Provider inventory** — FRED, TRAD_ECON, DTNIQ, COMTRADE, etc. Which ones Mars-relevant.
3. **18-column dictionary schema** (adapted from Quantum AI's `technical_reference.md`):
   - Governance: `in_use`, `authorized_groups`
   - Identity: `symbol`, `provider`
   - Semantics (primary for search): `name`, `classification`, `category`, `sub_category_1`, `sub_category_2`
   - Context: `frequency`, `location`, `currency`, `unit`, `start_date`, `exchange`, `extra`
   - Modeling: `valid_as_target`, `valid_as_predictor`
4. **Query-to-field mapping cheat sheet** — user asks about X → filter on Y
5. **Two QDL API patterns**:
   - **Pattern A (CSV)**: `GET https://qdl.ai/get_datasource_csv/{SYMBOL},{PROVIDER}/{T1}/{T2}?key=...` — what FinIQ uses. Simpler.
   - **Pattern B (JSON)**: `GET {QDL_API_URL}/qml/v1/get_symbol?key=...&tag=...&symbol=...&provider=...&t1=...&t2=...` — what Quantum AI uses. Richer.
6. **search_data_catalog patterns**:
   - Full DuckDB approach (Quantum AI's `qml.py`) — 113k rows in-memory, joins with Comtrade/SITC4/ONI dictionaries
   - Curated map approach (FinIQ's `macro-indicators.ts`) — 9 hard-coded indicators, LLM picks tags. Decision rule: >20 candidates → DuckDB; <20 → curated map.
7. **End-to-end LLM pattern** — two-pass: (1) LLM picks tags, (2) parallel QDL fetch, (3) LLM synthesizes narrative. FinIQ's `macro-enrichment.ts` is the reference.
8. **Schema drift handling** — symbol rename vs semantic drift. Pairs with the proposed drift-detection agent.
9. **Error handling catalog** — real symptoms from FinIQ production (27ms fetch-fail = DNS reject, empty CSV = no data in range, 403 = bad key, 15s+ timeout = upstream slowness).
10. **Quick-start checklist + open questions for QDT ops**.

## Confidentiality handling

- QML API PDF and keys are confidential (`feedback_qml_confidential.md`).
- The doc describes URL shapes and param names (already in our own code) but does NOT reproduce the vendor PDF.
- Example API key value NEVER echoed in chat or the doc — only masked form (last 4 chars + length).
- Internal team reference — NOT for Mars delivery.

## Platform-level split (the Amira question)

Farzaneh asked whether this is something Amira platform could use. Answer: yes — and probably should. Clean split:

**Platform-level (Amira owns once):**
- Shared QDL catalog service — one DuckDB instance with the 113k-row dictionary + Comtrade/SITC4/ONI, exposed as a `search_data_catalog` API
- Canonical QDL client library (TS + Python bindings) with caching, logging, health-check, error-handling baked in
- Secret management via Key Vault + managed identity (same pattern as `DATABRICKS_TOKEN`)
- Governance enforcement (`authorized_groups`) at the platform edge
- Drift detection paired with the nightly golden-query suite
- Standardized `[qdl]` log format + shared tracing

**App-level (stays in app):**
- Curated indicator map (Mars-segment-specific for FinIQ, different for each app)
- Tag-based prompts / synthesis narrative
- App-specific golden queries

**Tradeoff**: centralizing gives one place to fix drift and rate-limit, but imposes a contract — apps have to accept the platform's response shape. Worth it; pain of 5 apps rolling their own is already visible.

**Next move** (deferred to after Monday proposal): §9 (Quick-Start Checklist) + §10 (Open Questions) of the doc → Amira platform RFC. Pairs with the drift-agent architecture Cesar already has sketched.

## Source material used

- [D:/QuantumAI/data/documents/data-dictionary/technical_reference.md](D:/QuantumAI/data/documents/data-dictionary/technical_reference.md) — canonical 18-column semantics (Quantum AI ships this)
- [D:/QuantumAI/src/noname/app/tools/qml.py](D:/QuantumAI/src/noname/app/tools/qml.py) — full implementation of `search_data_catalog` + `fetch_timeseries` + forecast pipeline
- [D:/QuantumAI/src/noname/.claude/skills/data-explorer/SKILL.md](D:/QuantumAI/src/noname/.claude/skills/data-explorer/SKILL.md) — agent skill for UI-driven data exploration
- [ale-build/src/lib/qml-client.ts](D:/Amira FinIQ/ale-build/src/lib/qml-client.ts) — our CSV-pattern HTTP client, ~110 lines
- [ale-build/src/lib/macro-indicators.ts](D:/Amira FinIQ/ale-build/src/lib/macro-indicators.ts) — 9-indicator curated map
- [ale-build/src/lib/macro-enrichment.ts](D:/Amira FinIQ/ale-build/src/lib/macro-enrichment.ts) — 2-pass orchestration, ~220 lines

## Status

- Doc written 2026-04-23 ~1:30 PM
- Not yet sent to Cesar (waiting for Farzaneh to confirm she wants to share it with Mars-deploy testing still pending)
- Platform RFC extension deferred until after Monday proposal
