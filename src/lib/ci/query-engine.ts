/* eslint-disable @typescript-eslint/no-unused-vars */
import { fetchAllCompaniesData, getAllCompetitorSymbols, COMPETITOR_NAMES, type CICompanyData } from "./fmp-fetcher";

/* -- Company alias resolution -- */

const COMPANY_ALIASES: Record<string, string> = {
  "mondelez": "MDLZ", "mdlz": "MDLZ", "oreo": "MDLZ", "cadbury": "MDLZ", "mondelēz": "MDLZ",
  "hershey": "HSY", "hsy": "HSY", "reeses": "HSY", "reese": "HSY",
  "general mills": "GIS", "gis": "GIS", "blue buffalo": "GIS", "cheerios": "GIS",
  "colgate": "CL", "hills": "CL", "cl": "CL", "hill's": "CL",
  "unilever": "UL", "ul": "UL", "dove": "UL",
  "smucker": "SJM", "sjm": "SJM", "meow mix": "SJM", "j.m. smucker": "SJM",
  "nestle": "NESN", "nesn": "NESN", "purina": "NESN", "nescafe": "NESN", "nestlé": "NESN",
};

/* -- Metric detection -- */

const METRIC_KEYWORDS: Record<string, string[]> = {
  revenue: ["revenue", "sales", "top line"],
  margin: ["margin", "gross margin", "operating margin", "profitability"],
  growth: ["growth", "yoy", "year over year", "growing"],
  income: ["income", "profit", "earnings", "net income", "operating income"],
  esg: ["esg", "environmental", "social", "governance", "sustainability", "green"],
  analyst: ["analyst", "recommendation", "target", "rating", "consensus", "price target", "buy", "sell", "hold"],
  news: ["news", "headline", "recent", "latest"],
  financial: ["financial", "financials", "p&l"],
  price: ["price", "stock price", "share price", "valuation"],
  mktcap: ["market cap", "mktcap", "market capitalization", "cap"],
  profile: ["profile", "about", "overview", "company", "who is"],
  summary: ["summary", "summarize", "summarise", "overview", "snapshot"],
};

/* -- Intent types -- */

export type CIQueryIntent =
  | "compare_all"
  | "compare_selected"
  | "single_company"
  | "ranking"
  | "sector_filter"
  | "esg_comparison"
  | "analyst_overview"
  | "news_lookup"
  | "general";

export interface CIBlock {
  type: "ci-summary" | "ci-comparison" | "ci-chart" | "ci-news" | "ci-profile";
  data: Record<string, unknown>;
}

export interface CIResponse {
  text: string;
  blocks: CIBlock[];
  companies: string[];
}

/* -- Detection functions -- */

export function detectCompanies(query: string): string[] {
  const lower = query.toLowerCase();
  const found = new Set<string>();
  for (const [alias, symbol] of Object.entries(COMPANY_ALIASES)) {
    if (lower.includes(alias)) found.add(symbol);
  }
  if (lower.includes("all competitor") || lower.includes("all companies") || lower.includes("every") || lower.includes("each")) {
    return getAllCompetitorSymbols();
  }
  return found.size > 0 ? Array.from(found) : getAllCompetitorSymbols();
}

export function detectMetrics(query: string): string[] {
  const lower = query.toLowerCase();
  const found: string[] = [];
  for (const [metric, keywords] of Object.entries(METRIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(metric);
  }
  return found;
}

function detectIntent(query: string, companies: string[], metrics: string[]): CIQueryIntent {
  const lower = query.toLowerCase();
  const allCompanies = getAllCompetitorSymbols();

  if (metrics.includes("esg")) return "esg_comparison";
  if (metrics.includes("analyst")) return "analyst_overview";
  if (metrics.includes("news")) return "news_lookup";

  if (lower.includes("rank") || lower.includes("best") || lower.includes("highest") ||
      lower.includes("lowest") || lower.includes("worst") || lower.includes("leader") ||
      lower.includes("who has") || lower.includes("which")) return "ranking";

  if (lower.includes("pet food") || lower.includes("snack") || lower.includes("personal care") ||
      lower.includes("sector") || lower.includes("segment")) return "sector_filter";

  if (companies.length === 1) return "single_company";
  if (companies.length > 1 && companies.length < allCompanies.length) return "compare_selected";
  if (lower.includes("compare") || lower.includes("vs") || lower.includes("versus")) return "compare_all";

  return companies.length >= allCompanies.length ? "compare_all" : "general";
}

/* -- Response generation (template-based) -- */

function toBillions(n: number | undefined): string {
  if (!n) return "N/A";
  return "$" + (n / 1e9).toFixed(2) + "B";
}

function computeMetrics(data: CICompanyData, sym: string) {
  const stmts = data.financials;
  const latest = stmts[0];
  const prev = stmts[4]; // same quarter last year
  const rev = latest?.revenue || 0;
  const prevRev = prev?.revenue || 0;
  const yoyGrowth = prevRev ? ((rev - prevRev) / prevRev) * 100 : 0;
  const rawGrossMargin = latest?.grossProfit && latest?.revenue
    ? (latest.grossProfit / latest.revenue) * 100 : 0;
  // Cap at 99% — 100% indicates a data reporting anomaly
  const grossMargin = rawGrossMargin >= 100 ? 0 : rawGrossMargin;
  const opMargin = latest?.operatingIncome && latest?.revenue
    ? (latest.operatingIncome / latest.revenue) * 100 : 0;

  return {
    symbol: sym,
    name: COMPETITOR_NAMES[sym] || sym,
    revenue: rev,
    grossMargin,
    opMargin,
    yoyGrowth,
    netIncome: latest?.netIncome || 0,
    mktCap: data.profile?.mktCap || 0,
    price: data.profile?.price || 0,
  };
}

function generateComparisonResponse(allData: Record<string, CICompanyData>, companies: string[], metrics: string[]): CIResponse {
  const computed = companies.map(sym => computeMetrics(allData[sym], sym));

  const tableRows = computed.map(c => ({
    Company: c.name,
    Ticker: c.symbol,
    Price: `$${c.price.toFixed(2)}`,
    "Mkt Cap": toBillions(c.mktCap),
    "YoY Rev Growth": `${c.yoyGrowth.toFixed(1)}%`,
    "Gross Margin": `${c.grossMargin.toFixed(1)}%`,
    "Op Margin": `${c.opMargin.toFixed(1)}%`,
  }));

  const highestMargin = [...computed].sort((a, b) => b.grossMargin - a.grossMargin)[0];
  const highestGrowth = [...computed].sort((a, b) => b.yoyGrowth - a.yoyGrowth)[0];
  const largestCap = [...computed].sort((a, b) => b.mktCap - a.mktCap)[0];

  const text = `Comparing ${companies.length} competitors on key financial metrics. ` +
    `${highestMargin.name} leads in gross margin at ${highestMargin.grossMargin.toFixed(1)}%, ` +
    `${highestGrowth.name} shows the strongest revenue growth at ${highestGrowth.yoyGrowth.toFixed(1)}%, ` +
    `and ${largestCap.name} has the largest market cap at ${toBillions(largestCap.mktCap)}.`;

  const chartData = computed.map(c => ({
    name: c.symbol,
    "Revenue Growth %": parseFloat(c.yoyGrowth.toFixed(1)),
    "Gross Margin %": parseFloat(c.grossMargin.toFixed(1)),
    "Op Margin %": parseFloat(c.opMargin.toFixed(1)),
  }));

  return {
    text,
    blocks: [
      { type: "ci-comparison", data: { rows: tableRows, title: "Competitor Comparison" } },
      { type: "ci-chart", data: { chartType: "bar", chartData, title: "Financial Metrics Comparison", dataKeys: ["Revenue Growth %", "Gross Margin %", "Op Margin %"] } },
    ],
    companies,
  };
}

function generateRankingResponse(allData: Record<string, CICompanyData>, companies: string[], metrics: string[], query: string): CIResponse {
  const computed = companies.map(sym => computeMetrics(allData[sym], sym));
  const lower = query.toLowerCase();

  let sortKey: string = "grossMargin";
  let sortLabel = "Gross Margin";
  let ascending = false;

  if (lower.includes("revenue growth") || lower.includes("growth")) {
    sortKey = "yoyGrowth"; sortLabel = "Revenue Growth";
  } else if (lower.includes("operating margin") || lower.includes("op margin")) {
    sortKey = "opMargin"; sortLabel = "Operating Margin";
  } else if (lower.includes("revenue") && !lower.includes("growth")) {
    sortKey = "revenue"; sortLabel = "Revenue";
  } else if (lower.includes("market cap") || lower.includes("mktcap") || lower.includes("largest")) {
    sortKey = "mktCap"; sortLabel = "Market Cap";
  } else if (lower.includes("price")) {
    sortKey = "price"; sortLabel = "Stock Price";
  }
  if (lower.includes("lowest") || lower.includes("worst") || lower.includes("smallest")) ascending = true;

  const sorted = [...computed].sort((a, b) =>
    ascending ? (a[sortKey as keyof typeof a] as number) - (b[sortKey as keyof typeof b] as number) : (b[sortKey as keyof typeof b] as number) - (a[sortKey as keyof typeof a] as number)
  );

  const formatVal = (val: number) => {
    if (sortKey === "revenue" || sortKey === "mktCap" || sortKey === "netIncome") return toBillions(val);
    if (sortKey === "price") return `$${val.toFixed(2)}`;
    return `${val.toFixed(1)}%`;
  };

  const rankings = sorted.map((c, i) => `${i + 1}. ${c.name} (${c.symbol}): ${formatVal(c[sortKey as keyof typeof c] as number)}`).join("\n");
  const text = `Ranking by ${sortLabel} (${ascending ? "lowest" : "highest"} first):\n\n${rankings}`;

  const chartData = sorted.map(c => ({
    name: c.symbol,
    [sortLabel]: sortKey === "revenue" || sortKey === "mktCap" || sortKey === "netIncome"
      ? parseFloat(((c[sortKey as keyof typeof c] as number) / 1e9).toFixed(2))
      : parseFloat((c[sortKey as keyof typeof c] as number).toFixed(1)),
  }));

  return {
    text,
    blocks: [
      { type: "ci-chart", data: { chartType: "bar", chartData, title: `${sortLabel} Ranking`, dataKeys: [sortLabel] } },
    ],
    companies,
  };
}

function generateSingleCompanyResponse(allData: Record<string, CICompanyData>, symbol: string, metrics: string[]): CIResponse {
  const data = allData[symbol];
  const profile = data.profile;
  const m = computeMetrics(data, symbol);
  const name = COMPETITOR_NAMES[symbol] || symbol;
  const blocks: CIBlock[] = [];

  let text = `${name} (${symbol})`;
  if (profile) {
    text += ` — ${profile.sector || "N/A"} | ${profile.industry || "N/A"}`;
    text += `\nPrice: $${(profile.price || 0).toFixed(2)} | Market Cap: ${toBillions(profile.mktCap)}`;
    text += `\nCEO: ${profile.ceo || "N/A"} | Employees: ${profile.fullTimeEmployees ? Number(profile.fullTimeEmployees).toLocaleString() : "N/A"}`;

    blocks.push({
      type: "ci-profile",
      data: {
        name, symbol, price: profile.price, mktCap: profile.mktCap,
        sector: profile.sector, ceo: profile.ceo, employees: profile.fullTimeEmployees,
        description: profile.description?.slice(0, 300),
      },
    });
  }

  text += `\n\nKey Financials:`;
  text += `\n  Revenue Growth (YoY): ${m.yoyGrowth.toFixed(1)}%`;
  text += `\n  Gross Margin: ${m.grossMargin.toFixed(1)}%`;
  text += `\n  Operating Margin: ${m.opMargin.toFixed(1)}%`;
  text += `\n  Net Income: ${toBillions(m.netIncome)}`;

  if (metrics.includes("news") && data.news.length > 0) {
    blocks.push({
      type: "ci-news",
      data: { items: data.news.slice(0, 5).map(n => ({ title: n.title, url: n.url, date: n.publishedDate, site: n.site })) },
    });
    text += `\n\nLatest news: ${data.news.length} recent articles shown below.`;
  }

  if (metrics.includes("analyst") && data.priceTargets.length > 0) {
    const avgTarget = data.priceTargets.reduce((s, t) => s + (t.priceTarget || 0), 0) / data.priceTargets.length;
    const upside = profile?.price ? ((avgTarget - profile.price) / profile.price * 100) : 0;
    text += `\n\nAnalyst Consensus: Avg target $${avgTarget.toFixed(2)} (${upside >= 0 ? "+" : ""}${upside.toFixed(1)}% ${upside >= 0 ? "upside" : "downside"})`;
  }

  return { text, blocks, companies: [symbol] };
}

function generateESGResponse(allData: Record<string, CICompanyData>, companies: string[]): CIResponse {
  const rows = companies.map(sym => {
    const d = allData[sym]?.esg;
    return {
      Company: COMPETITOR_NAMES[sym] || sym,
      Ticker: sym,
      Environmental: d?.environmentalScore?.toFixed(1) ?? "N/A",
      Social: d?.socialScore?.toFixed(1) ?? "N/A",
      Governance: d?.governanceScore?.toFixed(1) ?? "N/A",
      "Overall ESG": d?.ESGScore?.toFixed(1) ?? "N/A",
    };
  });

  const withScores = companies
    .map(sym => ({ sym, score: allData[sym]?.esg?.ESGScore ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const leader = withScores[0];
  const text = `ESG Comparison across ${companies.length} competitors. ` +
    `${COMPETITOR_NAMES[leader.sym]} leads with an overall ESG score of ${leader.score.toFixed(1)}.`;

  return {
    text,
    blocks: [
      { type: "ci-comparison", data: { rows, title: "ESG Scores Comparison" } },
    ],
    companies,
  };
}

function generateAnalystResponse(allData: Record<string, CICompanyData>, companies: string[]): CIResponse {
  const rows = companies.map(sym => {
    const data = allData[sym];
    const targets = data.priceTargets;
    const price = data.profile?.price || 0;
    const avgTarget = targets.length > 0
      ? targets.reduce((s, t) => s + (t.priceTarget || 0), 0) / targets.length
      : 0;
    const upside = price ? ((avgTarget - price) / price * 100) : 0;

    let buy = 0, hold = 0, sell = 0;
    for (const t of targets) {
      const tgt = t.priceTarget || 0;
      if (tgt > price * 1.1) buy++;
      else if (tgt < price * 0.95) sell++;
      else hold++;
    }

    return {
      Company: COMPETITOR_NAMES[sym] || sym,
      Price: `$${price.toFixed(2)}`,
      "Avg Target": `$${avgTarget.toFixed(2)}`,
      Upside: `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`,
      Buy: String(buy),
      Hold: String(hold),
      Sell: String(sell),
      "# Analysts": String(targets.length),
    };
  });

  const text = `Analyst recommendations and price targets for ${companies.length} competitors.`;

  return {
    text,
    blocks: [
      { type: "ci-comparison", data: { rows, title: "Analyst Consensus Overview" } },
    ],
    companies,
  };
}

function generateNewsResponse(allData: Record<string, CICompanyData>, companies: string[]): CIResponse {
  const allNews: Array<{ company: string; title?: string; url?: string; date?: string; site?: string }> = [];
  for (const sym of companies) {
    for (const n of (allData[sym]?.news || []).slice(0, 3)) {
      allNews.push({ company: COMPETITOR_NAMES[sym] || sym, title: n.title, url: n.url, date: n.publishedDate, site: n.site });
    }
  }

  const text = `Latest news across ${companies.length} competitors (${allNews.length} articles).`;

  return {
    text,
    blocks: [
      { type: "ci-news", data: { items: allNews } },
    ],
    companies,
  };
}

/* -- Main query handler -- */

export async function handleCIQuery(query: string): Promise<CIResponse> {
  const companies = detectCompanies(query);
  const metrics = detectMetrics(query);
  const intent = detectIntent(query, companies, metrics);

  const fetchMetrics = metrics.length > 0 ? metrics : ["revenue", "margin", "growth", "price", "mktcap"];
  const allData = await fetchAllCompaniesData(companies, fetchMetrics);

  switch (intent) {
    case "ranking":
      return generateRankingResponse(allData, companies, metrics, query);
    case "single_company":
      return generateSingleCompanyResponse(allData, companies[0], metrics);
    case "esg_comparison":
      return generateESGResponse(allData, companies);
    case "analyst_overview":
      return generateAnalystResponse(allData, companies);
    case "news_lookup":
      return generateNewsResponse(allData, companies);
    case "compare_selected":
    case "compare_all":
    case "sector_filter":
    case "general":
    default:
      return generateComparisonResponse(allData, companies, metrics);
  }
}

/* -- CI intent detection for main chat -- */

// Databricks entity prefixes — always route to internal, never CI
const INTERNAL_ENTITY_PREFIXES = ["rc ", "rc japan", "rc france", "rc germany", "rc uk",
  "rc italy", "rc spain", "rc nordics", "rc usa", "rc canada", "rc australia", "rc china",
  "rc brazil", "rc mexico", "rc southeast", "mpc ", "mpc us", "mpc canada",
  "royal canin", "mars petcare"];

export function isCIQuery(query: string): boolean {
  const lower = query.toLowerCase();

  // Internal entities always win — never route to CI
  if (INTERNAL_ENTITY_PREFIXES.some(prefix => lower.includes(prefix))) return false;

  // Check for competitor company mentions — require word boundaries for short aliases
  const shortAliases = new Set(["ul", "cl", "gis", "hsy", "sjm", "nesn", "mdlz"]);
  for (const alias of Object.keys(COMPANY_ALIASES)) {
    if (shortAliases.has(alias)) {
      const wordBoundary = new RegExp(`\\b${alias}\\b`, "i");
      if (wordBoundary.test(query)) return true;
    } else if (lower.includes(alias)) {
      return true;
    }
  }

  // Check for CI-specific keywords
  const ciKeywords = ["competitive", "competitor", "compare companies",
    "market position", "benchmark against", "peer group", "rival"];
  return ciKeywords.some(kw => lower.includes(kw));
}
