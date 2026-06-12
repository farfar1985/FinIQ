---
name: cesar-build is the finiq-data-agent POC — framework-free
description: `cesar-build/` is Cesar's `finiq-data-agent` POC (Python + Databricks SQL + YAML semantic layer, NO framework). NOT the Amira platform itself. Integrated into ale-build's schema-context.ts.
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---
## What `cesar-build/` actually is

Cesar's `finiq-data-agent` — a Databricks-querying POC. NOT the Amira platform.

**Repo**: github.com/quantumdatatechnologies/finiq-data-agent
**Local clone**: `D:/Amira FinIQ/cesar-build/`

## Cesar's stated design philosophy (from `cesar-build/README.md`)

> *"All of this runs through Claude Code's native agentic loop — no custom orchestration framework."*

**Framework-free**. Dependencies are just:
- `databricks-sql-connector>=3.0.0`
- `python-dotenv>=1.0.0`

No CrewAI, no LangChain, no ADK, no Pydantic AI. The "agent" is Claude Code reading a rich CLAUDE.md + semantic-layer YAMLs + invoking Python tools via Bash.

## What it does

- Reads user NL questions about Mars financial data
- Consults `semantic-layer/` YAML files for table/column/join knowledge
- Checks `registry/view_registry.json` for pre-computed optimized views
- Generates SQL and runs via `python tools/db_query.py "SQL"`
- Auto-creates optimized views (`finiq_vw_auto_*`) when it sees repeating expensive patterns
- Updates semantic layer + registry so next time the same pattern is fast
- Never queries 5.7B-row fact tables without filters — enforced in CLAUDE.md as hard rules

## Where it fits in the layered Amira model

This is a **Layer-1 mini-agent** — a single-purpose data specialist. FinIQ (the mini-app) and any other Mars-finance app would call this agent for Databricks access rather than embedding the SQL generation inside themselves.

## What we've integrated into ale-build (2026-03-31)

- Copied `semantic-layer/` → `ale-build/doc/semantic-layer/` (7 YAML files)
- Rewrote `src/lib/schema-context.ts` with YAML content (~10x more context than before)
- Added `.env.example` with production Databricks workspace + warehouse config
- Did NOT copy Python tools (ale-build uses the Databricks SQL SDK directly via TypeScript)

## Key improvements unlocked

- LLM knows `Unit_Alias` is case-sensitive Title Case
- LLM knows 13-period fiscal calendar (Q4 = 4 periods, Period 13 = Q4 adjustment)
- LLM has safe query patterns to copy directly
- LLM knows dangerous patterns to avoid (no SELECT * on fact tables, no unfiltered view queries)
- 24 key reporting lines with exact names and sign conventions
- All join paths + 11-level org hierarchy with unit prefixes

**Alessandro's reaction**: "Outstanding", "this is the core of the prototype"

## Implications for framework choice

If Cesar kept his framework-free philosophy for the Amira platform itself, that shapes how OpenSpec Agent / Spec Agent / other meta-bots should be architected. Don't assume he's using CrewAI or ADK at the platform layer until we see the repo.

## Why this matters

When planning new bots for Amira, there's a working template: thin Python tools + rich CLAUDE.md + YAML knowledge + LLM's own reasoning loop. No framework tax. Whether that scales to multi-agent orchestration is the open question — it may not, and at that point ADK or OpenAI Agents SDK becomes compelling.
