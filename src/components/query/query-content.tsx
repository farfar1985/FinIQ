"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, ChevronDown, ChevronRight, Play, Hash } from "lucide-react";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  type SuggestedPrompt,
  type PromptCategory,
  PROMPT_CATEGORIES,
  CATEGORY_META,
  resolveVariables,
} from "@/data/prompts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StructuredData {
  type: "table" | "chart";
  columns?: string[];
  rows?: Record<string, unknown>[];
  chartData?: { label: string; value: number }[];
  chartType?: "area" | "bar";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: StructuredData;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SUGGESTED_QUERIES = [
  "What was Petcare's organic growth in P06?",
  "Compare MAC Shape across GBUs",
  "Show budget variance for Snacking",
  "Organic growth trend for Mars Wrigley over time",
];

const RECENT_QUERIES = [
  { query: "Petcare organic growth P06", time: "2h ago" },
  { query: "MAC Shape comparison all GBUs", time: "3h ago" },
  { query: "Snacking budget variance", time: "5h ago" },
  { query: "NCFO bridge Corporate", time: "1d ago" },
  { query: "Cocoa cost impact analysis", time: "1d ago" },
  { query: "Wrigley FX headwind P05-P06", time: "2d ago" },
];

// ---------------------------------------------------------------------------
// Context extractor - pulls entity/period from conversation history
// ---------------------------------------------------------------------------

function extractContext(messages: Message[]): {
  entity?: string;
  period?: string;
} {
  let entity: string | undefined;
  let period: string | undefined;

  const entityPatterns: [RegExp, string][] = [
    [/\bpetcare\b/i, "Petcare"],
    [/\bsnacking\b/i, "Snacking"],
    [/\bfood\s*&?\s*nutrition\b/i, "Food & Nutrition"],
    [/\b(mars\s*)?wrigley\b/i, "Mars Wrigley"],
    [/\bmars\s*inc\b/i, "Mars Inc"],
    [/\bcorporate\b/i, "Corporate"],
  ];

  const periodPattern = /\b(p(?:0?[1-9]|1[0-2]))\b/i;
  const quarterPattern = /\b(q[1-4])\b/i;

  // Walk most recent messages first
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const text = msg.content;

    if (!entity) {
      for (const [re, name] of entityPatterns) {
        if (re.test(text)) {
          entity = name;
          break;
        }
      }
    }
    if (!period) {
      const pm = text.match(periodPattern);
      if (pm) period = pm[1].toUpperCase();
      const qm = text.match(quarterPattern);
      if (qm) period = qm[1].toUpperCase();
    }
    if (entity && period) break;
  }

  return { entity, period };
}

// ---------------------------------------------------------------------------
// Inline table renderer
// ---------------------------------------------------------------------------

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

function InlineTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const [sort, setSort] = useState<SortState | null>(null);

  const handleSort = (col: string) => {
    setSort((prev) => {
      if (prev?.column === col) {
        return prev.direction === "asc"
          ? { column: col, direction: "desc" }
          : null;
      }
      return { column: col, direction: "asc" };
    });
  };

  const sortedRows = sort
    ? [...rows].sort((a, b) => {
        const aVal = String(a[sort.column] ?? "");
        const bVal = String(b[sort.column] ?? "");
        // Try numeric sort by stripping non-numeric chars
        const aNum = parseFloat(aVal.replace(/[^0-9.\-+]/g, ""));
        const bNum = parseFloat(bVal.replace(/[^0-9.\-+]/g, ""));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sort.direction === "asc" ? aNum - bNum : bNum - aNum;
        }
        return sort.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      })
    : rows;

  return (
    <div className="mt-2 max-h-[300px] overflow-auto rounded-lg border border-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col}
                className="cursor-pointer select-none text-xs"
                onClick={() => handleSort(col)}
              >
                {col}
                {sort?.column === col
                  ? sort.direction === "asc"
                    ? " \u2191"
                    : " \u2193"
                  : ""}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className="text-xs">
                  {String(row[col] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline chart renderer
// ---------------------------------------------------------------------------

function InlineChart({
  chartData,
  chartType,
}: {
  chartData: { label: string; value: number }[];
  chartType: "area" | "bar";
}) {
  const data = chartData.map((d) => ({ name: d.label, value: d.value }));

  return (
    <div className="mt-2 h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "area" ? (
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(217, 91%, 60%)"
              fill="hsl(217, 91%, 60%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="value"
              fill="hsl(217, 91%, 60%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested Prompts panel (FR4.5 / FR4.6)
// ---------------------------------------------------------------------------

type CategoryFilter = "all" | PromptCategory;

function SuggestedPromptsPanel({
  onPromptClick,
  disabled,
  currentEntity,
}: {
  onPromptClick: (resolvedText: string, promptId: string) => void;
  disabled: boolean;
  currentEntity?: string;
}) {
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  // Fetch prompts on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchPrompts() {
      try {
        const res = await fetch("/api/prompts");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.prompts)) {
          setPrompts(json.prompts);
        }
      } catch {
        // Silently fail — panel will show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPrompts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter by active category tab
  const filtered =
    activeCategory === "all"
      ? prompts
      : prompts.filter((p) => p.category === activeCategory);

  // Group filtered prompts by category
  const grouped: Record<string, SuggestedPrompt[]> = {};
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  // Stable category order
  const categoryOrder = PROMPT_CATEGORIES.filter((c) => grouped[c]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleClick = (prompt: SuggestedPrompt) => {
    const resolved = resolveVariables(prompt.template, {
      unit: currentEntity,
    });
    onPromptClick(resolved, prompt.id);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Suggested Prompts</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Category filter tabs */}
        <div className="mb-3 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {PROMPT_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Prompts list */}
        <div
          className="space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 520px)" }}
        >
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No prompts available for this category.
            </p>
          )}

          {!loading &&
            categoryOrder.map((cat) => {
              const meta = CATEGORY_META[cat];
              const items = grouped[cat];
              const isCollapsed = collapsedCategories.has(cat);

              return (
                <div key={cat}>
                  {/* Category header — collapsible */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="mb-1 flex w-full items-center gap-1 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      ({items.length})
                    </span>
                  </button>

                  {/* Prompt items */}
                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {items.map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => handleClick(prompt)}
                          disabled={disabled}
                          className="group flex w-full flex-col gap-1 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-foreground/5 hover:bg-muted/50 disabled:opacity-50"
                        >
                          {/* Description + category badge */}
                          <div className="flex items-start gap-1.5">
                            <Play className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            <span className="text-xs leading-snug text-foreground">
                              {prompt.description}
                            </span>
                          </div>

                          {/* Meta row: badge + runs + tags */}
                          <div className="flex items-center gap-1.5 pl-[18px]">
                            <span
                              className={`inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Hash className="h-2.5 w-2.5" />
                              {prompt.runs}
                            </span>
                            {prompt.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] text-muted-foreground/60"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QueryContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dataMode = useUIStore((state) => state.dataMode);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Derive current entity from conversation context
  const currentEntity = extractContext(messages).entity;

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isLoading) return;

      // Add user message
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      try {
        // Build context from conversation history
        const ctx = extractContext(updatedMessages);

        // Build history for API (CR-004: multi-turn context)
        const history = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: text,
            context: { entity: ctx.entity, period: ctx.period },
            history,
          }),
        });

        const json = await res.json();

        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: json.text ?? "Sorry, I could not process that query.",
          timestamp: new Date(),
          data: json.data,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: Message = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            "An error occurred while processing your query. Please check your connection and try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // CR-034: Chips auto-submit directly
  const handleChipClick = (query: string) => {
    handleSend(query);
  };

  // FR4.5: Prompt click -> resolve variables -> auto-submit + increment runs
  const handlePromptClick = (resolvedText: string, promptId: string) => {
    handleSend(resolvedText);
    // Fire-and-forget: increment run counter
    fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: promptId }),
    }).catch(() => {
      // Non-critical — ignore errors
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Query Interface</h1>
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel - Chat */}
        <div className="col-span-8 flex flex-col">
          <Card
            className="flex flex-1 flex-col"
            style={{ minHeight: "calc(100vh - 180px)" }}
          >
            <CardHeader>
              <CardTitle>Amira Assistant</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {/* Message area */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto pr-2"
                style={{ maxHeight: "calc(100vh - 380px)" }}
              >
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Ask a question about financial data, metrics, or
                      forecasts to get started.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "max-w-[80%] bg-blue-600 text-white"
                          : "max-w-[90%] bg-muted/70 text-foreground ring-1 ring-foreground/5"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>

                      {/* Inline table (CR-002) */}
                      {msg.data?.columns &&
                        msg.data.rows &&
                        msg.data.rows.length > 0 && (
                          <InlineTable
                            columns={msg.data.columns}
                            rows={msg.data.rows}
                          />
                        )}

                      {/* Inline chart (CR-003) */}
                      {msg.data?.chartData &&
                        msg.data.chartData.length > 0 && (
                          <InlineChart
                            chartData={msg.data.chartData}
                            chartType={msg.data.chartType ?? "bar"}
                          />
                        )}

                      {/* Provenance badge on assistant messages */}
                      {msg.role === "assistant" && (
                        <div className="mt-2">
                          <ProvenanceBadge
                            source={dataMode === "real" ? "Databricks" : "Simulated Data"}
                          />
                        </div>
                      )}

                      <p
                        className={`mt-1 text-[10px] ${
                          msg.role === "user"
                            ? "text-blue-200"
                            : "text-muted-foreground"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-sm ring-1 ring-foreground/5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Analyzing...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested chips (CR-034: auto-submit on click) */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleChipClick(q)}
                    disabled={isLoading}
                    className="rounded-full border border-foreground/10 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="mt-2 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about financial data, metrics, forecasts..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {RECENT_QUERIES.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => handleChipClick(item.query)}
                    disabled={isLoading}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                  >
                    <span className="truncate text-foreground">
                      {item.query}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {item.time}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FR4.5 / FR4.6: Suggested Prompts Library */}
          <SuggestedPromptsPanel
            onPromptClick={handlePromptClick}
            disabled={isLoading}
            currentEntity={currentEntity}
          />
        </div>
      </div>
    </div>
  );
}
