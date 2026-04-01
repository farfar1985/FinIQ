"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * Revenue Treemap — Design Compliance #63
 *
 * Displays GBU revenue breakdown as a proportional treemap.
 */

const TREEMAP_DATA = [
  { name: "Petcare", size: 20_100, change: 3.2 },
  { name: "Snacking", size: 18_400, change: 1.8 },
  { name: "Food & Nutrition", size: 7_200, change: -0.5 },
  { name: "Wrigley", size: 5_800, change: 2.1 },
];

const COLORS = [
  "oklch(0.7 0.15 160)",  // teal
  "oklch(0.7 0.15 250)",  // blue
  "oklch(0.7 0.15 30)",   // orange
  "oklch(0.7 0.15 310)",  // purple
];

interface TreemapNode {
  name: string;
  size: number;
  change: number;
}

function TreemapTooltip({ active, payload }: { active?: boolean; payload?: { payload: TreemapNode }[] }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">${(d.size / 1000).toFixed(1)}B revenue</p>
      <p className={d.change >= 0 ? "text-emerald-400" : "text-red-400"}>
        {d.change >= 0 ? "+" : ""}{d.change.toFixed(1)}% YoY
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomContent(props: any) {
  const { x, y, width, height, index, name } = props;
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} rx={4} opacity={0.85} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="white" fontSize={12} fontWeight={600}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="white" fontSize={10} opacity={0.8}>
        ${(TREEMAP_DATA[index]?.size / 1000).toFixed(1)}B
      </text>
    </g>
  );
}

export function RevenueTreemap() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Revenue by GBU</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <Treemap
            data={TREEMAP_DATA}
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
