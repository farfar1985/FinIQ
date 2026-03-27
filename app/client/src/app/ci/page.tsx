"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { formatCompact, formatChange, getChangeColor } from "@/lib/format";
import { Download } from "lucide-react";
import { FinBarChart } from "@/components/charts/bar-chart";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from "recharts";

// ── OKLCH color palette (matches design system) ──
const COLORS = {
  blue: "oklch(0.55 0.15 250)",
  green: "oklch(0.70 0.17 160)",
  red: "oklch(0.65 0.20 25)",
  amber: "oklch(0.70 0.15 80)",
  purple: "oklch(0.65 0.18 300)",
  teal: "oklch(0.65 0.12 190)",
  pink: "oklch(0.60 0.18 350)",
  orange: "oklch(0.68 0.16 55)",
  indigo: "oklch(0.50 0.18 270)",
  lime: "oklch(0.72 0.15 130)",
};
const SCATTER_COLORS = Object.values(COLORS);

const SWOT_COLORS = {
  strengths: { bg: "bg-emerald-950/40", border: "border-emerald-800/60", text: "text-emerald-400", label: "Strengths" },
  weaknesses: { bg: "bg-red-950/40", border: "border-red-800/60", text: "text-red-400", label: "Weaknesses" },
  opportunities: { bg: "bg-blue-950/40", border: "border-blue-800/60", text: "text-blue-400", label: "Opportunities" },
  threats: { bg: "bg-amber-950/40", border: "border-amber-800/60", text: "text-amber-400", label: "Threats" },
};

// ── Types ──
interface Competitor {
  name: string;
  ticker: string;
  sector?: string;
  segment_overlap: string;
  isPublic?: boolean;
  revenue?: number | null;
  revenueGrowth?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  marketCap?: number | null;
  peRatio?: number | null;
}

interface SWOTData {
  ticker: string;
  company: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  financialSnapshot: Record<string, number>;
}

interface BenchmarkData {
  competitors: {
    ticker: string;
    company: string;
    revenue: number;
    revenueGrowth: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roe: number;
    marketCap: number | null;
    peRatio: number | null;
    evToEbitda: number | null;
    debtToEquity: number;
  }[];
  averages: Record<string, number | null>;
  peerCount: number;
}

interface PositioningData {
  points: { name: string; ticker: string; x: number; y: number; size: number; segment: string }[];
  xMetric: string;
  yMetric: string;
  xLabel: string;
  yLabel: string;
  availableMetrics: { key: string; label: string }[];
}

interface MATransaction {
  acquirer: string;
  target: string;
  date: string;
  closedDate: string | null;
  dealSize: string;
  type: string;
}

interface NewsArticle {
  ticker: string;
  company: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: string;
}

interface PortersData {
  forces: Record<
    string,
    { score: number; level: string; factors: string[] }
  >;
  hhi: number;
  concentration: string;
  marketShares: { name: string; ticker: string; marketCap: number; marketShare: number }[];
}

// ── Tabs ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "swot", label: "SWOT" },
  { id: "porters", label: "Porter's 5" },
  { id: "benchmark", label: "Benchmarking" },
  { id: "positioning", label: "Positioning" },
  { id: "ma", label: "M&A" },
  { id: "news", label: "News" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ══════════════════════════════════════════════════════════════════
// Page Component
// ══════════════════════════════════════════════════════════════════

export default function CIPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Competitive Intelligence</h1>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          FMP API + Mock Fallback
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "swot" && <SWOTTab />}
        {activeTab === "porters" && <PortersTab />}
        {activeTab === "benchmark" && <BenchmarkTab />}
        {activeTab === "positioning" && <PositioningTab />}
        {activeTab === "ma" && <MATab />}
        {activeTab === "news" && <NewsTab />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Overview Tab — competitor universe table
// ══════════════════════════════════════════════════════════════════

function OverviewTab() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api
      .get<{ competitors: Competitor[]; dataSource?: string }>("/ci/competitors")
      .then((res) => {
        setCompetitors(res.competitors || []);
        setDataSource(res.dataSource || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const INITIAL_ROWS = 5;
  const displayCompetitors = showAll ? competitors : competitors.slice(0, INITIAL_ROWS);

  return (
    <div className="space-y-4">
      {dataSource && (
        <p className="text-[10px] text-muted-foreground">Data source: {dataSource}</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left font-medium">Company</th>
              <th className="px-3 py-2 text-left font-medium">Ticker</th>
              <th className="px-3 py-2 text-left font-medium">Segment Overlap</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Growth</th>
              <th className="px-3 py-2 text-right font-medium">Gross Margin</th>
              <th className="px-3 py-2 text-right font-medium">Op Margin</th>
              <th className="px-3 py-2 text-right font-medium">Market Cap</th>
              <th className="px-3 py-2 text-right font-medium">P/E</th>
            </tr>
          </thead>
          <tbody>
            {displayCompetitors.map((c) => (
              <tr
                key={c.ticker}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {c.isPublic === false ? "Private" : c.ticker}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.segment_overlap}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.revenue ? formatCompact(c.revenue) : "N/A"}
                </td>
                <td className={`px-3 py-2 text-right font-mono ${c.revenueGrowth !== null && c.revenueGrowth !== undefined ? getChangeColor(c.revenueGrowth) : ""}`}>
                  {c.revenueGrowth !== null && c.revenueGrowth !== undefined
                    ? formatChange(c.revenueGrowth)
                    : "N/A"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.grossMargin !== null && c.grossMargin !== undefined
                    ? `${c.grossMargin.toFixed(1)}%`
                    : "N/A"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.operatingMargin !== null && c.operatingMargin !== undefined
                    ? `${c.operatingMargin.toFixed(1)}%`
                    : "N/A"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.marketCap ? formatCompact(c.marketCap) : "N/A"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.peRatio !== null && c.peRatio !== undefined
                    ? c.peRatio.toFixed(1)
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length > INITIAL_ROWS && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-center text-[11px] text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground border-t border-border/50"
          >
            {showAll ? "Show less" : `Show all ${competitors.length} competitors`}
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SWOT Tab — 2x2 colored quadrants
// ══════════════════════════════════════════════════════════════════

function SWOTTab() {
  const [ticker, setTicker] = useState("NSRGY");
  const [swot, setSWOT] = useState<SWOTData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSWOT = useCallback(() => {
    setLoading(true);
    api
      .get<SWOTData>(`/ci/swot/${ticker}`)
      .then(setSWOT)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    loadSWOT();
  }, [loadSWOT]);

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Competitor:</label>
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          {[
            { ticker: "NSRGY", name: "Nestle" },
            { ticker: "MDLZ", name: "Mondelez" },
            { ticker: "HSY", name: "Hershey" },
            { ticker: "CL", name: "Colgate-Palmolive" },
            { ticker: "GIS", name: "General Mills" },
            { ticker: "K", name: "Kellanova" },
            { ticker: "SJM", name: "J.M. Smucker" },
            { ticker: "FRPT", name: "Freshpet" },
            { ticker: "IDXX", name: "IDEXX" },
          ].map((c) => (
            <option key={c.ticker} value={c.ticker}>
              {c.name} ({c.ticker})
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}

      {swot && !loading && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium">
            {swot.company} — SWOT Analysis
          </h2>

          {/* Financial snapshot */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Revenue", value: swot.financialSnapshot.revenue ? formatCompact(swot.financialSnapshot.revenue) : "N/A" },
              { label: "Gross Margin", value: `${((swot.financialSnapshot.grossMargin || 0) * 100).toFixed(1)}%` },
              { label: "Op Margin", value: `${((swot.financialSnapshot.operatingMargin || 0) * 100).toFixed(1)}%` },
              { label: "ROE", value: `${((swot.financialSnapshot.roe || 0) * 100).toFixed(1)}%` },
              { label: "D/E", value: (swot.financialSnapshot.debtToEquity || 0).toFixed(2) },
            ].map((s) => (
              <div key={s.label} className="rounded border border-border bg-card px-3 py-1.5">
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
                <div className="text-xs font-mono font-medium">{s.value}</div>
              </div>
            ))}
          </div>

          {/* 2x2 SWOT grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((key) => {
              const cfg = SWOT_COLORS[key];
              const items = swot[key] || [];
              return (
                <div
                  key={key}
                  className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}
                >
                  <h3 className={`mb-2 text-sm font-semibold ${cfg.text}`}>
                    {cfg.label}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((item: string, i: number) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.text} opacity-60`} style={{ backgroundColor: "currentColor" }} />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Porter's Five Forces Tab
// ══════════════════════════════════════════════════════════════════

function PortersTab() {
  const [data, setData] = useState<PortersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PortersData>("/ci/porters")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="text-xs text-muted-foreground">Failed to load data.</p>;

  const forceLabels: Record<string, string> = {
    competitiveRivalry: "Competitive Rivalry",
    threatOfNewEntrants: "Threat of New Entrants",
    bargainingPowerOfSuppliers: "Supplier Power",
    bargainingPowerOfBuyers: "Buyer Power",
    threatOfSubstitutes: "Threat of Substitutes",
  };

  const levelColor = (level: string) => {
    if (level === "High") return "text-red-400";
    if (level === "Moderate") return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-6">
      {/* HHI summary */}
      <div className="flex items-center gap-4">
        <div className="rounded border border-border bg-card px-4 py-2">
          <div className="text-[10px] text-muted-foreground">HHI Index</div>
          <div className="text-lg font-mono font-medium">{data.hhi}</div>
        </div>
        <div className="rounded border border-border bg-card px-4 py-2">
          <div className="text-[10px] text-muted-foreground">Concentration</div>
          <div className={`text-sm font-medium ${levelColor(data.concentration)}`}>{data.concentration}</div>
        </div>
      </div>

      {/* Forces cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(data.forces).map(([key, force]) => (
          <div key={key} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{forceLabels[key] || key}</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${levelColor(force.level)}`}>
                  {force.level}
                </span>
                <ScoreBar score={force.score} />
              </div>
            </div>
            <ul className="space-y-1">
              {force.factors.map((f: string, i: number) => (
                <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Market share bar chart */}
      {data.marketShares && data.marketShares.length > 0 && (
        <FinBarChart
          data={data.marketShares.map((m) => ({
            name: m.name,
            "Market Share %": +m.marketShare.toFixed(2),
          }))}
          xKey="name"
          yKeys={["Market Share %"]}
          title="Market Share by Market Capitalization"
          height={280}
        />
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2.5 w-1.5 rounded-sm ${
            n <= score
              ? score >= 4
                ? "bg-red-500"
                : score >= 3
                ? "bg-amber-500"
                : "bg-emerald-500"
              : "bg-muted/40"
          }`}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Benchmarking Tab — side-by-side bar charts
// ══════════════════════════════════════════════════════════════════

function BenchmarkTab() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BenchmarkData>("/ci/benchmark")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="text-xs text-muted-foreground">Failed to load data.</p>;

  const chartData = data.competitors.map((c) => ({
    name: c.company.length > 12 ? c.company.slice(0, 12) + "..." : c.company,
    "Revenue ($B)": +(c.revenue / 1e9).toFixed(1),
    "Gross Margin %": c.grossMargin,
    "Op Margin %": c.operatingMargin,
    "Net Margin %": c.netMargin,
    "Revenue Growth %": c.revenueGrowth,
    "ROE %": c.roe,
  }));

  function exportBenchmarkCsv() {
    const headers = ["Company", "Ticker", "Revenue", "Revenue Growth %", "Gross Margin %", "Op Margin %", "Net Margin %", "ROE %", "D/E", "P/E", "EV/EBITDA"];
    const lines = [headers.join(",")];
    for (const c of data!.competitors) {
      lines.push([c.company, c.ticker, c.revenue, c.revenueGrowth, c.grossMargin, c.operatingMargin, c.netMargin, c.roe, c.debtToEquity, c.peRatio ?? "", c.evToEbitda ?? ""].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finiq_benchmark_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {data.peerCount} competitors compared | Averages: Gross Margin{" "}
          {data.averages.grossMargin?.toFixed(1)}%, Op Margin{" "}
          {data.averages.operatingMargin?.toFixed(1)}%, Growth{" "}
          {data.averages.revenueGrowth?.toFixed(1)}%
        </p>
        <button
          onClick={exportBenchmarkCsv}
          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinBarChart
          data={chartData}
          xKey="name"
          yKeys={["Revenue ($B)"]}
          title="Revenue ($B)"
          height={260}
        />
        <FinBarChart
          data={chartData}
          xKey="name"
          yKeys={["Gross Margin %", "Op Margin %", "Net Margin %"]}
          title="Margin Comparison (%)"
          height={260}
        />
        <FinBarChart
          data={chartData}
          xKey="name"
          yKeys={["Revenue Growth %"]}
          title="Revenue Growth (%)"
          height={260}
          colorByValue
        />
        <FinBarChart
          data={chartData}
          xKey="name"
          yKeys={["ROE %"]}
          title="Return on Equity (%)"
          height={260}
        />
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left font-medium">Company</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Growth</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-right font-medium">Operating</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
              <th className="px-3 py-2 text-right font-medium">ROE</th>
              <th className="px-3 py-2 text-right font-medium">D/E</th>
              <th className="px-3 py-2 text-right font-medium">P/E</th>
              <th className="px-3 py-2 text-right font-medium">EV/EBITDA</th>
            </tr>
          </thead>
          <tbody>
            {data.competitors.map((c) => (
              <tr key={c.ticker} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.company}</td>
                <td className="px-3 py-2 text-right font-mono">{formatCompact(c.revenue)}</td>
                <td className={`px-3 py-2 text-right font-mono ${getChangeColor(c.revenueGrowth)}`}>
                  {formatChange(c.revenueGrowth)}
                </td>
                <td className="px-3 py-2 text-right font-mono">{c.grossMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono">{c.operatingMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono">{c.netMargin.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono">{c.roe.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono">{c.debtToEquity.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.peRatio !== null ? c.peRatio.toFixed(1) : "N/A"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {c.evToEbitda !== null ? c.evToEbitda.toFixed(1) : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Positioning Tab — scatter chart
// ══════════════════════════════════════════════════════════════════

function PositioningTab() {
  const [data, setData] = useState<PositioningData | null>(null);
  const [xMetric, setXMetric] = useState("revenueGrowth");
  const [yMetric, setYMetric] = useState("operatingMargin");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PositioningData>(`/ci/positioning?x=${xMetric}&y=${yMetric}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [xMetric, yMetric]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Axis selectors */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">X-Axis:</label>
          <select
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value)}
            className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {(data?.availableMetrics || defaultMetrics).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Y-Axis:</label>
          <select
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value)}
            className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {(data?.availableMetrics || defaultMetrics).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {data && !loading && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">
            Competitive Positioning: {data.xLabel} vs {data.yLabel}
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.005 250)"
              />
              <XAxis
                type="number"
                dataKey="x"
                name={data.xLabel}
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                stroke="oklch(0.25 0.005 250)"
                label={{
                  value: data.xLabel,
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 11, fill: "oklch(0.55 0 0)" },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={data.yLabel}
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)", fontFamily: "JetBrains Mono" }}
                stroke="oklch(0.25 0.005 250)"
                label={{
                  value: data.yLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "oklch(0.55 0 0)" },
                }}
              />
              <ZAxis type="number" dataKey="size" range={[200, 800]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.16 0.005 250)",
                  border: "1px solid oklch(0.25 0.005 250)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-lg">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-muted-foreground">{d.segment}</div>
                      <div className="mt-1 font-mono">
                        {data.xLabel}: {typeof d.x === "number" ? d.x.toFixed(2) : d.x}
                      </div>
                      <div className="font-mono">
                        {data.yLabel}: {typeof d.y === "number" ? d.y.toFixed(2) : d.y}
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={data.points}>
                {data.points.map((_, i) => (
                  <Cell key={i} fill={SCATTER_COLORS[i % SCATTER_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3">
            {data.points.map((p, i) => (
              <div key={p.ticker} className="flex items-center gap-1.5 text-[11px]">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SCATTER_COLORS[i % SCATTER_COLORS.length] }}
                />
                <span className="text-muted-foreground">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const defaultMetrics = [
  { key: "revenue", label: "Revenue ($)" },
  { key: "revenueGrowth", label: "Revenue Growth (%)" },
  { key: "grossMargin", label: "Gross Margin (%)" },
  { key: "operatingMargin", label: "Operating Margin (%)" },
  { key: "netMargin", label: "Net Margin (%)" },
  { key: "roe", label: "Return on Equity (%)" },
  { key: "debtToEquity", label: "Debt / Equity" },
  { key: "marketCap", label: "Market Cap ($)" },
  { key: "peRatio", label: "P/E Ratio" },
  { key: "evToEbitda", label: "EV / EBITDA" },
];

// ══════════════════════════════════════════════════════════════════
// M&A Tab
// ══════════════════════════════════════════════════════════════════

function MATab() {
  const [transactions, setTransactions] = useState<MATransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ transactions: MATransaction[] }>("/ci/ma")
      .then((res) => setTransactions(res.transactions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {transactions.length} transactions in competitor universe
      </p>

      <div className="space-y-3">
        {transactions.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-lg border border-border bg-card p-3"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center pt-1">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              {i < transactions.length - 1 && (
                <div className="mt-1 h-8 w-px bg-border" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{t.acquirer}</span>
                <span className="text-[10px] text-muted-foreground">acquired</span>
                <span className="text-xs font-medium">{t.target}</span>
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span>{t.date}</span>
                <span className="font-mono font-medium text-foreground">
                  ${t.dealSize}
                </span>
                {t.closedDate && <span>Closed: {t.closedDate}</span>}
              </div>
            </div>

            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
              {t.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// News Tab
// ══════════════════════════════════════════════════════════════════

function NewsTab() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ articles: NewsArticle[] }>("/ci/news")
      .then((res) => setArticles(res.articles || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const sentimentColor = (s: string) => {
    if (s === "positive") return "text-emerald-400 border-emerald-800/40";
    if (s === "negative") return "text-red-400 border-red-800/40";
    return "text-muted-foreground border-border";
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{articles.length} recent articles</p>
      {articles.map((a, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                  {a.ticker}
                </span>
                <span className="text-[10px] text-muted-foreground">{a.company}</span>
              </div>
              <h3 className="text-xs font-medium leading-snug">{a.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {a.summary}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{a.source}</span>
                <span>{new Date(a.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize ${sentimentColor(a.sentiment)}`}
            >
              {a.sentiment}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Shared
// ══════════════════════════════════════════════════════════════════

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
