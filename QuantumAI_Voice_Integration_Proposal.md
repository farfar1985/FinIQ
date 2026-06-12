# Voice Agent Integration Proposal — Quantum AI / Noname

**Audience**: GenAI team (Noname / Quantum AI)
**Reference implementation**: Amira FinIQ voice agent (OpenAI Realtime + WebSocket proxy pattern)
**Prepared by**: Farzaneh + Claude Code
**Date**: 2026-04-20

---

## 1. Executive Summary

Quantum AI's Noname backend is a Pydantic AI agent with a rich tool surface (20+ tools covering navigation, dashboard interaction, AG Grid manipulation, widget creation, data catalog search, and forecasting) embedded as the `dash-agent-widget` inside a Plotly Dash dashboard. Adding voice input/output is straightforward because the hard parts — agent orchestration, tool calling, page context awareness, session persistence — already exist. Voice only has to replace the keyboard as input and the screen as output.

**Recommended architecture**: introduce a new standalone `voice-server` service (Node.js, patterned on FinIQ's `voice-server.ts`) that acts as a **transcription and TTS proxy between the browser and OpenAI Realtime API**. The `q-ui-sdk` widget gains a mic control and routes transcribed user utterances through the **existing** `/api/v1/chat` endpoint. Tool calls, dashboard actions, and widget creation continue to flow through the existing ActionBroker and `assistant-ui` runtime paths. **Voice is audio I/O only; not a parallel agent.**

**Effort estimate**: ~1 week for a senior engineer familiar with the codebase.

**Effort breakdown**:
- New `voice-server` service: 1–2 days
- `q-ui-sdk` widget voice integration (mic button, audio capture/playback, transcript injection into existing runtime, TTS streaming): 2–3 days
- Interruption and turn-taking refinement: 1 day
- Testing, polish, deployment wiring: 1–2 days

---

## 2. Current Architecture (baseline)

### 2.1 Services and their deployments

| Service | Code location | Port | Role |
|---|---|---|---|
| Plotly Dash app | (external repo — not in `quantum-ai`) | — | Main dashboard with 20+ pages |
| `dash-agent-widget` | `packages/q-ui-sdk/` | — | React widget embedded in Dash via `window.DASH_AGENT_CONFIG` |
| Noname | `src/noname/` | 8001 | FastAPI + Pydantic AI + Anthropic Claude |
| Fortuna | `src/fortuna/` | 8000 | (Legacy LlamaIndex agents, being replaced) |
| PostgreSQL `qask_v2` | — | 5433 | Noname session/message persistence |
| Redis | — | 6379 | (Available, not yet load-bearing for ActionBroker) |

### 2.2 Current request/response flow (typed)

```
User types in q-ui-sdk chat
  │
  ▼ (POST /api/v1/chat with { session_id, message, context })
Noname /chat route
  │
  │ Builds prompt:
  │   <page_context>
  │   ... component IDs, AG Grid columnStats, filters, chart IDs ...
  │   </page_context>
  │   User: <message>
  │
  │ Loads message history from DB + session_cache
  │
  ▼
Pydantic AI agent.run_stream_events()
  │
  │ LLM: Anthropic Claude (AGENT_MODEL via AnthropicModelSettings)
  │ Caching: instructions, tool defs (1h), messages
  │ Tools bound:
  │   - tavily_search_tool (if TAVILY_API_KEY)
  │   - SkillsToolset (discovers SKILL.md from .claude/skills/)
  │   - @agent.tool decorated: navigate_to_page, select_dropdown, click_button,
  │     set_input, set_date_range, set_slider, set_checklist, toggle_switch,
  │     set_tab, grid_set_filter, grid_clear_filters, grid_sort, grid_select_all,
  │     grid_multi_select, grid_click_row_button, get_entity_mappings,
  │     fetch_chart_context, create_widget, (qml / feature_intelligence tools)
  │
  │ For each event, SSE yield to client:
  │   PartStartEvent + TextPart → data: {"type":"text","content":...}
  │   PartDeltaEvent + TextPartDelta → data: {"type":"text","content":<delta>}
  │   FunctionToolCallEvent → data: {"type":"tool_call_start","tool_name":...,
  │                                   "tool_call_id":...,"args":...,
  │                                   "is_dashboard_tool":bool}
  │   FunctionToolResultEvent → data: {"type":"tool_call_end","tool_call_id":...}
  │   AgentRunResultEvent → (collect all_messages for persistence)
  │   — terminal: data: {"type":"done","widget_specs":[...]}
  │   — error: data: {"type":"error","content":...}
```

### 2.3 ActionBroker pattern — critical to understand

Dashboard tools (`navigate_to_page`, `select_dropdown`, `grid_set_filter`, etc.) do NOT complete immediately. Each one calls:

```python
# src/noname/app/tools/dashboard.py
result = await ctx.deps.action_broker.request_action(
    ctx.deps.session_id, action, timeout=10.0
)
```

Which blocks on an `asyncio.Future` for up to 10 seconds. Meanwhile, the SSE stream emits a `tool_call_start` event with `is_dashboard_tool: true`. The q-ui-sdk widget sees this event, **executes the action in the Dash UI** (clicks the button, navigates, filters the grid), and POSTs the result back:

```
POST /api/v1/chat/action-result
{
  "session_id": "...",
  "tool_call_id": "...",
  "result": { "success": true, ... }
}
```

The backend's `action_broker.resolve(session_id, result)` sets the Future, the tool returns, the agent continues. This is synchronous request-response between agent and widget, mediated by the SSE stream and a reverse HTTP POST.

**Implication for voice**: any voice architecture must preserve the widget's participation in tool execution. The widget cannot be bypassed for dashboard actions.

### 2.4 Frontend: q-ui-sdk

- `packages/q-ui-sdk/src/Widget.tsx` — mounts into `#dash-agent-widget-root` in the Dash app
- Uses `@assistant-ui/react` with `useLocalRuntime` and a custom SSE adapter (`makeSSEAdapter`)
- Three display modes: modal, sidebar, fullscreen (URL-driven via patched `history.pushState`)
- Reads config from `window.DASH_AGENT_CONFIG` (agent URL, fullscreen path, layout offsets)
- Connects to Noname at `http://localhost:8000/api/v1/chat` (dev)

---

## 3. Proposed Voice Architecture

### 3.1 Design principle

**Voice is audio I/O wrapped around the existing chat flow, not a parallel agent.** OpenAI Realtime (or Gemini Live — see §5) provides speech-to-text and text-to-speech only. The transcribed text is submitted to Noname's `/api/v1/chat` endpoint exactly as a typed message would be. All tool calling, dashboard actions, widget creation, and session persistence happen inside the existing Pydantic AI agent loop and the existing ActionBroker ↔ q-ui-sdk protocol.

This is **different from the FinIQ architecture** where the voice-server defines its own TOOLS array and OpenAI Realtime's function-calling drives navigation. FinIQ has a sparse backend (~5 tools) and no ActionBroker; Quantum AI has a rich backend with synchronous tool execution via the widget. In Quantum AI, letting OpenAI Realtime call tools directly would duplicate the agent's surface and bypass the ActionBroker — breaking the existing mechanism.

### 3.2 Component diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   Plotly Dash Dashboard                         │
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │  q-ui-sdk (dash-agent-widget)                           │   │
│   │  ┌───────────┐ ┌───────────┐ ┌────────────────┐        │   │
│   │  │ Composer  │ │ Chat      │ │ VoiceControls  │        │   │
│   │  │ (text)    │ │ Thread    │ │ (NEW: mic btn) │        │   │
│   │  └─────┬─────┘ └─────▲─────┘ └────────┬───────┘        │   │
│   │        │             │                 │                │   │
│   │        │  useLocalRuntime              │                │   │
│   │        │  + SSEAdapter                 │                │   │
│   │        │  + ActionExecutor             │                │   │
│   │        │             │                 │                │   │
│   │        │   POST /chat │ SSE stream     │ useVoiceAgent  │   │
│   │        │              │                │ (NEW)          │   │
│   │        ▼              │                ▼                │   │
│   └───────────────────────┴─────────────────┬───────────────┘   │
│                                             │                   │
└─────────────────────────────────────────────┼───────────────────┘
                     │                        │
                     │                  WebSocket (audio + events)
                     │                        │
                     ▼                        ▼
           ┌──────────────────┐    ┌──────────────────────┐
           │  Noname          │    │  voice-server (NEW)  │
           │  FastAPI         │    │  Node.js + WebSocket │
           │  + Pydantic AI   │    │  proxy               │
           │                  │    │                      │
           │  /api/v1/chat    │    │  1. Audio in → OAI   │
           │  /api/v1/chat/   │    │     Realtime (STT)   │
           │  action-result   │    │  2. Transcript →     │
           │                  │    │     Noname /chat     │
           │  ActionBroker    │    │  3. SSE → collect    │
           │  (asyncio.Future)│    │     text             │
           │                  │    │  4. Text → OAI       │
           └──────────────────┘    │     Realtime (TTS)   │
                     ▲             │  5. Audio → browser  │
                     │             └──────────┬───────────┘
                     │                        │
                     │                        │
                     └──HTTP POST──────────────┘
                    (voice-server calls Noname
                     on behalf of user, with JWT)
                    
                     And OAI Realtime API:
                     wss://api.openai.com/v1/realtime
                     ?model=gpt-4o-realtime-preview-...
```

### 3.3 Flow: user speaks "show me the gold forecast"

```
1. User speaks into mic in Dash dashboard
2. q-ui-sdk VoiceControls captures audio (PCM16 @ 24kHz)
3. Audio streams via WebSocket to voice-server
4. voice-server relays audio to OpenAI Realtime
5. OpenAI Realtime performs STT + server VAD detects end-of-speech
6. OpenAI Realtime emits `conversation.item.input_audio_transcription.completed`
   with text: "show me the gold forecast"
7. voice-server extracts the transcript and POSTs to Noname /api/v1/chat:
   {
     "session_id": "<same session as typed>",
     "message": "show me the gold forecast",
     "context": "<current page_context JSON from widget>"
   }
8. Noname agent runs. First tool call:
   get_entity_mappings() → finds project "Gold 2026 Forecast" id=1625
9. SSE emits:
   data: {"type":"tool_call_start","tool_name":"get_entity_mappings",...}
   voice-server forwards this event to the browser WebSocket
   q-ui-sdk widget shows "Looking up projects..." in the thread
   (OPTIONAL: voice-server synthesizes filler TTS "One moment...")
10. Agent decides: user is not on the forecast page, so call
    create_widget(widget_type="forecast_chart", title="Gold Forecast", 
                  data=[], config={project_id: 1625})
11. SSE emits text response: "Here is the gold forecast for project 1625..."
12. voice-server collects all text chunks as they arrive
13. On "done" event: voice-server sends accumulated text to OpenAI Realtime
    via `response.create` with `modalities: ["audio"]`
14. OpenAI Realtime synthesizes TTS, streams PCM16 audio back to voice-server
15. voice-server streams audio to browser WebSocket
16. Browser plays audio through speakers
17. Meanwhile, q-ui-sdk widget has already received `widget_specs` from done
    event and rendered the forecast chart inline in the chat thread
```

**Key observation**: steps 9–17 preserve the existing flow. Tool calls emit SSE events; widget executes dashboard actions; widgets render. Voice just supplies the user message and speaks the final response.

---

## 4. New Components

### 4.1 `packages/voice-server/` (NEW service)

**Stack**: Node.js 22 + TypeScript + `ws` library (patterned on FinIQ's `src/lib/voice-server.ts`).

**Port**: 8003 (or any free port; configurable via `VOICE_PORT` env var).

**Responsibilities**:
1. Accept browser WebSocket connections; authenticate via JWT passed in query string or first message
2. Maintain a 1:1 outbound WebSocket to OpenAI Realtime per browser session
3. Forward audio frames bidirectionally
4. On each completed user utterance: POST the transcript to Noname `/api/v1/chat` with the browser-supplied `session_id` and `page_context`
5. Read the SSE response stream from Noname; parse events; forward `tool_call_start` / `tool_call_end` / `widget_specs` / `done` / `error` events to the browser WebSocket (the widget will handle action execution)
6. On `done`: submit accumulated text content to OpenAI Realtime for TTS
7. Stream TTS audio chunks to the browser

**File layout**:

```
packages/voice-server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.template
└── src/
    ├── server.ts              # HTTP + WebSocket listener
    ├── session.ts             # Per-browser-session state
    ├── realtime-client.ts     # OpenAI Realtime WebSocket wrapper
    ├── noname-client.ts       # SSE reader for Noname /chat + /action-result
    ├── audio.ts               # PCM16 frame helpers (base64 encode/decode)
    ├── auth.ts                # JWT verification (shared key with Noname)
    └── types.ts               # Shared event types
```

**Key types**:

```typescript
// Sent browser → voice-server over WebSocket
type ClientEvent =
  | { type: "auth"; jwt: string; session_id: string; page_context?: string }
  | { type: "audio_input"; data_b64: string }    // PCM16 @ 24kHz
  | { type: "mute"; muted: boolean }
  | { type: "context_update"; page_context: string }  // widget sends on navigation
  | { type: "interrupt" };                       // user hit stop button

// Sent voice-server → browser over WebSocket
type ServerEvent =
  | { type: "session.ready" }
  | { type: "audio_output"; data_b64: string }   // TTS chunk
  | { type: "transcript_user"; text: string }    // finalized STT result
  | { type: "transcript_assistant"; text: string } // full text that was TTSed
  | { type: "thread_event"; event: NonameSSEEvent } // pass-through
  | { type: "tool_status"; tool_name: string; running: boolean }  // UI hint
  | { type: "error"; message: string };

// From Noname — forwarded by voice-server verbatim so widget can act
type NonameSSEEvent =
  | { type: "text"; content: string }
  | { type: "tool_call_start"; tool_name: string; tool_call_id: string;
      args: Record<string, unknown>; is_dashboard_tool: boolean }
  | { type: "tool_call_end"; tool_call_id: string }
  | { type: "done"; widget_specs?: object[] }
  | { type: "error"; content: string };
```

**OpenAI Realtime session configuration** (sent on connect):

```typescript
// No tools here — unlike FinIQ. OpenAI Realtime is pure STT+TTS.
openaiWs.send(JSON.stringify({
  type: "session.update",
  session: {
    modalities: ["text", "audio"],  // still need text for STT + TTS text
    voice: "sage",
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    input_audio_transcription: { model: "whisper-1" },
    turn_detection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800,
    },
    instructions: "You only transcribe user speech and read back text given to you. Do not generate your own content.",
    // tools: []  // explicitly empty — NOT using Realtime's function calling
  },
}));
```

**Noname call shape** (when user transcript finalizes):

```typescript
async function submitTranscriptToNoname(
  transcript: string,
  sessionId: string,
  pageContext: string | undefined,
  jwt: string,
): Promise<void> {
  const res = await fetch(`${NONAME_API_BASE}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: transcript,
      context: pageContext,
    }),
  });

  // Read SSE stream
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));

      // Forward non-text events verbatim to browser — widget acts on them
      if (event.type !== "text") {
        safeSend(clientWs, { type: "thread_event", event });
      }

      if (event.type === "text") {
        accumulatedText += event.content;
      } else if (event.type === "done") {
        // Submit accumulated text to OpenAI for TTS
        sendToTTS(openaiWs, accumulatedText);
        safeSend(clientWs, {
          type: "transcript_assistant",
          text: accumulatedText,
        });
      } else if (event.type === "tool_call_start") {
        // Optional: emit a short narration like "Looking up..."
        const narration = getToolNarration(event.tool_name);
        if (narration) speakFillerNarration(openaiWs, narration);
        safeSend(clientWs, {
          type: "tool_status",
          tool_name: event.tool_name,
          running: true,
        });
      } else if (event.type === "tool_call_end") {
        safeSend(clientWs, {
          type: "tool_status",
          tool_name: "",  // not known at end event; widget tracks by id
          running: false,
        });
      }
    }
  }
}
```

### 4.2 `packages/q-ui-sdk/` changes (EDIT, not from scratch)

**New files**:

```
packages/q-ui-sdk/src/
├── components/
│   └── VoiceControls.tsx       # Mic button, status indicator, stop button
├── hooks/
│   └── useVoiceAgent.ts        # WebSocket to voice-server, audio I/O lifecycle
├── lib/
│   └── audio-worklet.ts        # AudioWorklet processor for PCM16 capture/playback
└── contexts/
    └── VoiceContext.tsx        # Exposes isConnected, isSpeaking, transcript to UI
```

**Modified files**:

- `Widget.tsx` — mount `VoiceControls` in FullscreenChat, CustomModal, and Sidebar layouts
- `hooks/useAgentRuntime.ts` — accept voice-injected user messages (see below)

**Integration with `useLocalRuntime`**:

The `q-ui-sdk` uses `@assistant-ui/react`'s `useLocalRuntime` with a custom SSE adapter. For voice, transcribed user utterances need to appear in the SAME thread as typed messages. The cleanest way:

```typescript
// In useVoiceAgent.ts — when user speech finalizes:
function onVoiceTranscriptUser(text: string) {
  // Use the same code path as typing a message
  // assistant-ui's composer has an imperative `send(text)` method
  composerRuntime.send(text);  // fires the existing SSE flow
}

// When assistant response text comes back from voice-server,
// it's ALREADY being inserted into the thread by the existing SSE adapter
// (because voice-server is calling the SAME Noname /chat endpoint that
// the typed flow calls). No separate message state to manage.
```

This is the critical architectural decision: **voice does not create a parallel message stream**. The voice-server POST to `/chat` and the widget's typed-message POST to `/chat` produce identical message history in the database. The widget receives SSE events for both paths identically. Voice just skips the keyboard.

Wait — but the voice-server is the one POSTing to `/chat`, not the widget. So the widget's SSE listener wouldn't see the response. We need one of two options:

**Option A: Widget POSTs to `/chat`, voice-server observes**

The voice-server sends the user transcript to the widget via WebSocket. The widget pushes it into its composer (just like typing). The widget's own SSE reader gets the response. Voice-server reads the FINAL response text via a separate callback from the widget (or by reading the widget's DOM… ugly).

**Option B (recommended): Voice-server POSTs to `/chat`, forwards SSE events to widget via WebSocket**

The voice-server maintains ownership of the `/chat` call. It parses SSE events and forwards them to the browser WebSocket as `thread_event` events. The widget receives these events and feeds them into the same internal runtime logic as it uses for its own SSE connection. This requires a small refactor of the widget: the SSE event handler should be reusable for both local fetch-based streaming AND voice-server-forwarded events.

Option B is cleaner because:
- Voice-server can inject filler narration between tool calls
- Voice-server knows when text is complete (for TTS)
- Widget is decoupled from which HTTP endpoint produced the stream

**Refactor needed in `q-ui-sdk`**:

```typescript
// Before (current): SSE adapter reads directly from fetch()
const adapter = makeSSEAdapter({
  fetchFn: () => fetch('/api/v1/chat', { ... }),
});

// After: adapter becomes generic event source
const adapter = makeGenericAdapter({
  eventSource: typedOrVoiceEventStream,
});
// where typedOrVoiceEventStream emits NonameSSEEvent objects, either from
// local fetch (typed flow) or from voice WebSocket (voice flow)
```

**Audio pipeline** — browser side:

```typescript
// useVoiceAgent.ts
// Using AudioWorklet for low-latency PCM16 capture + playback

const audioContext = new AudioContext({ sampleRate: 24000 });
await audioContext.audioWorklet.addModule('/audio-worklet.js');

// CAPTURE
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
const captureNode = new AudioWorkletNode(audioContext, 'pcm16-capture');
source.connect(captureNode);

captureNode.port.onmessage = (ev) => {
  // ev.data is a Float32Array frame, convert to PCM16 base64
  const pcm16 = float32ToPCM16(ev.data);
  const b64 = btoa(String.fromCharCode(...pcm16));
  ws.send(JSON.stringify({ type: "audio_input", data_b64: b64 }));
};

// PLAYBACK
const playbackNode = new AudioWorkletNode(audioContext, 'pcm16-playback');
playbackNode.connect(audioContext.destination);

ws.onmessage = (ev) => {
  const event = JSON.parse(ev.data);
  if (event.type === "audio_output") {
    const pcm = base64ToPCM16(event.data_b64);
    playbackNode.port.postMessage({ type: "enqueue", data: pcm });
  }
  if (event.type === "interrupt") {
    playbackNode.port.postMessage({ type: "flush" });  // clear audio buffer
  }
};
```

### 4.3 Skills for voice-specific behaviors

The existing `SkillsToolset` pattern can host **voice-specific skills**. For example, `src/noname/.claude/skills/voice-guidance/SKILL.md` could include rules like:

- "When running as a voice session, keep initial responses under 3 sentences. Users cannot scroll spoken text."
- "Do not read out table cells — instead say 'I've filtered the table, you can see the results above.'"
- "If a tool is taking longer than 2 seconds, emit a short filler message."

Voice mode is passed through `AgentDeps` — add a field:

```python
@dataclass
class AgentDeps:
    session_id: str
    user_id: str | None = None
    action_broker: "ActionBroker | None" = None
    db_session: "AsyncSession | None" = None
    voice_mode: bool = False  # NEW
```

And in the `/chat` endpoint, accept an optional `voice_mode: bool` field on the request, which gets passed to `AgentDeps`. The system prompt can conditionally include voice-specific instructions.

---

## 5. Voice Provider Decision

### 5.1 Options

| Provider | Model | Pros | Cons |
|---|---|---|---|
| **OpenAI Realtime** | `gpt-4o-realtime-preview-2024-12-17` | Proven in FinIQ, mature API, documented widely, low-latency, server VAD, Whisper transcription | Requires OpenAI API key; Mars prefers Google long-term |
| **Gemini Live** (Google) | `gemini-2.0-flash-live-001` or newer | Aligns with Mars's preferred Google stack; unified platform if other Google Cloud services used | Smaller community, less documented tooling, separate credential/billing, API still evolving |

### 5.2 Recommendation

**Start with OpenAI Realtime for Phase 1** (1-week delivery). Same shape as FinIQ, least risk.

Phase 2: evaluate **Gemini Live** with the same `voice-server` shell. The WebSocket protocol is different but the architecture (voice-server as proxy, Noname as agent) stays identical. Migration would involve swapping `realtime-client.ts` for a `gemini-live-client.ts`; everything else unchanged.

For Mars deployment specifically, the Gemini Live path is preferred per the broader Mars Google preference, but that's a later phase.

### 5.3 Azure OpenAI Foundry wrinkle

Noname already uses Anthropic Claude via `AnthropicModelSettings`. Mars deployments may later require Azure OpenAI Foundry for compliance. When that happens, the voice-server needs to point at the Azure OpenAI Realtime endpoint:

```typescript
// voice-server env
FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com
FOUNDRY_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
// Constructs:
const realtimeUrl = FOUNDRY_ENDPOINT
  ? `wss://${FOUNDRY_ENDPOINT.replace(/^https?:\/\//, "")}/openai/realtime?api-version=2024-10-01-preview&deployment=${FOUNDRY_REALTIME_DEPLOYMENT}`
  : "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
```

FinIQ's voice-server already does this dual-endpoint detection; pattern is lifted as-is.

---

## 6. Streaming, Turn-taking, and Latency

### 6.1 Latency budget

Worst case (complex query with tool calls):
- User finishes speaking → 0.8s silence (server VAD `silence_duration_ms`)
- STT transcription → ~0.5s
- Noname agent run: LLM reasoning + tool calls → **1–10s** (dominated by LLM + tool latency)
- First text token arrival → start TTS pre-buffer
- TTS audio starts → ~0.5s first-byte
- **User perceives response latency: 2.5–12 seconds**

The LLM+tools middle is the swingy part. For navigation queries (1 tool call, no data fetch), it's ~1.5s. For forecasting queries (multiple tool calls + chart data), it's 5–10s.

### 6.2 Mitigations

1. **Filler narration during tool calls.** When `tool_call_start` fires for a long-running tool (forecasting, data catalog search), voice-server injects short audio narration: *"Looking that up now..."*. This keeps the user from feeling the silence. Tool-to-narration mapping lives in voice-server:

   ```typescript
   const TOOL_NARRATIONS: Record<string, string> = {
     "search_data_catalog": "Searching the catalog.",
     "fetch_timeseries": "Pulling the data.",
     "generate_forecast": "Running the forecast model, this takes a few seconds.",
     "get_entity_mappings": "Checking projects.",
     // ... etc
   };
   ```

2. **Stream TTS as text arrives** (stretch goal). Instead of waiting for `done`, submit text chunks to OpenAI Realtime's `response.create` as they arrive. OpenAI Realtime supports streaming input for TTS. Risk: if Noname revises text mid-stream, TTS plays before revision. Noname's current SSE has no revision so this is safe. Cuts perceived latency by 1–3s on long responses.

3. **Skip TTS for tool-only turns.** If Noname's response is purely dashboard actions (e.g., "navigate to markets") without meaningful text, voice-server can skip TTS and just play a short *"Done"* confirmation. Detect by: `done` event arrives with `widget_specs` set and cumulative text is empty or just confirmation phrases.

### 6.3 Interruption handling

When the user starts speaking while Q is still talking:
1. Browser detects mic input above threshold → sends `{ type: "interrupt" }` to voice-server
2. Voice-server cancels current TTS: `openaiWs.send({type:"response.cancel"})`
3. Voice-server flushes its local TTS audio buffer
4. Browser's playback AudioWorklet receives `flush` and clears its buffer
5. New user speech captured and processed normally

OpenAI Realtime supports this via `response.cancel`. The browser needs barge-in detection — simplest is to monitor input gain and trigger interrupt when user speaks during TTS output.

### 6.4 Turn detection

Use **server VAD** (OpenAI's built-in voice activity detection) rather than manual push-to-talk:
- `threshold: 0.5` — energy threshold
- `prefix_padding_ms: 300` — include 300ms before detected speech start
- `silence_duration_ms: 800` — end-of-turn after 800ms silence

These are FinIQ's values and work well. For Dash dashboard context where users might be multitasking, consider adding a push-to-talk mode as user preference (UI toggle) where holding spacebar enables capture. Implementation: browser gates audio frames on a boolean state.

---

## 7. Session and Auth

### 7.1 Session identity binding

Voice sessions and typed chat sessions must share the **same `session_id`**. Users expect voice-asked questions to appear in their chat history and be referenceable in follow-up typed queries. The binding:

1. q-ui-sdk widget already owns a `session_id` (from `ChatHistoryContext`)
2. When user starts voice, widget sends `{ type: "auth", jwt, session_id }` to voice-server
3. Voice-server uses that `session_id` on all `/chat` POSTs during the voice session
4. Noname persists voice-originated messages to the same `ChatSession` row, same `messages` table

Both voice turn and typed turn produce `ChatMessage` rows with identical shape (PydanticAI `ModelMessagesTypeAdapter` serialized JSON).

### 7.2 JWT passthrough

Noname's `/chat` endpoint requires `Depends(get_current_user)`. Voice-server must call `/chat` with a valid JWT. Two options:

**Option A: Proxy user's JWT (recommended for Phase 1)**

- q-ui-sdk sends its JWT to voice-server on connection
- Voice-server attaches `Authorization: Bearer <user_jwt>` to every `/chat` POST
- All actions are attributed to the actual user in Noname's logs and DB

Trade-off: voice-server holds user JWTs in memory during sessions. Mitigate with short session TTL + no logging.

**Option B: Voice-server service account**

- Voice-server uses its own service account JWT
- Actions are attributed to the service account
- Need a way to pass the actual user identity to Noname (e.g., `X-On-Behalf-Of: user@email`)

Option A is simpler; use it unless there's a specific security reason otherwise.

### 7.3 Page context propagation

The q-ui-sdk widget already collects page context (component IDs, AG Grid columnStats, chart IDs) for typed messages. For voice:

1. Widget broadcasts `{ type: "context_update", page_context }` to voice-server whenever the page changes (via the existing `widgeturlchange` event + any context-generator the widget uses today)
2. Voice-server caches the latest context per session
3. On each `/chat` POST, voice-server includes the cached context

This means voice and typed messages arrive at Noname with equivalent context — the agent behaves identically regardless of modality.

---

## 8. Infrastructure and Deployment

### 8.1 Docker

New service in `docker-compose.yaml`:

```yaml
voice-server:
  build:
    context: .
    dockerfile: packages/voice-server/Dockerfile
  ports:
    - "8003:8003"
  environment:
    VOICE_PORT: 8003
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    FOUNDRY_ENDPOINT: ${FOUNDRY_ENDPOINT:-}
    FOUNDRY_REALTIME_DEPLOYMENT: ${FOUNDRY_REALTIME_DEPLOYMENT:-}
    NONAME_API_BASE: http://noname:8001
    JWT_SECRET: ${SECRET_KEY}  # shared with Noname for verification
  depends_on:
    - noname
```

Dockerfile pattern (lifted from FinIQ, which recently fixed Docker Hub caching issues by using public ECR):

```dockerfile
# packages/voice-server/Dockerfile
FROM public.ecr.aws/docker/library/node:22-alpine AS deps
WORKDIR /app
COPY packages/voice-server/package.json packages/voice-server/package-lock.json ./
RUN npm ci --omit=dev

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY packages/voice-server/ ./
EXPOSE 8003
CMD ["node", "dist/server.js"]
```

### 8.2 Kubernetes

Add a `voice-server` deployment to `.helm/quantum-ai/templates/`. Single replica (OpenAI Realtime sessions are sticky per-connection). Scale horizontally only if N+1 replicas can be safely routed via sticky WebSocket load balancing.

### 8.3 Environment variables

`packages/voice-server/.env.template`:

```bash
# Required
VOICE_PORT=8003
OPENAI_API_KEY=sk-proj-...
NONAME_API_BASE=http://localhost:8001
JWT_SECRET=<shared with Noname>

# Optional — use Azure OpenAI Foundry instead of direct OpenAI
# FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com
# FOUNDRY_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
```

### 8.4 Lessons from FinIQ deployment — AVOID THESE TRAPS

From the FinIQ deployment on Azure, one class of bug bit us three times:

**Silent localhost fallback pattern**: 
```typescript
const nextApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
```

This looks defensive but is deadly in production. If the env var isn't set in an environment where localhost doesn't run Noname, the tool call silently fails and returns a generic "API not reachable" string. No log says "you forgot the env var."

**Recommended pattern for voice-server**:

```typescript
function getNonameBase(): string {
  const explicit = process.env.NONAME_API_BASE;
  if (explicit) return explicit;

  // Auto-detect on Azure: WEBSITE_HOSTNAME convention
  const azureHost = process.env.WEBSITE_HOSTNAME;
  if (azureHost && azureHost.includes("-voice")) {
    return `https://${azureHost.replace("-voice", "-noname")}`;
  }

  // In production without either signal, fail loud
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NONAME_API_BASE not set and WEBSITE_HOSTNAME does not match -voice convention. " +
      "Voice-server cannot reach Noname."
    );
  }

  // Only localhost in dev mode
  return "http://localhost:8001";
}
```

Similarly, for the OpenAI Realtime WebSocket URL: fail loud on missing API key in production.

---

## 9. Testing Strategy

### 9.1 Unit tests

- `audio.ts`: PCM16 encode/decode roundtrip
- `noname-client.ts`: SSE event parser (pass sample event strings, verify structured output)
- `session.ts`: state transitions (connected, listening, processing, speaking, interrupted)

### 9.2 Integration tests

- Mock OpenAI Realtime WebSocket: verify voice-server sends session.update with correct params
- Mock Noname `/chat`: verify voice-server POSTs with correct auth and payload
- End-to-end local test: real OpenAI Realtime, real Noname on localhost, assert transcript round-trip

### 9.3 Manual testing in Dash dashboard

Test cases:
1. Speak navigation request → verify Dash page changes
2. Speak grid filter request → verify AG Grid filters apply
3. Speak forecast request with new project → verify widget renders
4. Interrupt Q mid-response → verify TTS stops immediately
5. Voice + typed interleaved in same session → verify chat history preserves order
6. Multiple voice turns in a row → verify server VAD handles turn boundaries
7. Long-running tool (real forecast run) → verify filler narration plays

### 9.4 Edge cases to exercise

- User speaks while assistant is speaking (barge-in)
- Browser tab backgrounded mid-session (audio context suspension)
- Network blip mid-TTS (audio frames dropped)
- JWT expiry mid-session
- Noname returns error event mid-stream

---

## 10. Phased Implementation Plan

### Phase 1 — Working voice, typed-equivalent quality (1 week)

- [ ] `packages/voice-server/` scaffold (Node + TS + ws)
- [ ] OpenAI Realtime WebSocket client (reuse FinIQ patterns)
- [ ] Noname `/chat` SSE client
- [ ] JWT passthrough
- [ ] q-ui-sdk: `VoiceControls` component, `useVoiceAgent` hook
- [ ] AudioWorklet for PCM16 capture + playback
- [ ] Session binding (voice and typed share `session_id`)
- [ ] Page context propagation
- [ ] Docker + docker-compose integration
- [ ] End-to-end smoke test in local Dash dashboard

**Exit criteria**: user can say "navigate to markets page" and Dash navigates. Can say "show me a gold forecast" and widget renders. Typed and voice messages appear in same chat thread.

### Phase 2 — Latency and UX polish (3–5 days, after Phase 1)

- [ ] Filler narration during tool calls
- [ ] Interruption / barge-in handling
- [ ] Streaming TTS (start before `done` event)
- [ ] Visual voice status indicator in widget (listening, thinking, speaking)
- [ ] Voice-mode SKILL.md for Noname (terser responses, don't read tables)
- [ ] Push-to-talk toggle

### Phase 3 — Production hardening (1–2 weeks, before broader rollout)

- [ ] Logging + telemetry (session duration, tool call counts, TTS errors)
- [ ] Rate limiting and quota per user
- [ ] Error recovery (reconnect logic on WebSocket drops)
- [ ] JWT refresh mid-session
- [ ] Multi-worker support (Redis-backed ActionBroker if scaling past 1 Noname worker)
- [ ] E2E tests with Playwright

### Phase 4 — Gemini Live migration (future)

- [ ] Abstract `realtime-client.ts` behind a provider interface
- [ ] Implement `gemini-live-client.ts` alongside OpenAI Realtime
- [ ] Feature flag for per-user / per-env provider selection
- [ ] A/B comparison: latency, transcription accuracy, TTS quality

---

## 11. Open Questions / Decisions Needed

1. **Voice provider**: OpenAI Realtime for Phase 1 (recommended) vs. Gemini Live from start?
2. **Interaction model**: Server VAD (push-to-talk-free, FinIQ-style) vs. push-to-talk (more deliberate, fewer false triggers in noisy office)? Can ship both and let user toggle.
3. **Where does the mic button live in q-ui-sdk**: Modal header, sidebar header, fullscreen toolbar — all three? Or only in fullscreen mode where speech makes most sense?
4. **Voice persistence in DB**: Do voice messages get a modality flag (`"voice"` vs `"text"`) in the `messages` table for analytics? (Trivial to add; useful for later UX decisions.)
5. **Anonymous voice?**: Noname supports anonymous sessions. Should voice require login? (Recommend yes — easier auth story.)
6. **Multi-worker Noname**: ActionBroker is in-process asyncio.Future; doesn't scale past 1 worker. Voice adds coordination load but doesn't change this fundamental. Redis pub/sub ActionBroker is a separate project, applicable to both typed and voice. Don't block Phase 1 on it.
7. **Q's voice personality**: `sage` voice (FinIQ default) or different? Trivial config.

---

## 12. What's Being Reused from FinIQ

Files / patterns that transfer directly:

| FinIQ source | Role | Reuse in Quantum AI |
|---|---|---|
| `src/lib/voice-server.ts` | OpenAI Realtime WebSocket proxy | ~80% — strip the FinIQ-specific tool array, keep session management + audio pipe + SSE client adapted for Noname |
| `src/hooks/use-voice-agent.ts` | React hook for voice session | ~70% — adapt for q-ui-sdk's runtime integration |
| `src/components/voice-bridge.tsx` | Bridge between voice events and chat store | ~50% — conceptually, but replaced by direct `useLocalRuntime` integration in assistant-ui |
| FinIQ audio worklet setup | PCM16 capture + playback | ~95% — direct port |
| FinIQ Dockerfile pattern (public ECR) | Reliable container builds | ~100% — same pattern |

What doesn't transfer:
- FinIQ's tool array — Quantum AI has its own (and bigger) tool surface, but tools live in Noname, not voice-server
- FinIQ's `voice-indicator.tsx` drawer — q-ui-sdk uses `assistant-ui`'s thread directly
- FinIQ's Zustand voice store — replaced by `assistant-ui` runtime + a small voice state context

---

## 13. Summary

**Yes, voice can be added to Noname/Quantum AI in about a week of focused senior engineering work.**

The architecture is cleaner than FinIQ's because Noname's Pydantic AI agent already handles everything interesting (tool orchestration, page context, ActionBroker, widget rendering). Voice-server is a thin I/O proxy: audio ↔ OpenAI Realtime ↔ Noname HTTP.

Key design decision: **voice is NOT a parallel agent**. No tool definitions in voice-server, no OpenAI function calling. Voice-server transcribes user speech, POSTs to Noname exactly like typed input, collects the final text, speaks it back. All the richness (navigation, filtering, forecasting, chart creation) flows through the existing agent → SSE → widget → ActionBroker path unchanged.

Phase 1 delivers working voice; Phase 2 polishes latency; Phase 3 hardens for production; Phase 4 opens the door to Gemini Live for Mars-deployable environments.

Avoid the "silent localhost fallback" pattern that bit FinIQ three times — fail loud or auto-detect from runtime env signals.

---

*References: FinIQ's voice-server implementation at `ale-build/src/lib/voice-server.ts` in the `fin_iq` repo (QDT). Quantum AI codebase at `D:/QuantumAI/` — key files: `src/noname/app/agents/agent.py`, `src/noname/app/api/routes/chat.py`, `src/noname/app/services/action_broker.py`, `src/noname/app/tools/dashboard.py`, `src/noname/app/agents/definitions/q_data.py`, `packages/q-ui-sdk/src/Widget.tsx`.*
