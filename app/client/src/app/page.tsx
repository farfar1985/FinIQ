"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Briefcase } from "lucide-react";
import { FinBarChart } from "@/components/charts/bar-chart";

interface KPIData {
  kpi: string;
  ytd_cy: number;
  ytd_ly: number;
  ytd_growth: number;
  periodic_cy: number;
  periodic_ly: number;
  periodic_growth: number;
}

const KPI_ICONS: Record<string, typeof TrendingUp> = {
  "Organic Growth": TrendingUp,
  "MAC Shape %": BarChart3,
  "A&CP Shape %": DollarSign,
  "CE Shape %": Activity,
  "Controllable Overhead Shape %": TrendingDown,
  "NCFO": DollarSign,
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityCount, setEntityCount] = useState(0);

  useEffect(() => {
    // Fetch PES data for Mars Inc
    Promise.all([
      fetch("/api/reports/pes/Mars Inc").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([pesData, health]) => {
        if (pesData.pl) {
          // Group by Account_KPI, latest period
          const kpiMap: Record<string, KPIData> = {};
          for (const row of [...(pesData.pl || []), ...(pesData.ncfo || [])]) {
            const key = row.Account_KPI || row.Entity;
            if (!kpiMap[key]) {
              const ytdGrowth = row.YTD_LY !== 0 ? ((row.YTD_CY - row.YTD_LY) / Math.abs(row.YTD_LY)) * 100 : 0;
              const pGrowth = row.Periodic_LY !== 0 ? ((row.Periodic_CY - row.Periodic_LY) / Math.abs(row.Periodic_LY)) * 100 : 0;
              kpiMap[key] = {
                kpi: key,
                ytd_cy: row.YTD_CY,
                ytd_ly: row.YTD_LY,
                ytd_growth: Math.round(ytdGrowth * 100) / 100,
                periodic_cy: row.Periodic_CY,
                periodic_ly: row.Periodic_LY,
                periodic_growth: Math.round(pGrowth * 100) / 100,
              };
            }
          }
          // Filter to main 6 KPIs
          const mainKPIs = ["Organic Growth", "MAC Shape %", "A&CP Shape %", "CE Shape %", "Controllable Overhead Shape %", "NCFO"];
          const filtered = mainKPIs.map((k) => kpiMap[k]).filter(Boolean);
          setKpis(filtered);
        }
        setEntityCount(health.database?.entityCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = kpis.map((k) => ({
    name: k.kpi.length > 15 ? k.kpi.substring(0, 15) + "..." : k.kpi,
    "YTD Growth %": k.ytd_growth,
    "Periodic Growth %": k.periodic_growth,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Dashboard — Mars Inc</h1>
        <span className="text-xs text-muted-foreground">{entityCount} entities tracked</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
            ))
          : kpis.map((kpi) => {
              const Icon = KPI_ICONS[kpi.kpi] || Activity;
              return (
                <div key={kpi.kpi} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.kpi}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 font-mono text-lg font-semibold tabular-nums">
                    {kpi.ytd_cy?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        kpi.ytd_growth > 0
                          ? "text-positive"
                          : kpi.ytd_growth < 0
                          ? "text-negative"
                          : "text-muted-foreground"
                      }`}
                    >
                      {kpi.ytd_growth > 0 ? "+" : ""}
                      {kpi.ytd_growth}% YTD
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartData.length > 0 && (
          <FinBarChart
            data={chartData}
            xKey="name"
            yKeys={["YTD Growth %", "Periodic Growth %"]}
            title="KPI Performance — Mars Inc"
            height={280}
          />
        )}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Period End Summary", href: "/chat", query: "Generate period end summary for Mars Inc" },
              { label: "Budget Variance", href: "/chat", query: "Show budget variance for Mars Inc" },
              { label: "Growth Rankings", href: "/chat", query: "Which sub-units have the highest organic growth?" },
              { label: "Trend Analysis", href: "/chat", query: "Show organic growth trend for Mars Inc" },
            ].map((action) => (
              <a
                key={action.label}
                href={`${action.href}?q=${encodeURIComponent(action.query)}`}
                className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Briefcase className="h-3 w-3" />
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
