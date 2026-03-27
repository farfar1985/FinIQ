"use client";

import { useState, useEffect } from "react";
import { FileBarChart, Loader2 } from "lucide-react";
import { FinBarChart } from "@/components/charts/bar-chart";

interface Entity {
  Entity_ID: string;
  Entity_Alias: string;
}

interface VarianceRow {
  entity: string;
  account: string;
  actual: number;
  replan: number;
  variance: number;
  variance_pct: number;
  favorable: boolean;
}

interface ComparisonRow {
  entity: string;
  account: string;
  actual: number;
  replan: number;
  forecast: number | null;
  actual_vs_replan: number;
  actual_vs_replan_pct: number;
  actual_vs_forecast: number | null;
  actual_vs_forecast_pct: number | null;
  replan_favorable: boolean;
  forecast_favorable: boolean | null;
}

interface ComparisonData {
  entity: string;
  generated_at: string;
  forecast_note: string;
  rows: ComparisonRow[];
  summary: {
    total_accounts: number;
    total_actual: number;
    total_replan: number;
    total_forecast: number;
    favorable_vs_replan: number;
    unfavorable_vs_replan: number;
  } | null;
}

type ReportType = "pes" | "variance" | "comparison";

export default function ReportsPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("Mars Inc");
  const [reportType, setReportType] = useState<ReportType>("pes");
  const [pesData, setPesData] = useState<unknown>(null);
  const [varianceData, setVarianceData] = useState<VarianceRow[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/entities")
      .then((r) => r.json())
      .then((d) => setEntities(d.entities || []))
      .catch(() => {});
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      if (reportType === "pes") {
        const res = await fetch(`/api/reports/pes/${encodeURIComponent(selectedEntity)}`);
        const data = await res.json();
        setPesData(data);
      } else if (reportType === "variance") {
        const res = await fetch(`/api/reports/variance/${encodeURIComponent(selectedEntity)}`);
        const data = await res.json();
        setVarianceData(data.variance || []);
      } else if (reportType === "comparison") {
        const res = await fetch(`/api/intelligence/comparison/${encodeURIComponent(selectedEntity)}`);
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const reportTypes: { key: ReportType; label: string }[] = [
    { key: "pes", label: "Period End Summary" },
    { key: "variance", label: "Budget Variance" },
    { key: "comparison", label: "Three-Way Comparison" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Financial Reports</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {entities.map((e) => (
            <option key={e.Entity_ID} value={e.Entity_Alias}>
              {e.Entity_Alias}
            </option>
          ))}
        </select>

        <div className="flex rounded-md border border-border">
          {reportTypes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReportType(key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                reportType === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileBarChart className="h-3 w-3" />}
          Generate
        </button>
      </div>

      {/* PES Report */}
      {reportType === "pes" && pesData && (
        <PESReport data={pesData as { entity: string; pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] }} />
      )}

      {/* Variance Report */}
      {reportType === "variance" && varianceData.length > 0 && (
        <VarianceReport entity={selectedEntity} data={varianceData} />
      )}

      {/* Three-Way Comparison Report */}
      {reportType === "comparison" && comparisonData && (
        <ComparisonReport data={comparisonData} />
      )}
    </div>
  );
}

function PESReport({ data }: { data: { entity: string; pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] } }) {
  const allRows = [...(data.pl || []), ...(data.ncfo || [])];
  const kpiMap: Record<string, Record<string, unknown>> = {};
  for (const row of allRows) {
    const key = (row.Account_KPI || "") as string;
    if (!kpiMap[key]) kpiMap[key] = row;
  }

  const kpis = Object.entries(kpiMap).map(([name, row]) => {
    const ytdGrowth = (row.YTD_LY as number) !== 0
      ? (((row.YTD_CY as number) - (row.YTD_LY as number)) / Math.abs(row.YTD_LY as number)) * 100
      : 0;
    return { name, ytd_cy: row.YTD_CY as number, ytd_ly: row.YTD_LY as number, growth: Math.round(ytdGrowth * 100) / 100 };
  });

  return (
    <div className="space-y-4">
      <FinBarChart
        data={kpis.map((k) => ({ name: k.name, "Growth %": k.growth }))}
        xKey="name"
        yKeys={["Growth %"]}
        title={`${data.entity} — YTD Growth by KPI`}
        colorByValue
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="th-financial px-3 py-2 text-left">KPI</th>
              <th className="th-financial px-3 py-2 text-right">YTD CY</th>
              <th className="th-financial px-3 py-2 text-right">YTD LY</th>
              <th className="th-financial px-3 py-2 text-right">Growth %</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((k) => (
              <tr key={k.name} className="border-b border-border/50">
                <td className="px-3 py-2">{k.name}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{k.ytd_cy?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{k.ytd_ly?.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${k.growth >= 0 ? "text-positive" : "text-negative"}`}>
                  {k.growth >= 0 ? "+" : ""}{k.growth}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VarianceReport({ entity, data }: { entity: string; data: VarianceRow[] }) {
  const top10 = [...data].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10);

  return (
    <div className="space-y-4">
      <FinBarChart
        data={top10.map((v) => ({ name: v.account, Variance: v.variance }))}
        xKey="name"
        yKeys={["Variance"]}
        title={`${entity} — Top 10 Budget Variances`}
        colorByValue
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="th-financial px-3 py-2 text-left">Account</th>
              <th className="th-financial px-3 py-2 text-right">Actual</th>
              <th className="th-financial px-3 py-2 text-right">Replan</th>
              <th className="th-financial px-3 py-2 text-right">Variance</th>
              <th className="th-financial px-3 py-2 text-right">Var %</th>
              <th className="th-financial px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 30).map((v, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-3 py-2">{v.account}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{v.actual?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{v.replan?.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${v.favorable ? "text-positive" : "text-negative"}`}>
                  {v.variance?.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${v.favorable ? "text-positive" : "text-negative"}`}>
                  {v.variance_pct?.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${v.favorable ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
                    {v.favorable ? "Favorable" : "Unfavorable"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonReport({ data }: { data: ComparisonData }) {
  const { rows, summary, entity, forecast_note } = data;

  // Build chart data: top 12 accounts by absolute actual value
  const chartRows = [...rows]
    .sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual))
    .slice(0, 12)
    .map((r) => ({
      name: r.account.length > 20 ? r.account.slice(0, 18) + "..." : r.account,
      Actual: r.actual,
      Replan: r.replan,
      Forecast: r.forecast ?? 0,
    }));

  return (
    <div className="space-y-4">
      {/* Forecast disclaimer */}
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
        {forecast_note}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Accounts" value={String(summary.total_accounts)} />
          <SummaryCard label="Total Actual" value={fmtCurrency(summary.total_actual)} />
          <SummaryCard label="Total Replan" value={fmtCurrency(summary.total_replan)} />
          <SummaryCard label="Total Forecast" value={fmtCurrency(summary.total_forecast)} />
          <SummaryCard
            label="Favorable"
            value={String(summary.favorable_vs_replan)}
            className="text-positive"
          />
          <SummaryCard
            label="Unfavorable"
            value={String(summary.unfavorable_vs_replan)}
            className="text-negative"
          />
        </div>
      )}

      {/* Grouped bar chart */}
      <FinBarChart
        data={chartRows}
        xKey="name"
        yKeys={["Actual", "Replan", "Forecast"]}
        title={`${entity} — Actual vs Replan vs Forecast`}
        height={350}
      />

      {/* Detail table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="th-financial px-3 py-2 text-left">Account</th>
              <th className="th-financial px-3 py-2 text-right">Actual</th>
              <th className="th-financial px-3 py-2 text-right">Replan</th>
              <th className="th-financial px-3 py-2 text-right">Forecast</th>
              <th className="th-financial px-3 py-2 text-right">Act vs Replan</th>
              <th className="th-financial px-3 py-2 text-right">Act vs Forecast</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{r.account}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {r.actual?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {r.replan?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {r.forecast != null
                    ? r.forecast.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <VarianceBadge value={r.actual_vs_replan} pct={r.actual_vs_replan_pct} favorable={r.replan_favorable} />
                </td>
                <td className="px-3 py-2 text-right">
                  {r.actual_vs_forecast != null ? (
                    <VarianceBadge
                      value={r.actual_vs_forecast}
                      pct={r.actual_vs_forecast_pct ?? 0}
                      favorable={r.forecast_favorable ?? true}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold font-mono tabular-nums ${className || ""}`}>{value}</div>
    </div>
  );
}

function VarianceBadge({ value, pct, favorable }: { value: number; pct: number; favorable: boolean }) {
  const color = favorable ? "text-positive" : "text-negative";
  const bg = favorable ? "bg-positive/10" : "bg-negative/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono ${bg} ${color}`}>
      <span>{value >= 0 ? "+" : ""}{abbreviateNumber(value)}</span>
      <span className="opacity-70">({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
    </span>
  );
}

// ============================================================
// Formatting helpers
// ============================================================

function fmtCurrency(value: number): string {
  if (value == null || isNaN(value)) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function abbreviateNumber(value: number): string {
  if (value == null || isNaN(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
