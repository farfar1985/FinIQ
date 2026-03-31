/**
 * FinIQ Voice Agent — OpenAI Realtime API WebSocket Proxy
 *
 * Standalone server that proxies audio between the browser and OpenAI's
 * Realtime API. Runs alongside Next.js on a separate port (default 3002).
 *
 * Start with: npx tsx src/lib/voice-server.ts
 *
 * Architecture:
 *   Browser (mic audio) --> this server (ws://localhost:3002) --> OpenAI Realtime API
 *   OpenAI Realtime API --> function calls --> tool handlers --> results back to OpenAI
 *   OpenAI Realtime API --> voice + transcript --> this server --> Browser (speaker)
 */

import { WebSocketServer, WebSocket } from "ws";

const VOICE_PORT = parseInt(process.env.VOICE_PORT || "3002", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const REALTIME_URL =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

const SYSTEM_INSTRUCTIONS = `You are FinIQ, a conversational financial analyst for Mars, Incorporated. You help Mars executives and analysts understand their financial performance by querying real data and explaining it naturally.

Your personality:
- Professional but warm, like a trusted senior analyst
- Concise — give the key insight first, then supporting details
- Use specific numbers from the data, not vague statements
- When you get data back from a function, summarize the KEY findings conversationally
- Don't read tables verbatim — interpret them and highlight what matters
- If something is improving or declining, say so directly with the trend

You have access to:
1. Mars financial data (173 entities, 36 accounts, 6 KPIs, budget variance)
2. Competitive intelligence (10 competitors via FMP API — Nestle, Mondelez, Hershey, etc.)
3. Job Board (submit queries for async processing)

Available entities include: Mars Inc, Pet Care, Mars Wrigley, Royal Canin, and 169 more.

IMPORTANT language rules:
- NEVER say "replace" when describing FinIQ — use "augment" or "consolidate"
- NEVER say "fragmented" — use "dispersed" or "separate"
- Forecasts must be labeled as "projections"`;

// Tool definitions for the Realtime API
const TOOLS = [
  {
    type: "function" as const,
    name: "query_financial_data",
    description:
      "Query Mars internal financial data. Use this for KPIs, PES summaries, budget variance, trends, rankings, or any question about Mars's own performance.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description:
            "The financial question in natural language, e.g., 'Show organic growth for Mars Inc'",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function" as const,
    name: "get_competitor_analysis",
    description:
      "Get competitive intelligence using real FMP financial data. Use for competitor comparisons, benchmarking, SWOT analysis, or questions about Nestle, Mondelez, Hershey, Colgate, General Mills, Kellanova, Smucker, Freshpet, IDEXX.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description:
            "The competitive intelligence question, e.g., 'Compare Nestle vs Mondelez margins'",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function" as const,
    name: "submit_job",
    description:
      "Submit a query as a tracked job to the Job Board for async processing. Use when the user asks to 'run a report', 'generate something for later', or 'assign an agent'.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "The job query to submit",
        },
        priority: {
          type: "string" as const,
          enum: ["critical", "high", "medium", "low"],
          description: "Job priority level",
        },
      },
      required: ["query"],
    },
  },
];

// ================================================================
// Tool execution stubs
// ================================================================

async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case "query_financial_data": {
      // In the merged app, this would call the real NL query pipeline.
      // For now, call the Next.js API route if available.
      const nextApiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      try {
        const res = await fetch(`${nextApiBase}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: args.query, entity: args.entity }),
        });
        if (res.ok) {
          return await res.json();
        }
        return {
          summary: `Query received: "${args.query}". The analytics API returned status ${res.status}. Please try again.`,
          error: true,
        };
      } catch {
        return {
          summary: `Query received: "${args.query}". The analytics API is not reachable. Make sure the Next.js app is running on port 3000.`,
          error: true,
        };
      }
    }

    case "get_competitor_analysis": {
      const nextApiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      try {
        const res = await fetch(`${nextApiBase}/api/competitive/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: args.query }),
        });
        if (res.ok) {
          return await res.json();
        }
        return {
          summary: `CI query received: "${args.query}". API returned status ${res.status}.`,
          error: true,
        };
      } catch {
        return {
          summary: `CI query received: "${args.query}". The CI API is not reachable.`,
          error: true,
        };
      }
    }

    case "submit_job": {
      const nextApiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      try {
        const res = await fetch(`${nextApiBase}/api/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: args.query,
            priority: args.priority || "medium",
          }),
        });
        if (res.ok) {
          const job = await res.json();
          return {
            job_id: job.id,
            status: job.status,
            message: `Job submitted successfully with ${args.priority || "medium"} priority.`,
          };
        }
        return { error: `Job API returned status ${res.status}` };
      } catch {
        return {
          message: `Job submitted: "${args.query}" (${args.priority || "medium"} priority). Job Board API is not reachable — job was not persisted.`,
          error: true,
        };
      }
    }

    default:
      return { error: `Unknown function: ${name}` };
  }
}

// ================================================================
// Handle a single voice client connection
// ================================================================

function handleVoiceConnection(clientWs: WebSocket) {
  if (!OPENAI_API_KEY) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        message:
          "OpenAI API key not configured. Set OPENAI_API_KEY in your environment.",
      })
    );
    clientWs.close();
    return;
  }

  console.log("[voice] New voice session starting...");

  // Connect to OpenAI Realtime API
  const openaiWs = new WebSocket(REALTIME_URL, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  let sessionReady = false;

  // ---- OpenAI --> Client ----

  openaiWs.on("open", () => {
    console.log("[voice] Connected to OpenAI Realtime API");

    openaiWs.send(
      JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: SYSTEM_INSTRUCTIONS,
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
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.7,
        },
      })
    );
  });

  openaiWs.on("message", async (data: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const event = JSON.parse(data.toString());

      switch (event.type) {
        case "session.created":
          sessionReady = true;
          console.log("[voice] Session created, voice:", event.session?.voice);
          safeSend(clientWs, { type: "session.ready" });
          break;

        case "session.updated":
          console.log("[voice] Session configured");
          break;

        case "response.audio.delta":
          safeSend(clientWs, { type: "audio", delta: event.delta });
          break;

        case "response.audio_transcript.delta":
          safeSend(clientWs, {
            type: "transcript.agent",
            delta: event.delta,
          });
          break;

        case "response.audio_transcript.done":
          safeSend(clientWs, {
            type: "transcript.agent.done",
            transcript: event.transcript,
          });
          break;

        case "conversation.item.input_audio_transcription.completed":
          safeSend(clientWs, {
            type: "transcript.user",
            transcript: event.transcript,
          });
          break;

        case "response.function_call_arguments.done":
          await handleFunctionCall(event, openaiWs, clientWs);
          break;

        case "response.done":
          safeSend(clientWs, { type: "response.done" });
          break;

        case "input_audio_buffer.speech_started":
          safeSend(clientWs, { type: "speech.started" });
          break;

        case "input_audio_buffer.speech_stopped":
          safeSend(clientWs, { type: "speech.stopped" });
          break;

        case "error":
          console.error("[voice] OpenAI error:", event.error);
          safeSend(clientWs, {
            type: "error",
            message: event.error?.message || "OpenAI Realtime API error",
          });
          break;

        default:
          break;
      }
    } catch (err) {
      console.error(
        "[voice] Error processing OpenAI event:",
        (err as Error).message
      );
    }
  });

  openaiWs.on("close", (code: number, reason: Buffer) => {
    console.log(`[voice] OpenAI closed: ${code} ${reason.toString()}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      safeSend(clientWs, {
        type: "session.ended",
        reason: "OpenAI disconnected",
      });
      clientWs.close();
    }
  });

  openaiWs.on("error", (err: Error) => {
    console.error("[voice] OpenAI WebSocket error:", err.message);
  });

  // ---- Client --> OpenAI ----

  clientWs.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "audio":
          if (sessionReady && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: message.audio,
              })
            );
          }
          break;

        case "text":
          if (sessionReady && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: message.text }],
                },
              })
            );
            openaiWs.send(JSON.stringify({ type: "response.create" }));
          }
          break;

        case "interrupt":
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({ type: "response.cancel" }));
          }
          break;

        default:
          break;
      }
    } catch {
      // Ignore non-JSON messages
    }
  });

  clientWs.on("close", () => {
    console.log("[voice] Client disconnected, closing OpenAI session");
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
}

// ================================================================
// Function call handler
// ================================================================

async function handleFunctionCall(
  event: { call_id: string; name: string; arguments: string },
  openaiWs: WebSocket,
  clientWs: WebSocket
) {
  const { call_id, name, arguments: argsStr } = event;
  console.log(`[voice] Function call: ${name}`);

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr);
  } catch {
    args = {};
  }

  // Notify client
  safeSend(clientWs, { type: "function.calling", name, args });

  let result: Record<string, unknown>;
  try {
    result = await executeToolCall(name, args);

    // Forward any chart/data to the client for visual display
    if (result.chartConfig || result.data) {
      safeSend(clientWs, {
        type: "data.display",
        chartConfig: result.chartConfig || null,
        data: Array.isArray(result.data)
          ? (result.data as unknown[]).slice(0, 10)
          : null,
        sources: result.sources || null,
      });
    }
  } catch (err) {
    console.error(`[voice] Function ${name} error:`, (err as Error).message);
    result = { error: (err as Error).message };
  }

  // Send result back to OpenAI so it can narrate the answer
  openaiWs.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id,
        output: JSON.stringify(result),
      },
    })
  );

  // Trigger OpenAI to continue responding
  openaiWs.send(JSON.stringify({ type: "response.create" }));

  safeSend(clientWs, { type: "function.done", name });
}

// ================================================================
// Helpers
// ================================================================

function safeSend(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ================================================================
// Start server
// ================================================================

const wss = new WebSocketServer({ port: VOICE_PORT });

wss.on("connection", (ws) => {
  handleVoiceConnection(ws);
});

wss.on("listening", () => {
  console.log(`[voice] FinIQ Voice Agent server listening on ws://localhost:${VOICE_PORT}`);
  console.log("[voice] Waiting for client connections...");
});

wss.on("error", (err: Error) => {
  console.error("[voice] Server error:", err.message);
  process.exit(1);
});
