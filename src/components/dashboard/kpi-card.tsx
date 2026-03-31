"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChangeBadge } from "@/components/ui/change-badge";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  sparklineData: number[];
  status: "positive" | "neutral" | "negative";
}

const statusColors: Record<KPICardProps["status"], string> = {
  positive: "bg-emerald-400",
  neutral: "bg-amber-400",
  negative: "bg-red-400",
};

export function KPICard({ title, value, change, sparklineData, status }: KPICardProps) {
  return (
    <Card className="gap-2 py-3">
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span
            className={cn("size-1.5 rounded-full", statusColors[status])}
            title={status}
          />
        </div>
        <div className="text-lg font-semibold font-mono tabular-nums leading-none">
          {value}
        </div>
        <div className="flex items-center justify-between gap-2">
          <ChangeBadge value={change} format="percent" />
          <Sparkline data={sparklineData} width={64} height={20} />
        </div>
      </CardContent>
    </Card>
  );
}
