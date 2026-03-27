/**
 * FMP (Financial Modeling Prep) API Client
 * Provides real data via FMP API when key is configured,
 * otherwise returns realistic mock data for all 10 competitors.
 *
 * FMP docs: https://site.financialmodelingprep.com/developer/docs
 */

import config from "./config.mjs";

const BASE_URL = "https://financialmodelingprep.com/api";

// ── Competitor Universe ──────────────────────────────────────────
export const COMPETITORS = [
  { name: "Nestle", ticker: "NSRGY", sector: "Consumer Staples", segment_overlap: "Confectionery, Pet Care, Food", isPublic: true },
  { name: "Mondelez", ticker: "MDLZ", sector: "Consumer Staples", segment_overlap: "Confectionery, Snacking", isPublic: true },
  { name: "Hershey", ticker: "HSY", sector: "Consumer Staples", segment_overlap: "Confectionery", isPublic: true },
  { name: "Ferrero", ticker: "FERRERO", sector: "Consumer Staples", segment_overlap: "Confectionery", isPublic: false },
  { name: "Colgate-Palmolive", ticker: "CL", sector: "Consumer Staples", segment_overlap: "Pet Care (Hill's)", isPublic: true },
  { name: "General Mills", ticker: "GIS", sector: "Consumer Staples", segment_overlap: "Pet Care (Blue Buffalo), Food", isPublic: true },
  { name: "Kellanova", ticker: "K", sector: "Consumer Staples", segment_overlap: "Snacking", isPublic: true },
  { name: "J.M. Smucker", ticker: "SJM", sector: "Consumer Staples", segment_overlap: "Pet Care (Meow Mix, Milk-Bone)", isPublic: true },
  { name: "Freshpet", ticker: "FRPT", sector: "Consumer Staples", segment_overlap: "Pet Care (fresh/refrigerated)", isPublic: true },
  { name: "IDEXX", ticker: "IDXX", sector: "Healthcare", segment_overlap: "Veterinary diagnostics", isPublic: true },
];

// ── Helper: fetch with API key ───────────────────────────────────
async function fmpFetch(endpoint, params = {}) {
  const apiKey = config.fmpApiKey;
  if (!apiKey) return null; // signals to use mock data

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[fmp-client] ${res.status} for ${endpoint}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[fmp-client] Fetch error for ${endpoint}:`, err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC API — Each returns live data or mock fallback
// ══════════════════════════════════════════════════════════════════

/**
 * Income statement (annual or quarterly)
 */
export async function getIncomeStatement(ticker, period = "annual", limit = 4) {
  const data = await fmpFetch(`/v3/income-statement/${ticker}`, { period, limit });
  return data || getMockIncomeStatement(ticker, limit);
}

/**
 * Balance sheet
 */
export async function getBalanceSheet(ticker, period = "annual", limit = 4) {
  const data = await fmpFetch(`/v3/balance-sheet-statement/${ticker}`, { period, limit });
  return data || getMockBalanceSheet(ticker, limit);
}

/**
 * Financial ratios (margins, returns, leverage)
 */
export async function getFinancialRatios(ticker, limit = 4) {
  const data = await fmpFetch(`/v3/ratios/${ticker}`, { limit });
  return data || getMockFinancialRatios(ticker, limit);
}

/**
 * Key metrics (market cap, PE, EV/EBITDA, etc.)
 */
export async function getKeyMetrics(ticker, limit = 4) {
  const data = await fmpFetch(`/v3/key-metrics/${ticker}`, { limit });
  return data || getMockKeyMetrics(ticker, limit);
}

/**
 * Earnings call transcript
 */
export async function getEarningsCallTranscript(ticker, year, quarter) {
  const data = await fmpFetch(`/v3/earning_call_transcript/${ticker}`, { year, quarter });
  return data || getMockEarningsTranscript(ticker, year, quarter);
}

/**
 * Analyst estimates (revenue, EPS consensus)
 */
export async function getAnalystEstimates(ticker, limit = 4) {
  const data = await fmpFetch(`/v3/analyst-estimates/${ticker}`, { limit });
  return data || getMockAnalystEstimates(ticker, limit);
}

/**
 * Market cap (single value)
 */
export async function getMarketCap(ticker) {
  const data = await fmpFetch(`/v3/market-capitalization/${ticker}`);
  if (data && data.length > 0) return data[0];
  return getMockMarketCap(ticker);
}

/**
 * Stock news for one or more tickers
 */
export async function getStockNews(tickers, limit = 10) {
  const tickerStr = Array.isArray(tickers) ? tickers.join(",") : tickers;
  const data = await fmpFetch("/v3/stock_news", { tickers: tickerStr, limit });
  return data || getMockStockNews(tickers, limit);
}

/**
 * M&A transactions
 */
export async function getMergersAcquisitions(limit = 20) {
  const data = await fmpFetch("/v4/mergers-acquisitions-rss-feed", { page: 0 });
  if (data && data.length > 0) return data.slice(0, limit);
  return getMockMA(limit);
}

// ══════════════════════════════════════════════════════════════════
// MOCK DATA — Realistic values for all 10 competitors
// ══════════════════════════════════════════════════════════════════

const MOCK_PROFILES = {
  NSRGY: { revenue: 98400e6, grossMargin: 0.478, opMargin: 0.162, netMargin: 0.109, revenueGrowth: 0.021, marketCap: 290e9, pe: 23.1, employees: 275000, divYield: 0.029 },
  MDLZ: { revenue: 36020e6, grossMargin: 0.386, opMargin: 0.165, netMargin: 0.121, revenueGrowth: 0.038, marketCap: 96e9, pe: 22.5, employees: 91000, divYield: 0.022 },
  HSY: { revenue: 11160e6, grossMargin: 0.432, opMargin: 0.209, netMargin: 0.149, revenueGrowth: -0.009, marketCap: 34e9, pe: 18.7, employees: 20800, divYield: 0.027 },
  FERRERO: { revenue: 17800e6, grossMargin: 0.400, opMargin: 0.130, netMargin: 0.085, revenueGrowth: 0.055, marketCap: null, pe: null, employees: 47000, divYield: null },
  CL: { revenue: 20070e6, grossMargin: 0.601, opMargin: 0.201, netMargin: 0.142, revenueGrowth: 0.048, marketCap: 72e9, pe: 26.8, employees: 34200, divYield: 0.023 },
  GIS: { revenue: 20090e6, grossMargin: 0.352, opMargin: 0.177, netMargin: 0.136, revenueGrowth: -0.002, marketCap: 40e9, pe: 15.5, employees: 34000, divYield: 0.035 },
  K: { revenue: 13120e6, grossMargin: 0.342, opMargin: 0.136, netMargin: 0.081, revenueGrowth: 0.013, marketCap: 22e9, pe: 19.2, employees: 23000, divYield: 0.031 },
  SJM: { revenue: 8530e6, grossMargin: 0.363, opMargin: 0.143, netMargin: 0.079, revenueGrowth: -0.015, marketCap: 12e9, pe: 14.1, employees: 5150, divYield: 0.033 },
  FRPT: { revenue: 975e6, grossMargin: 0.402, opMargin: 0.052, netMargin: 0.028, revenueGrowth: 0.247, marketCap: 6.5e9, pe: 168, employees: 2200, divYield: 0 },
  IDXX: { revenue: 3890e6, grossMargin: 0.604, opMargin: 0.312, netMargin: 0.237, revenueGrowth: 0.071, marketCap: 42e9, pe: 55.2, employees: 11300, divYield: 0 },
};

function jitter(base, pct = 0.05) {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}

function yearSeries(ticker, count) {
  const p = MOCK_PROFILES[ticker] || MOCK_PROFILES.MDLZ;
  const years = [];
  const currentYear = 2025;
  for (let i = 0; i < count; i++) {
    const yr = currentYear - i;
    const growthFactor = Math.pow(1 + p.revenueGrowth, -i);
    years.push({ year: yr, growthFactor });
  }
  return { profile: p, years };
}

function getMockIncomeStatement(ticker, limit) {
  const { profile: p, years } = yearSeries(ticker, limit);
  return years.map(({ year, growthFactor }) => ({
    date: `${year}-12-31`,
    symbol: ticker,
    calendarYear: String(year),
    period: "FY",
    revenue: Math.round(p.revenue * growthFactor),
    costOfRevenue: Math.round(p.revenue * growthFactor * (1 - p.grossMargin)),
    grossProfit: Math.round(p.revenue * growthFactor * p.grossMargin),
    grossProfitRatio: jitter(p.grossMargin, 0.02),
    operatingIncome: Math.round(p.revenue * growthFactor * p.opMargin),
    operatingIncomeRatio: jitter(p.opMargin, 0.03),
    netIncome: Math.round(p.revenue * growthFactor * p.netMargin),
    netIncomeRatio: jitter(p.netMargin, 0.03),
    eps: +(jitter(p.netMargin * p.revenue * growthFactor / (p.employees * 0.4), 0.08)).toFixed(2),
    ebitda: Math.round(p.revenue * growthFactor * (p.opMargin + 0.04)),
    ebitdaratio: jitter(p.opMargin + 0.04, 0.02),
    researchAndDevelopmentExpenses: Math.round(p.revenue * growthFactor * 0.015),
    sellingGeneralAndAdministrativeExpenses: Math.round(p.revenue * growthFactor * (p.grossMargin - p.opMargin - 0.015)),
  }));
}

function getMockBalanceSheet(ticker, limit) {
  const { profile: p, years } = yearSeries(ticker, limit);
  return years.map(({ year, growthFactor }) => {
    const totalAssets = Math.round(p.revenue * growthFactor * 1.8);
    const totalDebt = Math.round(totalAssets * 0.35);
    return {
      date: `${year}-12-31`,
      symbol: ticker,
      calendarYear: String(year),
      totalAssets,
      totalCurrentAssets: Math.round(totalAssets * 0.28),
      totalNonCurrentAssets: Math.round(totalAssets * 0.72),
      totalLiabilities: Math.round(totalAssets * 0.62),
      totalCurrentLiabilities: Math.round(totalAssets * 0.22),
      totalStockholdersEquity: Math.round(totalAssets * 0.38),
      totalDebt,
      netDebt: Math.round(totalDebt * 0.85),
      cashAndCashEquivalents: Math.round(totalAssets * 0.06),
      goodwill: Math.round(totalAssets * 0.30),
      intangibleAssets: Math.round(totalAssets * 0.15),
    };
  });
}

function getMockFinancialRatios(ticker, limit) {
  const { profile: p, years } = yearSeries(ticker, limit);
  return years.map(({ year }) => ({
    date: `${year}-12-31`,
    symbol: ticker,
    calendarYear: String(year),
    grossProfitMargin: jitter(p.grossMargin, 0.02),
    operatingProfitMargin: jitter(p.opMargin, 0.03),
    netProfitMargin: jitter(p.netMargin, 0.03),
    returnOnEquity: jitter(p.netMargin * 2.5, 0.05),
    returnOnAssets: jitter(p.netMargin * 0.8, 0.03),
    currentRatio: jitter(1.1, 0.15),
    debtEquityRatio: jitter(1.6, 0.1),
    interestCoverage: jitter(8, 0.2),
    dividendYield: p.divYield ? jitter(p.divYield, 0.1) : 0,
    payoutRatio: p.divYield ? jitter(0.55, 0.1) : 0,
    priceEarningsRatio: p.pe ? jitter(p.pe, 0.08) : null,
    priceToBookRatio: jitter(5.5, 0.2),
    enterpriseValueMultiple: jitter(16, 0.1),
  }));
}

function getMockKeyMetrics(ticker, limit) {
  const { profile: p, years } = yearSeries(ticker, limit);
  return years.map(({ year, growthFactor }) => ({
    date: `${year}-12-31`,
    symbol: ticker,
    calendarYear: String(year),
    marketCap: p.marketCap ? Math.round(p.marketCap * jitter(1, 0.08)) : null,
    revenuePerShare: +(p.revenue * growthFactor / (p.employees * 0.4)).toFixed(2),
    netIncomePerShare: +(p.revenue * growthFactor * p.netMargin / (p.employees * 0.4)).toFixed(2),
    enterpriseValue: p.marketCap ? Math.round(p.marketCap * 1.15 * jitter(1, 0.06)) : null,
    peRatio: p.pe ? jitter(p.pe, 0.08) : null,
    evToEbitda: jitter(16, 0.1),
    evToRevenue: p.marketCap ? +(p.marketCap / (p.revenue * growthFactor)).toFixed(2) : null,
    freeCashFlowPerShare: +(p.revenue * growthFactor * p.netMargin * 0.9 / (p.employees * 0.4)).toFixed(2),
    debtToEquity: jitter(1.6, 0.1),
    roic: jitter(p.netMargin * 1.8, 0.05),
  }));
}

function getMockEarningsTranscript(ticker, year, quarter) {
  const comp = COMPETITORS.find((c) => c.ticker === ticker) || { name: ticker };
  const qLabel = `Q${quarter} ${year}`;
  return [
    {
      symbol: ticker,
      quarter,
      year,
      date: `${year}-${String(quarter * 3).padStart(2, "0")}-15`,
      content: [
        `Good morning and welcome to ${comp.name}'s ${qLabel} earnings call.`,
        `We delivered solid results this quarter with organic revenue growth driven by volume and pricing.`,
        `Our gross margin expanded as commodity costs moderated and we realized productivity savings.`,
        `In our largest segment, consumer demand remained resilient across both developed and emerging markets.`,
        `We are increasing our full-year guidance for organic net revenue growth to 4-5 percent.`,
        `Our innovation pipeline is strong and we expect to launch several new products in the next quarter.`,
        `We continue to invest in digital capabilities and direct-to-consumer channels.`,
        `Foreign exchange headwinds remain a factor, impacting reported revenue by approximately 200 basis points.`,
        `We are confident in our ability to deliver sustainable, profitable growth over the medium term.`,
        `Thank you for your questions, and we look forward to updating you next quarter.`,
      ].join("\n\n"),
    },
  ];
}

function getMockAnalystEstimates(ticker, limit) {
  const p = MOCK_PROFILES[ticker] || MOCK_PROFILES.MDLZ;
  const results = [];
  for (let i = 0; i < limit; i++) {
    const yr = 2026 + i;
    const growthFactor = Math.pow(1 + Math.abs(p.revenueGrowth) * 0.8, i);
    results.push({
      symbol: ticker,
      date: `${yr}-12-31`,
      estimatedRevenueAvg: Math.round(p.revenue * growthFactor),
      estimatedRevenueLow: Math.round(p.revenue * growthFactor * 0.97),
      estimatedRevenueHigh: Math.round(p.revenue * growthFactor * 1.04),
      estimatedEpsAvg: +(p.netMargin * p.revenue * growthFactor / (p.employees * 0.4)).toFixed(2),
      estimatedEpsLow: +(p.netMargin * p.revenue * growthFactor * 0.92 / (p.employees * 0.4)).toFixed(2),
      estimatedEpsHigh: +(p.netMargin * p.revenue * growthFactor * 1.06 / (p.employees * 0.4)).toFixed(2),
      numberAnalystEstimatedRevenue: Math.floor(12 + Math.random() * 10),
      numberAnalystsEstimatedEps: Math.floor(15 + Math.random() * 12),
    });
  }
  return results;
}

function getMockMarketCap(ticker) {
  const p = MOCK_PROFILES[ticker] || MOCK_PROFILES.MDLZ;
  return {
    symbol: ticker,
    date: new Date().toISOString().slice(0, 10),
    marketCap: p.marketCap || null,
  };
}

function getMockStockNews(tickers, limit) {
  const tickerList = Array.isArray(tickers) ? tickers : tickers.split(",");
  const headlines = [
    { title: "{name} Reports Strong Q4 Earnings, Beats Analyst Expectations", sentiment: "positive" },
    { title: "{name} Announces New Product Line Targeting Health-Conscious Consumers", sentiment: "positive" },
    { title: "{name} Faces Headwinds from Rising Commodity Costs", sentiment: "negative" },
    { title: "{name} Expands Distribution Partnership in Asia-Pacific Region", sentiment: "positive" },
    { title: "{name} CEO Outlines Strategic Vision at Investor Day", sentiment: "neutral" },
    { title: "{name} Initiates $2B Share Buyback Program", sentiment: "positive" },
    { title: "{name} Warns of FX Impact on Full-Year Revenue", sentiment: "negative" },
    { title: "{name} Completes Acquisition of Specialty Foods Brand", sentiment: "positive" },
    { title: "Analysts Upgrade {name} to Overweight on Margin Improvement", sentiment: "positive" },
    { title: "{name} Launches Sustainability Initiative Across Supply Chain", sentiment: "neutral" },
    { title: "{name} Reports Mixed Results Amid Soft Consumer Spending", sentiment: "negative" },
    { title: "{name} Partners with Retail Giants for Exclusive Product Launch", sentiment: "positive" },
  ];

  const results = [];
  const now = Date.now();
  for (let i = 0; i < Math.min(limit, 20); i++) {
    const tkr = tickerList[i % tickerList.length];
    const comp = COMPETITORS.find((c) => c.ticker === tkr) || { name: tkr };
    const h = headlines[i % headlines.length];
    results.push({
      symbol: tkr,
      publishedDate: new Date(now - i * 3600000 * 18).toISOString(),
      title: h.title.replace("{name}", comp.name),
      text: `Analysis of ${comp.name}'s latest developments and market position within the consumer staples sector.`,
      url: `https://finance.example.com/news/${tkr.toLowerCase()}-${i}`,
      site: "Financial Times",
      sentiment: h.sentiment,
    });
  }
  return results;
}

function getMockMA(limit) {
  const transactions = [
    { companyName: "Mars Inc", targetedCompanyName: "Kellanova", transactionDate: "2024-08-14", acceptedDate: "2024-10-01", dealSize: "35.9B", type: "acquisition" },
    { companyName: "Nestle SA", targetedCompanyName: "Orgain Inc", transactionDate: "2024-05-20", acceptedDate: "2024-07-15", dealSize: "2.8B", type: "acquisition" },
    { companyName: "Mondelez International", targetedCompanyName: "Clif Bar & Company", transactionDate: "2024-03-10", acceptedDate: "2024-04-22", dealSize: "2.9B", type: "acquisition" },
    { companyName: "Hershey Company", targetedCompanyName: "Dot's Pretzels", transactionDate: "2024-01-08", acceptedDate: "2024-02-15", dealSize: "1.2B", type: "acquisition" },
    { companyName: "J.M. Smucker", targetedCompanyName: "Hostess Brands", transactionDate: "2023-11-27", acceptedDate: "2023-12-18", dealSize: "5.6B", type: "acquisition" },
    { companyName: "General Mills", targetedCompanyName: "TNT Crust", transactionDate: "2023-09-05", acceptedDate: "2023-10-20", dealSize: "0.6B", type: "acquisition" },
    { companyName: "Ferrero Group", targetedCompanyName: "Wells Enterprises", transactionDate: "2023-07-22", acceptedDate: "2023-09-01", dealSize: "3.5B", type: "acquisition" },
    { companyName: "Colgate-Palmolive", targetedCompanyName: "Filorga", transactionDate: "2023-06-10", acceptedDate: "2023-07-28", dealSize: "1.7B", type: "acquisition" },
    { companyName: "Nestle SA", targetedCompanyName: "The Bountiful Company", transactionDate: "2023-04-15", acceptedDate: "2023-06-01", dealSize: "5.75B", type: "acquisition" },
    { companyName: "IDEXX Laboratories", targetedCompanyName: "ezyVet", transactionDate: "2023-02-20", acceptedDate: "2023-03-15", dealSize: "0.2B", type: "acquisition" },
    { companyName: "Freshpet Inc", targetedCompanyName: "Fresh Kitchen Co", transactionDate: "2023-01-10", acceptedDate: "2023-02-25", dealSize: "0.15B", type: "acquisition" },
    { companyName: "Mondelez International", targetedCompanyName: "Ricolino", transactionDate: "2022-11-01", acceptedDate: "2022-12-15", dealSize: "1.3B", type: "acquisition" },
  ];
  return transactions.slice(0, limit);
}

// ══════════════════════════════════════════════════════════════════
// FR3.4 — Competitor Monitoring & Alerts
// ══════════════════════════════════════════════════════════════════

const ALERT_THRESHOLDS = {
  revenueGrowth: { min: -0.05, label: "Revenue growth < -5%" },
  operatingMargin: { min: 0.10, label: "Operating margin < 10%" },
  debtEquity: { max: 2.0, label: "Debt/Equity > 2.0" },
};

// In-memory alert store
const competitorAlerts = [];

/**
 * Run a monitoring check across all public competitors.
 * Compares latest financial ratios and income statements against thresholds.
 * Returns newly generated alerts and stores them in memory.
 */
export async function monitorCompetitors() {
  const newAlerts = [];
  const checkedAt = new Date().toISOString();

  const publicCompetitors = COMPETITORS.filter((c) => c.isPublic);

  for (const comp of publicCompetitors) {
    try {
      const [incomeData, ratioData] = await Promise.all([
        getIncomeStatement(comp.ticker, "annual", 2),
        getFinancialRatios(comp.ticker, 1),
      ]);

      // Revenue growth check
      if (incomeData && incomeData.length >= 2) {
        const currentRev = incomeData[0].revenue;
        const priorRev = incomeData[1].revenue;
        if (priorRev > 0) {
          const revGrowth = (currentRev - priorRev) / priorRev;
          if (revGrowth < ALERT_THRESHOLDS.revenueGrowth.min) {
            newAlerts.push({
              id: `${comp.ticker}-rev-${checkedAt}`,
              ticker: comp.ticker,
              company: comp.name,
              type: "revenue_decline",
              severity: "high",
              threshold: ALERT_THRESHOLDS.revenueGrowth.label,
              value: Math.round(revGrowth * 10000) / 100,
              unit: "%",
              message: `${comp.name} (${comp.ticker}) revenue growth is ${(revGrowth * 100).toFixed(1)}%, below the -5% threshold.`,
              checked_at: checkedAt,
            });
          }
        }
      }

      // Operating margin check
      if (ratioData && ratioData.length > 0) {
        const opMargin = ratioData[0].operatingProfitMargin;
        if (opMargin != null && opMargin < ALERT_THRESHOLDS.operatingMargin.min) {
          newAlerts.push({
            id: `${comp.ticker}-opm-${checkedAt}`,
            ticker: comp.ticker,
            company: comp.name,
            type: "low_operating_margin",
            severity: "medium",
            threshold: ALERT_THRESHOLDS.operatingMargin.label,
            value: Math.round(opMargin * 10000) / 100,
            unit: "%",
            message: `${comp.name} (${comp.ticker}) operating margin is ${(opMargin * 100).toFixed(1)}%, below the 10% threshold.`,
            checked_at: checkedAt,
          });
        }

        // Debt/equity check
        const debtEquity = ratioData[0].debtEquityRatio;
        if (debtEquity != null && debtEquity > ALERT_THRESHOLDS.debtEquity.max) {
          newAlerts.push({
            id: `${comp.ticker}-de-${checkedAt}`,
            ticker: comp.ticker,
            company: comp.name,
            type: "high_leverage",
            severity: "medium",
            threshold: ALERT_THRESHOLDS.debtEquity.label,
            value: Math.round(debtEquity * 100) / 100,
            unit: "x",
            message: `${comp.name} (${comp.ticker}) debt/equity ratio is ${debtEquity.toFixed(2)}x, above the 2.0x threshold.`,
            checked_at: checkedAt,
          });
        }
      }
    } catch (err) {
      console.warn(`[fmp-client] Monitor error for ${comp.ticker}:`, err.message);
    }
  }

  // Append new alerts and cap at 200
  competitorAlerts.push(...newAlerts);
  if (competitorAlerts.length > 200) {
    competitorAlerts.splice(0, competitorAlerts.length - 200);
  }

  return {
    checked_at: checkedAt,
    competitors_checked: publicCompetitors.length,
    new_alerts: newAlerts.length,
    alerts: newAlerts,
  };
}

/**
 * Get all stored competitor alerts.
 * Optionally filter by ticker or severity.
 */
export function getCompetitorAlerts(filters = {}) {
  let results = [...competitorAlerts];

  if (filters.ticker) {
    results = results.filter((a) => a.ticker === filters.ticker);
  }
  if (filters.severity) {
    results = results.filter((a) => a.severity === filters.severity);
  }
  if (filters.type) {
    results = results.filter((a) => a.type === filters.type);
  }

  // Most recent first
  results.sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

  return {
    total: results.length,
    alerts: results,
    thresholds: ALERT_THRESHOLDS,
  };
}

export default {
  COMPETITORS,
  getIncomeStatement,
  getBalanceSheet,
  getFinancialRatios,
  getKeyMetrics,
  getEarningsCallTranscript,
  getAnalystEstimates,
  getMarketCap,
  getStockNews,
  getMergersAcquisitions,
  monitorCompetitors,
  getCompetitorAlerts,
};
