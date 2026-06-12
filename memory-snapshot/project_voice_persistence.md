---
name: Voice Persistence + Drawer + navigate_to_page (2026-04-16 late night, LOCAL only)
description: Voice session now persists across route changes. Mic in header, drawer on non-home pages, navigate_to_page tool, voice-store shared state, AppShell moved to root layout to stop per-route unmounts. Not pushed — waiting for user to demo side-by-side against `a14f91c` before committing.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
**Big goal tonight (user's words)**: "I wanna be able to talk to it throughout the app — say 'go to job board' then 'assign a job' then 'go to CI' then 'compare nestle with hershey' — all through voice, just like typing."

**Core architectural change**: AppShell previously wrapped every page individually. On route change, the old AppShell unmounted → VoiceBridge unmounted → WebSocket closed → voice died instantly. **Moved AppShell into `src/app/layout.tsx`** so it stays mounted for the life of the tab. VoiceBridge (which owns the WebSocket) now survives all navigations.

**New architecture**:
```
RootLayout (app/layout.tsx)
└── AppShell (persistent across routes)
    ├── VoiceBridge      ← owns the WebSocket, writes events to voice-store
    ├── Header           ← persistent mic button reads voice-store controls
    ├── Sidebar
    ├── <main>{children}</main>  ← page-specific content
    └── VoiceIndicator (drawer, only on non-home routes)
```

**New files:**
- `src/stores/voice-store.ts` — Zustand store: `messages`, `voiceState`, `isMuted`, `lastNarration`, `connect/disconnect/toggleMute` (registered by VoiceBridge)
- `src/components/voice-bridge.tsx` — headless; calls `useVoiceAgent`, routes events to store, handles `router.push(PAGE_PATHS[page])`, includes 3s-window dedup by signature
- `src/components/voice-indicator.tsx` — collapsible drawer. Defaults expanded. 640×720 when open, 320px collapsed. Renders `ChatMessage`s including inline table + recharts chart. Auto-expand on voice-connect and on new assistant messages.

**New tool: `navigate_to_page`** in `voice-server.ts` — enum `{home, jobs, competitive, reports, admin, help}`. Voice-server forwards `{ type: "navigate", page }` over WS. System prompt updated to route "go to / open / show me / take me to" through this tool instead of `query_financial_data`.

**System prompt updated for plot/visualize** — Realtime was refusing vague chart requests ("plot a chart"). Now explicit: call `query_financial_data` with a descriptive query, chart renders automatically from response.

**Redundancy removed**: chat-input mic button in `unified-content.tsx` deleted. Header is the single mic. Chat-input still shows "Voice on" label when active.

**Page files (all 10) stripped of their own `<AppShell>` wrappers:** page, jobs, reports, competitive (needed `<>` Fragment for its sticky-bottom sibling), query, unified, explorer, help, admin, voice.

**Hook safety**: `useVoiceAgent` now has a cleanup `useEffect(() => () => { close ws + audio + mic })` — prevents zombie sessions when component unmounts. In dev with HMR, this DOES kill the live session on file edits. That's acceptable in dev; production is unaffected. Post-demo enhancement: hoist WebSocket to a module-level singleton so it survives HMR.

**Dedup** in VoiceBridge — tracks last message signature (transcript hash or first-row/first-point of chart) within 3s. Realtime's double-tool-invocation bug ("Plot Mars revenue trend" fired twice back-to-back) used to produce duplicate bubbles; now only the first lands.

**Verified tonight end-to-end (local only):**
- "Go to the competitive page" → navigates, session stays alive
- "Compare nestle with hershey" on /competitive → cross-ref runs, drawer auto-expands with table + chart + narration
- "Plot Mars revenue trend" → voice doesn't refuse, fetches + narrates + charts
- "Submit a job to analyze Petcare organic growth with high priority" → job created, voice confirms with ID
- "What's on the job board?" → summary narrated

**Known residuals**:
- **Realtime entity-stripping**: "Compare Mars with Nestle" sometimes fires a second tool call with "Nestle" stripped (`"Compare Mars with"`) that routes as `financial` instead of `cross_reference`. Dedup doesn't catch because responses legitimately differ. **Possible fix** (not implemented): voice-server guard that rejects `query_financial_data` args ending in truncation markers (`with`/`to`/`versus`/`and`) within 3s of a prior call with the same prefix.
- **Voice can't drive page-internal UI** (e.g. "expand the completed job" on job board doesn't trigger the row-expand handler). Per-page voice tools would be the fix — big scope, post-demo.
- **HMR + dev**: live session dies on my file edits. User should only test during a stable window, or I stop editing while they test.

**Why it's not pushed**: User explicitly said "not going to be pushed until I show it to the team." Deployed baseline (`a14f91c`) stays safe on Azure. Tomorrow: side-by-side compare deployed vs local; if local holds, cut feature branch, commit, push for review.

**Tomorrow's testing plan:**
1. Deployed: finiq-app.azurewebsites.net (current baseline, showing Rajiv)
2. Local: localhost:3000 (tonight's work, compare UX feel)
3. Both run in parallel, no conflict
4. Decide push vs iterate

---

## 2026-04-17 update: pushed to feature branch, mic back to chat input

**Pushed to `feature/voice-persistence-full`** off main (main stays at `a14f91c`, untouched). Two commits on origin:
- `c279c87` — Feat: Voice agent persistence across routes + drawer + navigate_to_page (20 files, +624/-126)
- `bde0eb0` — UI: Move voice mic from header back to chat input (per Rajiv's ChatGPT-style preference)

**Mic placement change (Rajiv feedback)**: Rajiv liked the ChatGPT-style layout with mic inside the chat input bar next to Send. Moved the mic button from `header.tsx` back to `unified-content.tsx` (chat input row). Voice session plumbing unchanged — VoiceBridge in the root app-shell still owns the WebSocket, session persistence across routes preserved. Edge case: non-home pages no longer have a visible "start voice" control; users must start from home then navigate via voice. Acceptable for demo flow.

**Cesar can deploy this branch whenever** — main remains clean for safety.

---

## 2026-04-17 afternoon update: merged to main

**Merged.** Team reviewed the branch, Rajiv approved, user ran fast-forward merge from PowerShell:
```
git checkout main
git merge --ff-only feature/voice-persistence-full
git push origin main
```

Result: `a14f91c..bde0eb0  main -> main` fast-forward, 19 files changed, +596/-121, three new files created. Zero new git objects on the push since everything was already on origin from the feature-branch push earlier.

**Main is now the voice-enabled baseline.** Cesar redeploys from here — Azure `finiq-app.azurewebsites.net` will get the voice persistence + drawer + navigate_to_page + chat-input mic. Bruce/MLT demo on April 21 runs on this.

**Known residuals shipping to production** (all acceptable for demo):
- Realtime entity-stripping ("Compare X with Y" → second malformed call without Y). Dedup catches duplicates by signature but not this case. Post-demo fix is a typed `competitor` slot.
- No standalone mic on non-home pages. Flow: start from home, voice-navigate.
- HMR-dev sessions die on file save. Production unaffected.
