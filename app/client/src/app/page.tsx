"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Briefcase, Settings, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Sparkline } from "@/components/charts/sparkline";
import { useHistoryStore } from "@/stores/history-store";

// FR8.9: Dynamic component injection — lazy-load heavy chart components
const FinBarChart = dynamic(
  () => import("@/components/charts/bar-chart").then((mod) => ({ default: mod.FinBarChart })),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
    ),
    ssr: false,
  }
);

interface KPIData {
  kpi: string;
  ytd_cy: number;
  ytd_ly: number;
  ytd_growth: number;
  periodic_cy: number;
  periodic_ly: number;
  periodic_growth: number;
}

/** Generate mock sparkline data from a KPI's CY/LY values. Returns 6 period values trending from LY toward CY. */
function generateSparkData(ly: number, cy: number): number[] {
  const steps = 6;
  const diff = cy - ly;
  return Array.from({ length: steps }, (_, i) => {
    const base = ly + (diff * (i / (steps - 1)));
    // Add slight noise (deterministic by index)
    const noise = base * 0.02 * ((i % 3) - 1);
    return Math.round(base + noise);
  });
}

const KPI_ICONS: Record<string, typeof TrendingUp> = {
  "Organic Growth": TrendingUp,
  "MAC Shape %": BarChart3,
  "A&CP Shape %": DollarSign,
  "CE Shape %": Activity,
  "Controllable Overhead Shape %": TrendingDown,
  "NCFO": DollarSign,
};

// FR8.1: Widget definitions
interface Widget {
  id: string;
  title: string;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: "kpi-cards", title: "KPI Cards" },
  { id: "chart", title: "KPI Performance Chart" },
  { id: "quick-actions", title: "Quick Actions" },
];

const STORAGE_KEY = "finiq-dashboard-widget-order";

function loadWidgetOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_WIDGETS.map((w) => w.id);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // Validate all widget IDs exist
      const validIds = new Set(DEFAULT_WIDGETS.map((w) => w.id));
      if (parsed.every((id) => validIds.has(id)) && parsed.length === DEFAULT_WIDGETS.length) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS.map((w) => w.id);
}

function saveWidgetOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch { /* ignore */ }
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityCount, setEntityCount] = useState(0);
  const [customizing, setCustomizing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(loadWidgetOrder);

  const historyPush = useHistoryStore((s) => s.push);

  // FR8.11: Listen for undo/redo actions to restore widget order
  useEffect(() => {
    const unsub = useHistoryStore.subscribe((state, prevState) => {
      // Check if an undo or redo happened (past length changed)
      const lastAction = state.past.length < prevState.past.length
        ? state.future[0] // undo happened, action moved to future
        : state.past.length > prevState.past.length && prevState.future.length > state.future.length
        ? state.past[state.past.length - 1] // redo happened
        : null;

      if (lastAction && lastAction.type === "widget-reorder") {
        const payload = lastAction.payload as { from: string[]; to: string[] };
        // On undo, restore the "from" order; on redo, restore the "to" order
        const isUndo = state.past.length < prevState.past.length;
        const newOrder = isUndo ? payload.from : payload.to;
        setWidgetOrder(newOrder);
        saveWidgetOrder(newOrder);
      }
    });
    return unsub;
  }, []);

  const moveWidget = useCallback((index: number, direction: "up" | "down") => {
    setWidgetOrder((prev) => {
      const newOrder = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newOrder.length) return prev;
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      saveWidgetOrder(newOrder);
      // FR8.11: Push to undo history
      historyPush({
        type: "widget-reorder",
        payload: { from: prev, to: newOrder },
        timestamp: Date.now(),
      });
      return newOrder;
    });
  }, [historyPush]);

  const resetLayout = useCallback(() => {
    const defaultOrder = DEFAULT_WIDGETS.map((w) => w.id);
    setWidgetOrder((prev) => {
      historyPush({
        type: "widget-reorder",
        payload: { from: prev, to: defaultOrder },
        timestamp: Date.now(),
      });
      return defaultOrder;
    });
    saveWidgetOrder(defaultOrder);
    setCustomizing(false);
  }, [historyPush]);

  useEffect(() => {
    // Fetch PES data for Mars Inc
    Promise.all([
      fetch("/api/reports/pes/Mars Inc").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([pesData, health]) => {
        if (pesData.pl) {
          // Group by Account_KPI, latest period
          const kpiMap: Record<string, KPIData> = {};
          for (const row of [...(pesData.pl || []), ...(pesData.ncfo || [])]) {
            const key = row.Account_KPI || row.Entity;
            if (!kpiMap[key]) {
              const ytdGrowth = row.YTD_LY !== 0 ? ((row.YTD_CY - row.YTD_LY) / Math.abs(row.YTD_LY)) * 100 : 0;
              const pGrowth = row.Periodic_LY !== 0 ? ((row.Periodic_CY - row.Periodic_LY) / Math.abs(row.Periodic_LY)) * 100 : 0;
              kpiMap[key] = {
                kpi: key,
                ytd_cy: row.YTD_CY,
                ytd_ly: row.YTD_LY,
                ytd_growth: Math.round(ytdGrowth * 100) / 100,
                periodic_cy: row.Periodic_CY,
                periodic_ly: row.Periodic_LY,
                periodic_growth: Math.round(pGrowth * 100) / 100,
              };
            }
          }
          // Filter to main 6 KPIs
          const mainKPIs = ["Organic Growth", "MAC Shape %", "A&CP Shape %", "CE Shape %", "Controllable Overhead Shape %", "NCFO"];
          const filtered = mainKPIs.map((k) => kpiMap[k]).filter(Boolean);
          setKpis(filtered);
        }
        setEntityCount(health.database?.entityCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = kpis.map((k) => ({
    name: k.kpi.length > 15 ? k.kpi.substring(0, 15) + "..." : k.kpi,
    "YTD Growth %": k.ytd_growth,
    "Periodic Growth %": k.periodic_growth,
  }));

  // Widget renderers
  const widgetRenderers: Record<string, () => React.ReactNode> = {
    "kpi-cards": () => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
            ))
          : kpis.map((kpi) => {
              const Icon = KPI_ICONS[kpi.kpi] || Activity;
              return (
                <div key={kpi.kpi} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.kpi}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 font-mono text-lg font-semibold tabular-nums">
                    {kpi.ytd_cy?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        kpi.ytd_growth > 0
                          ? "text-positive"
                          : kpi.ytd_growth < 0
                          ? "text-negative"
                          : "text-muted-foreground"
                      }`}
                    >
                      {kpi.ytd_growth > 0 ? "+" : ""}
                      {kpi.ytd_growth}% YTD
                    </span>
                    <Sparkline data={generateSparkData(kpi.ytd_ly, kpi.ytd_cy)} />
                  </div>
                </div>
              );
            })}
      </div>
    ),
    chart: () =>
      chartData.length > 0 ? (
        <FinBarChart
          data={chartData}
          xKey="name"
          yKeys={["YTD Growth %", "Periodic Growth %"]}
          title="KPI Performance — Mars Inc"
          height={280}
        />
      ) : null,
    "quick-actions": () => (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Period End Summary", href: "/chat", query: "Generate period end summary for Mars Inc" },
            { label: "Budget Variance", href: "/chat", query: "Show budget variance for Mars Inc" },
            { label: "Growth Rankings", href: "/chat", query: "Which sub-units have the highest organic growth?" },
            { label: "Trend Analysis", href: "/chat", query: "Show organic growth trend for Mars Inc" },
          ].map((action) => (
            <a
              key={action.label}
              href={`${action.href}?q=${encodeURIComponent(action.query)}`}
              className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Briefcase className="h-3 w-3" />
              {action.label}
            </a>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Dashboard — Mars Inc</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{entityCount} entities tracked</span>
          {/* FR8.1: Customize / Reset buttons */}
          <button
            onClick={() => setCustomizing(!customizing)}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
              customizing
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-3 w-3" />
            {customizing ? "Done" : "Customize"}
          </button>
          {customizing && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Layout
            </button>
          )}
        </div>
      </div>

      {/* FR8.1: Render widgets in user-defined order */}
      {widgetOrder.map((widgetId, index) => {
        const widget = DEFAULT_WIDGETS.find((w) => w.id === widgetId);
        if (!widget) return null;
        const render = widgetRenderers[widgetId];
        if (!render) return null;

        return (
          <div key={widgetId} className="relative">
            {customizing && (
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground">{widget.title}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => moveWidget(index, "up")}
                    disabled={index === 0}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${widget.title} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveWidget(index, "down")}
                    disabled={index === widgetOrder.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${widget.title} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {render()}
          </div>
        );
      })}
    </div>
  );
}
