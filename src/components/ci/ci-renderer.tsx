/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ExternalLink } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import DataTable from "@/components/data-table";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "oklch(0.55 0.18 250)", "oklch(0.55 0.18 160)", "oklch(0.55 0.22 25)",
  "oklch(0.55 0.18 310)", "oklch(0.60 0.15 80)", "oklch(0.50 0.15 200)",
  "oklch(0.55 0.18 130)",
];

export interface CIBlock {
  type: "ci-summary" | "ci-comparison" | "ci-chart" | "ci-news" | "ci-profile";
  data: Record<string, unknown>;
}

/* -- Comparison Table -- */

function CIComparisonBlock({ data }: { data: Record<string, unknown> }) {
  const rows = (data.rows || []) as Record<string, string>[];
  const title = (data.title || "Comparison") as string;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <DataTable data={rows} />
    </div>
  );
}

/* -- Chart Block -- */

function CIChartBlock({ data }: { data: Record<string, unknown> }) {
  const chartData = (data.chartData || []) as Record<string, unknown>[];
  const title = (data.title || "Chart") as string;
  const dataKeys = (data.dataKeys || []) as string[];

  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
          {dataKeys.length === 0 && chartData.length > 0 && (() => {
            const keys = Object.keys(chartData[0]).filter(k => k !== "name");
            return keys.map((key, i) => (
              <Bar key={key} dataKey={key} radius={[4, 4, 0, 0]}>
                {chartData.map((_, j) => (
                  <Cell key={j} fill={CHART_COLORS[j % CHART_COLORS.length]} />
                ))}
              </Bar>
            ));
          })()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -- News Block -- */

function CINewsBlock({ data }: { data: Record<string, unknown> }) {
  const items = (data.items || []) as Array<{
    company?: string;
    title?: string;
    url?: string;
    date?: string;
    site?: string;
  }>;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="bg-card rounded-lg ring-1 ring-foreground/10 p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1"
            >
              {item.title}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {item.company && <span className="font-medium text-foreground">{item.company}</span>}
            {item.site && <span>{item.site}</span>}
            {item.date && <span>{item.date?.slice(0, 10)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -- Profile Block -- */

function CIProfileBlock({ data }: { data: Record<string, unknown> }) {
  const name = data.name as string;
  const symbol = data.symbol as string;
  const price = data.price as number | undefined;
  const mktCap = data.mktCap as number | undefined;
  const sector = data.sector as string | undefined;
  const ceo = data.ceo as string | undefined;
  const employees = data.employees as string | undefined;
  const description = data.description as string | undefined;

  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-sm">{name}</h4>
          <span className="text-xs text-muted-foreground font-mono">{symbol}</span>
        </div>
        {price !== undefined && (
          <div className="text-sm font-mono font-semibold">${price.toFixed(2)}</div>
        )}
      </div>
      {sector && <div className="text-xs text-muted-foreground">{sector}</div>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">Market Cap</span>
        <span className="font-mono">{mktCap ? `$${(mktCap / 1e9).toFixed(2)}B` : "N/A"}</span>
        <span className="text-muted-foreground">CEO</span>
        <span>{ceo || "N/A"}</span>
        <span className="text-muted-foreground">Employees</span>
        <span className="font-mono">{employees ? Number(employees).toLocaleString() : "N/A"}</span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-3">{description}</p>
      )}
    </div>
  );
}

/* -- Summary Block -- */

function CISummaryBlock({ data }: { data: Record<string, unknown> }) {
  const text = data.text as string;
  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
      <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>
    </div>
  );
}

/* -- Main Renderer -- */

export default function CIRenderer({ blocks }: { blocks: CIBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "ci-comparison":
            return <CIComparisonBlock key={i} data={block.data} />;
          case "ci-chart":
            return <CIChartBlock key={i} data={block.data} />;
          case "ci-news":
            return <CINewsBlock key={i} data={block.data} />;
          case "ci-profile":
            return <CIProfileBlock key={i} data={block.data} />;
          case "ci-summary":
            return <CISummaryBlock key={i} data={block.data} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
