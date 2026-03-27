/**
 * Competitive Intelligence Agent
 * Generates SWOT, Porter's Five Forces, benchmarking, positioning,
 * earnings intelligence, and M&A tracking from FMP data.
 */

import fmpClient, { COMPETITORS } from "../lib/fmp-client.mjs";

// ══════════════════════════════════════════════════════════════════
// SWOT Analysis — auto-generated from financial ratios + estimates
// ══════════════════════════════════════════════════════════════════

export async function getSWOT(ticker) {
  const [ratios, income, estimates, metrics] = await Promise.all([
    fmpClient.getFinancialRatios(ticker, 2),
    fmpClient.getIncomeStatement(ticker, "annual", 2),
    fmpClient.getAnalystEstimates(ticker, 2),
    fmpClient.getKeyMetrics(ticker, 2),
  ]);

  const comp = COMPETITORS.find((c) => c.ticker === ticker) || { name: ticker };
  const latest = ratios[0] || {};
  const prev = ratios[1] || {};
  const latestIncome = income[0] || {};
  const prevIncome = income[1] || {};

  const grossMargin = latest.grossProfitMargin || 0;
  const opMargin = latest.operatingProfitMargin || 0;
  const netMargin = latest.netProfitMargin || 0;
  const roe = latest.returnOnEquity || 0;
  const currentRatio = latest.currentRatio || 0;
  const deRatio = latest.debtEquityRatio || 0;

  const revenueGrowth = prevIncome.revenue
    ? (latestIncome.revenue - prevIncome.revenue) / prevIncome.revenue
    : 0;

  const marginImprovement = prev.grossProfitMargin
    ? grossMargin - prev.grossProfitMargin
    : 0;

  // Generate SWOT dynamically based on financial data
  const strengths = [];
  const weaknesses = [];
  const opportunities = [];
  const threats = [];

  // Strengths
  if (grossMargin > 0.40) strengths.push(`Strong gross margin of ${(grossMargin * 100).toFixed(1)}%, indicating pricing power and brand strength`);
  if (opMargin > 0.15) strengths.push(`Healthy operating margin of ${(opMargin * 100).toFixed(1)}%, reflecting operational efficiency`);
  if (roe > 0.20) strengths.push(`High return on equity (${(roe * 100).toFixed(1)}%), demonstrating effective capital allocation`);
  if (revenueGrowth > 0.03) strengths.push(`Revenue growth of ${(revenueGrowth * 100).toFixed(1)}% outpacing industry average`);
  if (currentRatio > 1.2) strengths.push(`Solid liquidity position with current ratio of ${currentRatio.toFixed(2)}`);
  if (latestIncome.revenue > 20e9) strengths.push("Scale advantages from significant revenue base enabling R&D and marketing investment");
  if (strengths.length === 0) strengths.push("Established market presence in consumer staples sector");

  // Weaknesses
  if (grossMargin < 0.35) weaknesses.push(`Below-average gross margin of ${(grossMargin * 100).toFixed(1)}%, limiting pricing flexibility`);
  if (deRatio > 2.0) weaknesses.push(`Elevated leverage with debt-to-equity ratio of ${deRatio.toFixed(2)}`);
  if (revenueGrowth < 0) weaknesses.push(`Revenue declined ${(revenueGrowth * 100).toFixed(1)}% year-over-year`);
  if (marginImprovement < -0.01) weaknesses.push(`Margin compression of ${(marginImprovement * 100).toFixed(1)} percentage points`);
  if (netMargin < 0.08) weaknesses.push(`Net margin of ${(netMargin * 100).toFixed(1)}% below sector peers`);
  if (weaknesses.length === 0) weaknesses.push("Limited geographic diversification relative to largest competitors");

  // Opportunities
  opportunities.push("Expansion into emerging markets where per-capita consumption is growing");
  if (revenueGrowth > 0) opportunities.push("Momentum in core categories supports premium product launches");
  opportunities.push("Digital and direct-to-consumer channels offer higher-margin growth");
  opportunities.push("Health and wellness trends driving demand for reformulated products");
  if (estimates[0]?.estimatedRevenueAvg > latestIncome.revenue) {
    opportunities.push(`Analyst consensus projects revenue growth to $${(estimates[0].estimatedRevenueAvg / 1e9).toFixed(1)}B`);
  }

  // Threats
  threats.push("Input cost inflation (cocoa, dairy, packaging) pressuring margins industry-wide");
  threats.push("Private label competition intensifying in key retail channels");
  if (deRatio > 1.5) threats.push("Rising interest rates increasing cost of debt servicing");
  threats.push("Regulatory changes on labeling, sugar content, and advertising restrictions");
  threats.push("Currency volatility impacting international operations");

  return {
    ticker,
    company: comp.name,
    segment_overlap: comp.segment_overlap,
    asOfDate: latest.date || new Date().toISOString().slice(0, 10),
    strengths,
    weaknesses,
    opportunities,
    threats,
    financialSnapshot: {
      revenue: latestIncome.revenue,
      grossMargin,
      operatingMargin: opMargin,
      netMargin,
      roe,
      revenueGrowth,
      debtToEquity: deRatio,
      currentRatio,
    },
  };
}

// ══════════════════════════════════════════════════════════════════
// Porter's Five Forces — quantified via market data
// ══════════════════════════════════════════════════════════════════

export async function getPortersFiveForces() {
  // Get market caps for HHI calculation
  const publicCompetitors = COMPETITORS.filter((c) => c.isPublic);
  const marketCaps = await Promise.all(
    publicCompetitors.map(async (c) => {
      const mc = await fmpClient.getMarketCap(c.ticker);
      return { ...c, marketCap: mc?.marketCap || null };
    })
  );

  // Add Mars estimated market cap (private, ~$50B enterprise value equivalent)
  const allCaps = [
    { name: "Mars Inc", ticker: "MARS", marketCap: 50e9 },
    ...marketCaps.filter((c) => c.marketCap),
  ];

  const totalCap = allCaps.reduce((sum, c) => sum + (c.marketCap || 0), 0);

  // HHI = sum of (market share%)^2 — below 1500 = competitive, 1500-2500 = moderate, >2500 = concentrated
  const hhi = allCaps.reduce((sum, c) => {
    const share = ((c.marketCap || 0) / totalCap) * 100;
    return sum + share * share;
  }, 0);

  const marketShares = allCaps
    .map((c) => ({
      name: c.name,
      ticker: c.ticker,
      marketCap: c.marketCap,
      marketShare: ((c.marketCap || 0) / totalCap) * 100,
    }))
    .sort((a, b) => b.marketCap - a.marketCap);

  // Score each force 1-5 (5 = highest threat)
  const competitiveRivalry = hhi < 1500 ? 4 : hhi < 2500 ? 3 : 2;

  return {
    forces: {
      competitiveRivalry: {
        score: competitiveRivalry,
        level: competitiveRivalry >= 4 ? "High" : competitiveRivalry >= 3 ? "Moderate" : "Low",
        factors: [
          `HHI of ${Math.round(hhi)} indicates ${hhi < 1500 ? "fragmented" : hhi < 2500 ? "moderately concentrated" : "concentrated"} market`,
          `${allCaps.length} major players competing for market share`,
          "High fixed costs drive aggressive pricing and promotion",
          "Brand loyalty creates pockets of differentiation",
        ],
      },
      threatOfNewEntrants: {
        score: 2,
        level: "Low",
        factors: [
          "High capital requirements for manufacturing and distribution",
          "Established brand equity creates significant barriers",
          "Regulatory compliance costs (FDA, EFSA) deter entrants",
          "Retail shelf space controlled by incumbents",
        ],
      },
      bargainingPowerOfSuppliers: {
        score: 3,
        level: "Moderate",
        factors: [
          "Agricultural commodity prices are volatile and cyclical",
          "Limited substitutability for key ingredients (cocoa, dairy)",
          "Large buyers have negotiating leverage on packaging and logistics",
          "Vertical integration by some competitors reduces dependency",
        ],
      },
      bargainingPowerOfBuyers: {
        score: 4,
        level: "High",
        factors: [
          "Retail consolidation (Walmart, Kroger, Costco) increases buyer power",
          "Private label alternatives create pricing pressure",
          "Low switching costs for consumers in most categories",
          "E-commerce platforms provide price transparency",
        ],
      },
      threatOfSubstitutes: {
        score: 3,
        level: "Moderate",
        factors: [
          "Health-conscious consumers shifting to fresh/organic alternatives",
          "Plant-based and alternative protein products gaining share",
          "Private label products offer comparable quality at lower prices",
          "Meal kit and food delivery services alter consumption patterns",
        ],
      },
    },
    hhi: Math.round(hhi),
    concentration: hhi < 1500 ? "Low" : hhi < 2500 ? "Moderate" : "High",
    marketShares,
    totalMarketCap: totalCap,
  };
}

// ══════════════════════════════════════════════════════════════════
// Earnings Call Intelligence — sentiment + key topics + guidance
// ══════════════════════════════════════════════════════════════════

export async function analyzeEarningsCall(ticker, year, quarter) {
  const transcripts = await fmpClient.getEarningsCallTranscript(ticker, year, quarter);
  const comp = COMPETITORS.find((c) => c.ticker === ticker) || { name: ticker };

  if (!transcripts || transcripts.length === 0) {
    return { ticker, company: comp.name, year, quarter, error: "Transcript not available" };
  }

  const transcript = transcripts[0];
  const content = transcript.content || "";

  // Keyword-based sentiment and topic extraction
  const positiveWords = ["growth", "strong", "beat", "exceeded", "record", "improving", "momentum", "expansion", "confident", "solid", "robust", "resilient", "increase"];
  const negativeWords = ["decline", "headwind", "challenge", "pressure", "weakness", "soft", "decline", "impact", "risk", "volatile", "uncertain", "concern", "lower"];

  const contentLower = content.toLowerCase();
  const posCount = positiveWords.reduce((n, w) => n + (contentLower.split(w).length - 1), 0);
  const negCount = negativeWords.reduce((n, w) => n + (contentLower.split(w).length - 1), 0);
  const totalSentimentWords = posCount + negCount || 1;
  const sentimentScore = (posCount - negCount) / totalSentimentWords;

  // Topic detection
  const topics = [];
  const topicKeywords = {
    "Organic Growth": ["organic", "volume", "pricing", "mix"],
    "Margin Expansion": ["margin", "gross profit", "operating income", "cost savings", "productivity"],
    "Innovation & New Products": ["innovation", "launch", "new product", "pipeline", "R&D"],
    "Digital & E-commerce": ["digital", "e-commerce", "direct-to-consumer", "online"],
    "Emerging Markets": ["emerging", "asia", "latin america", "international", "developing"],
    "Capital Allocation": ["buyback", "dividend", "acquisition", "capex", "investment"],
    "Guidance & Outlook": ["guidance", "outlook", "expect", "forecast", "full-year"],
    "FX & Currency": ["currency", "foreign exchange", "fx", "translation"],
    "Cost & Commodities": ["commodity", "input cost", "inflation", "cocoa", "raw material"],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const mentions = keywords.reduce((n, kw) => n + (contentLower.includes(kw) ? 1 : 0), 0);
    if (mentions > 0) {
      topics.push({ topic, relevance: mentions / keywords.length, mentions });
    }
  }
  topics.sort((a, b) => b.relevance - a.relevance);

  // Extract forward guidance hints
  const guidanceIndicators = [];
  if (contentLower.includes("increasing") && contentLower.includes("guidance"))
    guidanceIndicators.push("Raised full-year guidance");
  if (contentLower.includes("maintain") && contentLower.includes("guidance"))
    guidanceIndicators.push("Maintained existing guidance");
  if (contentLower.includes("4-5 percent") || contentLower.includes("4% to 5%"))
    guidanceIndicators.push("Organic growth guidance: 4-5%");
  if (contentLower.includes("full-year"))
    guidanceIndicators.push("Full-year targets reiterated");

  return {
    ticker,
    company: comp.name,
    year: Number(year),
    quarter: Number(quarter),
    date: transcript.date,
    sentiment: {
      score: +sentimentScore.toFixed(3),
      label: sentimentScore > 0.2 ? "Positive" : sentimentScore < -0.2 ? "Negative" : "Neutral",
      positiveCount: posCount,
      negativeCount: negCount,
    },
    topics: topics.slice(0, 8),
    forwardGuidance: guidanceIndicators.length > 0 ? guidanceIndicators : ["No specific guidance changes detected"],
    wordCount: content.split(/\s+/).length,
    transcriptAvailable: true,
  };
}

// ══════════════════════════════════════════════════════════════════
// Financial Benchmarking — side-by-side competitor comparison
// ══════════════════════════════════════════════════════════════════

export async function getBenchmarkComparison(tickers) {
  const targetTickers = tickers || COMPETITORS.filter((c) => c.isPublic).map((c) => c.ticker);

  const results = await Promise.all(
    targetTickers.map(async (ticker) => {
      const [income, ratios, metrics] = await Promise.all([
        fmpClient.getIncomeStatement(ticker, "annual", 2),
        fmpClient.getFinancialRatios(ticker, 1),
        fmpClient.getKeyMetrics(ticker, 1),
      ]);

      const comp = COMPETITORS.find((c) => c.ticker === ticker) || { name: ticker };
      const latest = income[0] || {};
      const prev = income[1] || {};
      const latestRatios = ratios[0] || {};
      const latestMetrics = metrics[0] || {};

      const revenueGrowth = prev.revenue
        ? ((latest.revenue - prev.revenue) / prev.revenue) * 100
        : 0;

      return {
        ticker,
        company: comp.name,
        segment_overlap: comp.segment_overlap,
        revenue: latest.revenue || 0,
        revenueGrowth: +revenueGrowth.toFixed(2),
        grossMargin: +((latestRatios.grossProfitMargin || 0) * 100).toFixed(2),
        operatingMargin: +((latestRatios.operatingProfitMargin || 0) * 100).toFixed(2),
        netMargin: +((latestRatios.netProfitMargin || 0) * 100).toFixed(2),
        roe: +((latestRatios.returnOnEquity || 0) * 100).toFixed(2),
        debtToEquity: +(latestRatios.debtEquityRatio || 0).toFixed(2),
        marketCap: latestMetrics.marketCap || null,
        peRatio: latestMetrics.peRatio ? +latestMetrics.peRatio.toFixed(1) : null,
        evToEbitda: latestMetrics.evToEbitda ? +latestMetrics.evToEbitda.toFixed(1) : null,
        ebitdaMargin: latest.ebitdaratio ? +(latest.ebitdaratio * 100).toFixed(2) : null,
      };
    })
  );

  // Compute averages
  const avg = (arr, key) => {
    const vals = arr.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== 0);
    return vals.length > 0 ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : null;
  };

  return {
    competitors: results.sort((a, b) => (b.revenue || 0) - (a.revenue || 0)),
    averages: {
      revenue: avg(results, "revenue"),
      revenueGrowth: avg(results, "revenueGrowth"),
      grossMargin: avg(results, "grossMargin"),
      operatingMargin: avg(results, "operatingMargin"),
      netMargin: avg(results, "netMargin"),
      roe: avg(results, "roe"),
      peRatio: avg(results, "peRatio"),
    },
    peerCount: results.length,
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}

// ══════════════════════════════════════════════════════════════════
// Competitive Positioning Map — scatter plot data
// ══════════════════════════════════════════════════════════════════

export async function getPositioningMap(xMetric = "revenueGrowth", yMetric = "operatingMargin") {
  const benchmark = await getBenchmarkComparison();
  const validMetrics = [
    "revenue", "revenueGrowth", "grossMargin", "operatingMargin",
    "netMargin", "roe", "debtToEquity", "marketCap", "peRatio", "evToEbitda",
  ];

  const xKey = validMetrics.includes(xMetric) ? xMetric : "revenueGrowth";
  const yKey = validMetrics.includes(yMetric) ? yMetric : "operatingMargin";

  const points = benchmark.competitors
    .filter((c) => c[xKey] !== null && c[yKey] !== null)
    .map((c) => ({
      name: c.company,
      ticker: c.ticker,
      x: c[xKey],
      y: c[yKey],
      size: c.marketCap ? Math.log10(c.marketCap) * 5 : 30,
      segment: c.segment_overlap,
    }));

  return {
    points,
    xMetric: xKey,
    yMetric: yKey,
    xLabel: metricLabel(xKey),
    yLabel: metricLabel(yKey),
    availableMetrics: validMetrics.map((m) => ({ key: m, label: metricLabel(m) })),
  };
}

function metricLabel(key) {
  const labels = {
    revenue: "Revenue ($)",
    revenueGrowth: "Revenue Growth (%)",
    grossMargin: "Gross Margin (%)",
    operatingMargin: "Operating Margin (%)",
    netMargin: "Net Margin (%)",
    roe: "Return on Equity (%)",
    debtToEquity: "Debt / Equity",
    marketCap: "Market Cap ($)",
    peRatio: "P/E Ratio",
    evToEbitda: "EV / EBITDA",
  };
  return labels[key] || key;
}

// ══════════════════════════════════════════════════════════════════
// M&A Activity Tracker
// ══════════════════════════════════════════════════════════════════

export async function getMAActivity(limit = 20) {
  const transactions = await fmpClient.getMergersAcquisitions(limit);

  return {
    transactions: transactions.map((t) => ({
      acquirer: t.companyName,
      target: t.targetedCompanyName,
      date: t.transactionDate,
      closedDate: t.acceptedDate || null,
      dealSize: t.dealSize || "Undisclosed",
      type: t.type || "acquisition",
    })),
    count: transactions.length,
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}

// ══════════════════════════════════════════════════════════════════
// News Feed
// ══════════════════════════════════════════════════════════════════

export async function getCompetitorNews(limit = 15) {
  const publicTickers = COMPETITORS.filter((c) => c.isPublic).map((c) => c.ticker);
  const news = await fmpClient.getStockNews(publicTickers, limit);

  return {
    articles: news.map((n) => ({
      ticker: n.symbol,
      company: COMPETITORS.find((c) => c.ticker === n.symbol)?.name || n.symbol,
      title: n.title,
      summary: n.text,
      url: n.url,
      source: n.site,
      publishedAt: n.publishedDate,
      sentiment: n.sentiment || "neutral",
    })),
    count: news.length,
  };
}

// ══════════════════════════════════════════════════════════════════
// Competitor Universe (enriched with financials)
// ══════════════════════════════════════════════════════════════════

export async function getCompetitorUniverse() {
  const benchmark = await getBenchmarkComparison();

  return {
    competitors: COMPETITORS.map((c) => {
      const fin = benchmark.competitors.find((b) => b.ticker === c.ticker);
      return {
        ...c,
        revenue: fin?.revenue || null,
        revenueGrowth: fin?.revenueGrowth || null,
        grossMargin: fin?.grossMargin || null,
        operatingMargin: fin?.operatingMargin || null,
        netMargin: fin?.netMargin || null,
        marketCap: fin?.marketCap || null,
        peRatio: fin?.peRatio || null,
      };
    }),
    peerCount: COMPETITORS.length,
    dataSource: config.fmpApiKey ? "FMP API (live)" : "Mock data (no API key)",
  };
}

// Need config for dataSource label
import config from "../lib/config.mjs";

export default {
  getSWOT,
  getPortersFiveForces,
  analyzeEarningsCall,
  getBenchmarkComparison,
  getPositioningMap,
  getMAActivity,
  getCompetitorNews,
  getCompetitorUniverse,
};
