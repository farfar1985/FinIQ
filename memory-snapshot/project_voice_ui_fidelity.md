---
name: Voice Agent UI Fidelity Fix (2026-04-16, local-only)
description: Phases A+C of voice-vs-typed rendering parity — voice chart messages now carry rows/columns/intent/followUps, so table + correct provenance badge + chips render. Data pipeline was always identical; divergence was UI-side field dropping.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
**Problem (Rajiv's feedback, 2026-04-16)**: Voice agent "seems to generate different results than typed query."

**Root cause**: Voice pipeline hits same `/api/query` with same classifier and SQL — data is identical. What differed was:
- Voice message renderer dropped `columns`, `rows`, `intent`, `followUps` from the `data.display` WebSocket event. Only `chartData` made it to the chat bubble.
- Voice data bubble showed chart only; typed bubble showed chart + table + macro paragraph + provenance badge + follow-up chips.
- OpenAI Realtime also paraphrases the spoken narration (expected behavior, not addressed).

**Fix landed (local, not pushed, 4 files)**:
| File | Change |
|------|--------|
| `src/lib/voice-server.ts` | `safeSend(clientWs, { type: "data.display", ... })` now includes `text`, `intent`, `followUps` alongside `data`/`chartConfig`/`sources` |
| `src/hooks/use-voice-agent.ts` | `VoiceEvent` widened; `data.display` handler extracts enriched fields and forwards them in the `chart` event |
| `src/components/unified/unified-content.tsx` | Voice `chart` event handler now builds a Message with `data.rows`/`data.columns` (table renders), `intent` from /api/query (correct badge), `followUps` (chips). Falls back to chart-only if no table data. |
| `src/data/fmp.ts` | Type fix for earlier `Promise.allSettled` refactor — explicit `StockQuote[]` / `IncomeStatement[][]` types |

**Risk**: Low. Typed path untouched. Backward compat preserved (chart-only still works if response has no rows).

**Known residuals**:
- Narration bubble (from Realtime transcript) still shows its own LIVE Databricks badge — separate code path, minor.
- Realtime sometimes fires two tool calls for cross-ref queries, one with entity name stripped (observed "Compare Nestle to Mars" → also calling "Compare  to Mars"). Unfixable server-side; post-demo fix is adding a typed `competitor` slot to the Realtime tool schema.
- Phase B (merge transcript + data bubbles into one) deferred — risk of rendering race.
- Azure voice container still has legacy `get_report` / `get_competitor_analysis` in its schema; WebSocket sessions are sticky. Needs Cesar to redeploy voice container.

**Verification**: Tested "How is Petcare doing?" — voice bubble now shows 5-row table, bar chart, MACRO QML+Databricks badge. Confirmed matches typed.
