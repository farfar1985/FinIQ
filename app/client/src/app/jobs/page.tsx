"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Job, JobCounts, JobPriority, WsMessage } from "@/types";

// ============================================================
// Constants
// ============================================================

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  queued: "bg-warning/15 text-warning",
  assigned: "bg-primary/15 text-primary",
  processing: "bg-primary/20 text-primary",
  review: "bg-chart-5/15 text-chart-5",
  completed: "bg-positive/15 text-positive",
  failed: "bg-negative/15 text-negative",
};

const STATUS_DOT: Record<string, string> = {
  submitted: "bg-muted-foreground",
  queued: "bg-warning",
  assigned: "bg-primary",
  processing: "bg-primary animate-pulse",
  review: "bg-chart-5",
  completed: "bg-positive",
  failed: "bg-negative",
};

const PRIORITY_LABELS: Record<string, { label: string; color: string; sla: string }> = {
  critical: { label: "Critical", color: "text-negative", sla: "<2 min" },
  high: { label: "High", color: "text-warning", sla: "<10 min" },
  medium: { label: "Medium", color: "text-foreground", sla: "<30 min" },
  low: { label: "Low", color: "text-muted-foreground", sla: "<2 hr" },
};

const AGENT_OPTIONS = [
  { value: "", label: "Auto-assign" },
  { value: "pes", label: "PES Agent" },
  { value: "ci", label: "CI Agent" },
  { value: "forecasting", label: "Forecasting Agent" },
  { value: "adhoc", label: "Ad-Hoc Agent" },
];

const PRIORITY_OPTIONS: { value: JobPriority; label: string }[] = [
  { value: "medium", label: "Medium" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
];

// ============================================================
// WebSocket hook
// ============================================================

function useJobWebSocket(onJobUpdate: (job: Job) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onJobUpdateRef = useRef(onJobUpdate);
  onJobUpdateRef.current = onJobUpdate;

  const connect = useCallback(() => {
    // Use the raw WebSocket endpoint on the Express server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//localhost:3001/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log("[ws] Connected to FinIQ real-time updates");
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        if (message.type === "job:updated" && message.data?.job) {
          onJobUpdateRef.current(message.data.job as unknown as Job);
        }
      } catch (err) {
        console.error("[ws] Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("[ws] WebSocket error:", err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected };
}

// ============================================================
// Utility functions
// ============================================================

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || "bg-muted-foreground"}`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_LABELS[priority];
  if (!config) return <span className="text-xs text-muted-foreground">{priority}</span>;
  return (
    <span className={`text-[11px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function StatusCards({ counts }: { counts: JobCounts }) {
  const cards = [
    {
      label: "Active",
      count: counts.assigned + counts.processing + counts.review,
      color: "text-primary",
      sub: "assigned + processing + review",
    },
    { label: "Queued", count: counts.queued + counts.submitted, color: "text-warning", sub: "waiting for agent" },
    { label: "Completed", count: counts.completed, color: "text-positive", sub: "finished successfully" },
    { label: "Failed", count: counts.failed, color: "text-negative", sub: "errors encountered" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {card.label}
          </span>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${card.color}`}>
            {card.count}
          </div>
          <span className="text-[10px] text-muted-foreground">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}

function SubmitJobForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (query: string, priority: JobPriority, agentType: string) => void;
  submitting: boolean;
}) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<JobPriority>("medium");
  const [agentType, setAgentType] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit(query.trim(), priority, agentType);
    setQuery("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Submit New Job
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="job-query" className="mb-1 block text-xs text-muted-foreground">
            Query
          </label>
          <input
            id="job-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Generate PES summary for Mars Inc P5 FY2025..."
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={submitting}
          />
        </div>
        <div className="w-full sm:w-32">
          <label htmlFor="job-priority" className="mb-1 block text-xs text-muted-foreground">
            Priority
          </label>
          <select
            id="job-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as JobPriority)}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={submitting}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="job-agent" className="mb-1 block text-xs text-muted-foreground">
            Agent
          </label>
          <select
            id="job-agent"
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={submitting}
          >
            {AGENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!query.trim() || submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

function JobDetailPanel({
  job,
  onClose,
  onRetry,
}: {
  job: Job;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{job.id}</div>
          <div className="mt-1 text-sm font-medium">{job.query}</div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close detail panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
        <div>
          <div className="mb-1 text-muted-foreground">Status</div>
          <StatusBadge status={job.status} />
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Priority</div>
          <PriorityBadge priority={job.priority} />
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Agent</div>
          <div className="font-medium">{job.agent_name}</div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Intent</div>
          <div className="font-medium">{job.intent}</div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Created</div>
          <div className="font-mono">{new Date(job.created_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Updated</div>
          <div className="font-mono">{new Date(job.updated_at).toLocaleString()}</div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">SLA Deadline</div>
          <div className="font-mono">{new Date(job.sla_deadline).toLocaleString()}</div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Retries</div>
          <div className="font-mono">{job.retries} / {job.max_retries}</div>
        </div>
      </div>

      {job.result && (
        <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-positive">
            Result
          </div>
          <div className="text-xs text-foreground">
            <div className="font-medium">{job.result.summary}</div>
            {job.result.rows_analyzed !== undefined && (
              <div className="mt-1 text-muted-foreground">
                {job.result.rows_analyzed.toLocaleString()} rows analyzed across{" "}
                {job.result.tables_queried?.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {job.error && (
        <div className="mt-4 rounded-md border border-negative/30 bg-negative/10 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-negative">
            Error
          </div>
          <div className="text-xs text-negative">{job.error}</div>
        </div>
      )}

      {job.status === "failed" && job.retries < job.max_retries && (
        <div className="mt-4">
          <button
            onClick={() => onRetry(job.id)}
            className="rounded-md border border-warning/50 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
          >
            Retry Job (attempt {job.retries + 1} of {job.max_retries})
          </button>
        </div>
      )}
    </div>
  );
}

function JobTable({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: Job[];
  selectedId: string | null;
  onSelect: (job: Job) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No jobs yet. Submit a query above to create your first job.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="th-financial px-4 py-2.5">ID</th>
              <th className="th-financial px-4 py-2.5">Query</th>
              <th className="th-financial px-4 py-2.5">Status</th>
              <th className="th-financial px-4 py-2.5">Priority</th>
              <th className="th-financial px-4 py-2.5">Agent</th>
              <th className="th-financial px-4 py-2.5">Created</th>
              <th className="th-financial px-4 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/30 ${
                  selectedId === job.id ? "bg-secondary/50" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {job.id.slice(0, 8)}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs">
                  {truncate(job.query, 60)}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-2.5">
                  <PriorityBadge priority={job.priority} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {job.agent_name}
                </td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                  {timeAgo(job.created_at)}
                </td>
                <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                  {timeAgo(job.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts>({
    submitted: 0,
    queued: 0,
    assigned: 0,
    processing: 0,
    review: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle real-time job updates from WebSocket
  const handleJobUpdate = useCallback((updatedJob: Job) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === updatedJob.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedJob;
        return next;
      }
      return [updatedJob, ...prev];
    });

    // Recompute counts from the updated jobs list
    setCounts((prev) => {
      const newCounts = { ...prev };
      // We recalculate from scratch on next fetch, but for now update incrementally
      return newCounts;
    });

    // If this job is the selected one, update the detail panel
    setSelectedJob((prev) => {
      if (prev && prev.id === updatedJob.id) return updatedJob;
      return prev;
    });
  }, []);

  const { connected } = useJobWebSocket(handleJobUpdate);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const result = await api.getJobs();
      setJobs(result.jobs);
      setCounts(result.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    }
  }

  async function handleSubmit(query: string, priority: JobPriority, agentType: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submitJob({
        query,
        priority,
        agent_type: agentType || undefined,
      });
      // Add the new job to the list (WebSocket will also send updates)
      setJobs((prev) => [result.job, ...prev]);
      setCounts((prev) => ({
        ...prev,
        total: prev.total + 1,
        queued: prev.queued + 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit job");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry(jobId: string) {
    try {
      const result = await api.retryJob(jobId);
      // Update the job in the list
      setJobs((prev) => prev.map((j) => (j.id === result.job.id ? result.job : j)));
      setSelectedJob(result.job);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry job");
    }
  }

  // Periodically refresh counts (WebSocket handles individual job updates,
  // but counts need a full refresh to stay accurate)
  useEffect(() => {
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Job Board</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connected ? "bg-positive animate-pulse" : "bg-negative"
              }`}
            />
            <span className="text-[10px] text-muted-foreground">
              {connected ? "Live" : "Reconnecting..."}
            </span>
          </div>
          <button
            onClick={fetchJobs}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-negative/30 bg-negative/10 px-4 py-2 text-xs text-negative">
          {error}
        </div>
      )}

      {/* Status cards */}
      <StatusCards counts={counts} />

      {/* Submit form */}
      <SubmitJobForm onSubmit={handleSubmit} submitting={submitting} />

      {/* Selected job detail */}
      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRetry={handleRetry}
        />
      )}

      {/* Job table */}
      <JobTable
        jobs={jobs}
        selectedId={selectedJob?.id ?? null}
        onSelect={(job) =>
          setSelectedJob((prev) => (prev?.id === job.id ? null : job))
        }
      />
    </div>
  );
}
