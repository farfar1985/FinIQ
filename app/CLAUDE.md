# FinIQ App — Claude Code Context (v2 Fresh Build)

## Build Status
- **Branch**: `v2-fresh`
- **Build start**: 2026-03-27
- **Batch 1: Foundation** — COMPLETE
- **Batch 2–8** — Pending

## Architecture (v2)
- **Frontend**: Next.js 15.5 + React 19 + TypeScript + Tailwind CSS 4 + Recharts
- **Backend**: Node.js + Express 4 (ESM)
- **LLM**: Anthropic SDK (`claude-sonnet-4-20250514`)
- **Data**: Databricks SQL connector + SQLite fallback (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **State**: Zustand
- **Components**: shadcn/ui + class-variance-authority
- **Fonts**: IBM Plex Sans + JetBrains Mono (Google Fonts via next/font)
- **Design system**: OKLCH color tokens, Bloomberg-inspired dark-first

## Project Structure
```
app/
├── client/                    # Next.js frontend
│   ├── src/app/              # App Router pages (7 routes)
│   │   ├── page.tsx          # Dashboard
│   │   ├── chat/page.tsx     # NL Query interface
│   │   ├── reports/page.tsx  # Financial Reports
│   │   ├── ci/page.tsx       # Competitive Intelligence
│   │   ├── explorer/page.tsx # Data Explorer
│   │   ├── jobs/page.tsx     # Job Board
│   │   └── admin/page.tsx    # Admin Panel
│   ├── src/components/
│   │   ├── layout/           # AppShell, Sidebar, Header, Ticker
│   │   ├── ui/               # shadcn/ui primitives (to be added)
│   │   ├── charts/           # Recharts wrappers (Batch 3)
│   │   ├── shared/           # KPI cards, badges, formatters
│   │   └── features/         # Feature-specific components
│   ├── src/lib/              # utils.ts, format.ts, api.ts
│   ├── src/stores/           # Zustand (ui-store.ts)
│   └── src/types/            # TypeScript interfaces
├── server/                    # Express backend
│   ├── index.js              # Entry point (port 3001)
│   ├── lib/
│   │   ├── config.mjs        # SINGLE SOURCE OF TRUTH for config
│   │   └── routes.mjs        # API routes (placeholder endpoints)
│   └── agents/               # AI agents (Batch 3+)
├── .env.example              # Credentials template
├── .gitignore                # Includes .env, node_modules, .next
├── BUILD_PROMPT.md           # Master build spec
└── package.json              # Root with concurrently
```

## What's Working (Batch 1)
- Next.js dev server starts on :3000 (8.2s)
- Express server starts on :3001 with /api/health endpoint
- App shell: collapsible sidebar (48px/192px), top header with search, market ticker strip
- 7 page routes with placeholder content
- OKLCH design tokens (dark + light mode)
- IBM Plex Sans + JetBrains Mono fonts
- Zustand store (sidebar collapse, theme toggle)
- API client with typed methods
- TypeScript types for all core entities
- Financial number formatters

## Anti-Patterns to Avoid (carried from Build 1)
1. Use `claude-sonnet-4-20250514` — NOT `claude-opus-4-6`
2. Always use parameterized SQL queries — NEVER interpolate strings
3. Config keys defined ONCE in config.mjs — reference everywhere
4. Always JOIN dimension tables for human-readable labels
5. Wire WebSocket on BOTH server AND client
6. EVERY analytics response includes a Recharts chart
7. Use FMP API for real competitor data — no hardcoded/simulated CI
8. Tailwind + shadcn/ui + OKLCH tokens from day 1

## npm Workaround
System npm is broken (NVM issue). Use this to run npm:
```bash
node "/c/Users/farza/.npm-install/package/bin/npm-cli.js" install
```
For Next.js dev:
```bash
node node_modules/next/dist/bin/next dev --port 3000
```

## Key Specs
- `BUILD_PROMPT.md` — 80-item compliance matrix, 8 batches
- `FinIQ SRS v3.1 Final.docx` — 52 FRs
- `FinIQ Frontend Design Guideline v1.0.docx` — Design system
- `FIN_IQ_FRONTEND_SPEC.md` — Markdown version of design spec

## Next: Batch 2 — Data Layer
- Databricks SQL connector with SQLite auto-fallback
- Dimension table queries (entities, accounts, products, customers)
- Schema context string for LLM prompts
- Connection management (health check, retries, pooling)
