/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2, Trophy, ExternalLink, Shield, Zap, Target, AlertTriangle,
  TrendingUp, TrendingDown, Plus, Trash2, Bell, Newspaper, BarChart3,
  Users, Leaf, Brain, Swords, ChevronLeft, ChevronRight, Search, X, Send,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import DataTable from "@/components/data-table";
import CIRenderer, { type CIBlock } from "@/components/ci/ci-renderer";
import { cn } from "@/lib/utils";
import { FMP_COMPETITORS } from "@/lib/constants";

/* ---- Types ---- */

interface CompanyProfile {
  companyName?: string;
  symbol?: string;
  price?: number;
  mktCap?: number;
  sector?: string;
  industry?: string;
  description?: string;
  ceo?: string;
  fullTimeEmployees?: string;
  range?: string;
  changes?: number;
  [k: string]: unknown;
}

interface IncomeStatement {
  date?: string;
  period?: string;
  revenue?: number;
  grossProfit?: number;
  netIncome?: number;
  operatingIncome?: number;
  eps?: number;
  [k: string]: unknown;
}

interface EarningsHistory {
  date?: string;
  symbol?: string;
  eps?: number;
  epsEstimated?: number;
  revenue?: number;
  revenueEstimated?: number;
  [k: string]: unknown;
}

interface NewsItem {
  title?: string;
  url?: string;
  publishedDate?: string;
  site?: string;
  text?: string;
  symbol?: string;
}

interface ESGData {
  symbol?: string;
  environmentalScore?: number;
  socialScore?: number;
  governanceScore?: number;
  ESGScore?: number;
  [k: string]: unknown;
}

interface MADeal {
  companyName?: string;
  targetedCompanyName?: string;
  datedAcquired?: string;
  transactionAmount?: string;
  [k: string]: unknown;
}

interface PressRelease {
  date?: string;
  title?: string;
  text?: string;
  symbol?: string;
}

interface AnalystEstimate {
  date?: string;
  estimatedRevenueLow?: number;
  estimatedRevenueHigh?: number;
  estimatedRevenueAvg?: number;
  estimatedEpsLow?: number;
  estimatedEpsHigh?: number;
  estimatedEpsAvg?: number;
  numberAnalystEstimatedRevenue?: number;
  numberAnalystsEstimatedEps?: number;
  [k: string]: unknown;
}

interface PriceTarget {
  symbol?: string;
  publishedDate?: string;
  analystName?: string;
  analystCompany?: string;
  priceTarget?: number;
  adjPriceTarget?: number;
  newsTitle?: string;
  newsBaseURL?: string;
  [k: string]: unknown;
}

interface FinancialRatio {
  symbol?: string;
  date?: string;
  grossProfitMargin?: number;
  operatingProfitMargin?: number;
  netProfitMargin?: number;
  debtEquityRatio?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  dividendYield?: number;
  priceToEarningsRatio?: number;
  [k: string]: unknown;
}

interface AlertRule {
  id: string;
  company: string;
  metric: "price" | "mktCap";
  operator: ">" | "<" | "=";
  threshold: number;
}

type TabKey =
  | "overview" | "financials" | "earnings" | "benchmarking"
  | "strategy" | "esg" | "analysts" | "news" | "swot" | "alerts";

/* ---- Constants ---- */

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview",      label: "Overview",      icon: <BarChart3 size={14} /> },
  { key: "financials",    label: "Financials",    icon: <TrendingUp size={14} /> },
  { key: "earnings",      label: "Earnings",      icon: <Target size={14} /> },
  { key: "benchmarking",  label: "Benchmarking",  icon: <Zap size={14} /> },
  { key: "strategy",      label: "Strategy",      icon: <Swords size={14} /> },
  { key: "esg",           label: "ESG",           icon: <Leaf size={14} /> },
  { key: "analysts",      label: "Analysts",      icon: <Users size={14} /> },
  { key: "news",          label: "News",          icon: <Newspaper size={14} /> },
  { key: "swot",          label: "SWOT",          icon: <Brain size={14} /> },
  { key: "alerts",        label: "Alerts",        icon: <Bell size={14} /> },
];

const COMPETITOR_NAMES: Record<string, string> = {
  MDLZ: "Mondelez", HSY: "Hershey", GIS: "General Mills",
  CL: "Colgate", UL: "Unilever", SJM: "J.M. Smucker", NESN: "Nestle",
};

const CHART_COLORS = [
  "oklch(0.55 0.18 250)", "oklch(0.55 0.18 160)", "oklch(0.55 0.22 25)",
  "oklch(0.55 0.18 310)", "oklch(0.60 0.15 80)", "oklch(0.50 0.15 200)",
  "oklch(0.55 0.18 130)",
];

const KEY_PHRASES = ["organic growth", "pricing", "margin", "volume", "guidance"];

const POS_WORDS = ["growth", "beats", "record", "surge", "strong", "upgrade", "bullish", "outperform"];
const NEG_WORDS = ["miss", "decline", "cut", "weak", "downgrade", "bearish", "loss", "drop"];

/* ---- Helpers ---- */

async function fmpFetch<T>(endpoint: string, symbol?: string, extra?: Record<string, string>): Promise<T | null> {
  try {
    const params = new URLSearchParams({ endpoint });
    if (symbol) params.set("symbol", symbol);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    const res = await fetch(`/api/fmp?${params}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toBillions(n: number | undefined): string {
  if (n === undefined || n === null) return "\u2014";
  return (n / 1e9).toFixed(2);
}

function pct(n: number | undefined): string {
  if (n === undefined || n === null) return "\u2014";
  return (n * 100).toFixed(2) + "%";
}

function sentimentFromTitle(title: string): "positive" | "negative" | "neutral" {
  const lower = title.toLowerCase();
  if (POS_WORDS.some((w) => lower.includes(w))) return "positive";
  if (NEG_WORDS.some((w) => lower.includes(w))) return "negative";
  return "neutral";
}

function esgColor(score: number | undefined): string {
  if (score === undefined || score === null) return "";
  if (score > 70) return "text-positive";
  if (score >= 40) return "text-amber-500";
  return "text-negative";
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return dateStr.slice(0, 10);
}

function esgBg(score: number | undefined): string {
  if (score === undefined || score === null) return "bg-muted";
  if (score > 70) return "bg-green-50";
  if (score >= 40) return "bg-amber-50";
  return "bg-red-50";
}

/* Skeleton loader */
function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded w-full" />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-3/4" />
    </div>
  );
}

/* ---- Main Component ---- */

export default function CompetitivePage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [tabVisible, setTabVisible] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>("MDLZ");

  // Data caches
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [financials, setFinancials] = useState<Record<string, IncomeStatement[]>>({});
  const [earningsHistory, setEarningsHistory] = useState<Record<string, EarningsHistory[]>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [esgData, setEsgData] = useState<Record<string, ESGData>>({});
  const [maDeals, setMaDeals] = useState<Record<string, MADeal[]>>({});
  const [pressReleases, setPressReleases] = useState<Record<string, PressRelease[]>>({});
  const [analystEstimates, setAnalystEstimates] = useState<Record<string, AnalystEstimate[]>>({});
  const [priceTargets, setPriceTargets] = useState<Record<string, PriceTarget[]>>({});
  const [newsItems, setNewsItems] = useState<Record<string, NewsItem[]>>({});
  const [ratios, setRatios] = useState<Record<string, FinancialRatio[]>>({});
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<string[]>([]);

  // Loading states per tab
  const [loadingTab, setLoadingTab] = useState<Record<string, boolean>>({});
  const loadedTabs = useRef<Set<string>>(new Set());

  // Tab scroll
  const tabRef = useRef<HTMLDivElement>(null);

  // Command Center state
  const [commandCenterLoading, setCommandCenterLoading] = useState(true);
  const [ccProfiles, setCcProfiles] = useState<CompanyProfile[]>([]);
  const [ccFinancials, setCcFinancials] = useState<Record<string, IncomeStatement[]>>({});

  // CI Query state
  const [ciQuery, setCiQuery] = useState("");
  const [ciQueryLoading, setCiQueryLoading] = useState(false);
  const [ciQueryResponse, setCiQueryResponse] = useState<string | null>(null);
  const [ciQueryBlocks, setCiQueryBlocks] = useState<CIBlock[]>([]);
  const [ciQueryActive, setCiQueryActive] = useState(false);

  const setTabLoading = (key: string, val: boolean) =>
    setLoadingTab((prev) => ({ ...prev, [key]: val }));

  /* -- Load alerts from localStorage -- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ci-alerts");
      if (stored) setAlerts(JSON.parse(stored));
    } catch { /* noop */ }
  }, []);

  const saveAlerts = (rules: AlertRule[]) => {
    setAlerts(rules);
    localStorage.setItem("ci-alerts", JSON.stringify(rules));
  };

  /* -- Command Center: load on mount -- */
  useEffect(() => {
    let cancelled = false;
    async function loadCommandCenter() {
      setCommandCenterLoading(true);
      const [profileResults, finResults] = await Promise.all([
        Promise.all(FMP_COMPETITORS.map((sym) => fmpFetch<CompanyProfile[]>("profile", sym))),
        Promise.all(FMP_COMPETITORS.map(async (sym) => {
          const data = await fmpFetch<IncomeStatement[]>("income-statement", sym, { period: "quarter", limit: "8" });
          return { sym, data: Array.isArray(data) ? data : [] };
        })),
      ]);
      if (cancelled) return;
      const items = profileResults.map((r) => (Array.isArray(r) ? r[0] : r)).filter(Boolean) as CompanyProfile[];
      setCcProfiles(items);
      setProfiles(items);
      loadedTabs.current.add("overview");

      const finMap: Record<string, IncomeStatement[]> = {};
      for (const { sym, data } of finResults) finMap[sym] = data;
      setCcFinancials(finMap);
      setFinancials(finMap);
      loadedTabs.current.add("financials");

      setCommandCenterLoading(false);
    }
    loadCommandCenter();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -- CI Query handler -- */
  const handleCIQuerySubmit = async () => {
    if (!ciQuery.trim() || ciQueryLoading) return;
    setCiQueryLoading(true);
    setCiQueryActive(true);
    setCiQueryResponse(null);
    setCiQueryBlocks([]);
    try {
      const res = await fetch("/api/ci-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ciQuery.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setCiQueryResponse(`Error: ${data.error}`);
      } else {
        setCiQueryResponse(data.response);
        setCiQueryBlocks(data.blocks || []);
      }
      setTimeout(() => {
        document.querySelector(".ci-query-response")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    } catch {
      setCiQueryResponse("Failed to process query. Please try again.");
    } finally {
      setCiQueryLoading(false);
    }
  };

  const clearCIQuery = () => {
    setCiQueryActive(false);
    setCiQueryResponse(null);
    setCiQueryBlocks([]);
    setCiQuery("");
  };

  /* -- Command Center computed data -- */
  const ccBenchmarkData = useMemo(() => {
    return FMP_COMPETITORS.map((sym) => {
      const stmts = ccFinancials[sym] || [];
      const latest = stmts[0];
      const prev = stmts[4];
      const profile = ccProfiles.find((p) => p.symbol === sym);
      const rev = latest?.revenue || 0;
      const prevRev = prev?.revenue || 0;
      const yoyGrowth = prevRev ? ((rev - prevRev) / prevRev) * 100 : 0;
      const grossMargin = latest?.grossProfit && latest?.revenue
        ? (latest.grossProfit / latest.revenue) * 100 : 0;
      const opMargin = latest?.operatingIncome && latest?.revenue
        ? (latest.operatingIncome / latest.revenue) * 100 : 0;
      return {
        symbol: sym, name: COMPETITOR_NAMES[sym] || sym,
        revenue: rev, grossMargin, opMargin, yoyGrowth,
        mktCap: profile?.mktCap || 0, price: profile?.price || 0,
        changes: profile?.changes || 0,
      };
    });
  }, [ccFinancials, ccProfiles]);

  const ccHeadline = useMemo(() => {
    if (ccBenchmarkData.length === 0) return null;
    const marginLeader = [...ccBenchmarkData].sort((a, b) => b.grossMargin - a.grossMargin)[0];
    const growthLeader = [...ccBenchmarkData].sort((a, b) => b.yoyGrowth - a.yoyGrowth)[0];
    return { marginLeader, growthLeader };
  }, [ccBenchmarkData]);

  const ccMarketPulse = useMemo(() => {
    if (ccBenchmarkData.length === 0) return [];
    const sorted = [...ccBenchmarkData];
    const capLeader = sorted.sort((a, b) => b.mktCap - a.mktCap)[0];
    const worstMargin = [...ccBenchmarkData].sort((a, b) => a.grossMargin - b.grossMargin)[0];
    const worstGrowth = [...ccBenchmarkData].sort((a, b) => a.yoyGrowth - b.yoyGrowth)[0];
    const bestOpMargin = [...ccBenchmarkData].sort((a, b) => b.opMargin - a.opMargin)[0];
    const pulses: string[] = [];
    if (worstMargin.grossMargin < 35) pulses.push(`${worstMargin.symbol} underperforming peers on margins (${worstMargin.grossMargin.toFixed(1)}%)`);
    pulses.push(`${capLeader.symbol} largest by market cap at $${(capLeader.mktCap / 1e9).toFixed(0)}B`);
    if (worstGrowth.yoyGrowth < 0) pulses.push(`${worstGrowth.symbol} facing revenue headwinds (${worstGrowth.yoyGrowth.toFixed(1)}% YoY)`);
    pulses.push(`${bestOpMargin.symbol} leads operating efficiency at ${bestOpMargin.opMargin.toFixed(1)}% op margin`);
    return pulses.slice(0, 4);
  }, [ccBenchmarkData]);

  /* -- Lazy loaders -- */

  const loadOverview = useCallback(async () => {
    if (loadedTabs.current.has("overview")) return;
    setTabLoading("overview", true);
    const results = await Promise.all(
      FMP_COMPETITORS.map((sym) => fmpFetch<CompanyProfile[]>("profile", sym))
    );
    const items = results
      .map((r) => (Array.isArray(r) ? r[0] : r))
      .filter(Boolean) as CompanyProfile[];
    setProfiles(items);
    loadedTabs.current.add("overview");
    setTabLoading("overview", false);
  }, []);

  const loadFinancials = useCallback(async () => {
    if (loadedTabs.current.has("financials")) return;
    setTabLoading("financials", true);
    const results = await Promise.all(
      FMP_COMPETITORS.map(async (sym) => {
        const data = await fmpFetch<IncomeStatement[]>("income-statement", sym, { period: "quarter", limit: "8" });
        return { sym, data: Array.isArray(data) ? data : [] };
      })
    );
    const map: Record<string, IncomeStatement[]> = {};
    for (const { sym, data } of results) map[sym] = data;
    setFinancials(map);
    loadedTabs.current.add("financials");
    setTabLoading("financials", false);
  }, []);

  const loadEarnings = useCallback(async (symbol: string) => {
    const earKey = `earnings-${symbol}`;
    if (loadedTabs.current.has(earKey)) return;
    setTabLoading("earnings", true);
    const [transcript, history] = await Promise.all([
      fmpFetch<Array<{ content?: string }>>("earning-call-transcript", symbol, { year: "2025", quarter: "4" }),
      fmpFetch<EarningsHistory[]>("earnings", symbol),
    ]);
    if (transcript && Array.isArray(transcript) && transcript[0]?.content) {
      setTranscripts((prev) => ({ ...prev, [symbol]: transcript[0].content! }));
    }
    if (history && Array.isArray(history)) {
      setEarningsHistory((prev) => ({ ...prev, [symbol]: history }));
    }
    loadedTabs.current.add(earKey);
    setTabLoading("earnings", false);
  }, []);

  const loadStrategy = useCallback(async (symbol: string) => {
    const sKey = `strategy-${symbol}`;
    if (loadedTabs.current.has(sKey)) return;
    setTabLoading("strategy", true);
    const name = COMPETITOR_NAMES[symbol] || symbol;
    const [deals, press] = await Promise.all([
      fmpFetch<MADeal[]>("mergers-acquisitions-search", symbol, { name }),
      fmpFetch<PressRelease[]>("press-releases", symbol, { limit: "10" }),
    ]);
    if (deals && Array.isArray(deals)) setMaDeals((prev) => ({ ...prev, [symbol]: deals }));
    if (press && Array.isArray(press)) setPressReleases((prev) => ({ ...prev, [symbol]: press }));
    loadedTabs.current.add(sKey);
    setTabLoading("strategy", false);
  }, []);

  const loadESG = useCallback(async () => {
    if (loadedTabs.current.has("esg")) return;
    setTabLoading("esg", true);
    const results = await Promise.all(
      FMP_COMPETITORS.map(async (sym) => {
        const data = await fmpFetch<ESGData[]>("esg-environmental-social-governance-data", sym);
        return { sym, data: Array.isArray(data) && data[0] ? data[0] : null };
      })
    );
    const map: Record<string, ESGData> = {};
    for (const { sym, data } of results) if (data) map[sym] = data;
    setEsgData(map);
    loadedTabs.current.add("esg");
    setTabLoading("esg", false);
  }, []);

  const loadAnalysts = useCallback(async (symbol: string) => {
    const aKey = `analysts-${symbol}`;
    if (loadedTabs.current.has(aKey)) return;
    setTabLoading("analysts", true);
    const [estimates, targets] = await Promise.all([
      fmpFetch<AnalystEstimate[]>("analyst-estimates", symbol),
      fmpFetch<PriceTarget[]>("price-target", symbol),
    ]);
    if (estimates && Array.isArray(estimates))
      setAnalystEstimates((prev) => ({ ...prev, [symbol]: estimates }));
    if (targets && Array.isArray(targets))
      setPriceTargets((prev) => ({ ...prev, [symbol]: targets.slice(0, 20) }));
    loadedTabs.current.add(aKey);
    setTabLoading("analysts", false);
  }, []);

  const loadNews = useCallback(async (symbol: string) => {
    const nKey = `news-${symbol}`;
    if (loadedTabs.current.has(nKey)) return;
    setTabLoading("news", true);
    const data = await fmpFetch<NewsItem[]>("stock-news", symbol, { limit: "20" });
    if (data && Array.isArray(data)) setNewsItems((prev) => ({ ...prev, [symbol]: data }));
    loadedTabs.current.add(nKey);
    setTabLoading("news", false);
  }, []);

  const loadSWOT = useCallback(async (symbol: string) => {
    const sKey = `swot-${symbol}`;
    if (loadedTabs.current.has(sKey)) return;
    setTabLoading("swot", true);
    const data = await fmpFetch<FinancialRatio[]>("ratios", symbol, { limit: "1" });
    if (data && Array.isArray(data)) setRatios((prev) => ({ ...prev, [symbol]: data }));
    loadedTabs.current.add(sKey);
    setTabLoading("swot", false);
  }, []);

  /* -- Trigger loaders on tab/company change -- */
  useEffect(() => {
    switch (tab) {
      case "overview": loadOverview(); break;
      case "financials": loadFinancials(); break;
      case "earnings": loadEarnings(selectedCompany); break;
      case "strategy": loadStrategy(selectedCompany); break;
      case "esg": loadESG(); break;
      case "analysts": loadAnalysts(selectedCompany); break;
      case "news": loadNews(selectedCompany); break;
      case "swot": loadSWOT(selectedCompany); break;
      case "benchmarking":
        if (profiles.length === 0) loadOverview();
        if (Object.keys(financials).length === 0) loadFinancials();
        break;
      case "alerts":
        if (profiles.length === 0) loadOverview();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedCompany]);

  /* -- Evaluate alerts when profiles load -- */
  useEffect(() => {
    if (profiles.length === 0 || alerts.length === 0) return;
    const profileMap: Record<string, CompanyProfile> = {};
    for (const p of profiles) if (p.symbol) profileMap[p.symbol] = p;

    const triggered: string[] = [];
    for (const rule of alerts) {
      const p = profileMap[rule.company];
      if (!p) continue;
      const val = rule.metric === "price" ? p.price : (p.mktCap ? p.mktCap / 1e9 : undefined);
      if (val === undefined) continue;
      const pass =
        rule.operator === ">" ? val > rule.threshold :
        rule.operator === "<" ? val < rule.threshold :
        Math.abs(val - rule.threshold) < 0.01;
      if (pass) triggered.push(`${COMPETITOR_NAMES[rule.company] || rule.company}: ${rule.metric} ${rule.operator} ${rule.threshold} (current: ${val.toFixed(2)})`);
    }
    setTriggeredAlerts(triggered);
  }, [profiles, alerts]);

  const isLoading = loadingTab[tab] ?? false;

  /* -- Tabs that use company selector -- */
  const companyTabs: TabKey[] = ["earnings", "strategy", "analysts", "news", "swot"];
  const showCompanySelector = companyTabs.includes(tab);

  /* -- Financial benchmarking data -- */
  const benchmarkData = useMemo(() => {
    return FMP_COMPETITORS.map((sym) => {
      const stmts = financials[sym] || [];
      const latest = stmts[0];
      const prev = stmts[4];
      const profile = profiles.find((p) => p.symbol === sym);
      const rev = latest?.revenue || 0;
      const prevRev = prev?.revenue || 0;
      const yoyGrowth = prevRev ? ((rev - prevRev) / prevRev) * 100 : 0;
      const grossMargin = latest?.grossProfit && latest?.revenue
        ? (latest.grossProfit / latest.revenue) * 100 : 0;
      const opMargin = latest?.operatingIncome && latest?.revenue
        ? (latest.operatingIncome / latest.revenue) * 100 : 0;
      return {
        symbol: sym,
        name: COMPETITOR_NAMES[sym] || sym,
        revenue: rev,
        grossProfit: latest?.grossProfit || 0,
        operatingIncome: latest?.operatingIncome || 0,
        netIncome: latest?.netIncome || 0,
        grossMargin,
        opMargin,
        yoyGrowth,
        mktCap: profile?.mktCap || 0,
      };
    });
  }, [financials, profiles]);

  /* -- Transcript phrase analysis -- */
  const phraseFreq = useMemo(() => {
    const text = (transcripts[selectedCompany] || "").toLowerCase();
    if (!text) return [];
    return KEY_PHRASES.map((phrase) => {
      const re = new RegExp(phrase, "gi");
      return { phrase, count: (text.match(re) || []).length };
    }).sort((a, b) => b.count - a.count);
  }, [transcripts, selectedCompany]);

  /* -- SWOT generation from ratios -- */
  const swotData = useMemo(() => {
    const r = ratios[selectedCompany]?.[0];
    if (!r) return null;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    if ((r.grossProfitMargin ?? 0) > 0.4) strengths.push(`Strong gross margin (${pct(r.grossProfitMargin)})`);
    else weaknesses.push(`Low gross margin (${pct(r.grossProfitMargin)})`);

    if ((r.returnOnEquity ?? 0) > 0.15) strengths.push(`High ROE (${pct(r.returnOnEquity)})`);
    else weaknesses.push(`Below-average ROE (${pct(r.returnOnEquity)})`);

    if ((r.currentRatio ?? 0) > 1.5) strengths.push(`Healthy liquidity (current ratio: ${(r.currentRatio ?? 0).toFixed(2)})`);
    else if ((r.currentRatio ?? 0) < 1) weaknesses.push(`Tight liquidity (current ratio: ${(r.currentRatio ?? 0).toFixed(2)})`);

    if ((r.operatingProfitMargin ?? 0) > 0.2) strengths.push(`Strong operating margin (${pct(r.operatingProfitMargin)})`);
    else weaknesses.push(`Thin operating margin (${pct(r.operatingProfitMargin)})`);

    if ((r.debtEquityRatio ?? 0) > 2) {
      weaknesses.push(`High leverage (D/E: ${(r.debtEquityRatio ?? 0).toFixed(2)})`);
      threats.push("Interest rate sensitivity from high debt load");
    }

    if ((r.netProfitMargin ?? 0) > 0.1) strengths.push(`Healthy net margin (${pct(r.netProfitMargin)})`);

    if ((r.dividendYield ?? 0) > 0.02) strengths.push(`Attractive dividend yield (${pct(r.dividendYield)})`);

    opportunities.push("Market expansion in emerging economies");
    opportunities.push("Product innovation and premiumization");
    opportunities.push("E-commerce and direct-to-consumer growth");

    threats.push("Commodity price volatility");
    threats.push("Intensifying competitive landscape");
    threats.push("Regulatory and compliance changes");

    return { strengths, weaknesses, opportunities, threats };
  }, [ratios, selectedCompany]);

  /* -- Scroll tabs -- */
  const scrollTabs = (dir: "left" | "right") => {
    if (tabRef.current) tabRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const switchTab = (newTab: TabKey) => {
    if (newTab === tab) return;
    setTabVisible(false);
    setTimeout(() => {
      setTab(newTab);
      setTabVisible(true);
    }, 150);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Competitive Intelligence</h2>
            <p className="text-xs text-muted-foreground">Executive briefing &middot; Real-time market data</p>
          </div>
          {triggeredAlerts.length > 0 && (
            <span className="ml-2 px-2.5 py-1 bg-negative/10 text-negative text-xs font-semibold rounded-full">
              {triggeredAlerts.length} alert{triggeredAlerts.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Command Center */}
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Command Center</h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-positive live-dot" />
              LIVE
            </span>
          </div>

          {/* Competitor metric tiles */}
          {ccBenchmarkData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ccBenchmarkData.map((c) => (
                <div key={c.symbol} className="bg-background rounded-lg border border-border p-4 space-y-3 card-hover">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-foreground">{c.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{c.symbol}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {c.symbol.slice(0, 2)}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold font-mono">${c.price.toFixed(2)}</span>
                      <span className={cn(
                        "text-xs font-semibold font-mono",
                        c.changes >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {c.changes >= 0 ? "+" : ""}{c.changes.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground uppercase tracking-wider">Mkt Cap</span>
                        <div className="font-mono font-semibold">${(c.mktCap / 1e9).toFixed(0)}B</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase tracking-wider">Revenue</span>
                        <div className="font-mono font-semibold">${(c.revenue / 1e9).toFixed(1)}B</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase tracking-wider">Gross %</span>
                        <div className={cn("font-mono font-semibold", c.grossMargin > 50 ? "text-positive" : c.grossMargin > 30 ? "" : "text-negative")}>{c.grossMargin.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase tracking-wider">YoY Rev</span>
                        <div className={cn("font-mono font-semibold", c.yoyGrowth > 0 ? "text-positive" : "text-negative")}>{c.yoyGrowth > 0 ? "+" : ""}{c.yoyGrowth.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Loading competitive data...
            </div>
          )}

          {/* Key Intelligence card */}
          {ccMarketPulse.length > 0 && (
            <div className="bg-primary/[0.03] border border-primary/10 rounded-lg p-4 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">Key Intelligence</h4>
              <ul className="space-y-1.5">
                {ccMarketPulse.map((insight, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="font-medium">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CI Natural Language Query */}
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold">Ask About Competitors</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleCIQuerySubmit(); }} className="flex gap-2">
            <input
              value={ciQuery}
              onChange={(e) => setCiQuery(e.target.value)}
              placeholder="Ask anything — compare margins, analyze trends, summarize a competitor..."
              className="flex-1 h-9 rounded-lg border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <button
              type="submit"
              disabled={ciQueryLoading || !ciQuery.trim()}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              {ciQueryLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
            {ciQueryActive && (
              <button
                type="button"
                onClick={clearCIQuery}
                className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </form>
          {!ciQueryActive && (
            <div className="flex gap-2 flex-wrap">
              {["Who has the best margins?", "Summarize Nestle", "Compare revenue growth"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setCiQuery(q); }}
                  className="text-xs border border-border/60 rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors bg-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {/* Query response area */}
          {ciQueryActive && ciQueryResponse && (
            <div className="space-y-3 pt-1 ci-query-response">
              <p className="text-sm text-foreground">{ciQueryResponse}</p>
              {ciQueryBlocks.length > 0 && <CIRenderer blocks={ciQueryBlocks} />}
            </div>
          )}
        </div>

        {/* Tab bar (scrollable) */}
        <div className="relative flex items-center">
          <button onClick={() => scrollTabs("left")} className="shrink-0 p-1 text-muted-foreground hover:text-foreground md:hidden">
            <ChevronLeft size={16} />
          </button>
          <div ref={tabRef} className="flex gap-1 border-b border-border overflow-x-auto scrollbar-hide">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => scrollTabs("right")} className="shrink-0 p-1 text-muted-foreground hover:text-foreground md:hidden">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Company selector pills */}
        {showCompanySelector && (
          <div className="flex gap-2 flex-wrap">
            {FMP_COMPETITORS.map((sym) => (
              <button
                key={sym}
                onClick={() => setSelectedCompany(sym)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                  selectedCompany === sym
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {sym}
              </button>
            ))}
          </div>
        )}

        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground font-mono">
          Viewing: {showCompanySelector ? `${COMPETITOR_NAMES[selectedCompany]} (${selectedCompany})` : "All Companies"} &middot; {TABS.find((t) => t.key === tab)?.label}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Tab content with fade transition */}
        <div className="transition-opacity duration-150" style={{ opacity: tabVisible ? 1 : 0 }}>

        {/* TAB: OVERVIEW */}
        {tab === "overview" && (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 7 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <div key={p.symbol} className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm">{p.companyName}</h3>
                      <span className="text-xs text-muted-foreground font-mono">{p.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold">${p.price?.toFixed(2)}</div>
                      <div className={cn(
                        "text-xs font-mono",
                        (p.changes ?? 0) >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {(p.changes ?? 0) >= 0 ? "+" : ""}{p.changes?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.sector}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-mono">${p.mktCap ? toBillions(p.mktCap) + "B" : "\u2014"}</span>
                    <span className="text-muted-foreground">CEO</span>
                    <span>{p.ceo || "\u2014"}</span>
                    <span className="text-muted-foreground">Employees</span>
                    <span className="font-mono">{p.fullTimeEmployees ? Number(p.fullTimeEmployees).toLocaleString() : "\u2014"}</span>
                    <span className="text-muted-foreground">52W Range</span>
                    <span className="font-mono text-[11px]">{p.range || "\u2014"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{p.description?.slice(0, 200)}...</p>
                  {/* AI insight */}
                  {(() => {
                    const bm = ccBenchmarkData.find((b) => b.symbol === p.symbol);
                    if (!bm) return null;
                    const parts: string[] = [];
                    if (bm.grossMargin > 35) parts.push(`strong pricing power with ${bm.grossMargin.toFixed(0)}% gross margins`);
                    else parts.push(`margin pressure at ${bm.grossMargin.toFixed(0)}% gross margins`);
                    if (bm.yoyGrowth > 3) parts.push(`accelerating revenue (+${bm.yoyGrowth.toFixed(1)}% YoY)`);
                    else if (bm.yoyGrowth < 0) parts.push(`revenue contraction (${bm.yoyGrowth.toFixed(1)}% YoY)`);
                    return (
                      <p className="text-[11px] text-primary/80 italic border-t border-border/50 pt-1.5 mt-1">
                        {COMPETITOR_NAMES[p.symbol ?? ""] || p.companyName} shows {parts.join(" but faces ")}.
                      </p>
                    );
                  })()}
                </div>
              ))}
              {profiles.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground col-span-full">No profile data available.</p>
              )}
            </div>
          )
        )}

        {/* TAB: FINANCIALS */}
        {tab === "financials" && !isLoading && (
          <div className="space-y-6">
            {benchmarkData.length > 0 && (() => {
              const fastest = [...benchmarkData].sort((a, b) => b.yoyGrowth - a.yoyGrowth)[0];
              const slowest = [...benchmarkData].sort((a, b) => a.yoyGrowth - b.yoyGrowth)[0];
              return (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  Revenue trends show divergence across the peer group — <strong className="text-foreground">{fastest.name}</strong> growing fastest at {fastest.yoyGrowth > 0 ? "+" : ""}{fastest.yoyGrowth.toFixed(1)}% YoY while <strong className="text-foreground">{slowest.name}</strong> {slowest.yoyGrowth < 0 ? "faces headwinds" : "lags"} at {slowest.yoyGrowth > 0 ? "+" : ""}{slowest.yoyGrowth.toFixed(1)}%.
                </p>
              );
            })()}
            <DataTable
              data={benchmarkData.map((d) => ({
                Company: d.name,
                "Revenue ($B)": toBillions(d.revenue),
                "Gross Profit ($B)": toBillions(d.grossProfit),
                "Op. Income ($B)": toBillions(d.operatingIncome),
                "Net Income ($B)": toBillions(d.netIncome),
                "Gross Margin %": d.grossMargin.toFixed(2),
                "Op. Margin %": d.opMargin.toFixed(2),
                "YoY Rev Growth %": d.yoyGrowth.toFixed(2),
              }))}
            />

            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
              <h3 className="text-sm font-semibold mb-3">Revenue Comparison ($B)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={benchmarkData}>
                  <XAxis dataKey="symbol" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(Number(v) / 1e9).toFixed(0)}B`} />
                  <Tooltip formatter={(v) => `$${toBillions(Number(v))}B`} />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
              <h3 className="text-sm font-semibold mb-3">Quarterly Revenue Trend ($B)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={(() => {
                  const quarters: Record<string, Record<string, number>> = {};
                  for (const sym of FMP_COMPETITORS) {
                    for (const stmt of (financials[sym] || []).slice().reverse()) {
                      const q = stmt.date?.slice(0, 7) || "";
                      if (!quarters[q]) quarters[q] = {};
                      quarters[q][sym] = (stmt.revenue || 0) / 1e9;
                    }
                  }
                  return Object.entries(quarters)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, vals]) => ({ date, ...vals }));
                })()}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Number(v).toFixed(0)}B`} />
                  <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}B`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {FMP_COMPETITORS.map((sym, i) => (
                    <Area
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      stroke={CHART_COLORS[i]}
                      fill={CHART_COLORS[i]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB: EARNINGS */}
        {tab === "earnings" && !isLoading && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold">
                Earnings Call Transcript — {COMPETITOR_NAMES[selectedCompany]} (Q4 2025)
              </h3>
              {transcripts[selectedCompany] ? (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {transcripts[selectedCompany].slice(0, 2000).split(new RegExp(`(${KEY_PHRASES.join("|")})`, "gi")).map((part, i) =>
                    KEY_PHRASES.some((kp) => kp.toLowerCase() === part.toLowerCase())
                      ? <mark key={i} className="bg-primary/20 text-primary px-0.5 rounded">{part}</mark>
                      : part
                  )}
                  {transcripts[selectedCompany].length > 2000 && "\u2026"}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No transcript available for this quarter.</p>
              )}
            </div>

            {phraseFreq.length > 0 && phraseFreq.some((p) => p.count > 0) && (
              <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
                <h3 className="text-sm font-semibold mb-3">Key Theme Frequency</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={phraseFreq} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="phrase" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">EPS History — {COMPETITOR_NAMES[selectedCompany]}</h3>
              {(earningsHistory[selectedCompany] || []).length > 0 ? (
                <DataTable
                  data={(earningsHistory[selectedCompany] || []).slice(0, 8).map((e) => {
                    const surprise = e.epsEstimated && e.eps
                      ? (((e.eps - e.epsEstimated) / Math.abs(e.epsEstimated)) * 100).toFixed(2)
                      : "\u2014";
                    return {
                      Date: e.date?.slice(0, 10) || "\u2014",
                      "Est. EPS": e.epsEstimated?.toFixed(2) ?? "\u2014",
                      "Actual EPS": e.eps?.toFixed(2) ?? "\u2014",
                      "Surprise %": surprise,
                    };
                  })}
                />
              ) : (
                <p className="text-xs text-muted-foreground">No earnings history available.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: BENCHMARKING */}
        {tab === "benchmarking" && (
          (loadingTab["overview"] || loadingTab["financials"]) ? <Skeleton rows={5} /> : (
            <div className="space-y-6">
              <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
                <h3 className="text-sm font-semibold mb-1">Competitive Positioning</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Bubble size = market cap. Upper right = ideal positioning (high growth + high margins).
                </p>
                <ResponsiveContainer width="100%" height={360}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                      type="number" dataKey="yoyGrowth" name="Revenue Growth %"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Revenue Growth %", position: "bottom", fontSize: 11 }}
                    />
                    <YAxis
                      type="number" dataKey="opMargin" name="Operating Margin %"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Op. Margin %", angle: -90, position: "insideLeft", fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="mktCap" range={[200, 2000]} />
                    <Tooltip
                      formatter={(v, name) =>
                        name === "Market Cap" ? `$${toBillions(Number(v))}B` : `${Number(v).toFixed(2)}%`
                      }
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.name} (${item.symbol})` : "";
                      }}
                    />
                    <Scatter data={benchmarkData}>
                      {benchmarkData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-2">
                  <div className="text-right">High Growth &middot; Low Margin</div>
                  <div>High Growth &middot; High Margin</div>
                  <div className="text-right">Low Growth &middot; Low Margin</div>
                  <div>Low Growth &middot; High Margin</div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {benchmarkData.map((d, i) => (
                    <span key={d.symbol} className="flex items-center gap-1 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                      {d.symbol}
                    </span>
                  ))}
                </div>
              </div>

              <DataTable
                data={benchmarkData.map((d) => ({
                  Company: d.name,
                  Ticker: d.symbol,
                  "Revenue ($B)": toBillions(d.revenue),
                  "Gross Margin %": d.grossMargin.toFixed(2),
                  "Op. Margin %": d.opMargin.toFixed(2),
                  "Net Income ($B)": toBillions(d.netIncome),
                  "YoY Growth %": d.yoyGrowth.toFixed(2),
                  "Mkt Cap ($B)": toBillions(d.mktCap),
                }))}
              />
            </div>
          )
        )}

        {/* TAB: STRATEGY */}
        {tab === "strategy" && !isLoading && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold">M&A Activity — {COMPETITOR_NAMES[selectedCompany]}</h3>
              {(maDeals[selectedCompany] || []).length > 0 ? (
                <div className="space-y-2">
                  {(maDeals[selectedCompany] || []).slice(0, 10).map((deal, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs border-l-2 border-primary/30 pl-3">
                      <span className="text-muted-foreground font-mono shrink-0">{deal.datedAcquired?.slice(0, 10) || "\u2014"}</span>
                      <div>
                        <span className="font-medium">{deal.companyName}</span>
                        <span className="text-muted-foreground"> &rarr; </span>
                        <span className="font-medium">{deal.targetedCompanyName}</span>
                        {deal.transactionAmount && (
                          <span className="text-muted-foreground ml-2">(${deal.transactionAmount})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No M&A data available.</p>
              )}
            </div>

            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
              <h3 className="text-sm font-semibold">Press Releases — {COMPETITOR_NAMES[selectedCompany]}</h3>
              {(pressReleases[selectedCompany] || []).length > 0 ? (
                <div className="space-y-2">
                  {(pressReleases[selectedCompany] || []).map((pr, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className="text-muted-foreground font-mono shrink-0">{pr.date?.slice(0, 10) || "\u2014"}</span>
                      <div>
                        <span className="font-medium">{pr.title}</span>
                        {pr.text && <p className="text-muted-foreground line-clamp-1 mt-0.5">{pr.text.slice(0, 150)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No press releases available.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: ESG */}
        {tab === "esg" && !isLoading && (
          <div className="space-y-6">
            {Object.keys(esgData).length > 0 ? (
              <>
                <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        {["Company", "Environmental", "Social", "Governance", "Overall ESG"].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FMP_COMPETITORS.map((sym) => {
                        const d = esgData[sym];
                        if (!d) return null;
                        return (
                          <tr key={sym} className="border-t border-border">
                            <td className="px-4 py-2 font-medium">{COMPETITOR_NAMES[sym]}</td>
                            <td className={cn("px-4 py-2 font-mono", esgColor(d.environmentalScore))}>
                              <span className={cn("px-1.5 py-0.5 rounded text-[11px]", esgBg(d.environmentalScore))}>
                                {d.environmentalScore?.toFixed(1) ?? "\u2014"}
                              </span>
                            </td>
                            <td className={cn("px-4 py-2 font-mono", esgColor(d.socialScore))}>
                              <span className={cn("px-1.5 py-0.5 rounded text-[11px]", esgBg(d.socialScore))}>
                                {d.socialScore?.toFixed(1) ?? "\u2014"}
                              </span>
                            </td>
                            <td className={cn("px-4 py-2 font-mono", esgColor(d.governanceScore))}>
                              <span className={cn("px-1.5 py-0.5 rounded text-[11px]", esgBg(d.governanceScore))}>
                                {d.governanceScore?.toFixed(1) ?? "\u2014"}
                              </span>
                            </td>
                            <td className={cn("px-4 py-2 font-mono font-semibold", esgColor(d.ESGScore))}>
                              {d.ESGScore?.toFixed(1) ?? "\u2014"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FMP_COMPETITORS.map((sym, idx) => {
                    const d = esgData[sym];
                    if (!d) return null;
                    const radarData = [
                      { subject: "Environmental", value: d.environmentalScore || 0 },
                      { subject: "Social", value: d.socialScore || 0 },
                      { subject: "Governance", value: d.governanceScore || 0 },
                    ];
                    return (
                      <div key={sym} className="bg-card rounded-xl ring-1 ring-foreground/10 p-3">
                        <h4 className="text-xs font-semibold text-center mb-1">{COMPETITOR_NAMES[sym]}</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar
                              dataKey="value"
                              stroke={CHART_COLORS[idx]}
                              fill={CHART_COLORS[idx]}
                              fillOpacity={0.3}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No ESG data available.</p>
            )}
          </div>
        )}

        {/* TAB: ANALYSTS */}
        {tab === "analysts" && !isLoading && (
          <div className="space-y-6">
            {(() => {
              const targets = priceTargets[selectedCompany] || [];
              const profile = profiles.find((p) => p.symbol === selectedCompany);
              const currentPrice = profile?.price || 0;
              const avgTarget = targets.length > 0
                ? targets.reduce((s, t) => s + (t.priceTarget || 0), 0) / targets.length
                : 0;
              const upside = currentPrice ? ((avgTarget - currentPrice) / currentPrice) * 100 : 0;

              let buy = 0, hold = 0, sell = 0;
              for (const t of targets) {
                const tgt = t.priceTarget || 0;
                if (tgt > currentPrice * 1.1) buy++;
                else if (tgt < currentPrice * 0.95) sell++;
                else hold++;
              }
              const total = buy + hold + sell;
              const pieData = [
                { name: "Buy", value: buy, fill: "oklch(0.45 0.18 160)" },
                { name: "Hold", value: hold, fill: "oklch(0.60 0.15 80)" },
                { name: "Sell", value: sell, fill: "oklch(0.50 0.22 25)" },
              ];

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Avg Price Target</div>
                      <div className="text-xl font-mono font-semibold">${avgTarget.toFixed(2)}</div>
                    </div>
                    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                      <div className="text-xl font-mono font-semibold">${currentPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Upside/Downside</div>
                      <div className={cn("text-xl font-mono font-semibold", upside >= 0 ? "text-positive" : "text-negative")}>
                        {upside >= 0 ? "+" : ""}{upside.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {total > 0 && (
                    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
                      <h3 className="text-sm font-semibold mb-3">Analyst Sentiment — {COMPETITOR_NAMES[selectedCompany]}</h3>
                      <div className="flex items-center justify-center gap-8">
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, value }) => `${name ?? ""}: ${value}`}
                            >
                              {pieData.map((d, i) => (
                                <Cell key={i} fill={d.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-positive" /> Buy: {buy}</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: "oklch(0.60 0.15 80)" }} /> Hold: {hold}</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-negative" /> Sell: {sell}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(analystEstimates[selectedCompany] || []).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Earnings Estimates — {COMPETITOR_NAMES[selectedCompany]}</h3>
                      <DataTable
                        data={(analystEstimates[selectedCompany] || []).slice(0, 8).map((e) => ({
                          Date: e.date?.slice(0, 10) || "\u2014",
                          "Est. EPS (Avg)": e.estimatedEpsAvg?.toFixed(2) ?? "\u2014",
                          "Est. EPS (Low)": e.estimatedEpsLow?.toFixed(2) ?? "\u2014",
                          "Est. EPS (High)": e.estimatedEpsHigh?.toFixed(2) ?? "\u2014",
                          "Est. Revenue ($B)": e.estimatedRevenueAvg ? toBillions(e.estimatedRevenueAvg) : "\u2014",
                          "# Analysts": String(e.numberAnalystsEstimatedEps ?? "\u2014"),
                        }))}
                      />
                    </div>
                  )}

                  {targets.length > 0 && (
                    <DataTable
                      data={targets.slice(0, 15).map((t) => ({
                        Analyst: t.analystName || "\u2014",
                        Company: t.analystCompany || "\u2014",
                        "Price Target": `$${(t.priceTarget || 0).toFixed(2)}`,
                        Date: t.publishedDate?.slice(0, 10) || "\u2014",
                      }))}
                    />
                  )}
                </>
              );
            })()}
            {!(priceTargets[selectedCompany] || []).length && (
              <p className="text-sm text-muted-foreground">No analyst data available for {COMPETITOR_NAMES[selectedCompany]}.</p>
            )}
          </div>
        )}

        {/* TAB: NEWS */}
        {tab === "news" && !isLoading && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {FMP_COMPETITORS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => { setSelectedCompany(sym); loadNews(sym); }}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                    selectedCompany === sym
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sym}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {(newsItems[selectedCompany] || []).map((n, i) => {
                const sentiment = sentimentFromTitle(n.title || "");
                return (
                  <div key={i} className="bg-card rounded-xl ring-1 ring-foreground/10 p-3 flex gap-3 hover:bg-muted/30 transition-colors">
                    <div className="shrink-0 w-16 pt-0.5">
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wide line-clamp-1">{n.site || "News"}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.publishedDate)}</div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1"
                        >
                          {n.title}
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                        <span className={cn(
                          "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full",
                          sentiment === "positive" && "bg-positive/10 text-positive",
                          sentiment === "negative" && "bg-negative/10 text-negative",
                          sentiment === "neutral" && "bg-muted text-muted-foreground",
                        )}>
                          {sentiment}
                        </span>
                      </div>
                      {n.text && <p className="text-xs text-muted-foreground line-clamp-2">{n.text.slice(0, 200)}</p>}
                    </div>
                  </div>
                );
              })}
              {(newsItems[selectedCompany] || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No news available for {COMPETITOR_NAMES[selectedCompany]}.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: SWOT */}
        {tab === "swot" && !isLoading && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              SWOT Analysis — {COMPETITOR_NAMES[selectedCompany]} ({selectedCompany})
            </h3>
            {swotData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { label: "Strengths", items: swotData.strengths, icon: <Shield size={14} />, color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-400/40" },
                  { label: "Weaknesses", items: swotData.weaknesses, icon: <AlertTriangle size={14} />, color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-400/40" },
                  { label: "Opportunities", items: swotData.opportunities, icon: <TrendingUp size={14} />, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-400/40" },
                  { label: "Threats", items: swotData.threats, icon: <TrendingDown size={14} />, color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", borderColor: "border-orange-400/40" },
                ] as const).map((q) => (
                  <div key={q.label} className={cn("rounded-xl ring-1 ring-foreground/10 p-4 border-l-4", q.bg, q.borderColor)}>
                    <h4 className={cn("text-sm font-semibold mb-2 flex items-center gap-1.5", q.color)}>
                      {q.icon}
                      {q.label}
                    </h4>
                    <ul className="space-y-1.5">
                      {q.items.map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="shrink-0">&bull;</span>
                          {item}
                        </li>
                      ))}
                      {q.items.length === 0 && (
                        <li className="text-xs text-muted-foreground italic">Insufficient data</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading financial ratios for SWOT generation...</p>
            )}
          </div>
        )}

        {/* TAB: ALERTS */}
        {tab === "alerts" && (
          <AlertsPanel
            alerts={alerts}
            triggeredAlerts={triggeredAlerts}
            onSave={saveAlerts}
          />
        )}

        </div>{/* end fade wrapper */}
      </div>
    </AppShell>
  );
}

/* ---- Alerts Sub-component ---- */

function AlertsPanel({
  alerts,
  triggeredAlerts,
  onSave,
}: {
  alerts: AlertRule[];
  triggeredAlerts: string[];
  onSave: (rules: AlertRule[]) => void;
}) {
  const [company, setCompany] = useState<string>("MDLZ");
  const [metric, setMetric] = useState<"price" | "mktCap">("price");
  const [operator, setOperator] = useState<">" | "<" | "=">(">");
  const [threshold, setThreshold] = useState("");

  const addRule = () => {
    const val = parseFloat(threshold);
    if (isNaN(val)) return;
    const rule: AlertRule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company, metric, operator, threshold: val,
    };
    onSave([...alerts, rule]);
    setThreshold("");
  };

  const removeRule = (id: string) => {
    onSave(alerts.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-negative/5 border border-negative/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-negative flex items-center gap-1.5">
            <Bell size={14} />
            Triggered Alerts
          </h3>
          {triggeredAlerts.map((msg, i) => (
            <div key={i} className="text-xs text-negative flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-negative shrink-0" />
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Add rule form */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Add Alert Rule</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1.5"
            >
              {FMP_COMPETITORS.map((sym) => (
                <option key={sym} value={sym}>{COMPETITOR_NAMES[sym]} ({sym})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as "price" | "mktCap")}
              className="text-xs bg-background border border-border rounded px-2 py-1.5"
            >
              <option value="price">Price ($)</option>
              <option value="mktCap">Market Cap ($B)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Operator</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as ">" | "<" | "=")}
              className="text-xs bg-background border border-border rounded px-2 py-1.5"
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="=">=</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1.5 w-24 font-mono"
              placeholder="e.g. 150"
            />
          </div>
          <button
            onClick={addRule}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {/* Active rules */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Active Rules ({alerts.length})</h3>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No alert rules configured. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                <span className="font-mono">
                  {COMPETITOR_NAMES[rule.company]} &middot; {rule.metric === "mktCap" ? "Mkt Cap ($B)" : "Price ($)"} {rule.operator} {rule.threshold}
                </span>
                <button onClick={() => removeRule(rule.id)} className="text-muted-foreground hover:text-negative transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
