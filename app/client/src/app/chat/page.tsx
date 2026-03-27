"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-var(--ticker-height)-2rem)] flex-col">
      <h1 className="mb-4 text-base font-medium">Query Interface</h1>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Ask a financial question to get started. Try: &quot;Show me organic growth for Mars Inc YTD&quot;
        </div>
      </div>

      {/* Suggested prompts placeholder */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "Show organic growth for Mars Inc",
          "Compare MAC Shape across GBUs",
          "Budget variance for Pet Care",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a financial question..."
          className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              // Will be wired in Batch 3
              setInput("");
            }
          }}
        />
        <button
          disabled={!input.trim()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}
