---
name: Two-layer voice architecture — Amira platform voice delegates to app voice via A2A
description: Voice UX at two layers: Amira platform (top-level, cross-app routing) + app-level specialist (domain-aware). Compose via A2A. FinIQ builds Layer B; Bill's Amira owns Layer A.
type: project
---

## The two layers

Voice in Amira should exist at BOTH the platform layer and inside each app. Not redundant — they compose.

### Layer A — Amira platform voice (Bill's original pattern)

- **UX**: top-level voice assistant the user talks to
- **Capability**: domain-aware routing, cross-app composition, context preservation across apps
- **Example**: *"What's the cocoa cost impact on Petcare margins?"* → Amira routes to Supply Chain (cocoa outlook) + FinIQ (Petcare margins), composes one narrative
- **Owner**: Bill's domain (he originated the pattern in the Amira desktop app)
- **Why it matters at scale**: as Amira grows to N apps × M pages, users don't know the map. Platform voice handles "where should this question go" so they don't have to.

### Layer B — App-level voice (FinIQ today)

- **UX**: voice inside a specific app (e.g., FinIQ's chat bar mic toggle)
- **Capability**: domain specialist, richer context inside one domain
- **Example**: inside FinIQ, voice-ask "top competitors with stats" → `/api/query` → FMP → speaks summary + renders chart
- **Owner**: app author (us for FinIQ; whoever builds Forecasting / Supply Chain / etc.)
- **Why it matters**: domain-specific context is tighter — "Petcare" inside FinIQ maps to a known Unit_Alias without disambiguation

## How they compose (A2A delegation)

```
User (voice)
    ↓
[Amira platform voice — Layer A]
    • Parses intent
    • Consults capability catalog (which apps can answer?)
    • Invokes app(s) via A2A
    ↓
[FinIQ voice agent — Layer B]
[Forecasting voice agent — Layer B]
[Supply Chain voice agent — Layer B]
    • Each answers in its domain
    • Returns structured response
    ↓
[Amira composes + speaks back to user]
```

The user talks to Layer A. Layer A talks to Layer B via A2A. User never sees the seams.

## Implications for FinIQ

**FinIQ is a Layer-B specialist.** It should NOT try to be the top-level voice UX for Mars. It should be cleanly A2A-callable by Layer A.

Practical moves:
1. **Keep FinIQ voice domain-focused** — financial queries, competitor stats, PES reports. Don't build cross-app navigation inside FinIQ; that's Layer A's job.
2. **Voice-nav inside FinIQ** (e.g., "go to Reports", "open CI") is valid but scoped to FinIQ's own UI only. It's not "navigate Amira" — it's "navigate within this app."
3. **Structured outputs matter more than flowery narration** — A2A callers need parseable data, not just speech.
4. **Ensure FinIQ's voice tools are A2A-exposable** — when Layer A arrives, we should be able to turn FinIQ's tool surface into an A2A agent card with minimal rework.

## Implications for the April 21 pitch

The strategic "wow" moment is NOT "FinIQ alone has voice nav." It's "Amira has voice nav and FinIQ is one of several specialists it talks to."

For April 21 specifically — Layer A (platform voice) may not exist yet in shippable form. FinIQ's own voice (Layer B) is what demos. Pitch the Layer A vision without claiming it ships today.

## Sequencing

| Phase | Layer | What happens |
|---|---|---|
| Now → April 21 | Layer B polish | Optional: add `navigate_to_page` to FinIQ voice. Tighten narration. Nothing more. |
| Post-April 21 | Integration planning | Align with Bill on integration path (tool-registration vs A2A). See `project_bill_amira_architecture.md`. |
| Phase 2 (~4-6 wk) | Layer A integration | Amira platform voice orchestrates FinIQ + future apps. Likely via ToolRegistry first (Bill's existing pattern), then A2A later. Migrate voice to Gemini Live as part of Google phasing. |
| Phase 3+ | Layer A maturity | More apps plug in. Cross-app composition becomes routine. |

## Bill's `navigate_page` — proven pattern we can copy

Bill already shipped a `navigate_page` tool in his Amira Meet desktop (`node-server/lib/tools/navigation.mjs`). It switches dashboard views via voice. When we add voice-nav to FinIQ:
- Tool registered in voice server tool list
- OpenAI Realtime decides when to call it based on user utterance
- Client event dispatched when tool fires → `router.push()`
- Voice session continues across navigation (hook stays mounted in app shell)

Pattern already proven in production inside Bill's stack. Reduces our voice-nav implementation risk from "design + build + debug" to "adapt + test."

## IMPORTANT: Bill's Amira is NOT A2A-native today (learned 2026-04-15)

Our earlier framing assumed Amira was already a bot-to-bot fabric. It's not — see `project_bill_amira_architecture.md`. It's a monolithic multi-agent app with internal agents sharing a ToolRegistry. "Layer A" as described above is aspirational; the concrete path for Phase 2 is to register FinIQ as a TOOL in Bill's existing registry first (Option 1, ~1 day), then evolve to real A2A later (Option 2, weeks).

This doesn't invalidate the two-layer voice architecture — it just means Layer A today is implemented via ToolRegistry, not A2A protocol. The user-facing UX (one voice, many specialists) is the same either way.

## What NOT to do

- Build "Amira-like platform voice" inside FinIQ. Wrong layer.
- Skip Layer B polish because "Layer A will handle it." Both layers are valuable — Layer B is the specialist Layer A calls.
- Migrate voice pipeline to Gemini Live before Layer A is understood. Voice choice (OpenAI Realtime vs Gemini Live) should be consistent across layers; let Bill's platform decision anchor it.

## Why this matters

Without this framing, we'd waste effort building cross-app voice routing inside FinIQ (wrong scope) or skip voice polish in FinIQ thinking Amira will do it all (also wrong). The layered view makes FinIQ's job clear: be a clean, A2A-callable voice specialist. Let Bill's platform orchestrate.
