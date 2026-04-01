"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell,
} from "recharts";
import {
  Swords, TrendingUp, TrendingDown, Loader2, ExternalLink,
  ChevronRight, FileText, Building2, BarChart3, DollarSign,
  Users, Leaf, RefreshCw, Newspaper, Target, Shield, Crosshair,
  Bell, Plus, Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { COMPETITOR_TICKERS } from "@/data/fmp";

// ---- Types ----------------------------------------------------------------

interface Competitor {
  ticker: string;
  name: string;
  segment: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  pe: number;
  revenue: number;
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  eps: number;
  fiscalDate: string;
}

interface CompanyDetail {
  profile: { companyName: string; sector: string; industry: string; mktCap: number; description: string; ceo: string; fullTimeEmployees: string; image: string } | null;
  income: { date: string; revenue: number; grossProfit: number; grossProfitRatio: number; operatingIncome: number; operatingIncomeRatio: number; netIncome: number; netIncomeRatio: number; ebitda: number; ebitdaratio: number; eps: number; epsdiluted: number }[];
  balance: { date: string; totalAssets: number; totalDebt: number; cashAndCashEquivalents: number; totalStockholdersEquity: number }[];
  ratios: { date: string; grossProfitMargin: number; operatingProfitMargin: number; netProfitMargin: number; returnOnEquity: number; returnOnAssets: number; debtEquityRatio: number; currentRatio: number; dividendYield: number; priceEarningsRatio: number }[];
  estimates: { date: string; estimatedRevenueAvg: number; estimatedEpsAvg: number; numberAnalystEstimatedRevenue: number }[];
  esg: { environmentalScore: number; socialScore: number; governanceScore: number; ESGScore: number; date: string }[];
}

interface PricePoint {
  date: string;
  close: number;
}

interface NewsItem {
  symbol: string;
  publishedDate: string;
  title: string;
  site: string;
  url: string;
}

interface MandADeal {
  companyName: string;
  targetedCompanyName: string;
  transactionDate: string;
  url: string;
}

interface TranscriptData {
  transcripts: { symbol: string; quarter: number; year: number; date: string; content: string }[];
}

// ---- SWOT data for Mars (hardcoded per SRS Section 7.2) -------------------

const MARS_SWOT = {
  strengths: [
    "Global brand portfolio across confectionery, petcare, and food segments",
    "Strong private ownership enabling long-term strategic investments",
    "Leading market share in pet nutrition (Royal Canin, Pedigree, Whiskas)",
    "Vertically integrated supply chain with direct cocoa sourcing",
    "Deep R&D investment in nutrition science and sustainability",
  ],
  weaknesses: [
    "Limited public financial transparency as a private company",
    "Heavy dependence on cocoa and sugar commodity prices",
    "Slower digital transformation compared to publicly traded peers",
    "Complex organizational structure across diverse business segments",
    "Geographic concentration of manufacturing in select regions",
  ],
  opportunities: [
    "Premiumization trend in pet food and health-focused snacking",
    "Expansion in emerging markets (Asia-Pacific, Latin America)",
    "Acquisitions in veterinary services and pet health technology",
    "Plant-based and sustainable ingredient innovation",
    "Direct-to-consumer and e-commerce channel growth",
  ],
  threats: [
    "Rising input costs from cocoa, dairy, and energy inflation",
    "Increasing regulatory scrutiny on sugar and processed foods",
    "Private label competition eroding branded market share",
    "Supply chain disruptions from climate and geopolitical risks",
    "Shifting consumer preferences toward healthier alternatives",
  ],
};

// ---- Hook -----------------------------------------------------------------

function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [url]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

// ---- Format helpers -------------------------------------------------------

function fmtB(v: number): string {
  if (!v) return "\u2014";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtPct(v: number | null, dec = 1): string {
  if (v == null) return "\u2014";
  return `${v >= 0 ? "+" : ""}${v.toFixed(dec)}%`;
}

function colorClass(v: number | null): string {
  if (v == null) return "text-muted-foreground";
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-foreground";
}

const SCATTER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

// ---- Component ------------------------------------------------------------

export function CompetitiveContent() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Dashboard data (all competitors)
  const { data: dashData, loading: dashLoading, refetch: dashRefetch } =
    useApi<{ competitors: Competitor[] }>("/api/fmp/dashboard");

  // Company detail (single ticker)
  const { data: detailData, loading: detailLoading } =
    useApi<CompanyDetail>(selectedTicker ? `/api/fmp/company?ticker=${selectedTicker}` : null);

  // Historical prices for selected ticker
  const { data: pricesData } =
    useApi<{ prices: PricePoint[] }>(selectedTicker ? `/api/fmp/prices?ticker=${selectedTicker}&from=2024-01-01` : null);

  const competitors = dashData?.competitors ?? [];
  const detail = detailData;
  const prices = pricesData?.prices ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Swords className="size-5 text-primary" />
            Competitive Intelligence
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Live data from Financial Modeling Prep &mdash; 10 FMCG competitors
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={dashRefetch} disabled={dashLoading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", dashLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {selectedTicker ? (
        // ---- Company detail view ----
        <CompanyDetailView
          ticker={selectedTicker}
          competitors={competitors}
          detail={detail}
          detailLoading={detailLoading}
          prices={prices}
          onBack={() => setSelectedTicker(null)}
        />
      ) : (
        // ---- Dashboard view ----
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="margins">Margins</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="swot">SWOT</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="positioning">Positioning</TabsTrigger>
            <TabsTrigger value="news-manda">News &amp; M&amp;A</TabsTrigger>
            <TabsTrigger value="alerts"><Bell className="h-3 w-3 mr-1" />Alerts</TabsTrigger>
            <TabsTrigger value="porters"><Shield className="h-3 w-3 mr-1" />Porter&apos;s</TabsTrigger>
          </TabsList>

          {/* ---------- OVERVIEW TAB ---------- */}
          <TabsContent value="overview">
            {dashLoading ? (
              <LoadingCard />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Peer Benchmarking &mdash; FMCG Competitors</CardTitle>
                  <CardDescription>Click any row to drill into company details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Chg%</TableHead>
                        <TableHead className="text-right">Mkt Cap</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Rev Growth</TableHead>
                        <TableHead className="text-right">Gross %</TableHead>
                        <TableHead className="text-right">Op %</TableHead>
                        <TableHead className="text-right">Net %</TableHead>
                        <TableHead className="text-right">P/E</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitors.map((c) => (
                        <TableRow
                          key={c.ticker}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedTicker(c.ticker)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs">{c.ticker}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{c.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            ${c.price.toFixed(2)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-xs tabular-nums", colorClass(c.changePct))}>
                            {fmtPct(c.changePct)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmtB(c.marketCap)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmtB(c.revenue)}</TableCell>
                          <TableCell className={cn("text-right font-mono text-xs", colorClass(c.revenueGrowth))}>
                            {fmtPct(c.revenueGrowth)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.grossMargin != null ? `${c.grossMargin.toFixed(1)}%` : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.operatingMargin != null ? `${c.operatingMargin.toFixed(1)}%` : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.netMargin != null ? `${c.netMargin.toFixed(1)}%` : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {c.pe ? c.pe.toFixed(1) : "\u2014"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------- MARGINS TAB ---------- */}
          <TabsContent value="margins">
            {dashLoading ? (
              <LoadingCard />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Margin Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={competitors.map((c) => ({
                          name: c.ticker,
                          "Gross %": c.grossMargin ?? 0,
                          "Operating %": c.operatingMargin ?? 0,
                          "Net %": c.netMargin ?? 0,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} unit="%" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#888" }} width={50} />
                        <Tooltip contentStyle={{ backgroundColor: "oklch(0.16 0.005 250)", border: "1px solid oklch(0.25 0.005 250)", borderRadius: "8px", fontSize: "11px" }} />
                        <Bar dataKey="Gross %" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                        <Bar dataKey="Operating %" fill="#10b981" radius={[0, 2, 2, 0]} />
                        <Bar dataKey="Net %" fill="#f59e0b" radius={[0, 2, 2, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------- VALUATION TAB ---------- */}
          <TabsContent value="valuation">
            {dashLoading ? (
              <LoadingCard />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Valuation Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Mkt Cap</TableHead>
                        <TableHead className="text-right">P/E</TableHead>
                        <TableHead className="text-right">EPS</TableHead>
                        <TableHead className="text-right">EBITDA %</TableHead>
                        <TableHead className="text-right">Rev Growth</TableHead>
                        <TableHead className="text-right">Fiscal Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitors.map((c) => (
                        <TableRow key={c.ticker} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicker(c.ticker)}>
                          <TableCell><span className="font-semibold text-xs">{c.ticker}</span> <span className="text-xs text-muted-foreground">{c.name}</span></TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmtB(c.marketCap)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{c.pe ? c.pe.toFixed(1) : "\u2014"}</TableCell>
                          <TableCell className="text-right font-mono text-xs">${c.eps.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{c.ebitdaMargin != null ? `${c.ebitdaMargin.toFixed(1)}%` : "\u2014"}</TableCell>
                          <TableCell className={cn("text-right font-mono text-xs", colorClass(c.revenueGrowth))}>{fmtPct(c.revenueGrowth)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{c.fiscalDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---------- SWOT TAB ---------- */}
          <TabsContent value="swot">
            <SwotTab competitors={competitors} onSelect={setSelectedTicker} />
          </TabsContent>

          {/* ---------- EARNINGS TAB ---------- */}
          <TabsContent value="earnings">
            <EarningsTab competitors={competitors} />
          </TabsContent>

          {/* ---------- POSITIONING TAB ---------- */}
          <TabsContent value="positioning">
            {dashLoading ? (
              <LoadingCard />
            ) : (
              <PositioningTab competitors={competitors} />
            )}
          </TabsContent>

          {/* ---------- NEWS & M&A TAB ---------- */}
          <TabsContent value="news-manda">
            <NewsMandATab />
          </TabsContent>

          {/* ---------- ALERTS TAB ---------- */}
          <TabsContent value="alerts">
            <AlertsPanel competitors={competitors} />
          </TabsContent>

          {/* ---------- PORTER'S FIVE FORCES TAB ---------- */}
          <TabsContent value="porters">
            <PortersFiveForces competitors={competitors} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---- SWOT Tab -------------------------------------------------------------

function SwotTab({ competitors, onSelect }: { competitors: Competitor[]; onSelect: (t: string) => void }) {
  const [selectedCompany, setSelectedCompany] = useState<string>("mars");

  // Generate SWOT from competitor data
  function generateCompetitorSwot(c: Competitor) {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    // Strengths based on margins
    if (c.grossMargin != null && c.grossMargin > 45) strengths.push(`Strong gross margin at ${c.grossMargin.toFixed(1)}%`);
    if (c.operatingMargin != null && c.operatingMargin > 18) strengths.push(`Above-average operating margin (${c.operatingMargin.toFixed(1)}%)`);
    if (c.marketCap > 100e9) strengths.push(`Large-cap market leader (${fmtB(c.marketCap)})`);
    if (c.pe > 0 && c.pe < 20) strengths.push(`Attractive P/E valuation (${c.pe.toFixed(1)}x)`);
    if (strengths.length === 0) strengths.push(`Established brand in ${c.segment} segment`);

    // Weaknesses
    if (c.grossMargin != null && c.grossMargin < 35) weaknesses.push(`Below-peer gross margin (${c.grossMargin.toFixed(1)}%)`);
    if (c.revenueGrowth != null && c.revenueGrowth < 0) weaknesses.push(`Declining revenue (${fmtPct(c.revenueGrowth)})`);
    if (c.netMargin != null && c.netMargin < 8) weaknesses.push(`Thin net margin (${c.netMargin.toFixed(1)}%)`);
    if (weaknesses.length === 0) weaknesses.push("Limited differentiation in commoditized categories");

    // Opportunities
    opportunities.push("Expansion into emerging markets and DTC channels");
    if (c.segment === "Petcare") opportunities.push("Growth in pet health and premium nutrition");
    if (c.segment === "Snacking" || c.segment === "Confectionery") opportunities.push("Health-conscious product reformulation");
    opportunities.push("Strategic M&A to consolidate market position");

    // Threats
    threats.push("Rising commodity and input cost inflation");
    threats.push("Private label competition and retailer brand pressure");
    if (c.revenueGrowth != null && c.revenueGrowth < 2) threats.push("Market maturation in core geographies");

    return { strengths, weaknesses, opportunities, threats };
  }

  const swotData = selectedCompany === "mars"
    ? MARS_SWOT
    : (() => {
        const comp = competitors.find((c) => c.ticker === selectedCompany);
        return comp ? generateCompetitorSwot(comp) : MARS_SWOT;
      })();

  const companyLabel = selectedCompany === "mars"
    ? "Mars, Inc."
    : competitors.find((c) => c.ticker === selectedCompany)?.name ?? selectedCompany;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                SWOT Analysis &mdash; {companyLabel}
              </CardTitle>
              <CardDescription>Strategic strengths, weaknesses, opportunities, and threats</CardDescription>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={selectedCompany === "mars" ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedCompany("mars")}
              >
                Mars
              </Button>
              {competitors.map((c) => (
                <Button
                  key={c.ticker}
                  variant={selectedCompany === c.ticker ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSelectedCompany(c.ticker)}
                >
                  {c.ticker}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {swotData.strengths.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {swotData.weaknesses.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-400">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {swotData.opportunities.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">^</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Threats */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-400">Threats</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {swotData.threats.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">!</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Earnings Tab ---------------------------------------------------------

function EarningsTab({ competitors }: { competitors: Competitor[] }) {
  const [selectedTicker, setSelectedTicker] = useState<string>(competitors[0]?.ticker ?? "NSRGY");
  const [transcriptYear, setTranscriptYear] = useState(2025);
  const [transcriptQuarter, setTranscriptQuarter] = useState(1);

  const { data: transcriptData, loading: transcriptLoading } =
    useApi<TranscriptData>(
      `/api/fmp/transcripts?ticker=${selectedTicker}&year=${transcriptYear}&quarter=${transcriptQuarter}`
    );

  const { data: detailData } =
    useApi<CompanyDetail>(`/api/fmp/company?ticker=${selectedTicker}`);

  // Build earnings surprise table from income data (actual EPS from income vs prior period)
  const incomeRows = detailData?.income ?? [];
  const earningsSurprises = incomeRows.slice(0, 4).map((row, idx) => {
    const prior = incomeRows[idx + 1];
    const priorEps = prior?.epsdiluted ?? null;
    const surprise = priorEps != null && priorEps !== 0
      ? ((row.epsdiluted - priorEps) / Math.abs(priorEps)) * 100
      : null;
    return {
      date: row.date,
      actualEps: row.epsdiluted,
      priorEps,
      surprisePct: surprise,
    };
  });

  const transcript = transcriptData?.transcripts?.[0];

  return (
    <div className="space-y-4">
      {/* Ticker selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Select company:</span>
        {competitors.map((c) => (
          <Button
            key={c.ticker}
            variant={selectedTicker === c.ticker ? "default" : "outline"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setSelectedTicker(c.ticker)}
          >
            {c.ticker}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Earnings surprises */}
        <div className="col-span-5">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm">EPS Trend &mdash; {selectedTicker}</CardTitle>
              <CardDescription>Year-over-year EPS comparison from income statements</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsSurprises.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">EPS</TableHead>
                      <TableHead className="text-right">Prior EPS</TableHead>
                      <TableHead className="text-right">YoY Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earningsSurprises.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-mono text-xs">{row.date}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${row.actualEps?.toFixed(2) ?? "\u2014"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{row.priorEps != null ? `$${row.priorEps.toFixed(2)}` : "\u2014"}</TableCell>
                        <TableCell className={cn("text-right font-mono text-xs", colorClass(row.surprisePct))}>
                          {row.surprisePct != null ? fmtPct(row.surprisePct) : "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-xs text-muted-foreground py-4">No earnings data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transcript */}
        <div className="col-span-7">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Earnings Call Transcript
                  </CardTitle>
                  <CardDescription>{selectedTicker} &mdash; Q{transcriptQuarter} {transcriptYear}</CardDescription>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((q) => (
                    <Button
                      key={q}
                      variant={transcriptQuarter === q ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 w-8"
                      onClick={() => setTranscriptQuarter(q)}
                    >
                      Q{q}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setTranscriptYear((y) => y - 1)}
                  >
                    {transcriptYear - 1}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setTranscriptYear((y) => y + 1)}
                  >
                    {transcriptYear + 1}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transcriptLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading transcript...</span>
                </div>
              ) : transcript?.content ? (
                <div className="max-h-[400px] overflow-y-auto rounded border border-border p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {transcript.content.slice(0, 5000)}
                    {transcript.content.length > 5000 && (
                      <span className="text-primary"> ... [truncated]</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4">
                  No transcript available for {selectedTicker} Q{transcriptQuarter} {transcriptYear}. Try a different period.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- Positioning Tab ------------------------------------------------------

function PositioningTab({ competitors }: { competitors: Competitor[] }) {
  const scatterData = competitors
    .filter((c) => c.revenueGrowth != null && c.operatingMargin != null)
    .map((c) => ({
      name: c.name,
      ticker: c.ticker,
      revenueGrowth: c.revenueGrowth ?? 0,
      operatingMargin: c.operatingMargin ?? 0,
      marketCap: c.marketCap,
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof scatterData[number] }> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-background/95 p-2 text-xs shadow-lg">
        <div className="font-semibold">{d.name} ({d.ticker})</div>
        <div className="text-muted-foreground">Rev Growth: {fmtPct(d.revenueGrowth)}</div>
        <div className="text-muted-foreground">Op Margin: {d.operatingMargin.toFixed(1)}%</div>
        <div className="text-muted-foreground">Mkt Cap: {fmtB(d.marketCap)}</div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Crosshair className="h-4 w-4" />
          Competitive Positioning Map
        </CardTitle>
        <CardDescription>
          X: Revenue growth % | Y: Operating margin % | Bubble size: Market cap
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scatterData.length > 0 ? (
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  dataKey="revenueGrowth"
                  name="Revenue Growth"
                  unit="%"
                  tick={{ fontSize: 10, fill: "#888" }}
                  label={{ value: "Revenue Growth %", position: "bottom", fontSize: 11, fill: "#888" }}
                />
                <YAxis
                  type="number"
                  dataKey="operatingMargin"
                  name="Operating Margin"
                  unit="%"
                  tick={{ fontSize: 10, fill: "#888" }}
                  label={{ value: "Operating Margin %", angle: -90, position: "insideLeft", fontSize: 11, fill: "#888" }}
                />
                <ZAxis
                  type="number"
                  dataKey="marketCap"
                  range={[200, 2000]}
                  name="Market Cap"
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={scatterData}>
                  {scatterData.map((_, index) => (
                    <Cell key={index} fill={SCATTER_COLORS[index % SCATTER_COLORS.length]} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4">Insufficient data for positioning chart</p>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
          {scatterData.map((d, i) => (
            <div key={d.ticker} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SCATTER_COLORS[i % SCATTER_COLORS.length] }}
              />
              {d.ticker}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- News & M&A Tab -------------------------------------------------------

function NewsMandATab() {
  const allTickers = "NSRGY,MDLZ,HSY,CL,SJM,GIS,PG,UL,KHC,K";

  const { data: newsData, loading: newsLoading } =
    useApi<{ news: NewsItem[] }>(`/api/fmp/news?tickers=${allTickers}&limit=25`);

  const { data: mandaData, loading: mandaLoading } =
    useApi<{ deals: MandADeal[] }>("/api/fmp/manda?company=Mars");

  const news = newsData?.news ?? [];
  const deals = mandaData?.deals ?? [];

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* News section */}
      <div className="col-span-7">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Newspaper className="h-4 w-4" />
              Recent News &mdash; FMCG Competitors
            </CardTitle>
            <CardDescription>Latest headlines from tracked companies</CardDescription>
          </CardHeader>
          <CardContent>
            {newsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading news...</span>
              </div>
            ) : news.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {news.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.title}
                        <ExternalLink className="inline h-3 w-3 ml-1 opacity-50" />
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4">{item.symbol}</Badge>
                        <span className="text-[10px] text-muted-foreground">{item.site}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.publishedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No recent news available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* M&A section */}
      <div className="col-span-5">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              M&amp;A Activity
            </CardTitle>
            <CardDescription>Recent mergers and acquisitions</CardDescription>
          </CardHeader>
          <CardContent>
            {mandaLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading M&amp;A data...</span>
              </div>
            ) : deals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acquirer</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.slice(0, 15).map((deal, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{deal.companyName}</TableCell>
                      <TableCell className="text-xs">{deal.targetedCompanyName}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {deal.transactionDate ? new Date(deal.transactionDate).toLocaleDateString() : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No recent M&amp;A activity found</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Check back for updates on industry consolidation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---- Company Detail View --------------------------------------------------

function CompanyDetailView({
  ticker, competitors, detail, detailLoading, prices, onBack,
}: {
  ticker: string;
  competitors: Competitor[];
  detail: CompanyDetail | null;
  detailLoading: boolean;
  prices: PricePoint[];
  onBack: () => void;
}) {
  const comp = competitors.find((c) => c.ticker === ticker);
  const profile = detail?.profile;

  // Fetch additional data for detail view
  const { data: newsData } = useApi<{ news: NewsItem[] }>(`/api/fmp/news?tickers=${ticker}&limit=5`);
  const { data: dcfData } = useApi<{ dcf: { dcf: number; "Stock Price": number }[] }>(`/api/fmp/dcf?ticker=${ticker}`);

  const news = newsData?.news ?? [];
  const dcf = dcfData?.dcf?.[0];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          Competitors
        </button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{ticker}</span>
        {comp && <span className="text-muted-foreground">&mdash; {comp.name}</span>}
      </div>

      {detailLoading ? (
        <LoadingCard />
      ) : (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Price", value: comp ? `$${comp.price.toFixed(2)}` : "\u2014" },
              { label: "Change", value: comp ? fmtPct(comp.changePct) : "\u2014", color: colorClass(comp?.changePct ?? 0) },
              { label: "Mkt Cap", value: comp ? fmtB(comp.marketCap) : "\u2014" },
              { label: "P/E", value: comp?.pe ? comp.pe.toFixed(1) : "\u2014" },
              { label: "Revenue", value: comp ? fmtB(comp.revenue) : "\u2014" },
              { label: "Gross %", value: comp?.grossMargin != null ? `${comp.grossMargin.toFixed(1)}%` : "\u2014" },
              { label: "Op %", value: comp?.operatingMargin != null ? `${comp.operatingMargin.toFixed(1)}%` : "\u2014" },
              { label: "DCF Value", value: dcf ? `$${dcf.dcf.toFixed(2)}` : "\u2014" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="py-2 px-3">
                  <div className="text-[10px] uppercase text-muted-foreground">{kpi.label}</div>
                  <div className={cn("text-sm font-semibold font-mono tabular-nums", kpi.color)}>{kpi.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Price chart + Profile */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <Card>
                <CardHeader><CardTitle className="text-sm">Stock Price &mdash; {ticker}</CardTitle></CardHeader>
                <CardContent>
                  {prices.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...prices].reverse()}>
                          <defs>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#888" }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: "#888" }} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ backgroundColor: "oklch(0.16 0.005 250)", border: "1px solid oklch(0.25 0.005 250)", borderRadius: "8px", fontSize: "11px" }} />
                          <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={1.5} fill="url(#priceGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No price data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="col-span-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" />
                    Company Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <div className="space-y-2 text-xs">
                      <div><span className="text-muted-foreground">Sector:</span> {profile.sector}</div>
                      <div><span className="text-muted-foreground">Industry:</span> {profile.industry}</div>
                      <div><span className="text-muted-foreground">CEO:</span> {profile.ceo}</div>
                      <div><span className="text-muted-foreground">Employees:</span> {Number(profile.fullTimeEmployees).toLocaleString()}</div>
                      <p className="text-muted-foreground leading-relaxed mt-2 line-clamp-6">{profile.description}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  )}
                </CardContent>
              </Card>
              {/* Recent news in detail view */}
              {news.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Newspaper className="h-4 w-4" />
                      Latest News
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {news.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.title}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {new Date(item.publishedDate).toLocaleDateString()}
                          </span>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Financial history */}
          <Tabs defaultValue="income">
            <TabsList>
              <TabsTrigger value="income"><DollarSign className="h-3 w-3 mr-1" />Income</TabsTrigger>
              <TabsTrigger value="ratios"><BarChart3 className="h-3 w-3 mr-1" />Ratios</TabsTrigger>
              <TabsTrigger value="estimates"><TrendingUp className="h-3 w-3 mr-1" />Estimates</TabsTrigger>
              <TabsTrigger value="esg"><Leaf className="h-3 w-3 mr-1" />ESG</TabsTrigger>
            </TabsList>

            <TabsContent value="income">
              <Card>
                <CardHeader><CardTitle className="text-sm">Income Statement History</CardTitle></CardHeader>
                <CardContent>
                  {detail?.income && detail.income.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fiscal Year</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Gross Profit</TableHead>
                          <TableHead className="text-right">Op. Income</TableHead>
                          <TableHead className="text-right">Net Income</TableHead>
                          <TableHead className="text-right">EBITDA</TableHead>
                          <TableHead className="text-right">EPS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.income.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell className="font-mono text-xs">{row.date}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.revenue)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.grossProfit)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.operatingIncome)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.netIncome)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.ebitda)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">${row.epsdiluted?.toFixed(2) ?? "\u2014"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4">No income data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ratios">
              <Card>
                <CardHeader><CardTitle className="text-sm">Financial Ratios</CardTitle></CardHeader>
                <CardContent>
                  {detail?.ratios && detail.ratios.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead className="text-right">Gross %</TableHead>
                          <TableHead className="text-right">Op %</TableHead>
                          <TableHead className="text-right">Net %</TableHead>
                          <TableHead className="text-right">ROE</TableHead>
                          <TableHead className="text-right">ROA</TableHead>
                          <TableHead className="text-right">D/E</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                          <TableHead className="text-right">Div Yield</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.ratios.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell className="font-mono text-xs">{row.date}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{(row.grossProfitMargin * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-xs">{(row.operatingProfitMargin * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-xs">{(row.netProfitMargin * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-xs">{(row.returnOnEquity * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-xs">{(row.returnOnAssets * 100).toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono text-xs">{row.debtEquityRatio?.toFixed(2) ?? "\u2014"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{row.currentRatio?.toFixed(2) ?? "\u2014"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{row.dividendYield ? `${(row.dividendYield * 100).toFixed(1)}%` : "\u2014"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4">No ratio data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="estimates">
              <Card>
                <CardHeader><CardTitle className="text-sm">Analyst Estimates</CardTitle></CardHeader>
                <CardContent>
                  {detail?.estimates && detail.estimates.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Est. Revenue</TableHead>
                          <TableHead className="text-right">Est. EPS</TableHead>
                          <TableHead className="text-right"># Analysts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.estimates.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell className="font-mono text-xs">{row.date}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{fmtB(row.estimatedRevenueAvg)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">${row.estimatedEpsAvg?.toFixed(2) ?? "\u2014"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{row.numberAnalystEstimatedRevenue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4">No estimate data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="esg">
              <Card>
                <CardHeader><CardTitle className="text-sm">ESG Scores</CardTitle></CardHeader>
                <CardContent>
                  {detail?.esg && detail.esg.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Environmental", value: detail.esg[0].environmentalScore, color: "text-emerald-400" },
                        { label: "Social", value: detail.esg[0].socialScore, color: "text-blue-400" },
                        { label: "Governance", value: detail.esg[0].governanceScore, color: "text-purple-400" },
                        { label: "Total ESG", value: detail.esg[0].ESGScore, color: "text-amber-400" },
                      ].map((s) => (
                        <Card key={s.label}>
                          <CardContent className="py-3 px-4 text-center">
                            <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
                            <div className={cn("text-2xl font-bold font-mono", s.color)}>{s.value?.toFixed(0) ?? "\u2014"}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4">No ESG data available for this company</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Button variant="outline" size="sm" onClick={onBack}>
            Back to overview
          </Button>
        </>
      )}
    </div>
  );
}

// ---- Alerts Panel (from Rajiv's build) ------------------------------------

interface AlertRule {
  id: string;
  company: string;
  metric: "price" | "mktCap";
  operator: ">" | "<" | "=";
  threshold: number;
}

interface TriggeredAlert {
  rule: AlertRule;
  currentValue: number;
  triggeredAt: Date;
}

function AlertsPanel({ competitors }: { competitors: Competitor[] }) {
  const [alerts, setAlerts] = useState<AlertRule[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("finiq-alert-rules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);

  // Form state
  const [newCompany, setNewCompany] = useState(COMPETITOR_TICKERS[0]?.ticker ?? "NSRGY");
  const [newMetric, setNewMetric] = useState<"price" | "mktCap">("price");
  const [newOperator, setNewOperator] = useState<">" | "<" | "=">(">");
  const [newThreshold, setNewThreshold] = useState("");

  // Persist alerts to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("finiq-alert-rules", JSON.stringify(alerts));
    }
  }, [alerts]);

  // Evaluate alerts against current competitor data
  useEffect(() => {
    if (competitors.length === 0 || alerts.length === 0) {
      setTriggeredAlerts([]);
      return;
    }

    const triggered: TriggeredAlert[] = [];
    for (const rule of alerts) {
      const comp = competitors.find((c) => c.ticker === rule.company);
      if (!comp) continue;

      const currentValue = rule.metric === "price" ? comp.price : comp.marketCap;
      let isTriggered = false;

      if (rule.operator === ">" && currentValue > rule.threshold) isTriggered = true;
      if (rule.operator === "<" && currentValue < rule.threshold) isTriggered = true;
      if (rule.operator === "=" && Math.abs(currentValue - rule.threshold) < 0.01) isTriggered = true;

      if (isTriggered) {
        triggered.push({ rule, currentValue, triggeredAt: new Date() });
      }
    }
    setTriggeredAlerts(triggered);
  }, [competitors, alerts]);

  const addRule = () => {
    const threshold = parseFloat(newThreshold);
    if (isNaN(threshold)) return;
    const rule: AlertRule = {
      id: `alert-${Date.now()}`,
      company: newCompany,
      metric: newMetric,
      operator: newOperator,
      threshold,
    };
    setAlerts((prev) => [...prev, rule]);
    setNewThreshold("");
  };

  const removeRule = (id: string) => {
    setAlerts((prev) => prev.filter((r) => r.id !== id));
  };

  const companyName = (ticker: string) =>
    COMPETITOR_TICKERS.find((c) => c.ticker === ticker)?.name ?? ticker;

  return (
    <div className="space-y-4">
      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-red-400">
              <Bell className="h-4 w-4" />
              Triggered Alerts ({triggeredAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggeredAlerts.map((ta, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs">
                  <Bell className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="font-semibold text-red-300">{ta.rule.company}</span>
                  <span className="text-muted-foreground">
                    {ta.rule.metric === "price" ? "Price" : "Market Cap"}{" "}
                    {ta.rule.operator} {ta.rule.metric === "mktCap" ? fmtB(ta.rule.threshold) : `$${ta.rule.threshold.toFixed(2)}`}
                  </span>
                  <span className="text-red-300 font-mono">
                    Current: {ta.rule.metric === "mktCap" ? fmtB(ta.currentValue) : `$${ta.currentValue.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new rule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Add Alert Rule
          </CardTitle>
          <CardDescription>
            Set threshold rules on competitor metrics. Alerts are evaluated in real-time against live FMP data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Company</label>
              <select
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              >
                {COMPETITOR_TICKERS.map((c) => (
                  <option key={c.ticker} value={c.ticker}>{c.ticker} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Metric</label>
              <select
                value={newMetric}
                onChange={(e) => setNewMetric(e.target.value as "price" | "mktCap")}
                className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="price">Price</option>
                <option value="mktCap">Market Cap</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Operator</label>
              <select
                value={newOperator}
                onChange={(e) => setNewOperator(e.target.value as ">" | "<" | "=")}
                className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value=">">&gt; Greater than</option>
                <option value="<">&lt; Less than</option>
                <option value="=">=  Equal to</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground">Threshold</label>
              <Input
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                placeholder={newMetric === "price" ? "e.g. 150.00" : "e.g. 100000000000"}
                className="h-9 w-40 text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") addRule(); }}
              />
            </div>
            <Button size="sm" onClick={addRule} disabled={!newThreshold}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Rules ({alerts.length})</CardTitle>
          <CardDescription>Rules persist in your browser localStorage</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No alert rules configured</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Add a rule above to start monitoring competitor metrics</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((rule) => {
                  const comp = competitors.find((c) => c.ticker === rule.company);
                  const currentValue = comp
                    ? rule.metric === "price" ? comp.price : comp.marketCap
                    : null;
                  const isTriggered = triggeredAlerts.some((ta) => ta.rule.id === rule.id);
                  return (
                    <TableRow key={rule.id} className={isTriggered ? "bg-red-500/5" : ""}>
                      <TableCell>
                        <span className="font-semibold text-xs">{rule.company}</span>{" "}
                        <span className="text-xs text-muted-foreground">{companyName(rule.company)}</span>
                      </TableCell>
                      <TableCell className="text-xs">{rule.metric === "price" ? "Price" : "Market Cap"}</TableCell>
                      <TableCell className="text-xs font-mono">{rule.operator}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {rule.metric === "mktCap" ? fmtB(rule.threshold) : `$${rule.threshold.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {currentValue != null
                          ? rule.metric === "mktCap" ? fmtB(currentValue) : `$${currentValue.toFixed(2)}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isTriggered ? (
                          <Badge variant="destructive" className="text-[10px]">TRIGGERED</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Watching</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => removeRule(rule.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Porter's Five Forces Tab — CI#71 ------------------------------------

interface ForceAssessment {
  force: string;
  level: "Low" | "Moderate" | "High";
  score: number; // 1-5
  drivers: string[];
}

function PortersFiveForces({ competitors }: { competitors: Competitor[] }) {
  const forces = useMemo<ForceAssessment[]>(() => {
    const avgMargin = competitors.reduce((s, c) => s + (c.grossMargin ?? 0), 0) / (competitors.length || 1);
    const avgGrowth = competitors.reduce((s, c) => s + (c.revenueGrowth ?? 0), 0) / (competitors.length || 1);
    const totalMktCap = competitors.reduce((s, c) => s + c.marketCap, 0);
    const topPlayerShare = competitors.length > 0
      ? (Math.max(...competitors.map((c) => c.marketCap)) / totalMktCap) * 100
      : 0;

    return [
      {
        force: "Competitive Rivalry",
        level: competitors.length >= 8 ? "High" : competitors.length >= 5 ? "Moderate" : "Low",
        score: competitors.length >= 8 ? 5 : competitors.length >= 5 ? 4 : 2,
        drivers: [
          `${competitors.length} major competitors tracked`,
          avgMargin > 40 ? `High margins (${avgMargin.toFixed(1)}%) attract competition` : `Moderate margins (${avgMargin.toFixed(1)}%) limit new players`,
          topPlayerShare > 30 ? `Market concentration: top player holds ${topPlayerShare.toFixed(0)}% of peer cap` : "Fragmented market — no single dominant player",
          "Brand loyalty is critical differentiator in FMCG",
        ],
      },
      {
        force: "Threat of New Entrants",
        level: "Low",
        score: 2,
        drivers: [
          `High capital requirements — avg peer market cap ${fmtB(totalMktCap / (competitors.length || 1))}`,
          "Strong brand moats and distribution networks",
          "Regulatory barriers in food safety and labeling",
          "Economies of scale in manufacturing and procurement",
        ],
      },
      {
        force: "Bargaining Power of Suppliers",
        level: "Moderate",
        score: 3,
        drivers: [
          "Commodity inputs (cocoa, dairy, grains) have volatile pricing",
          "Large buyers can negotiate volume discounts",
          "Vertical integration reduces dependency (Mars has cocoa farms)",
          "Multiple sourcing regions mitigate single-supplier risk",
        ],
      },
      {
        force: "Bargaining Power of Buyers",
        level: avgMargin < 38 ? "High" : "Moderate",
        score: avgMargin < 38 ? 4 : 3,
        drivers: [
          "Retail consolidation increases buyer leverage",
          "Private-label alternatives growing in all categories",
          avgMargin < 38 ? "Margin pressure indicates strong buyer power" : "Healthy margins suggest balanced buyer dynamics",
          "Brand loyalty partially offsets price sensitivity",
        ],
      },
      {
        force: "Threat of Substitutes",
        level: avgGrowth < 2 ? "Moderate" : "Low",
        score: avgGrowth < 2 ? 3 : 2,
        drivers: [
          "Health-conscious consumer trends shift demand",
          "DTC and specialty brands fragmenting market",
          avgGrowth < 2 ? `Slow peer growth (${avgGrowth.toFixed(1)}%) suggests substitution pressure` : `Healthy growth (${avgGrowth.toFixed(1)}%) indicates limited substitution`,
          "Pet care and premium segments more defensible",
        ],
      },
    ];
  }, [competitors]);

  const levelColor: Record<string, string> = {
    Low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    Moderate: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    High: "text-red-400 bg-red-400/10 border-red-400/30",
  };

  const overallScore = forces.reduce((s, f) => s + f.score, 0);
  const attractiveness = overallScore <= 10 ? "Attractive" : overallScore <= 15 ? "Moderate" : "Challenging";

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            Porter&apos;s Five Forces — FMCG / CPG Industry
          </CardTitle>
          <CardDescription>
            Industry attractiveness: <span className="font-semibold text-foreground">{attractiveness}</span>{" "}
            (score {overallScore}/25 — lower is more attractive)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Force cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {forces.map((f) => (
          <Card key={f.force}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{f.force}</CardTitle>
                <Badge variant="outline" className={cn("text-xs", levelColor[f.level])}>
                  {f.level} ({f.score}/5)
                </Badge>
              </div>
              {/* Visual bar */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={cn("h-1.5 rounded-full", f.score >= 4 ? "bg-red-400" : f.score >= 3 ? "bg-amber-400" : "bg-emerald-400")}
                  style={{ width: `${(f.score / 5) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {f.drivers.map((d, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Peer data table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supporting Peer Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-right">Gross Margin</TableHead>
                <TableHead className="text-right">Op. Margin</TableHead>
                <TableHead className="text-right">Revenue Growth</TableHead>
                <TableHead className="text-right">P/E</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((c) => (
                <TableRow key={c.ticker}>
                  <TableCell className="font-medium">{c.name} <span className="text-muted-foreground">({c.ticker})</span></TableCell>
                  <TableCell className="text-right">{fmtB(c.marketCap)}</TableCell>
                  <TableCell className="text-right">{fmtPct(c.grossMargin)}</TableCell>
                  <TableCell className="text-right">{fmtPct(c.operatingMargin)}</TableCell>
                  <TableCell className={cn("text-right", (c.revenueGrowth ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {fmtPct(c.revenueGrowth)}
                  </TableCell>
                  <TableCell className="text-right">{c.pe > 0 ? c.pe.toFixed(1) + "x" : "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Loading card ---------------------------------------------------------

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading live data from FMP...</span>
      </CardContent>
    </Card>
  );
}
