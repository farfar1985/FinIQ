"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, ArrowUpDown, Clock, CheckCircle2, Cpu, Activity, X, RotateCcw, Download, Pencil, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

// ---- Types matching the API response ----------------------------------------

interface JobRecord {
  id: string;
  query: string;
  title: string;
  status: "submitted" | "queued" | "processing" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  type: "PES" | "CI" | "Forecast" | "Ad-Hoc";
  agent_type: string;
  agent_name: string;
  intent: string;
  sla_target_minutes: number;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  submitted_by: string;
  result: JobResult | null;
  error: string | null;
  retries: number;
  max_retries: number;
}

interface JobResult {
  summary?: string;
  data?: {
    type?: string;
    columns?: string[];
    rows?: Record<string, unknown>[];
    chartData?: { label: string; value: number }[];
    chartType?: string;
  };
  intent?: string;
  generated_at?: string;
}

interface JobCounts {
  submitted: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

const STATUS_TABS = ["All", "Queued", "Processing", "Completed", "Failed"] as const;

const statusColors: Record<string, string> = {
  submitted: "bg-gray-500/15 text-gray-400 border border-gray-500/25",
  queued: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  processing: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  failed: "bg-red-500/15 text-red-400 border border-red-500/25",
};

const typeColors: Record<string, string> = {
  PES: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  CI: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  Forecast: "bg-teal-500/15 text-teal-400 border border-teal-500/25",
  "Ad-Hoc": "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
};

type SortField = "id" | "title" | "type" | "priority" | "status" | "submitted_by" | "created_at" | "sla_target_minutes" | "agent_name";
type SortDir = "asc" | "desc";

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { processing: 0, queued: 1, submitted: 2, completed: 3, failed: 4 };

const JOB_TYPES = ["PES", "CI", "Forecast", "Ad-Hoc"] as const;
const JOB_PRIORITIES = ["critical", "high", "medium", "low"] as const;

const POLL_INTERVAL_MS = 5000;

export function JobsContent() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [counts, setCounts] = useState<JobCounts>({ submitted: 0, queued: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);

  // Submit Job modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const [newType, setNewType] = useState<(typeof JOB_TYPES)[number]>("PES");
  const [newPriority, setNewPriority] = useState<(typeof JOB_PRIORITIES)[number]>("medium");
  const [submitting, setSubmitting] = useState(false);

  // Job drill-down state
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch jobs from API --------------------------------------------------

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
      setCounts(data.counts || { submitted: 0, queued: 0, processing: 0, completed: 0, failed: 0, total: 0 });

      // Update selected job if it changed
      if (data.jobs) {
        setSelectedJob((prev) => {
          if (!prev) return null;
          const updated = (data.jobs as JobRecord[]).find((j: JobRecord) => j.id === prev.id);
          return updated || prev;
        });
      }
    } catch {
      // Silently fail on poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Start polling on mount + SSE for real-time updates (FR8.3)
  useEffect(() => {
    fetchJobs();
    pollRef.current = setInterval(fetchJobs, POLL_INTERVAL_MS);

    // Connect SSE stream for real-time job updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/jobs/stream");

      eventSource.addEventListener("job:created", () => {
        // Refresh job list when a new job is created
        fetchJobs();
      });
      eventSource.addEventListener("job:completed", () => {
        fetchJobs();
      });
      eventSource.addEventListener("job:failed", () => {
        fetchJobs();
      });
      eventSource.addEventListener("job:updated", () => {
        fetchJobs();
      });

      eventSource.onerror = () => {
        // SSE connection error — polling continues as fallback
        eventSource?.close();
      };
    } catch {
      // SSE not available — polling continues as fallback
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      eventSource?.close();
    };
  }, [fetchJobs]);

  // ---- Sorting --------------------------------------------------------------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = jobs;
    if (activeTab !== "All") {
      list = list.filter((j) => j.status === activeTab.toLowerCase());
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "priority") {
        cmp = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      } else if (sortField === "status") {
        cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      } else if (sortField === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "sla_target_minutes") {
        cmp = a.sla_target_minutes - b.sla_target_minutes;
      } else {
        cmp = String(a[sortField as keyof JobRecord] ?? "").localeCompare(String(b[sortField as keyof JobRecord] ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [jobs, activeTab, sortField, sortDir]);

  // ---- KPI calculations -----------------------------------------------------

  const avgProcessingMin = useMemo(() => {
    const completed = jobs.filter((j) => j.completed_at);
    if (!completed.length) return 0;
    const total = completed.reduce((sum, j) => {
      return sum + (new Date(j.completed_at!).getTime() - new Date(j.created_at).getTime()) / 60000;
    }, 0);
    return Math.round(total / completed.length);
  }, [jobs]);

  const slaCompliance = useMemo(() => {
    const completed = jobs.filter((j) => j.completed_at);
    if (!completed.length) return 0;
    const withinSla = completed.filter((j) => {
      const dur = (new Date(j.completed_at!).getTime() - new Date(j.created_at).getTime()) / 60000;
      return dur <= j.sla_target_minutes;
    });
    return Math.round((withinSla.length / completed.length) * 100);
  }, [jobs]);

  const agentsOnline = useMemo(() => {
    const activeTypes = new Set(jobs.filter((j) => j.status === "processing").map((j) => j.agent_type));
    return Math.max(activeTypes.size, 4); // At least 4 agent types available
  }, [jobs]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ---- Submit a new job via API ---------------------------------------------

  const handleSubmitJob = useCallback(async () => {
    if (!newQuery.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: newQuery.trim(),
          title: newQuery.trim(),
          type: newType,
          priority: newPriority,
        }),
      });

      if (res.ok) {
        setShowSubmitModal(false);
        setNewQuery("");
        setNewType("PES");
        setNewPriority("medium");
        // Immediately fetch to show the new job
        await fetchJobs();
      }
    } catch {
      // Submission failed silently
    } finally {
      setSubmitting(false);
    }
  }, [newQuery, newType, newPriority, submitting, fetchJobs]);

  // ---- Retry a failed job ---------------------------------------------------

  const handleRetryJob = useCallback(async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      await fetchJobs();
    } catch {
      // Retry failed silently
    }
  }, [fetchJobs]);

  // ---- Export job result ----------------------------------------------------

  const handleExportJob = useCallback(async (job: JobRecord, format: "xlsx" | "csv" | "json") => {
    const result = job.result as JobResult | null;
    if (!result?.data?.rows || result.data.rows.length === 0) return;

    try {
      const res = await fetch(`/api/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: result.data.rows,
          filename: `finiq-job-${job.id}`,
          title: job.title,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finiq-job-${job.id}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Export failed silently
    }
  }, []);

  // ---- Edit job state & handler -----------------------------------------------

  const [editingJob, setEditingJob] = useState(false);
  const [editPriority, setEditPriority] = useState<(typeof JOB_PRIORITIES)[number]>("medium");
  const [editTitle, setEditTitle] = useState("");

  const startEditingJob = useCallback((job: JobRecord) => {
    setEditingJob(true);
    setEditPriority(job.priority);
    setEditTitle(job.title);
  }, []);

  const handleSaveJobEdit = useCallback(async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`/api/jobs/${selectedJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: editPriority, title: editTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data.job);
        setEditingJob(false);
        await fetchJobs();
      }
    } catch {
      // Edit failed silently
    }
  }, [selectedJob, editPriority, editTitle, fetchJobs]);

  // ---- Duration helper ------------------------------------------------------

  const getJobDuration = (job: JobRecord): string => {
    const end = job.completed_at ? new Date(job.completed_at) : new Date();
    const mins = Math.round((end.getTime() - new Date(job.created_at).getTime()) / 60000);
    if (mins < 1) return "<1 min";
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Job Board</h1>
          <Badge variant="secondary">{counts.queued + counts.processing} Active</Badge>
          <Badge variant="secondary">{counts.queued} Queued</Badge>
          <Badge variant="secondary">{counts.completed} Completed</Badge>
        </div>
        <Button onClick={() => setShowSubmitModal(true)}>
          <Plus className="h-4 w-4" />
          Submit Job
        </Button>
      </div>

      {/* Submit Job Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Submit New Job</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowSubmitModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Query</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/30"
                    placeholder="Enter your query... e.g. 'Show organic growth for Mars Petcare P06 2025'"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as typeof newType)}
                    >
                      {JOB_TYPES.map((t) => (
                        <SelectOption key={t} value={t}>{t}</SelectOption>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <Select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}
                    >
                      {JOB_PRIORITIES.map((p) => (
                        <SelectOption key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectOption>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitJob} disabled={!newQuery.trim() || submitting}>
                    <Plus className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Jobs</p>
              <p className="text-xl font-semibold">{counts.queued + counts.processing}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Processing Time</p>
              <p className="text-xl font-semibold">{avgProcessingMin} min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SLA Compliance</p>
              <p className="text-xl font-semibold">{slaCompliance}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15">
              <Cpu className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Agents Online</p>
              <p className="text-xl font-semibold">{agentsOnline}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Detail Panel */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job Details</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-3">
                  {editingJob ? (
                    <input
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  ) : (
                    <h3 className="text-base font-semibold">{selectedJob.title}</h3>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedJob.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${statusColors[selectedJob.status] || ""}`}
                  >
                    {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                  </span>
                  {editingJob ? (
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as typeof editPriority)}
                      className="h-6 rounded-md border border-input bg-background px-1 text-xs text-foreground"
                    >
                      {JOB_PRIORITIES.map((p) => (
                        <option key={p} value={p} className="bg-background text-foreground">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <SeverityBadge severity={selectedJob.priority}>
                      {selectedJob.priority.charAt(0).toUpperCase() + selectedJob.priority.slice(1)}
                    </SeverityBadge>
                  )}
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${typeColors[selectedJob.type] || ""}`}
                  >
                    {selectedJob.type}
                  </span>
                </div>
              </div>

              {/* Query text */}
              <div className="rounded-lg border border-foreground/5 bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Query</p>
                <p className="mt-1 text-sm">{selectedJob.query}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-lg border border-foreground/5 p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="mt-0.5 text-sm">{formatDate(selectedJob.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</p>
                  <p className="mt-0.5 text-sm">
                    {selectedJob.completed_at ? formatDate(selectedJob.completed_at) : "In progress"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requestor</p>
                  <p className="mt-0.5 text-sm">{selectedJob.submitted_by}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA Target</p>
                  <p className="mt-0.5 text-sm">{selectedJob.sla_target_minutes} min</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Duration</p>
                  <p className="mt-0.5 text-sm">{getJobDuration(selectedJob)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agent</p>
                  <p className="mt-0.5 text-sm">{selectedJob.agent_name}</p>
                </div>
              </div>

              {/* Result display for completed jobs */}
              {selectedJob.status === "completed" && selectedJob.result && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400">Result</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {(selectedJob.result as JobResult)?.summary || "Job completed successfully."}
                    </p>
                  </div>

                  {/* Data table if available */}
                  {(selectedJob.result as JobResult)?.data?.rows && (selectedJob.result as JobResult).data!.rows!.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-foreground/5">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30">
                          <tr>
                            {((selectedJob.result as JobResult).data!.columns || Object.keys((selectedJob.result as JobResult).data!.rows![0])).map((col) => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedJob.result as JobResult).data!.rows!.slice(0, 20).map((row, i) => (
                            <tr key={i} className="border-t border-foreground/5">
                              {((selectedJob.result as JobResult).data!.columns || Object.keys(row)).map((col) => (
                                <td key={col} className="px-3 py-1.5">
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Export buttons */}
                  {(selectedJob.result as JobResult)?.data?.rows && (selectedJob.result as JobResult).data!.rows!.length > 0 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExportJob(selectedJob, "xlsx")}>
                        <Download className="h-3 w-3" />
                        XLSX
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportJob(selectedJob, "csv")}>
                        <Download className="h-3 w-3" />
                        CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportJob(selectedJob, "json")}>
                        <Download className="h-3 w-3" />
                        JSON
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Error display for failed jobs */}
              {selectedJob.status === "failed" && selectedJob.error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-red-400">Error</p>
                  <p className="mt-1 text-sm text-red-300">{selectedJob.error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSelectedJob(null); setEditingJob(false); }}>
                  Close
                </Button>
                {selectedJob.status !== "processing" && !editingJob && (
                  <Button variant="outline" onClick={() => startEditingJob(selectedJob)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {editingJob && (
                  <>
                    <Button variant="outline" onClick={() => setEditingJob(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveJobEdit}>
                      <Check className="h-4 w-4" />
                      Save
                    </Button>
                  </>
                )}
                {selectedJob.status === "failed" && selectedJob.retries < selectedJob.max_retries && (
                  <Button variant="outline" onClick={() => handleRetryJob(selectedJob.id)}>
                    <RotateCcw className="h-4 w-4" />
                    Retry ({selectedJob.retries}/{selectedJob.max_retries})
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Tabs + Table */}
      <Card>
        <CardHeader>
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {tab}
                {tab !== "All" && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {counts[tab.toLowerCase() as keyof JobCounts] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading jobs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <p>No jobs found.</p>
              <p className="mt-1 text-xs">Submit a new job to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader field="id">ID</SortHeader></TableHead>
                  <TableHead><SortHeader field="title">Title</SortHeader></TableHead>
                  <TableHead><SortHeader field="type">Type</SortHeader></TableHead>
                  <TableHead><SortHeader field="priority">Priority</SortHeader></TableHead>
                  <TableHead><SortHeader field="status">Status</SortHeader></TableHead>
                  <TableHead><SortHeader field="submitted_by">Requestor</SortHeader></TableHead>
                  <TableHead><SortHeader field="created_at">Created</SortHeader></TableHead>
                  <TableHead><SortHeader field="sla_target_minutes">SLA Target</SortHeader></TableHead>
                  <TableHead><SortHeader field="agent_name">Agent</SortHeader></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <TableRow
                    key={job.id}
                    className={`cursor-pointer ${selectedJob?.id === job.id ? "bg-muted/50" : ""}`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell className="max-w-[240px] truncate font-medium">{job.title}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${typeColors[job.type] || ""}`}
                      >
                        {job.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={job.priority}>
                        {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                      </SeverityBadge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${statusColors[job.status] || ""}`}
                      >
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{job.submitted_by.split("@")[0].replace(".", " ")}</TableCell>
                    <TableCell className="text-xs">{formatDate(job.created_at)}</TableCell>
                    <TableCell className="text-xs">{job.sla_target_minutes} min</TableCell>
                    <TableCell className="text-xs">{job.agent_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
