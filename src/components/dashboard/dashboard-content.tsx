"use client";

import { useState, useCallback, useRef } from "react";
import { GripVertical } from "lucide-react";
import { generateKPISummary } from "@/data/simulated";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PLSummaryTable } from "@/components/dashboard/pl-summary-table";
import { RecentJobs } from "@/components/dashboard/recent-jobs";
import { CompetitorsCard } from "@/components/dashboard/competitors-card";
import { RevenueTreemap } from "@/components/dashboard/revenue-treemap";

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

// FR8.1: Dashboard widget definitions for drag-drop reordering
interface DashboardWidget {
  id: string;
  label: string;
  column: "main" | "side";
  component: () => React.ReactNode;
}

const DEFAULT_MAIN: DashboardWidget[] = [
  { id: "revenue-chart", label: "Revenue Trend", column: "main", component: () => <RevenueChart /> },
  { id: "treemap", label: "Revenue by GBU", column: "main", component: () => <RevenueTreemap /> },
  { id: "pl-table", label: "P&L Summary", column: "main", component: () => <PLSummaryTable /> },
];

const DEFAULT_SIDE: DashboardWidget[] = [
  { id: "recent-jobs", label: "Recent Jobs", column: "side", component: () => <RecentJobs /> },
  { id: "competitors", label: "Competitors", column: "side", component: () => <CompetitorsCard /> },
];

function DraggableWidget({
  widget,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  widget: DashboardWidget;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      className={`group relative transition-opacity ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="absolute -left-1 top-2 z-10 cursor-grab opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {widget.component()}
    </div>
  );
}

export function DashboardContent() {
  const [mainWidgets, setMainWidgets] = useState(DEFAULT_MAIN);
  const [sideWidgets, setSideWidgets] = useState(DEFAULT_SIDE);
  const dragIndex = useRef<number | null>(null);
  const dragColumn = useRef<"main" | "side">("main");

  const handleDragStart = useCallback((column: "main" | "side", index: number) => {
    dragIndex.current = index;
    dragColumn.current = column;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((column: "main" | "side", dropIndex: number) => {
    if (dragIndex.current === null || dragColumn.current !== column) return;
    const setter = column === "main" ? setMainWidgets : setSideWidgets;
    setter((prev) => {
      const items = [...prev];
      const [dragged] = items.splice(dragIndex.current!, 1);
      items.splice(dropIndex, 0, dragged);
      return items;
    });
    dragIndex.current = null;
  }, []);

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

      {/* Main Content Grid — FR8.1: Drag-drop reorderable widgets */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {mainWidgets.map((w, i) => (
            <DraggableWidget
              key={w.id}
              widget={w}
              index={i}
              onDragStart={(idx) => handleDragStart("main", idx)}
              onDragOver={handleDragOver}
              onDrop={(idx) => handleDrop("main", idx)}
              isDragging={dragIndex.current === i && dragColumn.current === "main"}
            />
          ))}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {sideWidgets.map((w, i) => (
            <DraggableWidget
              key={w.id}
              widget={w}
              index={i}
              onDragStart={(idx) => handleDragStart("side", idx)}
              onDragOver={handleDragOver}
              onDrop={(idx) => handleDrop("side", idx)}
              isDragging={dragIndex.current === i && dragColumn.current === "side"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
