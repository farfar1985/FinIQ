"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { generateJobs } from "@/data/simulated";

const statusMap: Record<string, string> = {
  queued: "pending",
  processing: "active",
  completed: "success",
  failed: "error",
};

const typeColors: Record<string, string> = {
  PES: "bg-blue-500/15 text-blue-400",
  CI: "bg-purple-500/15 text-purple-400",
  Forecast: "bg-cyan-500/15 text-cyan-400",
  "Ad-Hoc": "bg-zinc-500/15 text-zinc-400",
};

function timeAgo(dateStr: string): string {
  const now = new Date(2025, 5, 30);
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHrs > 0) return `${diffHrs}h ago`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `${diffMin}m ago`;
}

const jobs = generateJobs()
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .slice(0, 5);

export function RecentJobs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium leading-snug line-clamp-2">
                {job.title}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {timeAgo(job.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${typeColors[job.type] ?? typeColors["Ad-Hoc"]}`}
              >
                {job.type}
              </span>
              <StatusBadge status={statusMap[job.status] ?? "inactive"}>
                {job.status}
              </StatusBadge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
