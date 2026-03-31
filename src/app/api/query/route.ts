import { NextRequest, NextResponse } from "next/server";
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
  type CompetitorRow,
} from "@/data/simulated";
import {
  processLLMQuery,
  classifyIntent as llmClassifyIntent,
  isCIQuery,
} from "@/lib/llm-query";

// ---------------------------------------------------------------------------
// POST /api/query
// Accepts { query: string, context?: { entity?: string, period?: string }, history?: {role,content}[] }
// Returns  { text, intent, data?: { type, columns?, rows?, chartData?, chartType? } }
//
// Strategy: Try LLM-powered query first (if ANTHROPIC_API_KEY is set),
// then fall back to the regex-based logic below.
// ---------------------------------------------------------------------------

interface QueryRequest {
  query: string;
  context?: { entity?: string; period?: string };
  history?: { role: string; content: string }[];
}

interface StructuredData {
  type: "table" | "chart";
  columns?: string[];
  rows?: Record<string, unknown>[];
  chartData?: { label: string; value: number }[];
  chartType?: "area" | "bar";
}

interface QueryResponse {
  text: string;
  intent: string;
  data?: StructuredData;
}

// ---- Intent classification -------------------------------------------------

type Intent = "lookup" | "comparison" | "trend" | "report";

function classifyIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (/\b(compare|vs\.?|versus|across|benchmark)\b/.test(q)) return "comparison";
  if (/\b(trend|over time|history|historical|month.over.month|period.over.period)\b/.test(q)) return "trend";
  if (/\b(report|generate|pes|waterfall|bridge|package)\b/.test(q)) return "report";
  return "lookup";
}

// ---- Entity parsing --------------------------------------------------------

const ENTITY_ALIASES: Record<string, string> = {
  petcare: "GBU_PET",
  "mars petcare": "GBU_PET",
  snacking: "GBU_SNK",
  "mars snacking": "GBU_SNK",
  "food & nutrition": "GBU_FN",
  "food and nutrition": "GBU_FN",
  "mars wrigley": "GBU_MW",
  wrigley: "GBU_MW",
  "mars inc": "MARS",
  "mars incorporated": "MARS",
  corporate: "MARS",
  "chocolate na": "SUB_SNK_CHOC",
  "royal canin": "SUB_PET_ROYAL",
  "royal canin na": "SUB_PET_ROYAL",
  "ben's original": "SUB_FN_RICE",
  "gum & mints": "SUB_MW_GUM",
  "petcare na": "DIV_PET_NA",
  "petcare north america": "DIV_PET_NA",
  "petcare europe": "DIV_PET_EU",
  "petcare eu": "DIV_PET_EU",
  "snacking na": "DIV_SNK_NA",
  "snacking north america": "DIV_SNK_NA",
  "snacking eu": "DIV_SNK_EU",
  "snacking europe": "DIV_SNK_EU",
  "wrigley international": "DIV_MW_INTL",
  "wrigley na": "DIV_MW_NA",
};

function parseEntity(query: string, contextEntity?: string): string | null {
  const q = query.toLowerCase();
  // Try longest match first
  const sortedAliases = Object.entries(ENTITY_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, id] of sortedAliases) {
    if (q.includes(alias)) return id;
  }
  // Check for "all gbus" or "across gbus"
  if (/\b(all gbus?|across gbus?|each gbu|every gbu)\b/.test(q)) return "ALL_GBUS";
  return contextEntity || null;
}

// ---- Period parsing --------------------------------------------------------

function parsePeriod(query: string, contextPeriod?: string): string | null {
  const q = query.toLowerCase();
  // Match P01-P12
  const pMatch = q.match(/\bp(0?[1-9]|1[0-2])\b/);
  if (pMatch) {
    const num = pMatch[1].padStart(2, "0");
    const yearMatch = q.match(/\b(2024|2025|2026)\b/);
    const year = yearMatch ? yearMatch[1] : "2025";
    return `P${num}_${year}`;
  }
  // Match Q1-Q4
  const qMatch = q.match(/\bq([1-4])\b/);
  if (qMatch) return `Q${qMatch[1]}`;
  // Match YTD
  if (/\bytd\b/.test(q)) return "YTD";
  return contextPeriod || "P06_2025";
}

// ---- Account parsing -------------------------------------------------------

const ACCOUNT_ALIASES: Record<string, string> = {
  "organic growth": "S900083",
  "net revenue": "S100010",
  revenue: "S100010",
  "gross profit": "S100020",
  cogs: "S100030",
  mac: "S200010",
  "mac shape": "S200010",
  "a&cp": "S200020",
  acp: "S200020",
  "trade spend": "S200030",
  ce: "S300010",
  "ce shape": "S300010",
  overhead: "S300020",
  "controllable overhead": "S300020",
  "sg&a": "S300030",
  sga: "S300030",
  "operating profit": "S400010",
  "d&a": "S400020",
  depreciation: "S400020",
  ncfo: "S500010",
  capex: "S500020",
  "capital expenditures": "S500020",
  "working capital": "S500030",
  ebitda: "S600010",
  "net income": "S600020",
  volume: "S700010",
  "price/mix": "S700020",
  "price mix": "S700020",
  "fx impact": "S700030",
  fx: "S700030",
};

function parseAccounts(query: string): string[] {
  const q = query.toLowerCase();
  const matched: string[] = [];
  const sorted = Object.entries(ACCOUNT_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, code] of sorted) {
    if (q.includes(alias) && !matched.includes(code)) {
      matched.push(code);
    }
  }
  return matched;
}

// ---- Helpers ---------------------------------------------------------------

function fmtNum(v: number, suffix = ""): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}B${suffix}`;
  if (Math.abs(v) >= 1) return `$${v.toFixed(1)}M${suffix}`;
  return `${v.toFixed(1)}%${suffix}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function entityName(entities: Entity[], id: string): string {
  return entities.find((e) => e.id === id)?.name ?? id;
}

function accountName(accounts: Account[], code: string): string {
  return accounts.find((a) => a.code === code)?.name ?? code;
}

function isPercentageAccount(code: string): boolean {
  return ["S900083", "S700020", "S700030"].includes(code);
}

// ---- Quarter period expansion -----------------------------------------------

function quarterPeriods(quarter: string): string[] {
  const q = parseInt(quarter.replace("Q", ""), 10);
  const start = (q - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `P${String(start + i).padStart(2, "0")}_2025`);
}

// ---- Query handlers --------------------------------------------------------

function handleLookup(
  entityId: string | null,
  period: string,
  accountCodes: string[],
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[],
  replanData: ReplanRow[],
): QueryResponse {
  const eid = entityId ?? "MARS";
  const eName = entityName(entities, eid);

  // If no specific accounts, show full P&L summary
  const codes =
    accountCodes.length > 0
      ? accountCodes
      : ["S100010", "S900083", "S200010", "S300010", "S500010"];

  let periodFilter: string[];
  if (period === "YTD") {
    periodFilter = [
      "P01_2025", "P02_2025", "P03_2025", "P04_2025",
      "P05_2025", "P06_2025",
    ];
  } else if (period.startsWith("Q")) {
    periodFilter = quarterPeriods(period);
  } else {
    periodFilter = [period];
  }

  const rows = financialData.filter(
    (r) =>
      r.entity_id === eid &&
      codes.includes(r.account_code) &&
      periodFilter.includes(r.date_id)
  );

  if (rows.length === 0) {
    return {
      text: `No data found for ${eName} in ${period}. Please check the entity name and period.`,
      intent: "lookup",
    };
  }

  // Aggregate across periods if multi-period
  const aggregated = codes.map((code) => {
    const codeRows = rows.filter((r) => r.account_code === code);
    const isPct = isPercentageAccount(code);
    const cyValue = isPct
      ? codeRows.reduce((s, r) => s + r.periodic_cy_value, 0) / codeRows.length
      : codeRows.reduce((s, r) => s + r.periodic_cy_value, 0);
    const lyValue = isPct
      ? codeRows.reduce((s, r) => s + r.periodic_ly_value, 0) / codeRows.length
      : codeRows.reduce((s, r) => s + r.periodic_ly_value, 0);
    const variance = cyValue - lyValue;
    const variancePct = lyValue !== 0 ? (variance / Math.abs(lyValue)) * 100 : 0;
    return {
      Account: accountName(accounts, code),
      "CY Value": isPct ? `${cyValue.toFixed(1)}%` : `$${cyValue.toFixed(1)}M`,
      "LY Value": isPct ? `${lyValue.toFixed(1)}%` : `$${lyValue.toFixed(1)}M`,
      "Var ($)": isPct ? `${variance >= 0 ? "+" : ""}${variance.toFixed(1)} bps` : `$${variance.toFixed(1)}M`,
      "Var (%)": `${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}%`,
    };
  });

  const periodLabel = period === "YTD" ? "YTD P06" : period.startsWith("Q") ? period : period.replace("_", " ");
  const text = `${eName} financial summary for ${periodLabel} 2025:`;

  return {
    text,
    intent: "lookup",
    data: {
      type: "table",
      columns: ["Account", "CY Value", "LY Value", "Var ($)", "Var (%)"],
      rows: aggregated,
    },
  };
}

function handleComparison(
  entityId: string | null,
  period: string,
  accountCodes: string[],
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[],
  query: string,
): QueryResponse {
  const q = query.toLowerCase();

  // Check for competitor comparison
  if (/\b(nestle|mondelez|hershey|colgate|freshpet|smucker|competitor|industry|peer)\b/.test(q)) {
    return handleCompetitorComparison();
  }

  // Default: compare across GBUs
  const gbuIds = ["GBU_PET", "GBU_SNK", "GBU_FN", "GBU_MW"];
  const code = accountCodes.length > 0 ? accountCodes[0] : "S200010"; // Default to MAC
  const isPct = isPercentageAccount(code);
  const acctName = accountName(accounts, code);

  const periodFilter = period.startsWith("Q") ? quarterPeriods(period) : [period];

  const chartData: { label: string; value: number }[] = [];
  const tableRows: Record<string, unknown>[] = [];

  for (const gbuId of gbuIds) {
    const rows = financialData.filter(
      (r) =>
        r.entity_id === gbuId &&
        r.account_code === code &&
        periodFilter.includes(r.date_id)
    );
    const cyVal = isPct
      ? rows.reduce((s, r) => s + r.periodic_cy_value, 0) / (rows.length || 1)
      : rows.reduce((s, r) => s + r.periodic_cy_value, 0);
    const lyVal = isPct
      ? rows.reduce((s, r) => s + r.periodic_ly_value, 0) / (rows.length || 1)
      : rows.reduce((s, r) => s + r.periodic_ly_value, 0);
    const variance = cyVal - lyVal;

    const gbuName = entityName(entities, gbuId);
    chartData.push({
      label: gbuName.replace("Mars ", ""),
      value: parseFloat(cyVal.toFixed(1)),
    });
    tableRows.push({
      GBU: gbuName,
      [`CY ${acctName}`]: isPct ? `${cyVal.toFixed(1)}%` : `$${cyVal.toFixed(1)}M`,
      [`LY ${acctName}`]: isPct ? `${lyVal.toFixed(1)}%` : `$${lyVal.toFixed(1)}M`,
      Change: isPct
        ? `${variance >= 0 ? "+" : ""}${(variance * 100).toFixed(0)} bps`
        : `${variance >= 0 ? "+" : ""}$${variance.toFixed(1)}M`,
    });
  }

  const periodLabel = period.replace("_", " ");
  return {
    text: `${acctName} comparison across GBUs for ${periodLabel}:`,
    intent: "comparison",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: Object.keys(tableRows[0] ?? {}),
      rows: tableRows,
    },
  };
}

function handleCompetitorComparison(): QueryResponse {
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
    "P/E Ratio": c.pe_ratio.toFixed(1),
    "Market Cap": `$${c.market_cap_bn.toFixed(1)}B`,
  }));

  return {
    text: "Competitor benchmark comparison (latest available data):",
    intent: "comparison",
    data: {
      type: "chart",
      chartType: "bar",
      chartData,
      columns: Object.keys(tableRows[0]),
      rows: tableRows,
    },
  };
}

function handleTrend(
  entityId: string | null,
  accountCodes: string[],
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[],
): QueryResponse {
  const eid = entityId ?? "MARS";
  const eName = entityName(entities, eid);
  const code = accountCodes.length > 0 ? accountCodes[0] : "S100010";
  const isPct = isPercentageAccount(code);
  const acctName = accountName(accounts, code);

  const periods = [
    "P01_2025", "P02_2025", "P03_2025", "P04_2025",
    "P05_2025", "P06_2025", "P07_2025", "P08_2025",
    "P09_2025", "P10_2025", "P11_2025", "P12_2025",
  ];

  const chartData: { label: string; value: number }[] = [];
  const tableRows: Record<string, unknown>[] = [];

  for (const p of periods) {
    const row = financialData.find(
      (r) => r.entity_id === eid && r.account_code === code && r.date_id === p
    );
    if (!row) continue;
    const cyVal = row.periodic_cy_value;
    const lyVal = row.periodic_ly_value;
    const label = p.replace("_2025", "");
    chartData.push({ label, value: parseFloat(cyVal.toFixed(1)) });
    tableRows.push({
      Period: label,
      "CY Value": isPct ? `${cyVal.toFixed(1)}%` : `$${cyVal.toFixed(1)}M`,
      "LY Value": isPct ? `${lyVal.toFixed(1)}%` : `$${lyVal.toFixed(1)}M`,
      "YoY Change": `${((cyVal - lyVal) / Math.abs(lyVal || 1) * 100).toFixed(1)}%`,
    });
  }

  return {
    text: `${acctName} trend for ${eName} across 2025 periods:`,
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

function handleReport(
  entityId: string | null,
  period: string,
  entities: Entity[],
  accounts: Account[],
  financialData: FinancialRow[],
  replanData: ReplanRow[],
  query: string,
): QueryResponse {
  const q = query.toLowerCase();
  const eid = entityId ?? "MARS";
  const eName = entityName(entities, eid);
  const periodLabel = period.replace("_", " ");

  // Budget variance / replan report
  if (/\b(budget|variance|replan)\b/.test(q)) {
    const rRows = replanData.filter(
      (r) => r.entity_id === eid && r.date_id === period
    );
    if (rRows.length === 0) {
      return {
        text: `No replan data found for ${eName} in ${periodLabel}.`,
        intent: "report",
      };
    }
    const tableRows = rRows.map((r) => {
      const acctName = accountName(accounts, r.account_code);
      return {
        Account: acctName,
        "Actual ($M)": `$${r.actual_usd.toFixed(1)}M`,
        "Replan ($M)": `$${r.replan_usd.toFixed(1)}M`,
        "Variance ($M)": `${r.variance >= 0 ? "+" : ""}$${r.variance.toFixed(1)}M`,
        "Variance (%)": `${r.variance_pct >= 0 ? "+" : ""}${r.variance_pct.toFixed(1)}%`,
        Status: r.variance_pct >= 0 ? "Favorable" : "Unfavorable",
      };
    });
    const chartData = rRows.map((r) => ({
      label: accountName(accounts, r.account_code),
      value: r.variance,
    }));
    return {
      text: `${eName} Budget Variance Report for ${periodLabel}:`,
      intent: "report",
      data: {
        type: "chart",
        chartType: "bar",
        chartData,
        columns: ["Account", "Actual ($M)", "Replan ($M)", "Variance ($M)", "Variance (%)", "Status"],
        rows: tableRows,
      },
    };
  }

  // Default: full P&L report
  const allCodes = accounts.map((a) => a.code);
  const rows = financialData.filter(
    (r) =>
      r.entity_id === eid &&
      allCodes.includes(r.account_code) &&
      r.date_id === period
  );

  const tableRows = accounts
    .filter((a) => rows.some((r) => r.account_code === a.code))
    .map((acct) => {
      const row = rows.find((r) => r.account_code === acct.code);
      if (!row) return null;
      const isPct = isPercentageAccount(acct.code);
      return {
        Account: acct.name,
        Category: acct.category,
        "CY Value": isPct ? `${row.periodic_cy_value.toFixed(1)}%` : `$${row.periodic_cy_value.toFixed(1)}M`,
        "LY Value": isPct ? `${row.periodic_ly_value.toFixed(1)}%` : `$${row.periodic_ly_value.toFixed(1)}M`,
        "Var (%)": `${(((row.periodic_cy_value - row.periodic_ly_value) / Math.abs(row.periodic_ly_value || 1)) * 100).toFixed(1)}%`,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  return {
    text: `Full P&L report for ${eName} - ${periodLabel} 2025. ${tableRows.length} line items:`,
    intent: "report",
    data: {
      type: "table",
      columns: ["Account", "Category", "CY Value", "LY Value", "Var (%)"],
      rows: tableRows,
    },
  };
}

// ---- Main handler ----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    const { query, context, history } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'query' field" },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // CI query routing — redirect competitor queries to CI module
    // -----------------------------------------------------------------------
    if (isCIQuery(query)) {
      return NextResponse.json({
        text: "This looks like a competitive intelligence query. Head over to the **Competitive Intelligence** page for live competitor data, SWOT analysis, earnings transcripts, and benchmarking. You can find it in the sidebar under CI.",
        intent: "ci_redirect",
      });
    }

    // -----------------------------------------------------------------------
    // LLM-first path: if ANTHROPIC_API_KEY is configured, use the
    // Anthropic-powered query engine with 7 intents, AI narratives,
    // trend analysis, and ad-hoc SQL generation.
    // -----------------------------------------------------------------------
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Check for CI intent — route competitor queries through LLM engine
        const llmIntent = llmClassifyIntent(query);

        const llmResponse = await processLLMQuery(query, {
          entity: context?.entity ?? undefined,
          period: context?.period ?? undefined,
        });

        // If LLM returned a valid response, use it
        if (llmResponse && llmResponse.text) {
          return NextResponse.json(llmResponse);
        }
      } catch (llmError) {
        // LLM failed — fall through to regex-based logic
        console.warn("[/api/query] LLM query failed, falling back to regex:", llmError);
      }
    }

    // -----------------------------------------------------------------------
    // Regex fallback: original intent classification and handlers
    // -----------------------------------------------------------------------

    // Load simulated data
    const entities = generateEntities();
    const accounts = generateAccounts();
    const financialData = generateFinancialData();
    const replanData = generateReplanData();

    // Derive context from history if available
    let derivedEntity = context?.entity ?? null;
    let derivedPeriod = context?.period ?? null;
    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user") {
          if (!derivedEntity) {
            derivedEntity = parseEntity(msg.content) ?? null;
          }
          if (!derivedPeriod) {
            derivedPeriod = parsePeriod(msg.content, undefined) ?? null;
          }
        }
      }
    }

    const intent = classifyIntent(query);
    const entityId = parseEntity(query, derivedEntity ?? undefined);
    const period = parsePeriod(query, derivedPeriod ?? undefined) ?? "P06_2025";
    const accountCodes = parseAccounts(query);

    let response: QueryResponse;

    switch (intent) {
      case "comparison":
        response = handleComparison(
          entityId, period, accountCodes,
          entities, accounts, financialData, query,
        );
        break;
      case "trend":
        response = handleTrend(
          entityId, accountCodes,
          entities, accounts, financialData,
        );
        break;
      case "report":
        response = handleReport(
          entityId, period,
          entities, accounts, financialData, replanData, query,
        );
        break;
      default:
        response = handleLookup(
          entityId, period, accountCodes,
          entities, accounts, financialData, replanData,
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/query] Error:", error);
    return NextResponse.json(
      {
        text: "An error occurred processing your query. Please try again.",
        intent: "error",
      },
      { status: 500 }
    );
  }
}
