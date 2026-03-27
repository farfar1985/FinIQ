"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "oklch(0.55 0.15 250)",  // chart-1 blue
  "oklch(0.70 0.17 160)",  // chart-2 green
  "oklch(0.65 0.20 25)",   // chart-3 red
  "oklch(0.70 0.15 80)",   // chart-4 amber
  "oklch(0.65 0.18 300)",  // chart-5 purple
];

interface FinAreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  height?: number;
}

export function FinAreaChart({ data, xKey, yKeys, title, height = 300 }: FinAreaChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {title && <h3 className="mb-3 text-sm font-medium">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            {yKeys.map((key, i) => (
              <linearGradient key={key} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 250)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
            stroke="oklch(0.25 0.005 250)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)", fontFamily: "JetBrains Mono" }}
            stroke="oklch(0.25 0.005 250)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.16 0.005 250)",
              border: "1px solid oklch(0.25 0.005 250)",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {yKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              fill={`url(#gradient-${i})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
