"use client";

import { generateKPISummary } from "@/data/simulated";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PLSummaryTable } from "@/components/dashboard/pl-summary-table";
import { RecentJobs } from "@/components/dashboard/recent-jobs";
import { CompetitorsCard } from "@/components/dashboard/competitors-card";

const kpis = generateKPISummary();

function formatKPIValue(value: number, unit: "%" | "$M" | "$B"): string {
  switch (unit) {
    case "%":
      return `${value.toFixed(1)}%`;
    case "$M":
      return `$${value.toFixed(0)}M`;
    case "$B":
      return `$${value.toFixed(1)}B`;
  }
}

export function DashboardContent() {
  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.label}
            value={formatKPIValue(kpi.value, kpi.unit)}
            change={kpi.change}
            sparklineData={kpi.trend}
            status={kpi.status}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Charts & Tables */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <RevenueChart />
          <PLSummaryTable />
        </div>

        {/* Right: Jobs & Competitors */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <RecentJobs />
          <CompetitorsCard />
        </div>
      </div>
    </div>
  );
}
