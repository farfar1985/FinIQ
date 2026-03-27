/** Core FinIQ type definitions */

export interface Entity {
  Entity_ID: string;
  Entity_Alias: string;
  Parent_Entity_ID: string | null;
  Entity_Level?: number;
}

export interface Account {
  Account_ID: string;
  Account_Alias: string;
  Parent_Account_ID: string | null;
  Sign_Conversion?: number;
}

export interface KPIResult {
  kpi: string;
  entity: string;
  ytd_cy: number;
  ytd_ly: number;
  ytd_growth: number;
  periodic_cy: number;
  periodic_ly: number;
  periodic_growth: number;
}

export interface VarianceRow {
  entity: string;
  account: string;
  actual: number;
  replan: number;
  variance: number;
  variance_pct: number;
  favorable: boolean;
}

export type JobStatus = "submitted" | "queued" | "assigned" | "processing" | "review" | "completed" | "failed";
export type JobPriority = "critical" | "high" | "medium" | "low";

export interface Job {
  id: string;
  query: string;
  status: JobStatus;
  priority: JobPriority;
  agent_type: string;
  agent_name: string;
  intent: string;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  submitted_by: string;
  result: JobResult | null;
  error: string | null;
  retries: number;
  max_retries: number;
  schedule: string | null;
  is_recurring: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface JobResult {
  summary: string;
  rows_analyzed: number;
  tables_queried: string[];
  generated_at: string;
}

export interface JobCounts {
  submitted: number;
  queued: number;
  assigned: number;
  processing: number;
  review: number;
  completed: number;
  failed: number;
  total: number;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  counts: JobCounts;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  capacity: number;
  activeJobs: number;
  available: number;
  intents: string[];
}

export interface WsMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: unknown;
  chartConfig?: ChartConfig;
  sources?: Source[];
  timestamp: string;
}

export interface ChartConfig {
  type: "area" | "bar" | "line" | "treemap" | "scatter" | "composed";
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  colors?: string[];
}

export interface Source {
  table: string;
  query: string;
  rowCount: number;
}

export interface SuggestedPrompt {
  id: string;
  suggested_prompt: string;
  description: string;
  kpi: string[];
  tag: string;
  unit: string;
  category: string;
  runs: number;
  is_active: boolean;
}

export interface Competitor {
  name: string;
  ticker: string;
  segment_overlap: string;
}
