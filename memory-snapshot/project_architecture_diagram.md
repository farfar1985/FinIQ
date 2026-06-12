---
name: FinIQ Architecture Diagram — Mars Deck (2026-04-17)
description: Reviewed Rajiv's block diagram for Mars-facing deck. Structure good; missing Databricks, QML, Azure Key Vault. Cesar will polish final version with proper Azure icons in draw.io.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
**Context**: Rajiv (Asimov) generated an architecture block diagram and emailed it for review before sending to Mars. The diagram is built in **draw.io (diagrams.net)** using the **official Azure Architecture Icons library** (built-in `+ More Shapes → Networking → Azure`).

**Review outcome — accurate components:**
- Semantic layer & services group (Semantic YAML, Query Intelligence NL→SQL, Context store, FastAPI backend)
- LLM API (OpenAI), Realtime audio (OpenAI)
- GitHub Actions / Azure DevOps → Azure Container Registry
- Azure delivery group (Application Gateway → App Services Next.js/API/Audio → PostgreSQL Flexible Server, Voice desk UI)
- Web & Voice clients
- Source data: QDL (qdl.ai), FMP, Finance marts

**Critical missing components that should be added before Mars sees it:**
1. **Databricks** — primary data source for Mars financials. Currently invisible. Needs to be in Source data group.
2. **QML · Q.Enterprise** — macroeconomic data source. Needs to be in Source data group.
3. **Azure Key Vault + Managed Identity** — makes the "no shared secrets" security story explicit. Belongs in Azure delivery group.

**Not removals — additive only.** User said Rajiv's inclusions (QDL, pgvector, FastAPI, PostgreSQL) can stay; some reflect target / planned state. PostgreSQL IS on the roadmap per Cesar.

**Style notes:**
- Rajiv's polished diagram uses Azure's official icon library (colored 3D-ish tiles for Data Lake, Container Registry, Key Vault, etc.)
- My draw.io XML draft used `shape=mxgraph.azure2.*` which renders as plain colored squares — that library didn't resolve cleanly. The MODERN Microsoft Azure set in draw.io is under `+ More Shapes → Azure` and shape names like `mxgraph.azure.data_lake_storage`, `mxgraph.azure.key_vaults`.

**Handoff decision**: Cesar will take the 3 additions and apply them with proper Azure icons in Rajiv's polished file. Farzaneh passed the additions list to him.

**Files generated for reference (kept in `D:\Amira FinIQ\`):**
- `FinIQ_Architecture_Additions.md` — narrative + Mermaid cross-check + Mars-facing slide text
- `FinIQ_Architecture_Additions.drawio.xml` — 3 styled nodes snippet (Databricks, QML, Key Vault)
- `FinIQ_Architecture_Complete.drawio.xml` — full layout recreation (plain-box icons — reference only, not for Mars)

**Mars-facing narrative** (drop beneath the diagram on the slide):
> FinIQ consolidates four data surfaces into a single conversational hub: Mars internal financials via Databricks, competitor financials via FMP, macroeconomic context via QDT's Q.Enterprise (QML), and intent + voice orchestration via OpenAI. Delivery is on Azure — App Services hosting Next.js and the voice audio proxy, fronted by Application Gateway, with Azure Key Vault + Managed Identity handling Databricks authentication without shared secrets. CI/CD flows through GitHub Actions into Azure Container Registry. Containerized and Mars-deployment-ready.
