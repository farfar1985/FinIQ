/**
 * FinIQ Voice Agent — OpenAI Realtime API Proxy
 *
 * Server-side WebSocket proxy that connects the browser to OpenAI's Realtime API.
 * Handles function calling (processQuery, CI, job submission) mid-conversation.
 *
 * Architecture:
 *   Browser (mic audio) → our WebSocket → OpenAI Realtime API
 *   OpenAI Realtime API → function calls → processQuery() → results back to OpenAI
 *   OpenAI Realtime API → voice response → our WebSocket → Browser (speaker)
 */

import { WebSocket as WS } from "ws";
import config from "./config.mjs";
import { processQuery } from "../agents/finiq-agent.mjs";

const REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

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

// Function tool definitions for the Realtime API
const TOOLS = [
  {
    type: "function",
    name: "query_financial_data",
    description: "Query Mars internal financial data. Use this for KPIs, PES summaries, budget variance, trends, rankings, or any question about Mars's own performance. Returns narrative summary, structured data, and chart configuration.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The financial question in natural language, e.g., 'Show organic growth for Mars Inc' or 'Budget variance for Pet Care'",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_competitor_analysis",
    description: "Get competitive intelligence using real FMP financial data. Use for competitor comparisons, benchmarking, SWOT analysis, or questions about Nestle, Mondelez, Hershey, Colgate, General Mills, Kellanova, Smucker, Freshpet, IDEXX.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The competitive intelligence question, e.g., 'Compare Nestle vs Mondelez margins' or 'Who are Mars Pet Food competitors?'",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "submit_job",
    description: "Submit a query as a tracked job to the Job Board for async processing by a specialized agent. Use when the user asks to 'run a report', 'generate something for later', or 'assign an agent'.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The job query to submit",
        },
        priority: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Job priority level",
        },
      },
      required: ["query"],
    },
  },
];

/**
 * Handle a new voice agent WebSocket connection from the browser.
 * Creates a proxy connection to OpenAI Realtime API.
 */
export function handleVoiceConnection(clientWs) {
  if (!config.openaiApiKey) {
    clientWs.send(JSON.stringify({
      type: "error",
      message: "OpenAI API key not configured. Set OPENAI_API_KEY in .env",
    }));
    clientWs.close();
    return;
  }

  console.log("[voice] New voice agent session starting...");

  // Connect to OpenAI Realtime API
  const openaiWs = new WS(REALTIME_URL, {
    headers: {
      "Authorization": `Bearer ${config.openaiApiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  let sessionReady = false;

  // ============================================================
  // OpenAI → Client (relay events)
  // ============================================================

  openaiWs.on("open", () => {
    console.log("[voice] Connected to OpenAI Realtime API");

    // Configure the session
    openaiWs.send(JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: SYSTEM_INSTRUCTIONS,
        voice: "sage",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
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
    }));
  });

  openaiWs.on("message", async (data) => {
    try {
      const event = JSON.parse(data.toString());

      switch (event.type) {
        case "session.created":
          sessionReady = true;
          console.log("[voice] Session created, voice:", event.session?.voice);
          clientWs.send(JSON.stringify({ type: "session.ready" }));
          break;

        case "session.updated":
          console.log("[voice] Session configured");
          break;

        case "response.audio.delta":
          // Stream audio chunk to browser
          clientWs.send(JSON.stringify({
            type: "audio",
            delta: event.delta,
          }));
          break;

        case "response.audio_transcript.delta":
          // Stream agent transcript to browser
          clientWs.send(JSON.stringify({
            type: "transcript.agent",
            delta: event.delta,
          }));
          break;

        case "response.audio_transcript.done":
          clientWs.send(JSON.stringify({
            type: "transcript.agent.done",
            transcript: event.transcript,
          }));
          break;

        case "conversation.item.input_audio_transcription.completed":
          // User's speech transcribed
          clientWs.send(JSON.stringify({
            type: "transcript.user",
            transcript: event.transcript,
          }));
          break;

        case "response.function_call_arguments.done":
          // OpenAI wants to call one of our functions
          await handleFunctionCall(event, openaiWs, clientWs);
          break;

        case "response.done":
          clientWs.send(JSON.stringify({ type: "response.done" }));
          break;

        case "input_audio_buffer.speech_started":
          clientWs.send(JSON.stringify({ type: "speech.started" }));
          break;

        case "input_audio_buffer.speech_stopped":
          clientWs.send(JSON.stringify({ type: "speech.stopped" }));
          break;

        case "error":
          console.error("[voice] OpenAI error:", event.error);
          clientWs.send(JSON.stringify({
            type: "error",
            message: event.error?.message || "OpenAI Realtime API error",
          }));
          break;

        default:
          // Forward other events for debugging
          break;
      }
    } catch (err) {
      console.error("[voice] Error processing OpenAI event:", err.message);
    }
  });

  openaiWs.on("close", (code, reason) => {
    console.log(`[voice] OpenAI connection closed: ${code} ${reason}`);
    if (clientWs.readyState === WS.OPEN) {
      clientWs.send(JSON.stringify({ type: "session.ended", reason: "OpenAI disconnected" }));
      clientWs.close();
    }
  });

  openaiWs.on("error", (err) => {
    console.error("[voice] OpenAI WebSocket error:", err.message);
  });

  // ============================================================
  // Client → OpenAI (relay audio + commands)
  // ============================================================

  clientWs.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "audio":
          // Relay audio from browser to OpenAI
          if (sessionReady && openaiWs.readyState === WS.OPEN) {
            openaiWs.send(JSON.stringify({
              type: "input_audio_buffer.append",
              audio: message.audio,
            }));
          }
          break;

        case "text":
          // User sent text instead of voice
          if (sessionReady && openaiWs.readyState === WS.OPEN) {
            openaiWs.send(JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text: message.text }],
              },
            }));
            openaiWs.send(JSON.stringify({ type: "response.create" }));
          }
          break;

        case "interrupt":
          // User interrupted — cancel current response
          if (openaiWs.readyState === WS.OPEN) {
            openaiWs.send(JSON.stringify({ type: "response.cancel" }));
          }
          break;

        default:
          break;
      }
    } catch {
      // Binary audio data — relay directly
      if (sessionReady && openaiWs.readyState === WS.OPEN) {
        // This shouldn't happen with our JSON protocol, but handle gracefully
      }
    }
  });

  clientWs.on("close", () => {
    console.log("[voice] Client disconnected, closing OpenAI session");
    if (openaiWs.readyState === WS.OPEN) {
      openaiWs.close();
    }
  });
}

// ============================================================
// Function call handler
// ============================================================

async function handleFunctionCall(event, openaiWs, clientWs) {
  const { call_id, name, arguments: argsStr } = event;
  console.log(`[voice] Function call: ${name}`);

  let args;
  try {
    args = JSON.parse(argsStr);
  } catch {
    args = {};
  }

  // Notify client that we're fetching data
  clientWs.send(JSON.stringify({
    type: "function.calling",
    name,
    args,
  }));

  let result;
  try {
    switch (name) {
      case "query_financial_data": {
        const queryResult = await processQuery(args.query, { entity: args.entity || null });
        result = {
          summary: queryResult.response,
          data_available: queryResult.data ? queryResult.data.length : 0,
          sources: queryResult.sources,
        };
        // Send chart/data to client for visual display
        if (queryResult.chartConfig || queryResult.data) {
          clientWs.send(JSON.stringify({
            type: "data.display",
            chartConfig: queryResult.chartConfig,
            data: queryResult.data?.slice(0, 10),
            sources: queryResult.sources,
          }));
        }
        break;
      }

      case "get_competitor_analysis": {
        const ciResult = await processQuery(args.query, {});
        result = {
          summary: ciResult.response,
          data_available: ciResult.data ? ciResult.data.length : 0,
        };
        if (ciResult.chartConfig || ciResult.data) {
          clientWs.send(JSON.stringify({
            type: "data.display",
            chartConfig: ciResult.chartConfig,
            data: ciResult.data?.slice(0, 10),
          }));
        }
        break;
      }

      case "submit_job": {
        // Import job board dynamically to avoid circular deps
        const { default: jobBoard } = await import("./job-board.mjs");
        const job = jobBoard.submitJob(args.query, args.priority || "medium");
        result = {
          job_id: job.id,
          status: job.status,
          agent: job.agent_name,
          message: `Job submitted successfully. ${job.agent_name} will process "${args.query}" with ${args.priority || "medium"} priority.`,
        };
        clientWs.send(JSON.stringify({
          type: "job.submitted",
          job,
        }));
        break;
      }

      default:
        result = { error: `Unknown function: ${name}` };
    }
  } catch (err) {
    console.error(`[voice] Function ${name} error:`, err.message);
    result = { error: err.message };
  }

  // Send function result back to OpenAI so it can narrate
  openaiWs.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id,
      output: JSON.stringify(result),
    },
  }));

  // Trigger OpenAI to continue responding
  openaiWs.send(JSON.stringify({ type: "response.create" }));

  clientWs.send(JSON.stringify({
    type: "function.done",
    name,
  }));
}
