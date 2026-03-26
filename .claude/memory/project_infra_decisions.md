---
name: Infrastructure decisions from 2026-03-26 call
description: Azure OpenAI Foundry for LLM access, GitHub within Mars, QDL access added, Databricks access pending
type: project
---

Decisions from 2026-03-26 team call:

1. **LLM access**: All OpenAI and Anthropic connections go through **Azure OpenAI Foundry** (not external URLs). This is how Mars gets access — not a proprietary Mars LLM, but Azure OpenAI Foundry as the gateway.
2. **GitHub**: Code repository lives within Mars's internal GitHub. CI/CD pipelines run on Mars infrastructure.
3. **QDL (Quandl/Nasdaq Data Link)**: Access added. Will be used for competitor financial statements and investor reports for CI pipeline.
4. **Databricks access**: Pending — Cesar to provide credentials to Farzaneh. In the meantime, synthetic data will be used.
5. **Credentials**: All Databricks credentials and API keys stored in an Excel file in the shared Google Drive folder.

**Why:** Mars requires all connections to stay within their Azure tenant. External URLs are not allowed for LLM access.

**How to apply:** Architecture docs and SRS should reference "Azure OpenAI Foundry" not "Azure OpenAI". GitHub references should say "Mars internal GitHub repository".
