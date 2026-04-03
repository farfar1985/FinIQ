---
name: BUILD_PROMPT.md created (2026-03-27)
description: Unified build spec for fresh FinIQ rebuild — 80-item compliance matrix, 8 batches
type: project
---

## BUILD_PROMPT.md — Master Build Spec

**File**: `app/BUILD_PROMPT.md`
**Created**: 2026-03-27

### What it is
Single comprehensive document that any coding agent uses to build FinIQ from scratch.
Combines Rajiv's compliance-driven simplicity + Cesar's multi-agent structure + our Build 1 lessons.

### Key specs
- **80-item compliance matrix** (52 functional + 15 design + 6 CI/FMP + 7 technical)
- **Target score: 95+** (76/80 items)
- **8 dependency-ordered batches**: Foundation → Data → Analytics → Intelligence → Jobs → Admin → CI/FMP → Polish
- **Tech stack**: Next.js 16 + Tailwind + shadcn/ui + Recharts + Node.js + Anthropic SDK + Databricks + SQLite
- **CI uses REAL data**: FMP API for 10 competitors (not simulated)
- **Credentials**: .env only, from shared Google Drive

### How to use
- **Artemis**: Feed BUILD_PROMPT.md + spec docx files
- **Claude Code**: Read as team lead, spawn sub-agents (Frontend, Backend, CI/Integration, Reviewer)
- **Cesar's platform**: Feed both specs + BUILD_PROMPT.md, compliance matrix loop auto-runs

### Lessons baked in (anti-patterns from Build 1)
1. Use correct model name (claude-sonnet-4-20250514)
2. Parameterize ALL SQL queries
3. Single config source of truth
4. Always JOIN dimension tables for labels
5. Wire WebSocket on BOTH server and client
6. Include Recharts chart on every analytics response
7. Use FMP API for real competitor data
8. Use Tailwind + shadcn/ui design system from day 1
