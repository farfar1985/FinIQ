"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

type ConnectionState = "disconnected" | "connecting" | "connected";

interface Transcript {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

function getVoiceWsUrl(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname || "localhost";
  const port = process.env.NEXT_PUBLIC_VOICE_PORT || "3002";
  return `ws://${host}:${port}`;
}

export default function VoicePage() {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<"user" | "assistant" | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcripts]);

  const addTranscript = useCallback((role: "user" | "assistant", text: string) => {
    setTranscripts((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role, text, timestamp: Date.now() },
    ]);
  }, []);

  const connect = useCallback(async () => {
    if (state !== "disconnected") return;
    setState("connecting");

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 24000, channelCount: 1 } });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 24000 });
      // Resume AudioContext (browsers require user gesture)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      // Connect to voice WebSocket server
      const ws = new WebSocket(getVoiceWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setState("connected");
        addTranscript("assistant", "Connected. How can I help you with Mars financial data?");

        // Stream mic audio to server
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        let audioChunkCount = 0;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || isMuted) return;
          const pcm = e.inputBuffer.getChannelData(0);
          audioChunkCount++;
          if (audioChunkCount % 50 === 1) {
            console.log(`[voice] Audio chunk #${audioChunkCount}, max amplitude: ${Math.max(...Array.from(pcm).map(Math.abs)).toFixed(4)}`);
          }
          // Convert Float32 → Int16 PCM → base64
          const int16 = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
          }
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
        };

        source.connect(processor);
        // Connect to destination is required for ScriptProcessor to fire,
        // but we use a silent gain node to prevent mic audio playing through speakers
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
      };

      // Audio playback with sequential scheduling to avoid overlapping chunks
      let nextPlayTime = 0;
      const playAudioChunk = (b64: string) => {
        try {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
          const buffer = audioCtx.createBuffer(1, float32.length, 24000);
          buffer.getChannelData(0).set(float32);
          const src = audioCtx.createBufferSource();
          src.buffer = buffer;
          src.connect(audioCtx.destination);
          // Schedule sequentially — each chunk plays after the previous one ends
          const now = audioCtx.currentTime;
          const startAt = Math.max(now, nextPlayTime);
          src.start(startAt);
          nextPlayTime = startAt + buffer.duration;
        } catch {
          // ignore decode errors
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Server remaps OpenAI event types — match both server and raw formats
          if ((msg.type === "transcript.agent.done" || msg.type === "response.audio_transcript.done") && msg.transcript) {
            addTranscript("assistant", msg.transcript);
            setCurrentSpeaker(null);
          } else if ((msg.type === "transcript.user" || msg.type === "conversation.item.input_audio_transcription.completed") && msg.transcript) {
            addTranscript("user", msg.transcript);
          } else if (msg.type === "response.created") {
            // New response starting — reset audio queue to avoid stale scheduling
            nextPlayTime = 0;
          } else if (msg.type === "audio" || msg.type === "response.audio.delta") {
            setCurrentSpeaker("assistant");
            // Play the audio delta
            const audioData = msg.delta || msg.audio;
            if (audioData) playAudioChunk(audioData);
          } else if (msg.type === "input_audio_buffer.speech_started") {
            setCurrentSpeaker("user");
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            setCurrentSpeaker(null);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setState("disconnected");
        setCurrentSpeaker(null);
      };

      ws.onerror = () => {
        setState("disconnected");
        addTranscript("assistant", "Connection failed. Make sure the voice server is running on port 3002.");
      };
    } catch (err) {
      setState("disconnected");
      addTranscript("assistant", `Microphone error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [state, isMuted, addTranscript]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    wsRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    setState("disconnected");
    setCurrentSpeaker(null);
  }, []);

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col gap-4 p-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Voice Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Talk to FinIQ — ask about Mars financials, competitor benchmarks, or submit jobs
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              state === "connected" ? "bg-positive animate-pulse" : state === "connecting" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
            )}
          />
          <span className="text-xs text-muted-foreground capitalize">{state}</span>
          {currentSpeaker && (
            <span className="text-xs text-primary flex items-center gap-1">
              <Volume2 size={12} className="animate-pulse" />
              {currentSpeaker === "user" ? "Listening..." : "Speaking..."}
            </span>
          )}
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3">
          {transcripts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Press the call button to start a conversation
            </div>
          ) : (
            transcripts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  t.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {t.text}
              </div>
            ))
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-4">
          {state === "disconnected" ? (
            <button
              onClick={connect}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-positive text-white shadow-lg hover:bg-positive/90 transition-colors"
              title="Start call"
            >
              <Phone size={24} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full shadow transition-colors",
                  isMuted ? "bg-negative text-white" : "bg-muted text-foreground hover:bg-muted/80"
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                onClick={disconnect}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-negative text-white shadow-lg hover:bg-negative/90 transition-colors"
                title="End call"
              >
                <PhoneOff size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
