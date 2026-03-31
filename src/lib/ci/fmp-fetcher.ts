import { FMP_COMPETITORS } from "@/lib/constants";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

export interface CompanyProfile {
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

export interface IncomeStatement {
  date?: string;
  period?: string;
  revenue?: number;
  grossProfit?: number;
  netIncome?: number;
  operatingIncome?: number;
  eps?: number;
  [k: string]: unknown;
}

export interface ESGData {
  symbol?: string;
  environmentalScore?: number;
  socialScore?: number;
  governanceScore?: number;
  ESGScore?: number;
  [k: string]: unknown;
}

export interface AnalystEstimate {
  date?: string;
  estimatedRevenueLow?: number;
  estimatedRevenueHigh?: number;
  estimatedRevenueAvg?: number;
  estimatedEpsAvg?: number;
  numberAnalystsEstimatedEps?: number;
  [k: string]: unknown;
}

export interface PriceTarget {
  symbol?: string;
  publishedDate?: string;
  analystName?: string;
  analystCompany?: string;
  priceTarget?: number;
  [k: string]: unknown;
}

export interface NewsItem {
  title?: string;
  url?: string;
  publishedDate?: string;
  site?: string;
  text?: string;
  symbol?: string;
}

export interface CICompanyData {
  profile: CompanyProfile | null;
  financials: IncomeStatement[];
  esg: ESGData | null;
  analystEstimates: AnalystEstimate[];
  priceTargets: PriceTarget[];
  news: NewsItem[];
}

/* -- Server-side FMP fetch (used in API routes) -- */

async function fmpGet<T>(endpoint: string, symbol?: string, extra?: Record<string, string>): Promise<T | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  let url: string;
  const key = `&apikey=${apiKey}`;

  switch (endpoint) {
    case "profile":
      url = `${FMP_BASE}/profile/${symbol}?apikey=${apiKey}`;
      break;
    case "income-statement":
      url = `${FMP_BASE}/income-statement/${symbol}?period=${extra?.period || "quarter"}&limit=${extra?.limit || "8"}&apikey=${apiKey}`;
      break;
    case "esg-environmental-social-governance-data":
      url = `${FMP_BASE}/esg-environmental-social-governance-data?symbol=${symbol}${key}`;
      break;
    case "analyst-estimates":
      url = `${FMP_BASE}/analyst-estimates/${symbol}?limit=${extra?.limit || "8"}&apikey=${apiKey}`;
      break;
    case "price-target":
      url = `${FMP_BASE}/price-target?symbol=${symbol}${key}`;
      break;
    case "stock-news":
      url = `${FMP_BASE}/stock_news?tickers=${symbol}&limit=${extra?.limit || "10"}${key}`;
      break;
    default:
      url = `${FMP_BASE}/${endpoint}/${symbol}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "FinIQ/1.0" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchCompanyData(symbol: string, metrics: string[]): Promise<CICompanyData> {
  const needProfile = metrics.length === 0 || metrics.some(m => ["price", "mktcap", "market cap", "profile", "summary"].includes(m));
  const needFinancials = metrics.length === 0 || metrics.some(m => ["revenue", "margin", "income", "growth", "financial", "earnings"].includes(m));
  const needESG = metrics.some(m => ["esg", "environmental", "social", "governance", "sustainability"].includes(m));
  const needAnalysts = metrics.some(m => ["analyst", "recommendation", "target", "rating", "consensus"].includes(m));
  const needNews = metrics.some(m => ["news", "recent", "headline"].includes(m));

  const [profileRes, financialsRes, esgRes, estimatesRes, targetsRes, newsRes] = await Promise.all([
    needProfile ? fmpGet<CompanyProfile[]>("profile", symbol) : Promise.resolve(null),
    needFinancials ? fmpGet<IncomeStatement[]>("income-statement", symbol, { period: "quarter", limit: "8" }) : Promise.resolve(null),
    needESG ? fmpGet<ESGData[]>("esg-environmental-social-governance-data", symbol) : Promise.resolve(null),
    needAnalysts ? fmpGet<AnalystEstimate[]>("analyst-estimates", symbol) : Promise.resolve(null),
    needAnalysts ? fmpGet<PriceTarget[]>("price-target", symbol) : Promise.resolve(null),
    needNews ? fmpGet<NewsItem[]>("stock-news", symbol, { limit: "5" }) : Promise.resolve(null),
  ]);

  return {
    profile: Array.isArray(profileRes) ? profileRes[0] || null : null,
    financials: Array.isArray(financialsRes) ? financialsRes : [],
    esg: Array.isArray(esgRes) && esgRes[0] ? esgRes[0] : null,
    analystEstimates: Array.isArray(estimatesRes) ? estimatesRes : [],
    priceTargets: Array.isArray(targetsRes) ? targetsRes.slice(0, 15) : [],
    news: Array.isArray(newsRes) ? newsRes : [],
  };
}

export async function fetchAllCompaniesData(companies: string[], metrics: string[]): Promise<Record<string, CICompanyData>> {
  const results = await Promise.all(
    companies.map(async (sym) => ({
      sym,
      data: await fetchCompanyData(sym, metrics),
    }))
  );
  const map: Record<string, CICompanyData> = {};
  for (const { sym, data } of results) map[sym] = data;
  return map;
}

export function getAllCompetitorSymbols(): string[] {
  return [...FMP_COMPETITORS];
}

export const COMPETITOR_NAMES: Record<string, string> = {
  MDLZ: "Mondelez", HSY: "Hershey", GIS: "General Mills",
  CL: "Colgate", UL: "Unilever", SJM: "J.M. Smucker", NESN: "Nestle",
};
