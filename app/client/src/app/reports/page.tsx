"use client";

import { useState, useEffect } from "react";
import { FileBarChart, Loader2, Download, ChevronDown, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";

// FR8.9: Dynamic component injection — lazy-load FinBarChart with loading skeleton
const FinBarChart = dynamic(
  () => import("@/components/charts/bar-chart").then((m) => ({ default: m.FinBarChart })),
  {
    loading: () => <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />,
    ssr: false,
  }
);

interface Entity {
  Entity_ID: string;
  Entity_Alias: string;
}

interface DateInfo {
  Year: number;
  Period: number;
  Quarter: number;
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

type ReportType = "pes" | "variance" | "comparison" | "custom";

const ALL_KPIS = [
  "Organic Growth",
  "MAC Shape %",
  "A&CP Shape %",
  "CE Shape %",
  "Controllable Overhead Shape %",
  "NCFO",
];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const v = row[h];
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  return lines.join("\n");
}

export default function ReportsPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("Mars Inc");
  const [reportType, setReportType] = useState<ReportType>("pes");
  const [pesData, setPesData] = useState<unknown>(null);
  const [varianceData, setVarianceData] = useState<VarianceRow[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // FR2.5: Custom Report Builder state
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>([...ALL_KPIS]);
  const [comparisonBase, setComparisonBase] = useState<"ytd" | "periodic">("ytd");
  const [customData, setCustomData] = useState<unknown>(null);
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  function getCurrentData(): Record<string, unknown>[] {
    if (reportType === "pes" && pesData) {
      const d = pesData as { pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] };
      return [...(d.pl || []), ...(d.ncfo || [])];
    }
    if (reportType === "variance") return varianceData as unknown as Record<string, unknown>[];
    if (reportType === "comparison" && comparisonData) return comparisonData.rows as unknown as Record<string, unknown>[];
    if (reportType === "custom" && customData) {
      const d = customData as { pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] };
      return [...(d.pl || []), ...(d.ncfo || [])];
    }
    return [];
  }

  const SHEET_NAMES: Record<ReportType, string> = {
    pes: "PES Report",
    variance: "Budget Variance",
    comparison: "Three-Way Comparison",
    custom: "Custom Report",
  };

  function handleExport(format: "csv" | "json" | "xlsx") {
    const data = getCurrentData();
    if (data.length === 0) return;
    const ts = new Date().toISOString().slice(0, 10);
    const base = `finiq_${reportType}_${selectedEntity.replace(/\s+/g, "_")}_${ts}`;
    if (format === "csv") {
      downloadFile(toCsv(data), `${base}.csv`, "text/csv");
    } else if (format === "json") {
      downloadFile(JSON.stringify(data, null, 2), `${base}.json`, "application/json");
    } else if (format === "xlsx") {
      // Mars-branded XLSX: header + data + footer
      const headers = Object.keys(data[0]);
      const colCount = headers.length;

      // Build branded header rows
      const brandHeader = ["FinIQ \u2014 Mars, Incorporated"];
      for (let i = 1; i < colCount; i++) brandHeader.push("");
      const confidentialRow = ["Confidential"];
      for (let i = 1; i < colCount; i++) confidentialRow.push("");
      const emptyRow = Array(colCount).fill("");

      // Build data as array-of-arrays (header rows + column headers + data + footer)
      const aoa: unknown[][] = [brandHeader, confidentialRow, emptyRow, headers];
      for (const row of data) {
        aoa.push(headers.map((h) => row[h] ?? ""));
      }
      // Footer rows
      aoa.push(emptyRow);
      const footerRow = [`Generated by FinIQ | ${new Date().toISOString()}`];
      for (let i = 1; i < colCount; i++) footerRow.push("");
      aoa.push(footerRow);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Auto-column-width
      ws["!cols"] = headers.map((h) => {
        let maxWidth = h.length;
        for (const row of data) {
          const val = row[h];
          const len = val == null ? 0 : String(val).length;
          if (len > maxWidth) maxWidth = len;
        }
        return { wch: Math.min(maxWidth + 2, 40) };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, SHEET_NAMES[reportType] || "Data");
      XLSX.writeFile(wb, `${base}.xlsx`);
    }
    setExportOpen(false);
  }

  useEffect(() => {
    fetch("/api/entities")
      .then((r) => r.json())
      .then((d) => setEntities(d.entities || []))
      .catch(() => {});
    // Load dates for custom report period selector
    fetch("/api/dates")
      .then((r) => r.json())
      .then((d) => {
        const dateList = d.dates || [];
        setDates(dateList);
        if (dateList.length > 0) {
          const latest = dateList[dateList.length - 1];
          setSelectedPeriod(`${latest.Year}-${latest.Period}`);
        }
      })
      .catch(() => {});
  }, []);

  function toggleKPI(kpi: string) {
    setSelectedKPIs((prev) =>
      prev.includes(kpi) ? prev.filter((k) => k !== kpi) : [...prev, kpi]
    );
  }

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
      } else if (reportType === "custom") {
        // FR2.5: Reuse PES endpoint and filter client-side
        const res = await fetch(`/api/reports/pes/${encodeURIComponent(selectedEntity)}`);
        const data = await res.json();
        setCustomData(data);
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
    { key: "custom", label: "Custom Report" },
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
          {entities.map((e, i) => (
            <option key={`${e.Entity_Alias}-${i}`} value={e.Entity_Alias}>
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
          disabled={loading || (reportType === "custom" && selectedKPIs.length === 0)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileBarChart className="h-3 w-3" />}
          {reportType === "custom" ? "Generate Custom Report" : "Generate"}
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            disabled={getCurrentData().length === 0}
            className="flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            Export
            <ChevronDown className="h-3 w-3" />
          </button>
          {exportOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-border bg-card py-1 shadow-lg">
              <button onClick={() => handleExport("csv")} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent">
                Export CSV
              </button>
              <button onClick={() => handleExport("json")} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent">
                Export JSON
              </button>
              <button onClick={() => handleExport("xlsx")} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent">
                Export XLSX
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FR2.5: Custom Report Builder UI */}
      {reportType === "custom" && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4 text-primary" />
            Custom Report Builder
          </div>

          {/* KPI multi-select */}
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select KPIs
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_KPIS.map((kpi) => (
                <label
                  key={kpi}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    selectedKPIs.includes(kpi)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKPIs.includes(kpi)}
                    onChange={() => toggleKPI(kpi)}
                    className="h-3 w-3 rounded border-border accent-primary"
                  />
                  {kpi}
                </label>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              <button onClick={() => setSelectedKPIs([...ALL_KPIS])} className="text-[10px] text-primary hover:underline">Select all</button>
              <button onClick={() => setSelectedKPIs([])} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {dates.map((d) => (
                  <option key={`${d.Year}-${d.Period}`} value={`${d.Year}-${d.Period}`}>
                    FY{d.Year} P{d.Period} (Q{d.Quarter})
                  </option>
                ))}
              </select>
            </div>

            {/* Comparison base toggle */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Comparison Base
              </label>
              <div className="flex rounded-md border border-border">
                <button
                  onClick={() => setComparisonBase("ytd")}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    comparisonBase === "ytd" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  YTD
                </button>
                <button
                  onClick={() => setComparisonBase("periodic")}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    comparisonBase === "periodic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Periodic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* FR2.5: Custom Report */}
      {reportType === "custom" && customData && (
        <CustomReport
          data={customData as { entity: string; pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] }}
          selectedKPIs={selectedKPIs}
          comparisonBase={comparisonBase}
        />
      )}
    </div>
  );
}

// ============================================================
// FR2.5: Custom Report Component
// ============================================================

function CustomReport({
  data,
  selectedKPIs,
  comparisonBase,
}: {
  data: { entity: string; pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] };
  selectedKPIs: string[];
  comparisonBase: "ytd" | "periodic";
}) {
  const [showAll, setShowAll] = useState(false);
  const allRows = [...(data.pl || []), ...(data.ncfo || [])];
  const kpiMap: Record<string, Record<string, unknown>> = {};
  for (const row of allRows) {
    const key = (row.Account_KPI || "") as string;
    if (!kpiMap[key]) kpiMap[key] = row;
  }

  const filtered = selectedKPIs
    .map((name) => {
      const row = kpiMap[name];
      if (!row) return null;
      const cyKey = comparisonBase === "ytd" ? "YTD_CY" : "Periodic_CY";
      const lyKey = comparisonBase === "ytd" ? "YTD_LY" : "Periodic_LY";
      const cy = row[cyKey] as number;
      const ly = row[lyKey] as number;
      const growth = ly !== 0 ? ((cy - ly) / Math.abs(ly)) * 100 : 0;
      return { name, cy, ly, growth: Math.round(growth * 100) / 100 };
    })
    .filter(Boolean) as { name: string; cy: number; ly: number; growth: number }[];

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No data found for the selected KPIs.</p>;
  }

  const label = comparisonBase === "ytd" ? "YTD" : "Periodic";
  const displayRows = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="space-y-4">
      <FinBarChart
        data={filtered.map((k) => ({ name: k.name, [`${label} Growth %`]: k.growth }))}
        xKey="name"
        yKeys={[`${label} Growth %`]}
        title={`${data.entity} — Custom Report (${label})`}
        colorByValue
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="th-financial px-3 py-2 text-left">KPI</th>
              <th className="th-financial px-3 py-2 text-right">{label} CY</th>
              <th className="th-financial px-3 py-2 text-right">{label} LY</th>
              <th className="th-financial px-3 py-2 text-right">Growth %</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((k) => (
              <tr key={k.name} className="border-b border-border/50">
                <td className="px-3 py-2">{k.name}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{k.cy?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{k.ly?.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${k.growth >= 0 ? "text-positive" : "text-negative"}`}>
                  {k.growth >= 0 ? "+" : ""}{k.growth}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-1.5 text-center text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show fewer" : `Show all ${filtered.length} rows`}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PES Report — FR8.8 progressive disclosure
// ============================================================

function PESReport({ data }: { data: { entity: string; pl: Record<string, unknown>[]; ncfo: Record<string, unknown>[] } }) {
  const [showAll, setShowAll] = useState(false);
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

  const displayRows = showAll ? kpis : kpis.slice(0, 10);

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
            {displayRows.map((k) => (
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
        {kpis.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-1.5 text-center text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show fewer" : `Show all ${kpis.length} rows`}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Variance Report — FR8.8 progressive disclosure
// ============================================================

function VarianceReport({ entity, data }: { entity: string; data: VarianceRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const top10 = [...data].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10);
  const displayRows = showAll ? data : data.slice(0, 10);

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
            {displayRows.map((v, i) => (
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
        {data.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-1.5 text-center text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show fewer" : `Show all ${data.length} rows`}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison Report — FR8.8 progressive disclosure
// ============================================================

function ComparisonReport({ data }: { data: ComparisonData }) {
  const [showAll, setShowAll] = useState(false);
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

  const displayRows = showAll ? rows : rows.slice(0, 10);

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
            {displayRows.map((r, i) => (
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
        {rows.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-1.5 text-center text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show fewer" : `Show all ${rows.length} rows`}
          </button>
        )}
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
