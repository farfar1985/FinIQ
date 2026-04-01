"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { generateTimeSeriesData } from "@/data/simulated";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-semibold tabular-nums text-foreground">
        ${payload[0].value.toFixed(2)}M
      </p>
    </div>
  );
}

export function RevenueChart() {
  const [data, setData] = useState(generateTimeSeriesData(12));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.timeSeries && json.timeSeries.length > 0) {
          setData(json.timeSeries);
        }
      } catch {
        // Keep simulated fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.35 0 0)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => {
                    if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
                    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
                    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                    return `$${v.toFixed(0)}`;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.65 0.15 250)"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
