"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

const COLORS = [
  "oklch(0.55 0.15 250)",
  "oklch(0.70 0.17 160)",
  "oklch(0.65 0.20 25)",
  "oklch(0.70 0.15 80)",
  "oklch(0.65 0.18 300)",
];

const POSITIVE_COLOR = "oklch(0.70 0.17 160)";
const NEGATIVE_COLOR = "oklch(0.65 0.20 25)";

interface FinBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  height?: number;
  colorByValue?: boolean;
}

export function FinBarChart({ data, xKey, yKeys, title, height = 300, colorByValue = false }: FinBarChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {title && <h3 className="mb-3 text-sm font-medium">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 250)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
            stroke="oklch(0.25 0.005 250)"
            angle={data.length > 8 ? -45 : 0}
            textAnchor={data.length > 8 ? "end" : "middle"}
            height={data.length > 8 ? 80 : 30}
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
          {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: "12px" }} />}
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} radius={[4, 4, 0, 0]}>
              {colorByValue && yKeys.length === 1
                ? data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={(entry[key] as number) >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                    />
                  ))
                : data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[i % COLORS.length]} />
                  ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
