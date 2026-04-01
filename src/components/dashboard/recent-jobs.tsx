"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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

interface Job {
  id: string;
  query?: string;
  title?: string;
  type?: string;
  status: string;
  priority?: string;
  created_at?: string;
  createdAt?: string;
  agent?: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHrs > 0) return `${diffHrs}h ago`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

export function RecentJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) return;
        const json = await res.json();
        const jobList = json.jobs ?? json ?? [];
        if (!cancelled && Array.isArray(jobList)) {
          setJobs(
            jobList
              .sort((a: Job, b: Job) =>
                new Date(b.created_at || b.createdAt || 0).getTime() -
                new Date(a.created_at || a.createdAt || 0).getTime()
              )
              .slice(0, 5)
          );
        }
      } catch {
        // Keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJobs();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No jobs submitted yet. Use the Query page to create jobs.
          </p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium leading-snug line-clamp-2">
                  {job.title || job.query || job.id}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {job.created_at || job.createdAt ? timeAgo(job.created_at || job.createdAt!) : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${typeColors[job.type ?? "Ad-Hoc"] ?? typeColors["Ad-Hoc"]}`}
                >
                  {job.type || job.agent || "Ad-Hoc"}
                </span>
                <StatusBadge status={statusMap[job.status] ?? "inactive"}>
                  {job.status}
                </StatusBadge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
