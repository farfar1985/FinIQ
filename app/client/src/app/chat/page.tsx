"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Database, ChevronDown } from "lucide-react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import type { ChatMessage, ChartConfig, Source, SuggestedPrompt } from "@/types";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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
      <h1 className="mb-3 text-base font-medium">Query Interface</h1>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 space-y-4">
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
              {/* Message content */}
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

              {/* Chart */}
              {msg.chartConfig && (
                <div className="mt-3">
                  <ChartRenderer config={msg.chartConfig} />
                </div>
              )}

              {/* Data table preview */}
              {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
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

      {/* Input bar */}
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a financial question..."
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim() && !loading) {
              sendMessage();
            }
          }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </button>
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
