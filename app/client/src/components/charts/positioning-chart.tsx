"use client";

/**
 * FR8.9: Extracted PositioningTab for dynamic/lazy loading.
 * Contains the heavy ScatterChart from recharts.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
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

const SCATTER_COLORS = [
  "oklch(0.55 0.15 250)",
  "oklch(0.70 0.17 160)",
  "oklch(0.65 0.20 25)",
  "oklch(0.70 0.15 80)",
  "oklch(0.65 0.18 300)",
  "oklch(0.65 0.12 190)",
  "oklch(0.60 0.18 350)",
  "oklch(0.68 0.16 55)",
  "oklch(0.50 0.18 270)",
  "oklch(0.72 0.15 130)",
];

interface PositioningData {
  points: { name: string; ticker: string; x: number; y: number; size: number; segment: string }[];
  xMetric: string;
  yMetric: string;
  xLabel: string;
  yLabel: string;
  availableMetrics: { key: string; label: string }[];
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

export function PositioningChart() {
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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}

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
