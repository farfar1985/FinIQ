import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Users,
} from "lucide-react";

const kpiCards = [
  {
    label: "Organic Growth",
    value: "+3.2%",
    change: 0.8,
    icon: TrendingUp,
    period: "YTD FY2025",
  },
  {
    label: "MAC Shape",
    value: "42.1%",
    change: -0.3,
    icon: BarChart3,
    period: "YTD FY2025",
  },
  {
    label: "A&CP Shape",
    value: "8.7%",
    change: 0.2,
    icon: DollarSign,
    period: "YTD FY2025",
  },
  {
    label: "CE Shape",
    value: "15.4%",
    change: 1.1,
    icon: Activity,
    period: "YTD FY2025",
  },
  {
    label: "Controllable OH",
    value: "6.2%",
    change: -0.5,
    icon: TrendingDown,
    period: "YTD FY2025",
  },
  {
    label: "Active Jobs",
    value: "12",
    change: 0,
    icon: Users,
    period: "Today",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Dashboard</h1>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums">
                {kpi.value}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`font-mono text-xs tabular-nums ${
                    kpi.change > 0
                      ? "text-positive"
                      : kpi.change < 0
                      ? "text-negative"
                      : "text-muted-foreground"
                  }`}
                >
                  {kpi.change > 0 ? "+" : ""}
                  {kpi.change !== 0 ? `${kpi.change.toFixed(1)}%` : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {kpi.period}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Performance Trend</h2>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Chart will render here after Batch 3
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Recent Jobs</h2>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Job activity will appear here after Batch 5
          </div>
        </div>
      </div>
    </div>
  );
}
