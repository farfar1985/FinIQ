// ---------------------------------------------------------------------------
// Financial Modeling Prep (FMP) API client
// Server-only module — do not import from client components.
// Docs: https://site.financialmodelingprep.com/developer/docs
// ---------------------------------------------------------------------------

const BASE = "https://financialmodelingprep.com/api/v3";
const BASE_V4 = "https://financialmodelingprep.com/api/v4";
const STABLE = "https://financialmodelingprep.com/stable";

function apiKey(): string {
  return process.env.FMP_API_KEY || "";
}

async function fmpFetch<T>(url: string): Promise<T> {
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${sep}apikey=${apiKey()}`;
  const res = await fetch(fullUrl, { next: { revalidate: 3600 } }); // cache 1h
  if (!res.ok) throw new Error(`FMP API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ---- Competitor tickers ---------------------------------------------------

export const COMPETITOR_TICKERS = [
  { ticker: "NSRGY", name: "Nestle", segment: "All" },
  { ticker: "MDLZ",  name: "Mondelez International", segment: "Snacking" },
  { ticker: "HSY",   name: "The Hershey Company", segment: "Confectionery" },
  { ticker: "CL",    name: "Colgate-Palmolive", segment: "Petcare" },
  { ticker: "SJM",   name: "J.M. Smucker", segment: "Petcare" },
  { ticker: "GIS",   name: "General Mills", segment: "All" },
  { ticker: "PG",    name: "Procter & Gamble", segment: "All" },
  { ticker: "UL",    name: "Unilever", segment: "All" },
  { ticker: "KHC",   name: "Kraft Heinz", segment: "All" },
  { ticker: "K",     name: "Kellanova", segment: "Snacking" },
];

export const ALL_TICKERS = COMPETITOR_TICKERS.map((c) => c.ticker);

// ---- Types ----------------------------------------------------------------

export interface IncomeStatement {
  date: string;
  symbol: string;
  period: string;
  revenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  netIncome: number;
  netIncomeRatio: number;
  ebitda: number;
  ebitdaratio: number;
  eps: number;
  epsdiluted: number;
  costOfRevenue: number;
  sellingGeneralAndAdministrativeExpenses: number;
  researchAndDevelopmentExpenses: number;
  operatingExpenses: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
}

export interface BalanceSheet {
  date: string;
  symbol: string;
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  cashAndCashEquivalents: number;
  totalDebt: number;
  netDebt: number;
  inventory: number;
  goodwill: number;
  intangibleAssets: number;
}

export interface KeyMetrics {
  date: string;
  symbol: string;
  period: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  peRatio: number;
  priceToSalesRatio: number;
  debtToEquity: number;
  currentRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  dividendYield: number;
  enterpriseValue: number;
  marketCap: number;
  evToSales: number;
  evToOperatingCashFlow: number;
  earningsYield: number;
  payoutRatio: number;
  bookValuePerShare: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  pe: number;
  eps: number;
  earningsAnnouncement: string;
}

export interface AnalystEstimate {
  date: string;
  symbol: string;
  estimatedRevenueAvg: number;
  estimatedRevenueHigh: number;
  estimatedRevenueLow: number;
  estimatedEpsAvg: number;
  estimatedEpsHigh: number;
  estimatedEpsLow: number;
  numberAnalystEstimatedRevenue: number;
  numberAnalystsEstimatedEps: number;
}

export interface FinancialRatio {
  date: string;
  symbol: string;
  period: string;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
  debtEquityRatio: number;
  currentRatio: number;
  quickRatio: number;
  dividendYield: number;
  priceEarningsRatio: number;
  priceToSalesRatio: number;
  priceToBookRatio: number;
  enterpriseValueMultiple: number;
  freeCashFlowOperatingCashFlowRatio: number;
  operatingCashFlowSalesRatio: number;
  debtRatio: number;
  interestCoverage: number;
  dividendPayoutRatio: number;
}

export interface EarningsTranscript {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  content: string;
}

export interface PressRelease {
  symbol: string;
  date: string;
  title: string;
  text: string;
}

export interface ESGScore {
  symbol: string;
  cik: string;
  companyName: string;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  ESGScore: number;
  date: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  changePercent: number;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  currency: string;
  mktCap: number;
  price: number;
  changes: number;
  industry: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  description: string;
  ceo: string;
  ipoDate: string;
  image: string;
}

// ---- API functions --------------------------------------------------------

/** Company profile */
export async function getProfile(ticker: string): Promise<CompanyProfile | null> {
  const data = await fmpFetch<CompanyProfile[]>(`${BASE}/profile/${ticker}`);
  return data?.[0] ?? null;
}

/** Batch stock quotes */
export async function getQuotes(tickers: string[]): Promise<StockQuote[]> {
  return fmpFetch<StockQuote[]>(`${BASE}/quote/${tickers.join(",")}`);
}

/** Income statements (annual or quarterly) */
export async function getIncomeStatements(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 8,
): Promise<IncomeStatement[]> {
  return fmpFetch<IncomeStatement[]>(
    `${BASE}/income-statement/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Balance sheets */
export async function getBalanceSheets(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 8,
): Promise<BalanceSheet[]> {
  return fmpFetch<BalanceSheet[]>(
    `${BASE}/balance-sheet-statement/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Key metrics */
export async function getKeyMetrics(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 8,
): Promise<KeyMetrics[]> {
  return fmpFetch<KeyMetrics[]>(
    `${BASE}/key-metrics/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Financial ratios */
export async function getFinancialRatios(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 8,
): Promise<FinancialRatio[]> {
  return fmpFetch<FinancialRatio[]>(
    `${BASE}/ratios/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Analyst estimates */
export async function getAnalystEstimates(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 4,
): Promise<AnalystEstimate[]> {
  return fmpFetch<AnalystEstimate[]>(
    `${BASE}/analyst-estimates/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Historical daily prices */
export async function getHistoricalPrices(
  ticker: string,
  from?: string,
  to?: string,
): Promise<HistoricalPrice[]> {
  let url = `${BASE}/historical-price-full/${ticker}?serietype=line`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  const data = await fmpFetch<{ historical: HistoricalPrice[] }>(url);
  return data?.historical ?? [];
}

/** Earnings call transcripts */
export async function getEarningsTranscripts(
  ticker: string,
  year: number,
  quarter: number,
): Promise<EarningsTranscript[]> {
  return fmpFetch<EarningsTranscript[]>(
    `${BASE}/earning_call_transcript/${ticker}?year=${year}&quarter=${quarter}`
  );
}

/** Press releases */
export async function getPressReleases(
  ticker: string,
  limit = 10,
): Promise<PressRelease[]> {
  return fmpFetch<PressRelease[]>(
    `${STABLE}/news/press-releases/${ticker}?limit=${limit}`
  );
}

/** SEC filings */
export async function getSECFilings(
  ticker: string,
  type = "10-K",
  limit = 10,
): Promise<{ symbol: string; cik: string; type: string; link: string; finalLink: string; acceptedDate: string; fillingDate: string }[]> {
  return fmpFetch(
    `${BASE}/sec_filings/${ticker}?type=${type}&limit=${limit}`
  );
}

/** ESG scores */
export async function getESGScores(ticker: string): Promise<ESGScore[]> {
  return fmpFetch<ESGScore[]>(`${BASE}/esg-environmental-social-governance-data?symbol=${ticker}`);
}

// ---- Additional types -----------------------------------------------------

export interface StockNews {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export interface InsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  transactionType: string;
  securitiesOwned: number;
  securitiesTransacted: number;
  price: number;
  typeOfOwner: string;
}

export interface MandADeal {
  companyName: string;
  targetedCompanyName: string;
  transactionDate: string;
  acceptedDate: string;
  url: string;
}

export interface DCFValue {
  symbol: string;
  date: string;
  dcf: number;
  "Stock Price": number;
}

export interface EmployeeCount {
  symbol: string;
  cik: string;
  acceptanceTime: string;
  periodOfReport: string;
  companyName: string;
  formType: string;
  filingDate: string;
  employeeCount: number;
  source: string;
}

export interface HistoricalMarketCap {
  symbol: string;
  date: string;
  marketCap: number;
}

export interface StockPeer {
  symbol: string;
  peersList: string[];
}

export interface CashFlowStatement {
  date: string;
  symbol: string;
  period: string;
  netIncome: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
  debtRepayment: number;
  commonStockRepurchased: number;
}

export interface PriceTargetConsensus {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

// ---- Additional API functions ---------------------------------------------

/** Stock news for one or more tickers */
export async function getStockNews(tickers: string[], limit = 20): Promise<StockNews[]> {
  return fmpFetch<StockNews[]>(
    `${STABLE}/stock-news?symbols=${tickers.join(",")}&limit=${limit}`
  );
}

/** Insider trading activity */
export async function getInsiderTrading(ticker: string, limit = 20): Promise<InsiderTrade[]> {
  return fmpFetch<InsiderTrade[]>(
    `${BASE}/insider-trading?symbol=${ticker}&limit=${limit}`
  );
}

/** M&A search by company name */
export async function getMandA(company: string): Promise<MandADeal[]> {
  return fmpFetch<MandADeal[]>(
    `${BASE}/mergers-acquisitions-search?name=${encodeURIComponent(company)}`
  );
}

/** DCF valuation */
export async function getDCF(ticker: string): Promise<DCFValue[]> {
  return fmpFetch<DCFValue[]>(`${BASE}/discounted-cash-flow/${ticker}`);
}

/** Historical employee count */
export async function getEmployeeCount(ticker: string): Promise<EmployeeCount[]> {
  return fmpFetch<EmployeeCount[]>(
    `${BASE_V4}/historical/employee_count?symbol=${ticker}`
  );
}

/** Historical market capitalization */
export async function getHistoricalMarketCap(ticker: string, limit = 100): Promise<HistoricalMarketCap[]> {
  return fmpFetch<HistoricalMarketCap[]>(
    `${BASE}/historical-market-capitalization/${ticker}?limit=${limit}`
  );
}

/** Stock peers */
export async function getStockPeers(ticker: string): Promise<StockPeer[]> {
  return fmpFetch<StockPeer[]>(`${BASE_V4}/stock_peers?symbol=${ticker}`);
}

/** Cash flow statement */
export async function getCashFlowStatement(
  ticker: string,
  period: "annual" | "quarter" = "annual",
  limit = 5,
): Promise<CashFlowStatement[]> {
  return fmpFetch<CashFlowStatement[]>(
    `${BASE}/cash-flow-statement/${ticker}?period=${period}&limit=${limit}`
  );
}

/** Price target consensus */
export async function getPriceTarget(ticker: string): Promise<PriceTargetConsensus[]> {
  return fmpFetch<PriceTargetConsensus[]>(
    `${BASE_V4}/price-target-consensus?symbol=${ticker}`
  );
}

// ---- Aggregation helpers --------------------------------------------------

/** Get a full competitive snapshot for all tracked tickers */
export async function getCompetitiveDashboard() {
  const [quotes, ...incomeResults] = await Promise.all([
    getQuotes(ALL_TICKERS),
    ...ALL_TICKERS.map((t) => getIncomeStatements(t, "annual", 2)),
  ]);

  return ALL_TICKERS.map((ticker, i) => {
    const meta = COMPETITOR_TICKERS[i];
    const quote = quotes.find((q) => q.symbol === ticker);
    const income = incomeResults[i] ?? [];
    const latest = income[0];
    const prior = income[1];

    const revenueGrowth =
      latest && prior && prior.revenue
        ? ((latest.revenue - prior.revenue) / prior.revenue) * 100
        : null;

    return {
      ticker,
      name: meta.name,
      segment: meta.segment,
      price: quote?.price ?? 0,
      change: quote?.change ?? 0,
      changePct: quote?.changesPercentage ?? 0,
      marketCap: quote?.marketCap ?? 0,
      pe: quote?.pe ?? 0,
      revenue: latest?.revenue ?? 0,
      revenueGrowth,
      grossMargin: latest?.grossProfitRatio ? latest.grossProfitRatio * 100 : null,
      operatingMargin: latest?.operatingIncomeRatio ? latest.operatingIncomeRatio * 100 : null,
      netMargin: latest?.netIncomeRatio ? latest.netIncomeRatio * 100 : null,
      ebitdaMargin: latest?.ebitdaratio ? latest.ebitdaratio * 100 : null,
      eps: quote?.eps ?? 0,
      fiscalDate: latest?.date ?? "",
    };
  });
}

/** Get detailed financials for a single company */
export async function getCompanyDetail(ticker: string) {
  const [profile, income, balance, metrics, ratios, estimates, esg] =
    await Promise.all([
      getProfile(ticker),
      getIncomeStatements(ticker, "annual", 5),
      getBalanceSheets(ticker, "annual", 5),
      getKeyMetrics(ticker, "annual", 5),
      getFinancialRatios(ticker, "annual", 5),
      getAnalystEstimates(ticker, "annual", 4),
      getESGScores(ticker).catch(() => [] as ESGScore[]),
    ]);

  return { profile, income, balance, metrics, ratios, estimates, esg };
}
