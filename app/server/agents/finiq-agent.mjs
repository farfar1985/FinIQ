/**
 * FinIQ NL Query Agent
 * FR4.1-4.6: Conversational engine, intent classification, source attribution,
 *            suggested prompts, variable resolution
 */

import Anthropic from "@anthropic-ai/sdk";
import config from "../lib/config.mjs";
import dataLayer from "../lib/databricks.mjs";
import SCHEMA_CONTEXT from "../lib/schema-context.mjs";
import { getThreeWayComparison } from "../lib/intelligence.mjs";

const anthropic = config.anthropicApiKey
  ? new Anthropic({ apiKey: config.anthropicApiKey })
  : null;

const MODEL = "claude-haiku-4-5-20251001";

// ============================================================
// Intent classification
// ============================================================

const INTENTS = {
  pes: { keywords: ["pes", "period end", "summary", "kpi", "organic growth", "mac shape", "a&cp", "ce shape", "controllable", "ncfo", "performance"], description: "Period End Summary report" },
  variance: { keywords: ["variance", "budget", "replan", "actual vs", "favorable", "unfavorable"], description: "Budget variance analysis" },
  product: { keywords: ["product", "brand", "segment", "item", "category"], description: "Product/brand analysis" },
  trend: { keywords: ["trend", "over time", "history", "compare period", "year over year", "yoy", "growth"], description: "Trend/time series analysis" },
  ranking: { keywords: ["rank", "top", "bottom", "best", "worst", "highest", "lowest"], description: "Entity/KPI rankings" },
  ci: { keywords: ["competitor", "nestle", "mondelez", "hershey", "ferrero", "colgate", "general mills", "kellanova", "smucker", "freshpet", "idexx", "benchmark", "peer", "competitive", "swot", "porter", "margin compare"], description: "Competitive intelligence" },
  forecast: { keywords: ["forecast", "vs actual", "actual vs", "three-way", "replan vs", "projection"], description: "Forecast comparison" },
  adhoc: { keywords: [], description: "Ad-hoc SQL query" },
};

function classifyIntent(message) {
  const lower = message.toLowerCase();
  for (const [intent, { keywords }] of Object.entries(INTENTS)) {
    if (intent === "adhoc") continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent;
    }
  }
  return "adhoc";
}

// ============================================================
// Variable resolution (FR4.6)
// ============================================================

async function resolveVariables(template, userContext = {}) {
  const dates = await dataLayer.getDates();
  const latest = dates[0] || {};

  const vars = {
    "{current_year}": String(latest.Year || "2025"),
    "{current_period}": String(latest.Period || "P13"),
    "{current_quarter}": String(latest.Quarter || "Q4"),
    "{unit}": userContext.unit || "Mars Inc",
  };

  let resolved = template;
  for (const [key, value] of Object.entries(vars)) {
    resolved = resolved.replaceAll(key, value);
  }
  return resolved;
}

// ============================================================
// Suggested prompts (FR4.5)
// ============================================================

const SUGGESTED_PROMPTS = [
  // Bridge / Waterfall
  { id: "p1", suggested_prompt: "Build a revenue bridge for {unit} from {current_period} LY to CY", description: "Revenue bridge analysis", kpi: ["Total Growth", "Organic Growth"], tag: "bridge", unit: "{unit}", category: "bridge", runs: 0, is_active: true },
  { id: "p2", suggested_prompt: "Show the margin waterfall for {unit} YTD {current_year}", description: "Margin walk from revenue to CE", kpi: ["MAC Shape %", "CE Shape %"], tag: "waterfall", unit: "{unit}", category: "bridge", runs: 0, is_active: true },
  // Margin & Profitability
  { id: "p3", suggested_prompt: "Compare MAC Shape % across all GBUs for {current_period}", description: "Cross-GBU margin comparison", kpi: ["MAC Shape %"], tag: "margin", unit: "all", category: "margin", runs: 0, is_active: true },
  { id: "p4", suggested_prompt: "What is driving A&CP changes for {unit} this period?", description: "A&CP shape driver analysis", kpi: ["A&CP Shape %"], tag: "cost", unit: "{unit}", category: "margin", runs: 0, is_active: true },
  { id: "p5", suggested_prompt: "Show CE Shape % trend for {unit} across all periods in {current_year}", description: "CE Shape trend over time", kpi: ["CE Shape %"], tag: "trend", unit: "{unit}", category: "margin", runs: 0, is_active: true },
  // Revenue & Growth
  { id: "p6", suggested_prompt: "Show organic growth for {unit} YTD vs LY", description: "Organic growth comparison", kpi: ["Organic Growth"], tag: "growth", unit: "{unit}", category: "revenue", runs: 0, is_active: true },
  { id: "p7", suggested_prompt: "Which sub-units have the highest organic growth in {current_period}?", description: "Top performers by organic growth", kpi: ["Organic Growth"], tag: "ranking", unit: "all", category: "revenue", runs: 0, is_active: true },
  { id: "p8", suggested_prompt: "Break down total growth into price, volume, and mix for {unit}", description: "Growth decomposition", kpi: ["Total Growth"], tag: "decomposition", unit: "{unit}", category: "revenue", runs: 0, is_active: true },
  // Performance Narrative
  { id: "p9", suggested_prompt: "Generate period end summary for {unit} in {current_period}", description: "Full PES report with all 6 KPIs", kpi: ["All"], tag: "pes", unit: "{unit}", category: "narrative", runs: 0, is_active: true },
  { id: "p10", suggested_prompt: "What's working well for {unit} this period?", description: "Positive performance highlights", kpi: ["All"], tag: "www", unit: "{unit}", category: "narrative", runs: 0, is_active: true },
  { id: "p11", suggested_prompt: "What's not working well for {unit}?", description: "Areas of concern", kpi: ["All"], tag: "wnww", unit: "{unit}", category: "narrative", runs: 0, is_active: true },
  // Customer & Cost
  { id: "p12", suggested_prompt: "Show budget variance for {unit} in {current_period}", description: "Actual vs Replan analysis", kpi: ["All"], tag: "variance", unit: "{unit}", category: "cost", runs: 0, is_active: true },
  { id: "p13", suggested_prompt: "Which accounts have the largest unfavorable variance for {unit}?", description: "Top variance drivers", kpi: ["All"], tag: "variance", unit: "{unit}", category: "cost", runs: 0, is_active: true },
  { id: "p14", suggested_prompt: "Compare controllable overhead across divisions", description: "Overhead benchmarking", kpi: ["Controllable Overhead Shape %"], tag: "cost", unit: "all", category: "cost", runs: 0, is_active: true },
  { id: "p15", suggested_prompt: "Show NCFO trend for {unit} in {current_year}", description: "Cash flow analysis over time", kpi: ["NCFO"], tag: "trend", unit: "{unit}", category: "cost", runs: 0, is_active: true },
  { id: "p16", suggested_prompt: "Rank all sub-units by MAC Shape % for {current_period}", description: "Sub-unit profitability ranking", kpi: ["MAC Shape %"], tag: "ranking", unit: "all", category: "margin", runs: 0, is_active: true },
  { id: "p17", suggested_prompt: "Show top 3 and bottom 3 entities for organic growth", description: "Performance extremes", kpi: ["Organic Growth"], tag: "ranking", unit: "all", category: "revenue", runs: 0, is_active: true },
  { id: "p18", suggested_prompt: "Compare {unit} performance vs replan across all KPIs", description: "Full variance dashboard", kpi: ["All"], tag: "variance", unit: "{unit}", category: "cost", runs: 0, is_active: true },
];

// ============================================================
// Chart configuration helpers
// ============================================================

function makeAreaChart(data, xKey, yKeys, title) {
  return { type: "area", data, xKey, yKeys, title, colors: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] };
}

function makeBarChart(data, xKey, yKeys, title) {
  return { type: "bar", data, xKey, yKeys, title, colors: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] };
}

// ============================================================
// Trend Analysis — taglines for KPI direction over recent periods
// ============================================================

/**
 * Analyze the last 3-5 periods of a KPI to detect trend direction.
 * @param {Array} rows - All rows for a single KPI, each with Period, Periodic_CY, Periodic_LY
 * @returns {{ direction: string, periods: number, tagline: string }}
 */
function analyzeTrend(rows) {
  // Sort ascending by period (oldest first)
  const sorted = [...rows]
    .filter((r) => r.Period != null)
    .sort((a, b) => (a.Period || "").localeCompare(b.Period || ""));

  // Take the last 3-5 periods
  const recent = sorted.slice(-5);
  if (recent.length < 2) {
    return { direction: "stable", periods: recent.length, tagline: "Insufficient data for trend analysis" };
  }

  // Compute periodic growth for each period
  const growths = recent.map((r) => {
    if (r.Periodic_LY === 0) return 0;
    return ((r.Periodic_CY - r.Periodic_LY) / Math.abs(r.Periodic_LY)) * 100;
  });

  // Count consecutive increases and decreases from the end
  let consecutiveUp = 0;
  let consecutiveDown = 0;

  for (let i = growths.length - 1; i >= 1; i--) {
    if (growths[i] > growths[i - 1]) {
      if (consecutiveDown === 0) consecutiveUp++;
      else break;
    } else if (growths[i] < growths[i - 1]) {
      if (consecutiveUp === 0) consecutiveDown++;
      else break;
    } else {
      break;
    }
  }

  // Check for alternating pattern (volatile)
  let alternations = 0;
  for (let i = 1; i < growths.length; i++) {
    if ((growths[i] > growths[i - 1]) !== (growths[i - 1] > (i >= 2 ? growths[i - 2] : growths[i - 1]))) {
      alternations++;
    }
  }

  // Check stability: all growths within 1% of each other
  const maxGrowth = Math.max(...growths);
  const minGrowth = Math.min(...growths);
  const isStable = (maxGrowth - minGrowth) < 1;

  const periodsAnalyzed = recent.length;

  if (isStable) {
    return { direction: "stable", periods: periodsAnalyzed, tagline: `Stable across ${periodsAnalyzed} periods (< 1% variation)` };
  }
  if (consecutiveUp >= 2) {
    return { direction: "improving", periods: consecutiveUp + 1, tagline: `Improving for ${consecutiveUp + 1} consecutive periods` };
  }
  if (consecutiveDown >= 2) {
    return { direction: "declining", periods: consecutiveDown + 1, tagline: `Declining for ${consecutiveDown + 1} consecutive periods` };
  }
  if (alternations >= 2) {
    return { direction: "volatile", periods: periodsAnalyzed, tagline: `Volatile over ${periodsAnalyzed} periods (alternating direction)` };
  }

  // Default: mixed
  return { direction: "stable", periods: periodsAnalyzed, tagline: `Relatively stable over ${periodsAnalyzed} periods` };
}

// ============================================================
// PES Engine (FR2.1)
// ============================================================

async function generatePES(entity, format = "summary") {
  const [pl, ncfo] = await Promise.all([
    dataLayer.getPLByEntity(entity),
    dataLayer.getNCFOByEntity(entity),
  ]);

  if (!pl.length && !ncfo.length) {
    return { response: `No data found for entity "${entity}".`, data: null, chartConfig: null, sources: [] };
  }

  // Group by Account_KPI and get latest period
  const kpiMap = {};
  for (const row of [...pl, ...ncfo]) {
    const key = row.Account_KPI;
    if (!kpiMap[key]) kpiMap[key] = [];
    kpiMap[key].push(row);
  }

  // Calculate growth for each KPI
  const kpiResults = [];
  for (const [kpi, rows] of Object.entries(kpiMap)) {
    // Get latest period data
    const sorted = rows.sort((a, b) => (b.Period || "").localeCompare(a.Period || ""));
    const latest = sorted[0];
    if (!latest) continue;

    const ytdGrowth = latest.YTD_LY !== 0
      ? ((latest.YTD_CY - latest.YTD_LY) / Math.abs(latest.YTD_LY)) * 100
      : 0;
    const periodicGrowth = latest.Periodic_LY !== 0
      ? ((latest.Periodic_CY - latest.Periodic_LY) / Math.abs(latest.Periodic_LY)) * 100
      : 0;

    // Analyze trend across recent periods
    const trend = analyzeTrend(rows);

    kpiResults.push({
      kpi,
      period: latest.Period,
      ytd_cy: latest.YTD_CY,
      ytd_ly: latest.YTD_LY,
      ytd_growth: Math.round(ytdGrowth * 100) / 100,
      periodic_cy: latest.Periodic_CY,
      periodic_ly: latest.Periodic_LY,
      periodic_growth: Math.round(periodicGrowth * 100) / 100,
      trend,
    });
  }

  // Build chart data — show KPI growth rates
  const chartData = kpiResults.map((k) => ({
    name: k.kpi,
    "YTD Growth %": k.ytd_growth,
    "Periodic Growth %": k.periodic_growth,
  }));

  const chartConfig = makeBarChart(chartData, "name", ["YTD Growth %", "Periodic Growth %"], `${entity} — KPI Performance`);

  // Generate narrative if LLM available
  let narrative = "";
  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are a financial analyst for Mars, Incorporated. Generate a ${format} for ${entity} based on this KPI data:\n\n${JSON.stringify(kpiResults, null, 2)}\n\nEach KPI includes a "trend" object with direction (improving/declining/volatile/stable) and a tagline. Incorporate these trend insights into your narrative — mention whether KPIs are improving, declining, or volatile.\n\nFormat: ${format === "www" ? "What's Working Well" : format === "wnww" ? "What's Not Working Well" : "Executive Summary"}\n\nBe concise. Use specific numbers. Never say "replace" or "fragmented".`,
        }],
      });
      narrative = msg.content[0]?.text || "";
    } catch (err) {
      console.error("[agent] LLM error:", err.message);
      narrative = formatKPITable(entity, kpiResults, format);
    }
  } else {
    narrative = formatKPITable(entity, kpiResults, format);
  }

  return {
    response: narrative,
    data: kpiResults,
    chartConfig,
    sources: [
      { table: "finiq_vw_pl_entity", query: "Entity filter applied", rowCount: pl.length },
      { table: "finiq_vw_ncfo_entity", query: "Entity filter applied", rowCount: ncfo.length },
    ],
  };
}

function formatKPITable(entity, kpis, format) {
  let text = `## ${entity} — Period End Summary\n\n`;
  text += "| KPI | YTD CY | YTD LY | YTD Growth | Periodic CY | Periodic LY | Periodic Growth | Trend |\n";
  text += "|-----|--------|--------|------------|-------------|-------------|----------------|-------|\n";
  for (const k of kpis) {
    const ytdSign = k.ytd_growth >= 0 ? "+" : "";
    const pSign = k.periodic_growth >= 0 ? "+" : "";
    const trendIcon = k.trend?.direction === "improving" ? "^" : k.trend?.direction === "declining" ? "v" : k.trend?.direction === "volatile" ? "~" : "-";
    text += `| ${k.kpi} | ${k.ytd_cy?.toLocaleString()} | ${k.ytd_ly?.toLocaleString()} | ${ytdSign}${k.ytd_growth}% | ${k.periodic_cy?.toLocaleString()} | ${k.periodic_ly?.toLocaleString()} | ${pSign}${k.periodic_growth}% | ${trendIcon} ${k.trend?.tagline || ""} |\n`;
  }

  // Add trend summary section
  const improving = kpis.filter((k) => k.trend?.direction === "improving");
  const declining = kpis.filter((k) => k.trend?.direction === "declining");

  if (improving.length > 0 || declining.length > 0) {
    text += "\n### Trend Summary\n\n";
    if (improving.length > 0) {
      text += `**Improving:** ${improving.map((k) => `${k.kpi} (${k.trend.tagline})`).join(", ")}\n\n`;
    }
    if (declining.length > 0) {
      text += `**Declining:** ${declining.map((k) => `${k.kpi} (${k.trend.tagline})`).join(", ")}\n\n`;
    }
  }

  return text;
}

// ============================================================
// NL Query processor
// ============================================================

async function processQuery(message, sessionContext = {}) {
  const intent = classifyIntent(message);
  const entity = extractEntity(message) || sessionContext.entity || "Mars Inc";

  // Route by intent
  switch (intent) {
    case "pes":
      return generatePES(entity, detectFormat(message));

    case "variance": {
      const rows = await dataLayer.getVariance(entity);
      const data = rows.map((r) => ({
        account: r.Account_KPI,
        actual: r.Actual_USD_Value,
        replan: r.Replan_USD_Value,
        variance: r.Variance,
        variance_pct: Math.round(r.Variance_Pct * 100) / 100,
        favorable: r.Variance >= 0,
      }));

      // Top variances for chart
      const topVariances = [...data].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 10);
      const chartConfig = makeBarChart(
        topVariances.map((v) => ({ name: v.account, Variance: v.variance })),
        "name", ["Variance"],
        `${entity} — Budget Variance (Top 10)`
      );

      let narrative = `## ${entity} — Budget Variance\n\n`;
      const favorable = data.filter((d) => d.favorable).length;
      narrative += `**${favorable}** of ${data.length} accounts are favorable.\n\n`;

      return { response: narrative, data, chartConfig, sources: [{ table: "finiq_financial_replan", query: "Entity filter applied", rowCount: rows.length }] };
    }

    case "ranking": {
      const allEntities = await dataLayer.getEntities();
      const results = [];
      // Get top-level entities for ranking
      const topEntities = allEntities.filter((e) => e.Entity_Level <= 2).slice(0, 20);

      for (const ent of topEntities) {
        const pl = await dataLayer.getPLByEntity(ent.Entity_Alias);
        if (pl.length === 0) continue;
        const ogRow = pl.find((r) => r.Account_KPI === "Organic Growth");
        if (ogRow) {
          const growth = ogRow.YTD_LY !== 0 ? ((ogRow.YTD_CY - ogRow.YTD_LY) / Math.abs(ogRow.YTD_LY)) * 100 : 0;
          results.push({ entity: ent.Entity_Alias, growth: Math.round(growth * 100) / 100 });
        }
      }

      results.sort((a, b) => b.growth - a.growth);
      const chartConfig = makeBarChart(results.slice(0, 10), "entity", ["growth"], "Organic Growth Rankings");

      return {
        response: `## Entity Rankings by Organic Growth\n\nTop 3: ${results.slice(0, 3).map((r) => `${r.entity} (${r.growth > 0 ? "+" : ""}${r.growth}%)`).join(", ")}\n\nBottom 3: ${results.slice(-3).map((r) => `${r.entity} (${r.growth > 0 ? "+" : ""}${r.growth}%)`).join(", ")}`,
        data: results,
        chartConfig,
        sources: [{ table: "finiq_vw_pl_entity", query: "All entities", rowCount: results.length }],
      };
    }

    case "trend": {
      const pl = await dataLayer.getPLByEntity(entity);
      const kpiName = extractKPI(message) || "Organic Growth";
      const kpiRows = pl.filter((r) => r.Account_KPI === kpiName);

      const trendData = kpiRows.sort((a, b) => (a.Period || "").localeCompare(b.Period || "")).map((r) => ({
        period: r.Period,
        "Current Year": r.Periodic_CY,
        "Prior Year": r.Periodic_LY,
      }));

      const chartConfig = makeAreaChart(trendData, "period", ["Current Year", "Prior Year"], `${entity} — ${kpiName} Trend`);

      return {
        response: `## ${entity} — ${kpiName} Trend\n\nShowing ${trendData.length} periods.`,
        data: trendData,
        chartConfig,
        sources: [{ table: "finiq_vw_pl_entity", query: "Entity and KPI filter applied", rowCount: kpiRows.length }],
      };
    }

    case "ci": {
      // Route CI queries to FMP-powered analysis
      try {
        const { default: ciAgent } = await import("./ci-agent.mjs");
        const benchmarkData = await ciAgent.getBenchmarkComparison();
        const competitors = benchmarkData.competitors || [];

        const chartData = competitors.slice(0, 8).map((c) => ({
          name: c.company || c.ticker,
          "Revenue ($B)": Math.round((c.revenue || 0) / 1e9 * 10) / 10,
          "Gross Margin %": Math.round((c.grossMargin || 0) * 10) / 10,
          "Operating Margin %": Math.round((c.operatingMargin || 0) * 10) / 10,
        }));

        let narrative = `## Competitive Benchmarking\n\n`;
        if (anthropic) {
          try {
            const resp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 1024,
              messages: [{ role: "user", content: `You are a financial analyst for Mars, Incorporated. Analyze this competitor benchmarking data and provide insights. Question: "${message}"\n\nData:\n${JSON.stringify(competitors.slice(0, 6), null, 2)}\n\nBe concise. Use specific numbers. Never say "replace" or "fragmented".` }],
            });
            narrative = resp.content[0]?.text || narrative;
          } catch (e) { /* keep default */ }
        } else {
          narrative += competitors.map((c) => `- **${c.company}**: Revenue $${Math.round((c.revenue || 0) / 1e9)}B, Gross Margin ${c.grossMargin?.toFixed(1)}%, Op Margin ${c.operatingMargin?.toFixed(1)}%`).join("\n");
        }

        return {
          response: narrative,
          data: competitors,
          chartConfig: makeBarChart(chartData, "name", ["Revenue ($B)", "Gross Margin %", "Operating Margin %"], "Competitor Benchmarking"),
          sources: [{ table: "FMP API", query: "Benchmark comparison", rowCount: competitors.length }],
        };
      } catch (err) {
        return { response: `CI query error: ${err.message}`, data: null, chartConfig: null, sources: [] };
      }
    }

    case "forecast": {
      // Three-way comparison: Actual vs Replan vs Forecast
      try {
        const comparison = await getThreeWayComparison(entity);
        const rows = comparison.rows || [];
        const chartData = rows.slice(0, 10).map((r) => ({
          name: r.account,
          Actual: Math.round(r.actual),
          Replan: Math.round(r.replan),
          Forecast: Math.round(r.forecast || 0),
        }));

        let narrative = `## ${entity} — Actual vs Replan vs Forecast\n\n`;
        if (anthropic) {
          try {
            const resp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 1024,
              messages: [{ role: "user", content: `You are a financial analyst for Mars, Incorporated. Analyze this three-way comparison (Actual vs Replan vs Forecast) for ${entity}. Highlight key variances and risks.\n\nData (first 10 accounts):\n${JSON.stringify(rows.slice(0, 10), null, 2)}\n\nBe concise. Use specific numbers. Never say "replace" or "fragmented".` }],
            });
            narrative = resp.content[0]?.text || narrative;
          } catch (e) { /* keep default */ }
        } else {
          narrative += `${rows.length} accounts compared. Forecast is simulated (mock data).`;
        }

        return {
          response: narrative,
          data: rows,
          chartConfig: makeBarChart(chartData, "name", ["Actual", "Replan", "Forecast"], `${entity} — Three-Way Comparison`),
          sources: [{ table: "finiq_financial_replan + forecast", query: "Entity filter applied", rowCount: rows.length }],
        };
      } catch (err) {
        return { response: `Forecast query error: ${err.message}`, data: null, chartConfig: null, sources: [] };
      }
    }

    default: {
      // Ad-hoc: use LLM to generate SQL
      if (anthropic) {
        return await processAdHocWithLLM(message, entity);
      }
      return {
        response: "LLM not configured. Please set ANTHROPIC_API_KEY in .env for ad-hoc queries.",
        data: null,
        chartConfig: null,
        sources: [],
      };
    }
  }
}

// ============================================================
// Ad-hoc LLM query
// ============================================================

async function processAdHocWithLLM(message, entity) {
  try {
    const sqlResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: `You are a SQL expert for a financial database. ${SCHEMA_CONTEXT}\n\nGenerate a SELECT query to answer the user's question. Use the SQLite column names:\n- finiq_dim_entity: Child_Entity_ID, Child_Entity, Parent_Entity_ID, Parent_Entity, Entity_Level\n- finiq_dim_account: Child_Account_ID, Child_Account, Parent_Account_ID, Parent_Account, Sign_Conversion, Statement\n- finiq_vw_pl_entity: Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY\n- finiq_vw_ncfo_entity: Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY\n- finiq_financial_replan: Entity, Account_KPI, Actual_USD_Value, Replan_USD_Value, Year, Quarter\n- finiq_date: Date_ID, Year, Period, Quarter\n\nReturn ONLY the SQL query, nothing else. Use ? for parameters. After the SQL, on a new line write PARAMS: followed by comma-separated values.`,
      messages: [{ role: "user", content: message }],
    });

    const sqlText = sqlResponse.content[0]?.text || "";
    const lines = sqlText.trim().split("\n");
    let sql = lines.filter((l) => !l.startsWith("PARAMS:")).join("\n").replace(/```sql/g, "").replace(/```/g, "").trim();
    const paramsLine = lines.find((l) => l.startsWith("PARAMS:"));
    const params = paramsLine ? paramsLine.replace("PARAMS:", "").trim().split(",").map((p) => p.trim()) : [];

    const data = await dataLayer.executeAdHoc(sql, params);

    // Auto-detect chart type
    let chartConfig = null;
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      const numericKeys = keys.filter((k) => typeof data[0][k] === "number");
      const stringKeys = keys.filter((k) => typeof data[0][k] === "string");
      if (numericKeys.length > 0 && stringKeys.length > 0) {
        chartConfig = makeBarChart(data.slice(0, 20), stringKeys[0], numericKeys.slice(0, 3), "Query Results");
      }
    }

    // Summarize with LLM
    let summary = `Found ${data.length} rows.`;
    if (anthropic && data.length > 0) {
      try {
        const summaryResp = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          messages: [{ role: "user", content: `Summarize this financial data concisely for a business user. Question: "${message}"\n\nData (first 10 rows):\n${JSON.stringify(data.slice(0, 10), null, 2)}\n\nNever say "replace" or "fragmented".` }],
        });
        summary = summaryResp.content[0]?.text || summary;
      } catch (e) { /* keep default */ }
    }

    return {
      response: summary,
      data: data.slice(0, 100),
      chartConfig,
      sources: [{ table: "ad-hoc", query: sql, rowCount: data.length }],
    };
  } catch (err) {
    return {
      response: `Error processing query: ${err.message}`,
      data: null,
      chartConfig: null,
      sources: [],
    };
  }
}

// ============================================================
// Helpers
// ============================================================

function extractEntity(message) {
  // Common entity names — would be better with an entity lookup
  const entities = ["Mars Inc", "Pet Care", "Mars Wrigley", "Royal Canin", "Food Nutrition & Multisales"];
  const lower = message.toLowerCase();
  for (const ent of entities) {
    if (lower.includes(ent.toLowerCase())) return ent;
  }
  return null;
}

function extractKPI(message) {
  const kpis = ["Organic Growth", "MAC Shape %", "A&CP Shape %", "CE Shape %", "Controllable Overhead Shape %", "NCFO", "Total Growth", "Net Revenue"];
  const lower = message.toLowerCase();
  for (const kpi of kpis) {
    if (lower.includes(kpi.toLowerCase())) return kpi;
  }
  return null;
}

function detectFormat(message) {
  const lower = message.toLowerCase();
  if (lower.includes("what's working well") || lower.includes("www")) return "www";
  if (lower.includes("what's not working") || lower.includes("wnww")) return "wnww";
  return "summary";
}

export { processQuery, resolveVariables, SUGGESTED_PROMPTS, classifyIntent };
