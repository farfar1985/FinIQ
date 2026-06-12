---
name: Claude Code Review Pass 1 findings (2026-03-27)
description: Critical bugs and gaps found in Artemis build, coverage assessment
type: project
---

## Review Pass 1 — Artemis Build Assessment

### Critical Bugs
1. **Anthropic model name wrong** — uses `claude-opus-4-6` (invalid), every LLM call fails
2. **SQL injection in fallback mode** — entity names interpolated directly into SQL in `finiq-agent.mjs:289`
3. **Config property mismatch** — admin.mjs uses `DATABRICKS_HOST`, config.mjs defines `DATABRICKS_SERVER_HOSTNAME`
4. **Frontend doesn't use WebSocket** — server ready, client polls `/api/jobs` every 2s
5. **Variance query missing JOIN** — no `finiq_dim_account` JOIN, shows "Unknown" for account names
6. **CI all simulated** — hardcoded competitor data

### Coverage vs SRS v3.0
- FR1 Data Ingestion: ~50%
- FR2 Analytics: ~60%
- FR3 CI: ~40%
- FR4 NL Query: ~40%
- FR5 Job Board: **100%**
- FR6 Integration: ~30%
- FR7 Admin: ~20%
- FR8 Dynamic UI: ~50%
- **Overall: ~55-65%**

### Key Gap vs Competitors
NO charting/visualization. Alessandro has Recharts charts, data explorer with plots. Our app returns tables only.

### Fix Plan (Claude Code Pass 1)
1. Fix model name
2. Fix config mismatch
3. Fix SQL injection (parameterize queries)
4. Fix variance account JOIN
5. Wire frontend WebSocket client
6. Add Recharts charting for NL queries

### Status: FINDINGS DOCUMENTED, FIXES NOT YET APPLIED
