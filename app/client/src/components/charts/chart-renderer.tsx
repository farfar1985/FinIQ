"use client";

import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { FinAreaChart } from "./area-chart";
import { FinBarChart } from "./bar-chart";
import type { ChartConfig } from "@/types";

const TREEMAP_COLORS = [
  "oklch(0.55 0.15 250)",
  "oklch(0.70 0.17 160)",
  "oklch(0.65 0.20 25)",
  "oklch(0.70 0.15 80)",
  "oklch(0.65 0.18 300)",
  "oklch(0.65 0.12 190)",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function TreemapCell(props: any) {
  const { x, y, width: w, height: h, name, fill } = props;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} opacity={0.85} rx={2} />
      {w > 40 && h > 20 && (
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={10}>
          {String(name || "").length > 12 ? String(name).slice(0, 10) + "..." : name}
        </text>
      )}
    </g>
  );
}

interface ChartRendererProps {
  config: ChartConfig | null | undefined;
}

export function ChartRenderer({ config }: ChartRendererProps) {
  if (!config || !config.data || config.data.length === 0) return null;

  switch (config.type) {
    case "area":
    case "line":
      return (
        <FinAreaChart
          data={config.data}
          xKey={config.xKey}
          yKeys={config.yKeys}
          title={config.title}
        />
      );
    case "bar":
    case "composed":
      return (
        <FinBarChart
          data={config.data}
          xKey={config.xKey}
          yKeys={config.yKeys}
          title={config.title}
          colorByValue={config.yKeys.length === 1}
        />
      );
    case "treemap": {
      const treemapData = config.data.map((d, i) => ({
        name: String(d[config.xKey] || ""),
        size: Number(d[config.yKeys[0]] || 0),
        fill: TREEMAP_COLORS[i % TREEMAP_COLORS.length],
      }));
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          {config.title && <h3 className="mb-3 text-xs font-medium text-muted-foreground">{config.title}</h3>}
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              stroke="oklch(0.25 0.005 250)"
              content={<TreemapCell />}
            >
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.16 0.005 250)", border: "1px solid oklch(0.25 0.005 250)", borderRadius: 6, fontSize: 11 }}
                itemStyle={{ color: "oklch(0.93 0 0)" }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      );
    }
    default:
      return (
        <FinBarChart
          data={config.data}
          xKey={config.xKey}
          yKeys={config.yKeys}
          title={config.title}
        />
      );
  }
}
