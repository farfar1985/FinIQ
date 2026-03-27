"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Loader2, Database, ChevronDown, Clock, PanelRightOpen, PanelRightClose, ArrowRight, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import type { ChatMessage, ChartConfig, Source, SuggestedPrompt } from "@/types";

const MAX_RECENT_QUERIES = 5;

/** FR8.7: Detect intent from the last assistant message for context-aware actions */
function detectIntent(msg: ChatMessage | undefined): string | null {
  if (!msg || msg.role !== "assistant") return null;
  const text = msg.content.toLowerCase();
  if (text.includes("period end summary") || text.includes("pes") || text.includes("kpi")) return "pes";
  if (text.includes("variance") || text.includes("budget")) return "variance";
  if (text.includes("competitor") || text.includes("competitive") || text.includes("swot") || text.includes("porter")) return "ci";
  if (text.includes("ranking") || text.includes("top") || text.includes("bottom") || text.includes("entities")) return "ranking";
  return null;
}

/** FR8.7: Context action bar config per intent */
const CONTEXT_ACTIONS: Record<string, { label: string; href: string }> = {
  pes: { label: "View full report", href: "/reports" },
  variance: { label: "View full report", href: "/reports" },
  ci: { label: "Open CI Dashboard", href: "/ci" },
  ranking: { label: "See all entities", href: "/explorer" },
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteIndex, setAutoCompleteIndex] = useState(-1);
  // FR8.10: Split view state
  const [splitView, setSplitView] = useState(false);
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Voice output state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete: filter prompts that match current input
  const autoCompleteSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    return prompts
      .filter((p) => {
        const resolved = (p as unknown as { resolved_prompt: string }).resolved_prompt || p.suggested_prompt;
        return resolved.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
      })
      .slice(0, 6);
  }, [input, prompts]);

  // FR8.10: Get the latest assistant message with data for the side panel
  const latestDataMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && (m.data || m.chartConfig)) return m;
    }
    return null;
  }, [messages]);

  // FR8.7: Detect intent of last assistant message
  const lastAssistantMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return undefined;
  }, [messages]);
  const detectedIntent = detectIntent(lastAssistantMsg);

  // Load suggested prompts
  useEffect(() => {
    fetch("/api/prompts/suggested")
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {});
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================
  // Voice Input — Speech-to-Text (webkitSpeechRecognition)
  // ============================================================

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError("Speech recognition is not supported in this browser.");
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);

      // If the result is final, auto-send
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          // Small delay to let React render the input, then send
          setTimeout(() => sendMessage(transcript.trim()), 100);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone permission denied. Please allow access.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Try again.");
      } else {
        setVoiceError(`Voice error: ${event.error}`);
      }
      setTimeout(() => setVoiceError(null), 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      setVoiceError("Could not start speech recognition.");
      setTimeout(() => setVoiceError(null), 4000);
    }
  }

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // ============================================================
  // Voice Output — Text-to-Speech (speechSynthesis)
  // ============================================================

  function speakMessage(msgId: string, text: string) {
    if (!window.speechSynthesis) return;

    // If already speaking this message, stop
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    // Cancel any other ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 0.9;

    // Try to pick a professional voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")
    ) || voices.find(
      (v) => v.lang.startsWith("en-US") && !v.name.toLowerCase().includes("novelty")
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  }

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;

    // Track recent queries (FR8.4 adaptive query interface)
    setRecentQueries((prev) => {
      const updated = [msg, ...prev.filter((q) => q !== msg)].slice(0, MAX_RECENT_QUERIES);
      return updated;
    });

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowAutoComplete(false);
    setAutoCompleteIndex(-1);
    setLoading(true);
    setShowPrompts(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "No response.",
        data: data.data,
        chartConfig: data.chartConfig as ChartConfig,
        sources: data.sources as Source[],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-var(--ticker-height)-2rem)] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-medium">Query Interface</h1>
        {/* FR8.10: Split view toggle */}
        <button
          onClick={() => setSplitView(!splitView)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
            splitView
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
          title={splitView ? "Close split view" : "Open split view"}
        >
          {splitView ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
          Split View
        </button>
      </div>

      {/* FR8.10: Split layout container */}
      <div className={`flex flex-1 gap-3 overflow-hidden ${splitView ? "" : ""}`}>
        {/* Chat column */}
        <div className={`flex flex-col ${splitView ? "w-[60%]" : "w-full"}`}>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 space-y-4" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 && showPrompts && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ask a financial question or select a suggested prompt below.
                </p>
                {/* Prompt categories */}
                {["revenue", "margin", "narrative", "cost", "bridge"].map((cat) => {
                  const catPrompts = prompts.filter((p) => p.category === cat);
                  if (catPrompts.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {cat}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {catPrompts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => sendMessage((p as unknown as { resolved_prompt: string }).resolved_prompt || p.suggested_prompt)}
                            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-left"
                            title={p.description}
                          >
                            {(p as unknown as { resolved_prompt: string }).resolved_prompt || p.suggested_prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  }`}
                >
                  {/* Message content + voice output */}
                  <div className="flex items-start gap-2">
                    <div className="whitespace-pre-wrap text-sm flex-1">{msg.content}</div>
                    {msg.role === "assistant" && window.speechSynthesis && (
                      <button
                        onClick={() => speakMessage(msg.id, msg.content)}
                        className={`mt-0.5 shrink-0 rounded p-1 transition-colors ${
                          speakingMsgId === msg.id
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                        title={speakingMsgId === msg.id ? "Stop reading" : "Read aloud"}
                        aria-label={speakingMsgId === msg.id ? "Stop reading message" : "Read message aloud"}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="h-3.5 w-3.5" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Chart — only show inline if NOT in split view */}
                  {!splitView && msg.chartConfig && (
                    <div className="mt-3">
                      <ChartRenderer config={msg.chartConfig} />
                    </div>
                  )}

                  {/* Data table preview — only show inline if NOT in split view */}
                  {!splitView && msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                    <DataTablePreview data={msg.data as Record<string, unknown>[]} />
                  )}

                  {/* Source attribution (FR4.4) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {msg.sources.map((s) => `${s.table} (${s.rowCount} rows)`).join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing query...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FR8.7: Context-aware action bar */}
          {detectedIntent && CONTEXT_ACTIONS[detectedIntent] && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <ArrowRight className="h-3 w-3 text-primary" />
              <a
                href={CONTEXT_ACTIONS[detectedIntent].href}
                className="text-xs font-medium text-primary hover:underline"
              >
                {CONTEXT_ACTIONS[detectedIntent].label} &rarr;
              </a>
            </div>
          )}

          {/* Quick prompts (collapsed after first message) */}
          {messages.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showPrompts ? "rotate-180" : ""}`} />
                Suggested prompts
              </button>
              {showPrompts && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {prompts.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => sendMessage((p as unknown as { resolved_prompt: string }).resolved_prompt || p.suggested_prompt)}
                      className="rounded border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent queries chips (FR8.4) */}
          {recentQueries.length > 0 && (
            <div className="mt-2 flex items-center gap-2 overflow-x-auto" aria-label="Recent queries">
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              {recentQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title={q}
                >
                  {q.length > 40 ? q.slice(0, 40) + "..." : q}
                </button>
              ))}
            </div>
          )}

          {/* Voice error toast */}
          {voiceError && (
            <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {voiceError}
            </div>
          )}

          {/* Input bar */}
          <div className="relative mt-2 flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setShowAutoComplete(e.target.value.trim().length >= 2);
                  setAutoCompleteIndex(-1);
                }}
                onFocus={() => {
                  if (input.trim().length >= 2) setShowAutoComplete(true);
                }}
                onBlur={() => {
                  // Delay to allow click on autocomplete item
                  setTimeout(() => setShowAutoComplete(false), 200);
                }}
                placeholder={isListening ? "Listening..." : "Ask a financial question... (Enter to send)"}
                aria-label="Ask a financial question"
                aria-describedby="chat-keyboard-hint"
                aria-autocomplete="list"
                aria-controls={showAutoComplete && autoCompleteSuggestions.length > 0 ? "autocomplete-list" : undefined}
                aria-activedescendant={autoCompleteIndex >= 0 ? `autocomplete-item-${autoCompleteIndex}` : undefined}
                className={`w-full rounded-md border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                  isListening ? "border-red-500 ring-1 ring-red-500/50" : "border-border focus:border-primary"
                }`}
                onKeyDown={(e) => {
                  if (showAutoComplete && autoCompleteSuggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setAutoCompleteIndex((prev) => Math.min(prev + 1, autoCompleteSuggestions.length - 1));
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setAutoCompleteIndex((prev) => Math.max(prev - 1, -1));
                      return;
                    }
                    if (e.key === "Escape") {
                      setShowAutoComplete(false);
                      setAutoCompleteIndex(-1);
                      return;
                    }
                    if (e.key === "Enter" && autoCompleteIndex >= 0) {
                      e.preventDefault();
                      const selected = autoCompleteSuggestions[autoCompleteIndex];
                      const text = (selected as unknown as { resolved_prompt: string }).resolved_prompt || selected.suggested_prompt;
                      sendMessage(text);
                      return;
                    }
                  }
                  if (e.key === "Enter" && input.trim() && !loading) {
                    sendMessage();
                  }
                }}
                disabled={loading}
              />
              <span id="chat-keyboard-hint" className="sr-only">Press Enter to send, Arrow keys to navigate suggestions</span>

              {/* Autocomplete dropdown (FR8.4) */}
              {showAutoComplete && autoCompleteSuggestions.length > 0 && (
                <ul
                  id="autocomplete-list"
                  role="listbox"
                  aria-label="Suggested prompts"
                  className="absolute bottom-full left-0 z-20 mb-1 w-full rounded-md border border-border bg-card shadow-lg"
                >
                  {autoCompleteSuggestions.map((p, i) => {
                    const text = (p as unknown as { resolved_prompt: string }).resolved_prompt || p.suggested_prompt;
                    return (
                      <li
                        key={p.id}
                        id={`autocomplete-item-${i}`}
                        role="option"
                        aria-selected={i === autoCompleteIndex}
                        className={`cursor-pointer px-3 py-2 text-xs transition-colors ${
                          i === autoCompleteIndex ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          sendMessage(text);
                        }}
                      >
                        <div className="truncate">{text}</div>
                        {p.description && (
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground/70">{p.description}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Mic button — Voice Input */}
            <button
              onClick={toggleListening}
              disabled={loading}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
              className={`flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isListening
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              } disabled:opacity-50`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </div>

        {/* FR8.10: Data side panel */}
        {splitView && (
          <div className="flex w-[40%] flex-col overflow-y-auto rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data Panel
            </h2>
            {latestDataMessage ? (
              <div className="space-y-4">
                {latestDataMessage.chartConfig && (
                  <ChartRenderer config={latestDataMessage.chartConfig} />
                )}
                {latestDataMessage.data && Array.isArray(latestDataMessage.data) && latestDataMessage.data.length > 0 && (
                  <DataTablePreview data={latestDataMessage.data as Record<string, unknown>[]} />
                )}
                {!latestDataMessage.chartConfig && !(latestDataMessage.data && Array.isArray(latestDataMessage.data) && latestDataMessage.data.length > 0) && (
                  <p className="text-xs text-muted-foreground">No tabular data in last response.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Query results will appear here. Ask a question to get started.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Inline data table preview
// ============================================================

function DataTablePreview({ data }: { data: Record<string, unknown>[] }) {
  const [expanded, setExpanded] = useState(false);
  const keys = Object.keys(data[0]);
  const displayData = expanded ? data.slice(0, 50) : data.slice(0, 5);

  return (
    <div className="mt-3 overflow-x-auto rounded border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            {keys.map((key) => (
              <th key={key} className="th-financial px-3 py-2 text-left">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              {keys.map((key) => (
                <td key={key} className={`px-3 py-1.5 ${typeof row[key] === "number" ? "font-mono tabular-nums text-right" : ""}`}>
                  {typeof row[key] === "number"
                    ? (row[key] as number).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : typeof row[key] === "object" && row[key] !== null
                    ? (row[key] as Record<string, unknown>).tagline || (row[key] as Record<string, unknown>).direction || JSON.stringify(row[key])
                    : String(row[key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-1 text-center text-[10px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show less" : `Show all ${data.length} rows`}
        </button>
      )}
    </div>
  );
}
