"use client";

import { FinAreaChart } from "./area-chart";
import { FinBarChart } from "./bar-chart";
import type { ChartConfig } from "@/types";

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
