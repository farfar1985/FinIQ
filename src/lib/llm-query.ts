// ---------------------------------------------------------------------------
// LLM-powered NL Query Engine for FinIQ
// Ported from finiq-agent.mjs to TypeScript for Next.js API routes.
// Uses Anthropic SDK (claude-haiku-4-5-20251001) for intent classification,
// AI narratives, ad-hoc SQL generation, and trend analysis.
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { SCHEMA_CONTEXT, DANGEROUS_TABLES } from "./schema-context";
import {
  generateEntities,
  generateAccounts,
  generateFinancialData,
  generateReplanData,
  generateCompetitorData,
  type Entity,
  type Account,
  type FinancialRow,
  type ReplanRow,
} from "@/data/simulated";

// ---------------------------------------------------------------------------
// Anthropic client — only initialized if API key is present
// ---------------------------------------------------------------------------

const MODEL = "claude-haiku-4-5-20251001";

function getClient(): Anthropic | null {
  const key = process.env.FINIQ_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

// ---------------------------------------------------------------------------
// Response types (matches Ale's query route shape)
// ---------------------------------------------------------------------------

export interface StructuredData {
  type: "table" | "chart";
  columns?: string[];
  rows?: Record<string, unknown>[];
  chartData?: { label: string; value: number }[];
  chartType?: "area" | "bar";
}

export interface FollowUpSuggestion {
  label: string;
  query: string;
}

export interface QueryResponse {
  text: string;
  intent: string;
  data?: StructuredData;
  followUps?: FollowUpSuggestion[];
  isFollowUp?: boolean; // True if this was a chart/table toggle on existing data
}

// ---------------------------------------------------------------------------
// Intent classification — 7 intents + adhoc fallback
// ---------------------------------------------------------------------------

export type Intent =
  | "ci"
  | "pes"
  | "variance"
  | "forecast"
  | "product"
  | "trend"
  | "ranking"
  | "adhoc";

const INTENT_KEYWORDS: Record<Exclude<Intent, "adhoc">, string[]> = {
  ci: [
    "competitor", "nestle", "mondelez", "hershey", "ferrero", "colgate",
    "general mills", "kellanova", "smucker", "freshpet", "idexx",
    "benchmark", "peer", "competitive", "swot", "porter", "margin compare",
  ],
  pes: [
    "pes", "period end", "summary", "kpi", "organic growth", "mac shape",
    "a&cp", "ce shape", "controllable", "ncfo", "performance",
    "working well", "not working", "what's working", "what's not",
  ],
  variance: [
    "variance", "budget", "replan", "actual vs", "favorable", "unfavorable",
  ],
  forecast: [
    "forecast", "vs actual", "actual vs", "three-way", "replan vs", "projection",
  ],
  product: [
    "product", "brand", "segment", "item", "category",
  ],
  trend: [
    "trend", "over time", "history", "compare period", "year over year",
    "yoy", "growth trend", "monthly",
  ],
  ranking: [
    "rank", "top", "bottom", "best", "worst", "highest", "lowest",
  ],
};

// ---------------------------------------------------------------------------
// CI query detection — adapted from Rajiv's query-engine.ts
// Determines if a query is about competitors vs internal Mars data.
// Internal entity prefixes → NEVER CI. Competitor aliases → CI.
// CI keywords → CI. Short tickers need word boundary checks.
// ---------------------------------------------------------------------------

const INTERNAL_PREFIXES = [
  "rc", "mpc", "royal canin", "mars petcare", "mars wrigley",
  "petcare", "snacking", "food & nutrition", "food and nutrition",
  "wrigley", "mars inc", "corporate", "gbu", "division",
  "ben's original", "gum & mints", "chocolate na",
];

const COMPETITOR_ALIASES: Record<string, string> = {
  nestle: "NSRGY", mondelez: "MDLZ", mdlz: "MDLZ",
  hershey: "HSY", hsy: "HSY", ferrero: "FERRERO",
  "colgate-palmolive": "CL", colgate: "CL",
  "general mills": "GIS", kellanova: "K",
  "j.m. smucker": "SJM", smucker: "SJM", "jm smucker": "SJM",
  freshpet: "FRPT", idexx: "IDXX",
  "procter & gamble": "PG", "procter and gamble": "PG",
  unilever: "UL", "kraft heinz": "KHC", khc: "KHC",
  nsrgy: "NSRGY", oreo: "MDLZ", kitkat: "NSRGY",
  "kit kat": "NSRGY", nescafe: "NSRGY", purina: "NSRGY",
  "coca cola": "KO", "coca-cola": "KO", coke: "KO",
  pepsi: "PEP", pepsico: "PEP",
  danone: "BN", "kellogg": "K", "campbell": "CPB",
};

// Short tickers that need word boundary checks to avoid false positives
const SHORT_TICKERS = ["ul", "cl", "gis", "k", "pg"];

const CI_KEYWORDS = [
  "competitive", "competitor", "benchmark", "benchmarking",
  "peer group", "peer comparison", "industry comparison",
  "swot", "porter", "five forces", "earnings call",
  "market share comparison", "margin compare",
];

export function isCIQuery(query: string): boolean {
  const lower = query.toLowerCase();

  // Check internal entity prefixes first — these are NEVER CI
  for (const prefix of INTERNAL_PREFIXES) {
    if (lower.includes(prefix)) return false;
  }

  // Check competitor aliases (long names)
  for (const alias of Object.keys(COMPETITOR_ALIASES)) {
    if (alias.length > 3 && lower.includes(alias)) return true;
  }

  // Check short tickers with word boundary
  for (const ticker of SHORT_TICKERS) {
    const re = new RegExp(`\\b${ticker}\\b`, "i");
    if (re.test(query)) return true;
  }

  // Check CI keywords
  for (const kw of CI_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  return false;
}

export function classifyIntent(message: string): Intent {
  // Check for competitor mentions first — always route to CI
  if (isCIQuery(message)) return "ci";

  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent as Intent;
    }
  }
  return "adhoc";
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

const ENTITY_MAP: Record<string, string> = {
  "mars inc": "MARS",
  "mars incorporated": "MARS",
  corporate: "MARS",
  "all gbus": "ALL_GBUS",
  "across gbus": "ALL_GBUS",
  "each gbu": "ALL_GBUS",
  "every gbu": "ALL_GBUS",
  // GBUs — multiple aliases for fuzzy matching
  petcare: "GBU_PET",
  "mars petcare": "GBU_PET",
  "pet care": "GBU_PET",
  "pet nutrition": "GBU_PET",
  snacking: "GBU_SNK",
  "mars snacking": "GBU_SNK",
  "food & nutrition": "GBU_FN",
  "food and nutrition": "GBU_FN",
  "fn": "GBU_FN",
  "f&n": "GBU_FN",
  "mars wrigley": "GBU_MW",
  wrigley: "GBU_MW",
  "mw": "GBU_MW",
  // Divisions
  "chocolate na": "SUB_SNK_CHOC",
  "chocolate north america": "SUB_SNK_CHOC",
  "royal canin": "SUB_PET_ROYAL",
  "rc": "SUB_PET_ROYAL",
  "ben's original": "SUB_FN_RICE",
  "bens original": "SUB_FN_RICE",
  "gum & mints": "SUB_MW_GUM",
  "gum and mints": "SUB_MW_GUM",
  "petcare na": "DIV_PET_NA",
  "petcare north america": "DIV_PET_NA",
  "petcare europe": "DIV_PET_EU",
  "snacking na": "DIV_SNK_NA",
  "snacking north america": "DIV_SNK_NA",
  "snacking europe": "DIV_SNK_EU",
  "wrigley international": "DIV_MW_INTL",
  "wrigley intl": "DIV_MW_INTL",
  "wrigley na": "DIV_MW_NA",
  "wrigley north america": "DIV_MW_NA",
  // Common informal names that users type
  "global corporate": "MARS",
  "mars global": "MARS",
  "mars vet health": "DIV_PET_VET",
  "mvh": "DIV_PET_VET",
  "science & diagnostics": "DIV_PET_DIAG",
  "hotel chocolat": "SUB_SNK_HC",
  "kellanova": "SUB_SNK_KELL",
};

// ---------------------------------------------------------------------------
// Fuzzy entity matching — Levenshtein distance for typos and near-misses
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function fuzzyMatchEntity(query: string): string | null {
  const q = query.toLowerCase();
  const aliases = Object.keys(ENTITY_MAP);

  // First try exact substring match (sorted by length desc for longest match)
  const sorted = aliases.sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (q.includes(alias)) return ENTITY_MAP[alias];
  }

  // Then try fuzzy match: extract candidate words/phrases from query
  // and compare against aliases
  const words = q.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = Infinity;
  const threshold = 2; // Max Levenshtein distance for a match

  for (const alias of aliases) {
    // Skip very short aliases for fuzzy (too many false positives)
    if (alias.length < 4) continue;

    // Try matching against sliding windows of query words
    const aliasWords = alias.split(/\s+/);
    for (let i = 0; i <= words.length - aliasWords.length; i++) {
      const candidate = words.slice(i, i + aliasWords.length).join(" ");
      const dist = levenshtein(candidate, alias);
      if (dist <= threshold && dist < bestScore) {
        bestScore = dist;
        bestMatch = ENTITY_MAP[alias];
      }
    }

    // Also try each individual word against single-word aliases
    if (aliasWords.length === 1) {
      for (const word of words) {
        const dist = levenshtein(word, alias);
        if (dist <= threshold && dist < bestScore) {
          bestScore = dist;
          bestMatch = ENTITY_MAP[alias];
        }
      }
    }
  }

  return bestMatch;
}

function extractEntity(
  query: string,
  contextEntity?: string
): string | null {
  // Try exact + fuzzy matching
  const matched = fuzzyMatchEntity(query);
  if (matched) return matched;

  // Check "all GBUs" pattern
  if (/\b(all gbus?|across gbus?|each gbu|every gbu)\b/.test(query.toLowerCase())) return "ALL_GBUS";

  // Fall back to context from previous turns
  return contextEntity ?? null;
}

// ---------------------------------------------------------------------------
// KPI extraction
// ---------------------------------------------------------------------------

const KPI_MAP: Record<string, string> = {
  "organic growth": "S900083",
  "net revenue": "S100010",
  revenue: "S100010",
  "gross profit": "S100020",
  mac: "S200010",
  "mac shape": "S200010",
  "a&cp": "S200020",
  acp: "S200020",
  ce: "S300010",
  "ce shape": "S300010",
  overhead: "S300020",
  "controllable overhead": "S300020",
  ncfo: "S500010",
  ebitda: "S600010",
  volume: "S700010",
  "price/mix": "S700020",
  "fx impact": "S700030",
};

function extractKPI(message: string): string | null {
  const lower = message.toLowerCase();
  const sorted = Object.entries(KPI_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, code] of sorted) {
    if (lower.includes(alias)) return code;
  }
  return null;
}

function extractKPIName(message: string): string {
  const kpiNames: Record<string, string> = {
    "organic growth": "Organic Growth",
    "net revenue": "Net Revenue",
    mac: "MAC",
    "mac shape": "MAC Shape %",
    "a&cp": "A&CP Shape %",
    ce: "CE",
    "ce shape": "CE Shape %",
    overhead: "Controllable Overhead",
    ncfo: "NCFO",
    ebitda: "EBITDA",
    volume: "Volume",
    "price/mix": "Price/Mix",
  };
  const lower = message.toLowerCase();
  const sorted = Object.entries(kpiNames).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, name] of sorted) {
    if (lower.includes(alias)) return name;
  }
  return "Organic Growth";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entityName(entities: Entity[], id: string): string {
  return entities.find((e) => e.id === id)?.name ?? id;
}

function accountName(accounts: Account[], code: string): string {
  return accounts.find((a) => a.code === code)?.name ?? code;
}

function isPercentageAccount(code: string): boolean {
  return ["S900083", "S700020", "S700030"].includes(code);
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function makeAreaChart(
  data: { label: string; value: number }[],
  title: string
): StructuredData {
  return { type: "chart", chartType: "area", chartData: data, columns: ["Period", "Value"], rows: data.map((d) => ({ Period: d.label, Value: d.value })) };
}

function makeBarChart(
  data: { label: string; value: number }[],
  title: string
): StructuredData {
  return { type: "chart", chartType: "bar", chartData: data, columns: ["Name", "Value"], rows: data.map((d) => ({ Name: d.label, Value: d.value })) };
}

// ---------------------------------------------------------------------------
// Trend analysis
// ---------------------------------------------------------------------------

interface TrendResult {
  direction: "improving" | "declining" | "volatile" | "stable";
  periods: number;
  tagline: string;
}

export function analyzeTrend(values: number[]): TrendResult {
  if (values.length < 2) {
    return { direction: "stable", periods: values.length, tagline: "Insufficient data for trend analysis" };
  }

  const recent = values.slice(-5);

  // Compute period-over-period changes
  const changes: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    changes.push(recent[i] - recent[i - 1]);
  }

  // Count consecutive up/down from end
  let consecutiveUp = 0;
  let consecutiveDown = 0;
  for (let i = changes.length - 1; i >= 0; i--) {
    if (changes[i] > 0) {
      if (consecutiveDown === 0) consecutiveUp++;
      else break;
    } else if (changes[i] < 0) {
      if (consecutiveUp === 0) consecutiveDown++;
      else break;
    } else {
      break;
    }
  }

  // Check alternating pattern
  let alternations = 0;
  for (let i = 1; i < changes.length; i++) {
    if ((changes[i] > 0) !== (changes[i - 1] > 0)) {
      alternations++;
    }
  }

  // Check stability
  const maxVal = Math.max(...recent);
  const minVal = Math.min(...recent);
  const range = maxVal - minVal;
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const isStable = avg !== 0 ? (range / Math.abs(avg)) < 0.02 : range < 0.5;

  const periodsAnalyzed = recent.length;

  if (isStable) {
    return { direction: "stable", periods: periodsAnalyzed, tagline: `Stable across ${periodsAnalyzed} periods` };
  }
  if (consecutiveUp >= 2) {
    return { direction: "improving", periods: consecutiveUp + 1, tagline: `Improving for ${consecutiveUp + 1} consecutive periods` };
  }
  if (consecutiveDown >= 2) {
    return { direction: "declining", periods: consecutiveDown + 1, tagline: `Declining for ${consecutiveDown + 1} consecutive periods` };
  }
  if (alternations >= 2) {
    return { direction: "volatile", periods: periodsAnalyzed, tagline: `Volatile over ${periodsAnalyzed} periods` };
  }

  return { direction: "stable", periods: periodsAnalyzed, tagline: `Relatively stable over ${periodsAnalyzed} periods` };
}

// ---------------------------------------------------------------------------
// Variable resolution (FR4.6)
// ---------------------------------------------------------------------------

export function resolveVariables(
  template: string,
  userContext: { unit?: string } = {}
): string {
  const vars: Record<string, string> = {
    "{current_year}": "2025",
    "{current_period}": "P06",
    "{current_quarter}": "Q2",
    "{unit}": userContext.unit || "Mars Inc",
  };

  let resolved = template;
  for (const [key, value] of Object.entries(vars)) {
    resolved = resolved.split(key).join(value);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Suggested prompts (FR4.5) — 18 curated prompts
// ---------------------------------------------------------------------------

export interface SuggestedPrompt {
  id: string;
  prompt: string;
  description: string;
  category: "bridge" | "margin" | "revenue" | "narrative" | "cost";
  tag: string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  // Bridge / Waterfall
  { id: "p1", prompt: "Build a revenue bridge for {unit} from {current_period} LY to CY", description: "Revenue bridge analysis", category: "bridge", tag: "bridge" },
  { id: "p2", prompt: "Show the margin waterfall for {unit} YTD {current_year}", description: "Margin walk from revenue to CE", category: "bridge", tag: "waterfall" },
  // Margin & Profitability
  { id: "p3", prompt: "Compare MAC Shape % across all GBUs for {current_period}", description: "Cross-GBU margin comparison", category: "margin", tag: "margin" },
  { id: "p4", prompt: "What is driving A&CP changes for {unit} this period?", description: "A&CP shape driver analysis", category: "margin", tag: "cost" },
  { id: "p5", prompt: "Show CE Shape % trend for {unit} across all periods in {current_year}", description: "CE Shape trend over time", category: "margin", tag: "trend" },
  // Revenue & Growth
  { id: "p6", prompt: "Show organic growth for {unit} YTD vs LY", description: "Organic growth comparison", category: "revenue", tag: "growth" },
  { id: "p7", prompt: "Which sub-units have the highest organic growth in {current_period}?", description: "Top performers by organic growth", category: "revenue", tag: "ranking" },
  { id: "p8", prompt: "Break down total growth into price, volume, and mix for {unit}", description: "Growth decomposition", category: "revenue", tag: "decomposition" },
  // Performance Narrative
  { id: "p9", prompt: "Generate period end summary for {unit} in {current_period}", description: "Full PES report with all 6 KPIs", category: "narrative", tag: "pes" },
  { id: "p10", prompt: "What's working well for {unit} this period?", description: "Positive performance highlights", category: "narrative", tag: "www" },
  { id: "p11", prompt: "What's not working well for {unit}?", description: "Areas of concern", category: "narrative", tag: "wnww" },
  // Customer & Cost
  { id: "p12", prompt: "Show budget variance for {unit} in {current_period}", description: "Actual vs Replan analysis", category: "cost", tag: "variance" },
  { id: "p13", prompt: "Which accounts have the largest unfavorable variance for {unit}?", description: "Top variance drivers", category: "cost", tag: "variance" },
  { id: "p14", prompt: "Compare controllable overhead across divisions", description: "Overhead benchmarking", category: "cost", tag: "cost" },
  { id: "p15", prompt: "Show NCFO trend for {unit} in {current_year}", description: "Cash flow analysis over time", category: "cost", tag: "trend" },
  { id: "p16", prompt: "Rank all sub-units by MAC Shape % for {current_period}", description: "Sub-unit profitability ranking", category: "margin", tag: "ranking" },
  { id: "p17", prompt: "Show top 3 and bottom 3 entities for organic growth", description: "Performance extremes", category: "revenue", tag: "ranking" },
  { id: "p18", prompt: "Compare {unit} performance vs replan across all KPIs", description: "Full variance dashboard", category: "cost", tag: "variance" },
];

// ---------------------------------------------------------------------------
// PES format detection
// ---------------------------------------------------------------------------

function detectFormat(message: string): "summary" | "www" | "wnww" {
  const lower = message.toLowerCase();
  if (lower.includes("what's working well") || lower.includes("www")) return "www";
  if (lower.includes("what's not working") || lower.includes("wnww")) return "wnww";
  return "summary";
}

// ---------------------------------------------------------------------------
// PERIOD constants
// ---------------------------------------------------------------------------

const PERIODS = [
  "P01_2025", "P02_2025", "P03_2025", "P04_2025",
  "P05_2025", "P06_2025", "P07_2025", "P08_2025",
  "P09_2025", "P10_2025", "P11_2025", "P12_2025",
];

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

async function handlePES(
  entityId: string,
  query: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[]
): Promise<QueryResponse> {
  const eName = entityName(entities, entityId);
  const format = detectFormat(query);

  // Core PES KPIs
  const pesKPICodes = ["S900083", "S200010", "S200020", "S300010", "S300020", "S500010"];

  // Get all period data for this entity and these KPIs
  const kpiResults: {
    kpi: string;
    code: string;
    ytdGrowth: number;
    periodicGrowth: number;
    cyValue: number;
    lyValue: number;
    trend: TrendResult;
  }[] = [];

  for (const code of pesKPICodes) {
    const rows = financialData.filter(
      (r) => r.entity_id === entityId && r.account_code === code
    );
    if (rows.length === 0) continue;

    // Latest period
    const sorted = [...rows].sort((a, b) => b.date_id.localeCompare(a.date_id));
    const latest = sorted[0];

    const ytdGrowth = latest.ytd_ly_value !== 0
      ? ((latest.ytd_cy_value - latest.ytd_ly_value) / Math.abs(latest.ytd_ly_value)) * 100
      : 0;
    const periodicGrowth = latest.periodic_ly_value !== 0
      ? ((latest.periodic_cy_value - latest.periodic_ly_value) / Math.abs(latest.periodic_ly_value)) * 100
      : 0;

    // Trend from all periods
    const periodValues = rows
      .sort((a, b) => a.date_id.localeCompare(b.date_id))
      .map((r) => r.periodic_cy_value);
    const trend = analyzeTrend(periodValues);

    kpiResults.push({
      kpi: accountName(accounts, code),
      code,
      ytdGrowth: Math.round(ytdGrowth * 100) / 100,
      periodicGrowth: Math.round(periodicGrowth * 100) / 100,
      cyValue: latest.periodic_cy_value,
      lyValue: latest.periodic_ly_value,
      trend,
    });
  }

  // Chart data
  const chartData = kpiResults.map((k) => ({
    label: k.kpi,
    value: k.periodicGrowth,
  }));

  // Try AI narrative
  let narrative = "";
  const client = getClient();
  if (client) {
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0,
        messages: [{
          role: "user",
          content: `You are a financial analyst for Mars, Incorporated. Generate a ${format === "www" ? "What's Working Well" : format === "wnww" ? "What's Not Working Well" : "Executive Summary"} for ${eName} based on this KPI data:\n\n${JSON.stringify(kpiResults, null, 2)}\n\nEach KPI includes a "trend" object with direction and tagline. Incorporate trend insights.\nBe concise. Use specific numbers. Never say "replace" or "fragmented".`,
        }],
      });
      narrative = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    } catch {
      // Fall through to table format
    }
  }

  if (!narrative) {
    // Fallback: formatted table
    const lines = [`**${eName} - Period End Summary**\n`];
    lines.push("| KPI | CY Value | LY Value | Growth | Trend |");
    lines.push("|-----|----------|----------|--------|-------|");
    for (const k of kpiResults) {
      const isPct = isPercentageAccount(k.code);
      const cy = isPct ? `${k.cyValue.toFixed(1)}%` : `$${k.cyValue.toFixed(1)}M`;
      const ly = isPct ? `${k.lyValue.toFixed(1)}%` : `$${k.lyValue.toFixed(1)}M`;
      const trendIcon = k.trend.direction === "improving" ? "^" : k.trend.direction === "declining" ? "v" : "-";
      lines.push(`| ${k.kpi} | ${cy} | ${ly} | ${fmtPct(k.periodicGrowth)} | ${trendIcon} ${k.trend.tagline} |`);
    }
    narrative = lines.join("\n");
  }

  return {
    text: narrative,
    intent: "pes",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: ["KPI", "CY Value", "LY Value", "Growth %", "Trend"],
      rows: kpiResults.map((k) => ({
        KPI: k.kpi,
        "CY Value": isPercentageAccount(k.code) ? `${k.cyValue.toFixed(1)}%` : `$${k.cyValue.toFixed(1)}M`,
        "LY Value": isPercentageAccount(k.code) ? `${k.lyValue.toFixed(1)}%` : `$${k.lyValue.toFixed(1)}M`,
        "Growth %": fmtPct(k.periodicGrowth),
        Trend: k.trend.tagline,
      })),
    },
  };
}

async function handleVariance(
  entityId: string,
  query: string,
  entities: Entity[],
  accounts: Account[],
  replanData: ReplanRow[],
  contextPeriod?: string
): Promise<QueryResponse> {
  const eName = entityName(entities, entityId);

  // Extract period from query or use context, fallback to latest available
  const periodMatch = query.match(/\b[pP](0?[1-9]|1[0-3])\b/);
  const quarterMatch = query.match(/\b[qQ]([1-4])\b/);
  let targetPeriods: string[] = [];

  if (periodMatch) {
    const pNum = periodMatch[1].padStart(2, "0");
    targetPeriods = [`P${pNum}_2025`];
  } else if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const periodMap: Record<number, string[]> = {
      1: ["P01_2025", "P02_2025", "P03_2025"],
      2: ["P04_2025", "P05_2025", "P06_2025"],
      3: ["P07_2025", "P08_2025", "P09_2025"],
      4: ["P10_2025", "P11_2025", "P12_2025"],
    };
    targetPeriods = periodMap[q] || ["P06_2025"];
  } else if (contextPeriod) {
    const pMatch = contextPeriod.match(/P(\d+)/i);
    if (pMatch) {
      const pNum = pMatch[1].padStart(2, "0");
      targetPeriods = [`P${pNum}_2025`];
    }
  }

  // If no period detected, find the latest period with data for this entity
  if (targetPeriods.length === 0) {
    const entityRows = replanData.filter((r) => r.entity_id === entityId);
    if (entityRows.length > 0) {
      const latestPeriod = entityRows
        .map((r) => r.date_id)
        .sort()
        .pop()!;
      targetPeriods = [latestPeriod];
    } else {
      targetPeriods = ["P06_2025"];
    }
  }

  // Also try parent entity if no rows found (handle "all GBUs" or corporate roll-up)
  let rows = replanData.filter(
    (r) => r.entity_id === entityId && targetPeriods.includes(r.date_id)
  );

  // If "ALL_GBUS", aggregate across all GBU entities
  if (entityId === "ALL_GBUS" && rows.length === 0) {
    const gbuEntities = entities.filter((e) => e.level === "GBU");
    rows = replanData.filter(
      (r) => gbuEntities.some((g) => g.id === r.entity_id) && targetPeriods.includes(r.date_id)
    );
  }

  if (rows.length === 0) {
    return { text: `No replan data found for ${eName} in ${targetPeriods.join(", ")}. Try specifying a different period (e.g., "budget variance for Petcare in P06").`, intent: "variance" };
  }

  // Sort by absolute variance descending, take top 10
  const sorted = [...rows].sort(
    (a, b) => Math.abs(b.variance) - Math.abs(a.variance)
  );
  const top10 = sorted.slice(0, 10);

  const chartData = top10.map((r) => ({
    label: accountName(accounts, r.account_code),
    value: r.variance,
  }));

  const tableRows = rows.map((r) => ({
    Account: accountName(accounts, r.account_code),
    "Actual ($M)": `$${r.actual_usd.toFixed(1)}M`,
    "Replan ($M)": `$${r.replan_usd.toFixed(1)}M`,
    "Variance ($M)": `${r.variance >= 0 ? "+" : ""}$${r.variance.toFixed(1)}M`,
    "Variance (%)": `${r.variance_pct >= 0 ? "+" : ""}${r.variance_pct.toFixed(1)}%`,
    Status: r.variance_pct >= 0 ? "Favorable" : "Unfavorable",
  }));

  const favorable = rows.filter((r) => r.variance >= 0).length;
  const text = `**${eName} Budget Variance** - ${favorable} of ${rows.length} accounts are favorable.`;

  return {
    text,
    intent: "variance",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: ["Account", "Actual ($M)", "Replan ($M)", "Variance ($M)", "Variance (%)", "Status"],
      rows: tableRows,
    },
  };
}

async function handleTrend(
  entityId: string,
  query: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[]
): Promise<QueryResponse> {
  const eName = entityName(entities, entityId);
  const kpiCode = extractKPI(query) || "S900083";
  const kpiName = extractKPIName(query);
  const isPct = isPercentageAccount(kpiCode);

  const chartData: { label: string; value: number }[] = [];
  const tableRows: Record<string, unknown>[] = [];

  for (const period of PERIODS) {
    const row = financialData.find(
      (r) => r.entity_id === entityId && r.account_code === kpiCode && r.date_id === period
    );
    if (!row) continue;
    const label = period.replace("_2025", "");
    chartData.push({ label, value: parseFloat(row.periodic_cy_value.toFixed(1)) });
    tableRows.push({
      Period: label,
      "CY Value": isPct ? `${row.periodic_cy_value.toFixed(1)}%` : `$${row.periodic_cy_value.toFixed(1)}M`,
      "LY Value": isPct ? `${row.periodic_ly_value.toFixed(1)}%` : `$${row.periodic_ly_value.toFixed(1)}M`,
      "YoY Change": `${(((row.periodic_cy_value - row.periodic_ly_value) / Math.abs(row.periodic_ly_value || 1)) * 100).toFixed(1)}%`,
    });
  }

  // Run trend analysis
  const values = financialData
    .filter((r) => r.entity_id === entityId && r.account_code === kpiCode)
    .sort((a, b) => a.date_id.localeCompare(b.date_id))
    .map((r) => r.periodic_cy_value);
  const trend = analyzeTrend(values);

  return {
    text: `**${kpiName} trend for ${eName}** across 2025 periods. ${trend.tagline}.`,
    intent: "trend",
    data: {
      type: "chart",
      chartType: "area",
      chartData,
      columns: ["Period", "CY Value", "LY Value", "YoY Change"],
      rows: tableRows,
    },
  };
}

async function handleRanking(
  query: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[]
): Promise<QueryResponse> {
  const kpiCode = extractKPI(query) || "S900083";
  const kpiName = extractKPIName(query);

  // Rank GBU-level and Division-level entities
  const rankEntities = entities.filter(
    (e) => e.level === "GBU" || e.level === "Division"
  );

  const results: { entity: string; growth: number }[] = [];

  for (const ent of rankEntities) {
    const rows = financialData.filter(
      (r) => r.entity_id === ent.id && r.account_code === kpiCode && r.date_id === "P06_2025"
    );
    if (rows.length === 0) continue;
    const row = rows[0];
    const growth = row.periodic_ly_value !== 0
      ? ((row.periodic_cy_value - row.periodic_ly_value) / Math.abs(row.periodic_ly_value)) * 100
      : 0;
    results.push({ entity: ent.name, growth: Math.round(growth * 100) / 100 });
  }

  results.sort((a, b) => b.growth - a.growth);

  const chartData = results.slice(0, 10).map((r) => ({
    label: r.entity,
    value: r.growth,
  }));

  const top3 = results.slice(0, 3).map((r) => `${r.entity} (${fmtPct(r.growth)})`).join(", ");
  const bottom3 = results.slice(-3).map((r) => `${r.entity} (${fmtPct(r.growth)})`).join(", ");

  return {
    text: `**${kpiName} Rankings**\n\nTop 3: ${top3}\nBottom 3: ${bottom3}`,
    intent: "ranking",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: ["Entity", "Growth %"],
      rows: results.map((r) => ({ Entity: r.entity, "Growth %": fmtPct(r.growth) })),
    },
  };
}

async function handleProduct(
  entityId: string,
  query: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[]
): Promise<QueryResponse> {
  // Product/brand analysis uses sub-unit data as a proxy
  // (real Databricks would use finiq_vw_pl_brand_product)
  const eName = entityName(entities, entityId);

  // Get sub-units under this entity
  const children = entities.filter((e) => e.parent_id === entityId);
  if (children.length === 0) {
    // Try direct entity data
    return handlePES(entityId, query, entities, accounts, financialData);
  }

  const kpiCode = extractKPI(query) || "S100010"; // Default to Net Revenue for product
  const kpiName = accountName(accounts, kpiCode);

  const results: { name: string; cy: number; ly: number; growth: number }[] = [];
  for (const child of children) {
    const row = financialData.find(
      (r) => r.entity_id === child.id && r.account_code === kpiCode && r.date_id === "P06_2025"
    );
    if (!row) continue;
    const growth = row.periodic_ly_value !== 0
      ? ((row.periodic_cy_value - row.periodic_ly_value) / Math.abs(row.periodic_ly_value)) * 100
      : 0;
    results.push({
      name: child.name,
      cy: row.periodic_cy_value,
      ly: row.periodic_ly_value,
      growth: Math.round(growth * 100) / 100,
    });
  }

  results.sort((a, b) => b.cy - a.cy);

  const chartData = results.map((r) => ({ label: r.name, value: r.cy }));

  return {
    text: `**${kpiName} by segment** under ${eName}:`,
    intent: "product",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: ["Segment", "CY Value", "LY Value", "Growth %"],
      rows: results.map((r) => ({
        Segment: r.name,
        "CY Value": `$${r.cy.toFixed(1)}M`,
        "LY Value": `$${r.ly.toFixed(1)}M`,
        "Growth %": fmtPct(r.growth),
      })),
    },
  };
}

async function handleCI(): Promise<QueryResponse> {
  // Return competitor data from simulated generators
  const competitors = generateCompetitorData();

  const chartData = competitors.map((c) => ({
    label: c.company,
    value: c.gross_margin_pct,
  }));

  const tableRows = competitors.map((c) => ({
    Company: c.company,
    Ticker: c.ticker,
    "Revenue ($B)": `$${c.revenue_bn.toFixed(1)}B`,
    "Organic Growth": `${c.organic_growth_pct.toFixed(1)}%`,
    "Gross Margin": `${c.gross_margin_pct.toFixed(1)}%`,
    "Op. Margin": `${c.operating_margin_pct.toFixed(1)}%`,
    "EBITDA Margin": `${c.ebitda_margin_pct.toFixed(1)}%`,
  }));

  return {
    text: "Competitor benchmark comparison. For detailed competitive intelligence including SWOT, Porter's Five Forces, and earnings analysis, use the CI module.",
    intent: "ci",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: Object.keys(tableRows[0]),
      rows: tableRows,
    },
  };
}

async function handleForecast(
  entityId: string,
  entities: Entity[],
  accounts: Account[],
  replanData: ReplanRow[]
): Promise<QueryResponse> {
  const eName = entityName(entities, entityId);

  const rows = replanData.filter((r) => r.entity_id === entityId && r.date_id === "P06_2025");

  if (rows.length === 0) {
    return { text: `No forecast data found for ${eName}.`, intent: "forecast" };
  }

  // Simulated forecast = replan * random factor
  const tableRows = rows.map((r) => {
    const forecastUsd = r.replan_usd * (1 + (Math.random() * 0.1 - 0.05));
    return {
      Account: accountName(accounts, r.account_code),
      "Actual ($M)": `$${r.actual_usd.toFixed(1)}M`,
      "Replan ($M)": `$${r.replan_usd.toFixed(1)}M`,
      "Forecast ($M)": `$${forecastUsd.toFixed(1)}M`,
      "Act vs Replan": `${r.variance >= 0 ? "+" : ""}$${r.variance.toFixed(1)}M`,
    };
  });

  const chartData = rows.map((r) => ({
    label: accountName(accounts, r.account_code),
    value: r.actual_usd,
  }));

  return {
    text: `**${eName} - Three-Way Comparison** (Actual vs Replan vs Forecast). Forecast data is simulated.`,
    intent: "forecast",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: ["Account", "Actual ($M)", "Replan ($M)", "Forecast ($M)", "Act vs Replan"],
      rows: tableRows,
    },
  };
}

async function handleAdhoc(
  query: string,
  entityId: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[]
): Promise<QueryResponse> {
  const client = getClient();
  if (!client) {
    return {
      text: "Ad-hoc queries require an Anthropic API key. Please configure ANTHROPIC_API_KEY in your environment.",
      intent: "adhoc",
    };
  }

  try {
    // Step 1: Generate SQL from the query
    const sqlResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      temperature: 0,
      system: `You are a SQL expert for a Mars, Incorporated financial database. ${SCHEMA_CONTEXT}\n\nThe user is asking about entity "${entityName(entities, entityId)}". Generate a query against the simulated data. Available columns in financialData: entity_id, account_code, date_id, ytd_ly_value, ytd_cy_value, periodic_ly_value, periodic_cy_value.\n\nReturn a JSON object with:\n- "filter": { "entity_id": string | null, "account_codes": string[] | null, "periods": string[] | null }\n- "aggregation": "sum" | "avg" | "latest"\n- "description": brief description of what to compute\n\nReturn ONLY valid JSON.`,
      messages: [{ role: "user", content: query }],
    });

    const responseText = sqlResponse.content[0]?.type === "text" ? sqlResponse.content[0].text : "";

    // Try to parse the JSON filter
    let filterSpec: {
      filter?: { entity_id?: string | null; account_codes?: string[] | null; periods?: string[] | null };
      aggregation?: string;
      description?: string;
    } = {};

    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        filterSpec = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, fall back to broad lookup
    }

    // Apply filters
    let filtered = financialData;
    if (filterSpec.filter?.entity_id) {
      filtered = filtered.filter((r) => r.entity_id === filterSpec.filter!.entity_id);
    } else if (entityId) {
      filtered = filtered.filter((r) => r.entity_id === entityId);
    }
    if (filterSpec.filter?.account_codes && filterSpec.filter.account_codes.length > 0) {
      const codes = filterSpec.filter.account_codes;
      filtered = filtered.filter((r) => codes.includes(r.account_code));
    }
    if (filterSpec.filter?.periods && filterSpec.filter.periods.length > 0) {
      const periods = filterSpec.filter.periods;
      filtered = filtered.filter((r) => periods.includes(r.date_id));
    }

    // Limit results
    const limitedData = filtered.slice(0, 50);

    if (limitedData.length === 0) {
      return {
        text: `No data matched your query. Try specifying an entity (e.g., "Mars Inc", "Petcare") or a KPI (e.g., "organic growth", "net revenue").`,
        intent: "adhoc",
      };
    }

    // Step 2: Summarize results with LLM
    const summaryData = limitedData.slice(0, 15).map((r) => ({
      entity: entityName(entities, r.entity_id),
      account: accountName(accounts, r.account_code),
      period: r.date_id,
      cy: r.periodic_cy_value,
      ly: r.periodic_ly_value,
    }));

    const summaryResp = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      temperature: 0,
      messages: [{
        role: "user",
        content: `Summarize this financial data for a business user. Question: "${query}"\n\nData (sample):\n${JSON.stringify(summaryData, null, 2)}\n\nTotal rows: ${filtered.length}. Be concise. Use specific numbers. Never say "replace" or "fragmented".`,
      }],
    });

    const summary = summaryResp.content[0]?.type === "text" ? summaryResp.content[0].text : `Found ${filtered.length} matching records.`;

    // Auto-detect chart
    const chartEntries = limitedData.slice(0, 10);
    const chartData = chartEntries.map((r) => ({
      label: `${accountName(accounts, r.account_code)} (${r.date_id.replace("_2025", "")})`,
      value: r.periodic_cy_value,
    }));

    return {
      text: summary,
      intent: "adhoc",
      data: {
        type: "chart",
        chartType: "bar",
        chartData,
        columns: ["Entity", "Account", "Period", "CY Value", "LY Value"],
        rows: limitedData.slice(0, 20).map((r) => ({
          Entity: entityName(entities, r.entity_id),
          Account: accountName(accounts, r.account_code),
          Period: r.date_id,
          "CY Value": `$${r.periodic_cy_value.toFixed(1)}M`,
          "LY Value": `$${r.periodic_ly_value.toFixed(1)}M`,
        })),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      text: `Could not process the ad-hoc query. Try rephrasing, or use a suggested prompt.\n\n_Technical: ${message}_`,
      intent: "adhoc",
    };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Follow-up detection — identifies "show as chart", "as table", etc.
// ---------------------------------------------------------------------------

const CHART_FOLLOW_UP_PATTERNS = [
  /\b(show|display|render|view|see)\s+(it\s+)?(as\s+)?(a\s+)?(chart|graph|plot|visual)/i,
  /\b(chart|graph|plot|visuali[sz]e)\s+(this|that|it|the data|these)/i,
  /\bcan\s+you\s+(chart|graph|plot|visuali[sz]e)/i,
  /\b(make|turn)\s+(it|this|that)\s+into\s+a?\s*(chart|graph)/i,
  /\b(bar|area|line)\s*chart/i,
];

const TABLE_FOLLOW_UP_PATTERNS = [
  /\b(show|display|render|view|see)\s+(it\s+)?(as\s+)?(a\s+)?table/i,
  /\b(table|tabular)\s+(view|format)/i,
  /\bshow\s+(the\s+)?data/i,
];

function isChartFollowUp(query: string): boolean {
  return CHART_FOLLOW_UP_PATTERNS.some((p) => p.test(query));
}

function isTableFollowUp(query: string): boolean {
  return TABLE_FOLLOW_UP_PATTERNS.some((p) => p.test(query));
}

// ---------------------------------------------------------------------------
// Context-aware follow-up suggestions
// ---------------------------------------------------------------------------

function generateFollowUps(
  intent: Intent,
  entityId: string,
  entityName: string,
  hasChart: boolean,
  hasTable: boolean,
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];

  // Toggle view type
  if (hasChart) {
    suggestions.push({ label: "Show as table", query: "Show this as a table" });
  } else if (hasTable) {
    suggestions.push({ label: "Show as chart", query: "Show this as a chart" });
  }

  // Intent-specific follow-ups
  switch (intent) {
    case "pes":
      suggestions.push(
        { label: "What's working well?", query: `What's working well for ${entityName}?` },
        { label: "Show trend", query: `Show organic growth trend for ${entityName} over time` },
        { label: "Compare GBUs", query: "Compare MAC Shape across all GBUs" },
      );
      break;
    case "variance":
      suggestions.push(
        { label: "Top variances", query: `Which accounts have the largest unfavorable variance for ${entityName}?` },
        { label: "Show trend", query: `Show budget variance trend for ${entityName}` },
        { label: "Three-way comparison", query: `Compare ${entityName} actual vs replan vs forecast` },
      );
      break;
    case "trend":
      suggestions.push(
        { label: "Show rankings", query: `Rank all entities by this metric` },
        { label: "Budget variance", query: `Show budget variance for ${entityName}` },
        { label: "Full PES report", query: `Generate period end summary for ${entityName}` },
      );
      break;
    case "ranking":
      suggestions.push(
        { label: "Show as trend", query: `Show this metric as a trend over time` },
        { label: "Drill into top performer", query: `Show details for the top ranked entity` },
      );
      break;
    case "product":
      suggestions.push(
        { label: "Show trends", query: `Show revenue trend for ${entityName} over time` },
        { label: "Compare margins", query: `Compare MAC Shape for ${entityName} segments` },
      );
      break;
    case "ci":
      suggestions.push(
        { label: "SWOT analysis", query: "Show SWOT analysis" },
        { label: "Porter's Five Forces", query: "Show Porter's Five Forces" },
      );
      break;
    default:
      suggestions.push(
        { label: "Show PES summary", query: `Generate period end summary for ${entityName}` },
        { label: "Budget variance", query: `Show budget variance for ${entityName}` },
        { label: "Organic growth trend", query: `Show organic growth trend for ${entityName}` },
      );
  }

  // Export option
  suggestions.push({ label: "Export to XLSX", query: "Export this to spreadsheet" });

  return suggestions.slice(0, 4); // Max 4 follow-up chips
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function processLLMQuery(
  query: string,
  context?: { entity?: string; period?: string },
  lastResponseData?: StructuredData
): Promise<QueryResponse> {
  // Check if this is a chart/table follow-up on existing data
  if (lastResponseData) {
    if (isChartFollowUp(query) && lastResponseData.rows && lastResponseData.rows.length > 0) {
      // Re-render existing data as chart
      const chartData = lastResponseData.chartData ?? lastResponseData.rows.slice(0, 15).map((r) => {
        const keys = Object.keys(r);
        const labelKey = keys[0];
        const valueKey = keys.find((k) => typeof r[k] === "number" || /^\$?-?[\d,.]+[BMK%]?$/.test(String(r[k] ?? "")));
        const value = valueKey ? parseFloat(String(r[valueKey]).replace(/[^0-9.\-]/g, "")) : 0;
        return { label: String(r[labelKey] ?? ""), value };
      });

      // Detect preferred chart type from query
      const preferBar = /\bbar\b/i.test(query);
      const preferArea = /\b(area|line)\b/i.test(query);
      const chartType = preferBar ? "bar" as const : preferArea ? "area" as const : "bar" as const;

      return {
        text: "Here's the data visualized as a chart:",
        intent: "follow-up",
        isFollowUp: true,
        data: {
          type: "chart",
          chartType,
          chartData,
          columns: lastResponseData.columns,
          rows: lastResponseData.rows,
        },
      };
    }

    if (isTableFollowUp(query) && lastResponseData.chartData && lastResponseData.chartData.length > 0) {
      // Re-render existing chart data as table
      const rows = lastResponseData.rows ?? lastResponseData.chartData.map((d) => ({
        Name: d.label,
        Value: d.value,
      }));
      const columns = lastResponseData.columns ?? ["Name", "Value"];

      return {
        text: "Here's the data in table format:",
        intent: "follow-up",
        isFollowUp: true,
        data: {
          type: "table",
          columns,
          rows,
        },
      };
    }
  }

  const intent = classifyIntent(query);
  const entities = generateEntities();
  const accounts = generateAccounts();
  const financialData = generateFinancialData();
  const replanData = generateReplanData();

  const entityId = extractEntity(query, context?.entity) ?? "MARS";
  const eName = entityName(entities, entityId);

  let result: QueryResponse;

  switch (intent) {
    case "ci":
      result = await handleCI();
      break;
    case "pes":
      result = await handlePES(entityId, query, entities, accounts, financialData);
      break;
    case "variance":
      result = await handleVariance(entityId, query, entities, accounts, replanData, context?.period);
      break;
    case "forecast":
      result = await handleForecast(entityId, entities, accounts, replanData);
      break;
    case "product":
      result = await handleProduct(entityId, query, entities, accounts, financialData);
      break;
    case "trend":
      result = await handleTrend(entityId, query, entities, accounts, financialData);
      break;
    case "ranking":
      result = await handleRanking(query, entities, accounts, financialData);
      break;
    case "adhoc":
    default:
      result = await handleAdhoc(query, entityId, entities, accounts, financialData);
      break;
  }

  // Add contextual follow-up suggestions
  const hasChart = !!result.data?.chartData && result.data.chartData.length > 0;
  const hasTable = !!result.data?.rows && result.data.rows.length > 0;
  result.followUps = generateFollowUps(intent, entityId, eName, hasChart, hasTable);

  return result;
}
