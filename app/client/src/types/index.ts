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

export interface Job {
  id: string;
  query: string;
  status: "submitted" | "queued" | "assigned" | "processing" | "review" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  agent_type: string;
  created_at: string;
  updated_at: string;
  result?: unknown;
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
