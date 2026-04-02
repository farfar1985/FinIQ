"use client";

import { useState, useEffect } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TreemapNode {
  name: string;
  size: number;
  change: number;
}

const COLORS = [
  "oklch(0.7 0.15 160)",  // teal
  "oklch(0.7 0.15 250)",  // blue
  "oklch(0.7 0.15 30)",   // orange
  "oklch(0.7 0.15 310)",  // purple
  "oklch(0.7 0.15 200)",  // cyan
  "oklch(0.7 0.15 90)",   // yellow
];

function TreemapTooltip({ active, payload }: { active?: boolean; payload?: { payload: TreemapNode }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const revB = d.size / 1_000_000_000;
  return (
    <div className="rounded-md border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">${revB >= 1 ? `${revB.toFixed(1)}B` : `${(d.size / 1_000_000).toFixed(0)}M`} revenue</p>
      <p className={d.change >= 0 ? "text-emerald-400" : "text-red-400"}>
        {d.change >= 0 ? "+" : ""}{d.change.toFixed(1)}% YoY
      </p>
    </div>
  );
}

// Store data at module level for the CustomContent renderer
let _treemapData: TreemapNode[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x, y, width, height, index, name } = props;
  if (width < 40 || height < 30) return null;
  const node = _treemapData[index];
  const revB = node ? node.size / 1_000_000_000 : 0;
  const label = revB >= 1 ? `$${revB.toFixed(1)}B` : `$${((node?.size || 0) / 1_000_000).toFixed(0)}M`;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} rx={4} opacity={0.85} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="white" fontSize={12} fontWeight={600}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="white" fontSize={10} opacity={0.8}>
        {label}
      </text>
    </g>
  );
}

export function RevenueTreemap() {
  const [data, setData] = useState<TreemapNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      for (let attempt = 0; attempt < 60; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/dashboard");
          if (res.status === 202) { await new Promise((r) => setTimeout(r, 5000)); continue; }
          if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        // Extract GBU-level revenue from P&L summary
        if (json.plSummary?.rows?.length > 0) {
          const gbuRows = json.plSummary.rows
            .filter((r: Record<string, unknown>) => {
              const entity = String(r.Entity || "").toLowerCase();
              return entity.includes("gbu") || entity.includes("mars incorporated");
            })
            .slice(0, 6)
            .map((r: Record<string, unknown>) => {
              const revStr = String(r["Revenue ($M)"] || "0").replace(/[^0-9.\-]/g, "");
              const rev = parseFloat(revStr) * 1_000_000; // Convert $M back to raw
              const yoyStr = String(r["Rev YoY"] || "0").replace(/[^0-9.\-]/g, "");
              const yoy = parseFloat(yoyStr);
              // Shorten entity name for display
              let name = String(r.Entity || "");
              name = name.replace(" ex Russia", "").replace("GBU ", "").replace("Mars ", "");
              return { name, size: Math.abs(rev), change: yoy };
            })
            .filter((d: TreemapNode) => d.size > 0);

          if (gbuRows.length > 0) {
            _treemapData = gbuRows;
            setData(gbuRows);
          }
        }
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 5000));
      }
      }
    }
    fetchData().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue by GBU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Revenue by GBU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No GBU revenue data available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Revenue by GBU</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<CustomContent />}
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
