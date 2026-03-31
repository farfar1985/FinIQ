"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, ArrowUpDown, Clock, CheckCircle2, Cpu, Activity, X } from "lucide-react";
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
import { generateJobs, type Job } from "@/data/simulated";

const STATUS_TABS = ["All", "Queued", "Processing", "Completed", "Failed"] as const;

const statusColors: Record<Job["status"], string> = {
  queued: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  processing: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  failed: "bg-red-500/15 text-red-400 border border-red-500/25",
};

const typeColors: Record<Job["type"], string> = {
  PES: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  CI: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  Forecast: "bg-teal-500/15 text-teal-400 border border-teal-500/25",
  "Ad-Hoc": "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
};

type SortField = "id" | "title" | "type" | "priority" | "status" | "requestor" | "created_at" | "sla_target_minutes" | "agent";
type SortDir = "asc" | "desc";

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { processing: 0, queued: 1, completed: 2, failed: 3 };

const JOB_TYPES: Job["type"][] = ["PES", "CI", "Forecast", "Ad-Hoc"];
const JOB_PRIORITIES: Job["priority"][] = ["critical", "high", "medium", "low"];

export function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>(() => generateJobs());
  const [activeTab, setActiveTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // CR-015: Submit Job modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Job["type"]>("PES");
  const [newPriority, setNewPriority] = useState<Job["priority"]>("medium");
  const [newDescription, setNewDescription] = useState("");

  // CR-019: Job drill-down state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const counts = useMemo(() => {
    const c = { queued: 0, processing: 0, completed: 0, failed: 0 };
    for (const j of jobs) c[j.status]++;
    return c;
  }, [jobs]);

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
        cmp = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [jobs, activeTab, sortField, sortDir]);

  // KPI calculations
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // CR-015: Submit a new job
  const handleSubmitJob = useCallback(() => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const id = `JOB-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const newJob: Job = {
      id,
      title: newTitle.trim(),
      type: newType,
      status: "queued",
      priority: newPriority,
      requestor: "current.user@mars.com",
      created_at: now,
      completed_at: null,
      sla_target_minutes: newPriority === "critical" ? 15 : newPriority === "high" ? 30 : newPriority === "medium" ? 60 : 120,
      agent: "Unassigned",
    };
    setJobs((prev) => [newJob, ...prev]);
    setShowSubmitModal(false);
    setNewTitle("");
    setNewType("PES");
    setNewPriority("medium");
    setNewDescription("");
  }, [newTitle, newType, newPriority]);

  // CR-019: Cancel a job
  const handleCancelJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: "failed" as const } : j))
    );
    setSelectedJob((prev) => (prev && prev.id === jobId ? { ...prev, status: "failed" } : prev));
  }, []);

  // CR-019: Compute duration for a job
  const getJobDuration = (job: Job): string => {
    const end = job.completed_at ? new Date(job.completed_at) : new Date();
    const mins = Math.round((end.getTime() - new Date(job.created_at).getTime()) / 60000);
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

      {/* CR-015: Submit Job Modal */}
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
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input
                    placeholder="Enter job title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as Job["type"])}
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
                      onChange={(e) => setNewPriority(e.target.value as Job["priority"])}
                    >
                      {JOB_PRIORITIES.map((p) => (
                        <SelectOption key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectOption>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/30"
                    placeholder="Describe the job..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitJob} disabled={!newTitle.trim()}>
                    <Plus className="h-4 w-4" />
                    Submit
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
              <p className="text-xl font-semibold">5</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CR-019: Job Detail Panel */}
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
                <div>
                  <h3 className="text-base font-semibold">{selectedJob.title}</h3>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{selectedJob.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${statusColors[selectedJob.status]}`}
                  >
                    {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                  </span>
                  <SeverityBadge severity={selectedJob.priority}>
                    {selectedJob.priority.charAt(0).toUpperCase() + selectedJob.priority.slice(1)}
                  </SeverityBadge>
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${typeColors[selectedJob.type]}`}
                  >
                    {selectedJob.type}
                  </span>
                </div>
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
                  <p className="mt-0.5 text-sm">{selectedJob.requestor}</p>
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
                  <p className="mt-0.5 text-sm">{selectedJob.agent}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  Close
                </Button>
                {selectedJob.status !== "completed" && selectedJob.status !== "failed" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelJob(selectedJob.id)}
                  >
                    Cancel Job
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
                    {counts[tab.toLowerCase() as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader field="id">ID</SortHeader></TableHead>
                <TableHead><SortHeader field="title">Title</SortHeader></TableHead>
                <TableHead><SortHeader field="type">Type</SortHeader></TableHead>
                <TableHead><SortHeader field="priority">Priority</SortHeader></TableHead>
                <TableHead><SortHeader field="status">Status</SortHeader></TableHead>
                <TableHead><SortHeader field="requestor">Requestor</SortHeader></TableHead>
                <TableHead><SortHeader field="created_at">Created</SortHeader></TableHead>
                <TableHead><SortHeader field="sla_target_minutes">SLA Target</SortHeader></TableHead>
                <TableHead><SortHeader field="agent">Agent</SortHeader></TableHead>
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
                      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${typeColors[job.type]}`}
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
                      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${statusColors[job.status]}`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{job.requestor.split("@")[0].replace(".", " ")}</TableCell>
                  <TableCell className="text-xs">{formatDate(job.created_at)}</TableCell>
                  <TableCell className="text-xs">{job.sla_target_minutes} min</TableCell>
                  <TableCell className="text-xs">{job.agent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
