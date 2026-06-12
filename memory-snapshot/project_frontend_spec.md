---
name: Alessandro's Frontend Design Spec
description: Bloomberg-inspired fintech UI spec to be used as stylistic guideline
type: project
---

## Frontend Design Spec (FIN_IQ_FRONTEND_SPEC.md)

**Author**: Alessandro Savino (Atlas agent)
**Saved to**: `app/FIN_IQ_FRONTEND_SPEC.md`

### Key Design Decisions
- **Philosophy**: Bloomberg-inspired, "information density without visual clutter"
- **Color system**: OKLCH color space, dark-first (deep navy-black background)
- **Fonts**: IBM Plex Sans (UI) + JetBrains Mono (data), tabular numerics
- **Components**: shadcn/ui base, Cards, Badges, Buttons, Tables, Tabs
- **Charts**: Recharts (area, bar, treemap), lightweight-charts (candlestick), custom SVG sparklines
- **Layout**: Collapsible sidebar (48px/192px), top header, market ticker strip, 12-column grid

### Tech Stack (his spec)
- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Recharts + lightweight-charts
- Zustand for state management

### Our Current Stack
- React 18 + TypeScript + Vite
- Vanilla CSS (dark theme)
- No charting library

### Gap: Our frontend needs significant upgrade to match this spec
- Add Recharts for charting (minimum viable)
- Eventually rebuild frontend with Tailwind + shadcn/ui design system
- This spec will be the "stylistic guidelines" fed to coding agents in future builds
