---
name: Meeting notes 2026-03-31
description: Key decisions from Mar 31 call — reusable agent platform, A2A/MCP protocol, April 21 MLT demo, ROI argument
type: project
---

Meeting 2026-03-31: Martin Yang demo + architecture discussion with Bill, Alessandro, Cesar, Atif.

**Key decisions:**
- **Reusable agent architecture**: 4 components (orchestration, data fetcher/text-to-SQL, data science, visualization) — build once, apply across use cases
- **Integration options**: APIs, agent-to-agent, MCP protocol under evaluation
- **FinIQ is proof-of-concept** for the broader platform — Atif confirmed no full funding yet
- **April 21 MLT presentation** is the key milestone to secure further investment
- **ROI argument**: Previous builds took 12 weeks internally; show faster/better results to justify investment
- **Embeddings/vectorization**: Recommended as next layer (not yet implemented) for semantic search
- **ETL strategy**: Custom Databricks SQL + precomputed/synthetic tables for heavy queries (no Genie AI)
- **Martin sending RFI** on reusable data-fetching components to QDT
- **Cesar action**: Send day-by-day plan to Atif for visibility (→ project plan docs created)

**Why:** This shapes the narrative for the April 21 demo — not just "we built an app" but "we proved a reusable platform model that scales."

**How to apply:** Frame all demo prep and documentation around the reusable platform story. Emphasize speed (2 weeks vs 12 weeks) and cross-domain potential.
