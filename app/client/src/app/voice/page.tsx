"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, PhoneOff, Loader2, BarChart3, Database } from "lucide-react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import type { ChartConfig } from "@/types";

// ============================================================
// Types
// ============================================================

interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

interface DataDisplay {
  chartConfig?: ChartConfig | null;
  data?: Record<string, unknown>[] | null;
  sources?: { table: string; rowCount: number }[];
}

type SessionStatus = "idle" | "connecting" | "ready" | "listening" | "thinking" | "speaking" | "error";

// ============================================================
// Audio helpers
// ============================================================

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ============================================================
// Voice Agent Page
// ============================================================

export default function VoiceAgentPage() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentAgentText, setCurrentAgentText] = useState("");
  const [dataDisplays, setDataDisplays] = useState<DataDisplay[]>([]);
  const [functionCalling, setFunctionCalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentAgentText]);

  // ============================================================
  // Audio playback (PCM16 from OpenAI)
  // ============================================================

  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = audioContextRef.current;
    if (!ctx) { isPlayingRef.current = false; return; }

    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift()!;
      const int16 = new Int16Array(pcmData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 0x8000;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
    }

    isPlayingRef.current = false;
  }, []);

  // ============================================================
  // Start voice session
  // ============================================================

  const startSession = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setCurrentAgentText("");
    setDataDisplays([]);
    audioQueueRef.current = [];

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Connect to our server's voice WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//localhost:3001/voice-ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[voice] Connected to server");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (err) {
          console.error("[voice] Parse error:", err);
        }
      };

      ws.onclose = () => {
        console.log("[voice] Disconnected");
        stopSession();
      };

      ws.onerror = () => {
        setError("Connection failed. Make sure the server is running.");
        setStatus("error");
      };

      // Set up audio capture once WebSocket is ready
      ws.addEventListener("open", () => {
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const pcm16 = floatTo16BitPCM(float32);
          const base64 = arrayBufferToBase64(pcm16);

          ws.send(JSON.stringify({ type: "audio", audio: base64 }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start voice session");
      setStatus("error");
    }
  }, []);

  // ============================================================
  // Handle messages from server
  // ============================================================

  const handleServerMessage = useCallback((msg: Record<string, unknown>) => {
    switch (msg.type) {
      case "session.ready":
        setStatus("ready");
        // Auto-start listening
        setTimeout(() => setStatus("listening"), 500);
        break;

      case "audio":
        // Queue audio for playback
        setStatus("speaking");
        const audioData = base64ToArrayBuffer(msg.delta as string);
        audioQueueRef.current.push(audioData);
        playNextAudio();
        break;

      case "transcript.user":
        setTranscript((prev) => [
          ...prev,
          { role: "user", text: msg.transcript as string, timestamp: new Date() },
        ]);
        setStatus("thinking");
        break;

      case "transcript.agent":
        setCurrentAgentText((prev) => prev + (msg.delta as string));
        break;

      case "transcript.agent.done":
        setTranscript((prev) => [
          ...prev,
          { role: "agent", text: msg.transcript as string, timestamp: new Date() },
        ]);
        setCurrentAgentText("");
        break;

      case "speech.started":
        setStatus("listening");
        // Interrupt any playing audio
        audioQueueRef.current = [];
        break;

      case "speech.stopped":
        setStatus("thinking");
        break;

      case "function.calling":
        setFunctionCalling(msg.name as string);
        setStatus("thinking");
        break;

      case "function.done":
        setFunctionCalling(null);
        break;

      case "data.display":
        setDataDisplays((prev) => [
          ...prev,
          {
            chartConfig: msg.chartConfig as ChartConfig | null,
            data: msg.data as Record<string, unknown>[] | null,
            sources: msg.sources as { table: string; rowCount: number }[],
          },
        ]);
        break;

      case "response.done":
        setStatus("listening");
        break;

      case "session.ended":
        setStatus("idle");
        break;

      case "error":
        setError(msg.message as string);
        setStatus("error");
        break;
    }
  }, [playNextAudio]);

  // ============================================================
  // Stop session
  // ============================================================

  const stopSession = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Clean up audio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus("idle");
    setFunctionCalling(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  // ============================================================
  // Render
  // ============================================================

  const statusLabels: Record<SessionStatus, string> = {
    idle: "Ready to start",
    connecting: "Connecting...",
    ready: "Connected — start speaking",
    listening: "Listening...",
    thinking: "Processing...",
    speaking: "Speaking...",
    error: "Error",
  };

  const statusColors: Record<SessionStatus, string> = {
    idle: "text-muted-foreground",
    connecting: "text-warning",
    ready: "text-positive",
    listening: "text-positive",
    thinking: "text-primary",
    speaking: "text-primary",
    error: "text-negative",
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-var(--ticker-height)-2rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium">Voice Agent</h1>
          <p className={`text-xs ${statusColors[status]}`}>{statusLabels[status]}</p>
        </div>
        {functionCalling && (
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-xs text-primary">
              {functionCalling === "query_financial_data" ? "Querying Mars data..." :
               functionCalling === "get_competitor_analysis" ? "Analyzing competitors..." :
               "Submitting job..."}
            </span>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Transcript panel */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
          {transcript.length === 0 && status === "idle" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Mic className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Click the microphone to start a conversation
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Try: &quot;What&apos;s working well for Mars right now?&quot;
              </p>
            </div>
          )}

          {transcript.map((entry, i) => (
            <div
              key={i}
              className={`mb-3 ${entry.role === "user" ? "text-right" : ""}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {entry.role === "user" ? "You" : "FinIQ Agent"}
              </span>
              <div
                className={`mt-1 inline-block max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                  entry.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))}

          {/* Agent currently speaking */}
          {currentAgentText && (
            <div className="mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                FinIQ Agent
              </span>
              <div className="mt-1 inline-block max-w-[85%] rounded-lg bg-secondary px-4 py-2 text-sm">
                {currentAgentText}
                <span className="ml-1 animate-pulse text-primary">●</span>
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Data panel (shows charts/data when agent pulls them) */}
        {dataDisplays.length > 0 && (
          <div className="w-[400px] shrink-0 overflow-y-auto space-y-3">
            {dataDisplays.map((display, i) => (
              <div key={i} className="space-y-2">
                {display.chartConfig && (
                  <ChartRenderer config={display.chartConfig} />
                )}
                {display.sources && display.sources.length > 0 && (
                  <div className="flex items-center gap-2 px-2">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {display.sources.map((s) => `${s.table} (${s.rowCount} rows)`).join(" · ")}
                    </span>
                  </div>
                )}
                {display.data && display.data.length > 0 && (
                  <div className="rounded border border-border bg-card p-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      {display.data.length} data points loaded
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {/* Mic button */}
        {status === "idle" || status === "error" ? (
          <button
            onClick={startSession}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="Start voice conversation"
          >
            <Mic className="h-7 w-7" />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            {/* Pulsing mic indicator */}
            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${
              status === "listening"
                ? "bg-positive shadow-lg shadow-positive/20"
                : status === "speaking"
                ? "bg-primary shadow-lg shadow-primary/20"
                : "bg-secondary"
            }`}>
              {status === "listening" && (
                <div className="absolute inset-0 animate-ping rounded-full bg-positive/30" />
              )}
              {status === "listening" ? (
                <Mic className="relative h-7 w-7 text-white" />
              ) : status === "thinking" ? (
                <Loader2 className="h-7 w-7 animate-spin text-foreground" />
              ) : (
                <Mic className="h-7 w-7 text-primary-foreground" />
              )}
            </div>

            {/* End session button */}
            <button
              onClick={stopSession}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-negative text-white shadow-md transition-transform hover:scale-105"
              title="End session"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Status text */}
        <p className="text-xs text-muted-foreground">
          {status === "idle" && "Click to start a conversation with FinIQ"}
          {status === "connecting" && "Setting up voice connection..."}
          {status === "listening" && "Speak your question — I'm listening"}
          {status === "thinking" && (functionCalling ? "Looking up the data..." : "Thinking...")}
          {status === "speaking" && "Speaking..."}
        </p>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-negative/30 bg-negative/10 px-4 py-2 text-xs text-negative">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
