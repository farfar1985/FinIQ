// ---------------------------------------------------------------------------
// Simulated data generators for Amira FinIQ (Mars, Incorporated)
// All generators use a seeded PRNG (mulberry32) so output is deterministic.
// Results are cached at module level so every call returns the same reference,
// eliminating hydration mismatches caused by PRNG state divergence.
// ---------------------------------------------------------------------------

// ---- Seeded PRNG (mulberry32) ---------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

/** Random float in [min, max) */
function rf(min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Random int in [min, max] */
function ri(min: number, max: number): number {
  return Math.floor(rf(min, max + 1));
}

/** Round to n decimal places */
function round(v: number, n = 2): number {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[ri(0, arr.length - 1)];
}

// ---- Cache helper: run each generator exactly once -------------------------
function once<T>(fn: () => T): () => T {
  let result: T | undefined;
  let ran = false;
  return () => {
    if (!ran) { result = fn(); ran = true; }
    return result as T;
  };
}

// ---- Entity hierarchy -----------------------------------------------------

export interface Entity {
  id: string;
  name: string;
  alias: string;
  parent_id: string | null;
  level: "Corporate" | "GBU" | "Division" | "Region" | "Sub-unit";
}

function _generateEntities(): Entity[] {
  const entities: Entity[] = [];

  // Corporate root
  entities.push({
    id: "MARS",
    name: "Mars, Incorporated",
    alias: "MARS",
    parent_id: null,
    level: "Corporate",
  });

  // GBUs
  const gbus: { id: string; name: string; alias: string }[] = [
    { id: "GBU_PET", name: "Mars Petcare", alias: "PETCARE" },
    { id: "GBU_SNK", name: "Mars Snacking", alias: "SNACKING" },
    { id: "GBU_FN", name: "Food & Nutrition", alias: "FOOD_NUTR" },
    { id: "GBU_MW", name: "Mars Wrigley", alias: "WRIGLEY" },
  ];

  for (const g of gbus) {
    entities.push({ ...g, parent_id: "MARS", level: "GBU" });
  }

  // Divisions per GBU
  const divisionMap: Record<string, { id: string; name: string; alias: string }[]> = {
    GBU_PET: [
      { id: "DIV_PET_NA", name: "Petcare North America", alias: "PET_NA" },
      { id: "DIV_PET_EU", name: "Petcare Europe", alias: "PET_EU" },
    ],
    GBU_SNK: [
      { id: "DIV_SNK_NA", name: "Snacking North America", alias: "SNK_NA" },
      { id: "DIV_SNK_EU", name: "Snacking Europe", alias: "SNK_EU" },
    ],
    GBU_FN: [
      { id: "DIV_FN_NA", name: "Food & Nutrition NA", alias: "FN_NA" },
      { id: "DIV_FN_APAC", name: "Food & Nutrition APAC", alias: "FN_APAC" },
    ],
    GBU_MW: [
      { id: "DIV_MW_NA", name: "Wrigley North America", alias: "MW_NA" },
      { id: "DIV_MW_INTL", name: "Wrigley International", alias: "MW_INTL" },
    ],
  };

  for (const [gbuId, divs] of Object.entries(divisionMap)) {
    for (const d of divs) {
      entities.push({ ...d, parent_id: gbuId, level: "Division" });
    }
  }

  // Regions / Sub-units
  const regionMap: Record<string, { id: string; name: string; alias: string; level: "Region" | "Sub-unit" }[]> = {
    DIV_PET_NA: [
      { id: "REG_PET_US", name: "Petcare US", alias: "PET_US", level: "Region" },
      { id: "REG_PET_CA", name: "Petcare Canada", alias: "PET_CA", level: "Region" },
      { id: "SUB_PET_ROYAL", name: "Royal Canin NA", alias: "ROYAL_NA", level: "Sub-unit" },
    ],
    DIV_PET_EU: [
      { id: "REG_PET_UK", name: "Petcare UK", alias: "PET_UK", level: "Region" },
      { id: "REG_PET_DE", name: "Petcare Germany", alias: "PET_DE", level: "Region" },
    ],
    DIV_SNK_NA: [
      { id: "REG_SNK_US", name: "Snacking US", alias: "SNK_US", level: "Region" },
      { id: "SUB_SNK_CHOC", name: "Chocolate NA", alias: "CHOC_NA", level: "Sub-unit" },
    ],
    DIV_SNK_EU: [
      { id: "REG_SNK_UK", name: "Snacking UK", alias: "SNK_UK", level: "Region" },
      { id: "REG_SNK_DE", name: "Snacking Germany", alias: "SNK_DE", level: "Region" },
    ],
    DIV_FN_NA: [
      { id: "REG_FN_US", name: "Food & Nutrition US", alias: "FN_US", level: "Region" },
      { id: "SUB_FN_RICE", name: "Ben's Original NA", alias: "BENS_NA", level: "Sub-unit" },
    ],
    DIV_FN_APAC: [
      { id: "REG_FN_AU", name: "Food & Nutrition Australia", alias: "FN_AU", level: "Region" },
      { id: "REG_FN_CN", name: "Food & Nutrition China", alias: "FN_CN", level: "Region" },
    ],
    DIV_MW_NA: [
      { id: "REG_MW_US", name: "Wrigley US", alias: "MW_US", level: "Region" },
      { id: "SUB_MW_GUM", name: "Gum & Mints NA", alias: "GUM_NA", level: "Sub-unit" },
    ],
    DIV_MW_INTL: [
      { id: "REG_MW_EU", name: "Wrigley Europe", alias: "MW_EU", level: "Region" },
      { id: "REG_MW_APAC", name: "Wrigley APAC", alias: "MW_APAC", level: "Region" },
    ],
  };

  for (const [divId, regions] of Object.entries(regionMap)) {
    for (const r of regions) {
      entities.push({ id: r.id, name: r.name, alias: r.alias, parent_id: divId, level: r.level });
    }
  }

  return entities;
}

// ---- Account structure ----------------------------------------------------

export interface Account {
  id: string;
  code: string;
  name: string;
  formula: string | null;
  category: "Revenue" | "Cost" | "Margin" | "Overhead" | "Cash Flow";
  sort_order: number;
}

function _generateAccounts(): Account[] {
  return [
    { id: "A01", code: "S900083", name: "Organic Growth", formula: "(CY Revenue - LY Revenue) / LY Revenue", category: "Revenue", sort_order: 1 },
    { id: "A02", code: "S100010", name: "Net Revenue", formula: null, category: "Revenue", sort_order: 2 },
    { id: "A03", code: "S100020", name: "Gross Profit", formula: "Net Revenue - COGS", category: "Margin", sort_order: 3 },
    { id: "A04", code: "S100030", name: "COGS", formula: null, category: "Cost", sort_order: 4 },
    { id: "A05", code: "S200010", name: "MAC", formula: "Gross Profit - Direct Costs", category: "Margin", sort_order: 5 },
    { id: "A06", code: "S200020", name: "A&CP", formula: null, category: "Cost", sort_order: 6 },
    { id: "A07", code: "S200030", name: "Trade Spend", formula: null, category: "Cost", sort_order: 7 },
    { id: "A08", code: "S300010", name: "CE", formula: "MAC - Controllable Overhead", category: "Margin", sort_order: 8 },
    { id: "A09", code: "S300020", name: "Controllable Overhead", formula: null, category: "Overhead", sort_order: 9 },
    { id: "A10", code: "S300030", name: "SG&A", formula: null, category: "Overhead", sort_order: 10 },
    { id: "A11", code: "S400010", name: "Operating Profit", formula: "CE - Uncontrollable Costs", category: "Margin", sort_order: 11 },
    { id: "A12", code: "S400020", name: "Depreciation & Amortization", formula: null, category: "Overhead", sort_order: 12 },
    { id: "A13", code: "S500010", name: "NCFO", formula: "Operating Profit + D&A - CapEx - WC Change", category: "Cash Flow", sort_order: 13 },
    { id: "A14", code: "S500020", name: "Capital Expenditures", formula: null, category: "Cash Flow", sort_order: 14 },
    { id: "A15", code: "S500030", name: "Working Capital Change", formula: null, category: "Cash Flow", sort_order: 15 },
    { id: "A16", code: "S600010", name: "EBITDA", formula: "Operating Profit + D&A", category: "Margin", sort_order: 16 },
    { id: "A17", code: "S600020", name: "Net Income", formula: null, category: "Margin", sort_order: 17 },
    { id: "A18", code: "S700010", name: "Volume", formula: null, category: "Revenue", sort_order: 18 },
    { id: "A19", code: "S700020", name: "Price/Mix", formula: null, category: "Revenue", sort_order: 19 },
    { id: "A20", code: "S700030", name: "FX Impact", formula: null, category: "Revenue", sort_order: 20 },
  ];
}

// ---- Financial fact data --------------------------------------------------

export interface FinancialRow {
  entity_id: string;
  account_code: string;
  date_id: string;
  ytd_ly_value: number;
  ytd_cy_value: number;
  periodic_ly_value: number;
  periodic_cy_value: number;
}

const PERIODS = [
  "P01_2025", "P02_2025", "P03_2025", "P04_2025",
  "P05_2025", "P06_2025", "P07_2025", "P08_2025",
  "P09_2025", "P10_2025", "P11_2025", "P12_2025",
];

/**
 * Generates P&L financial data rows for every entity + account + period.
 * Revenue figures are in millions USD. Margin / ratio accounts use percentages.
 */
function _generateFinancialData(): FinancialRow[] {
  const entities = _generateEntities();
  const accounts = _generateAccounts();
  const rows: FinancialRow[] = [];

  // Base revenue scale by entity level (in $M)
  const levelScale: Record<string, number> = {
    Corporate: 50000,
    GBU: 12000,
    Division: 5000,
    Region: 2000,
    "Sub-unit": 800,
  };

  for (const entity of entities) {
    const baseRev = levelScale[entity.level] ?? 1000;

    for (const period of PERIODS) {
      const pIdx = PERIODS.indexOf(period) + 1;
      const ytdMultiplier = pIdx / 12;

      for (const acct of accounts) {
        let periodicLY: number;
        let periodicCY: number;

        switch (acct.category) {
          case "Revenue":
            if (acct.code === "S900083") {
              // Organic Growth %
              periodicLY = round(rf(2.0, 6.0), 1);
              periodicCY = round(rf(2.5, 7.5), 1);
            } else if (acct.code === "S700010") {
              // Volume (thousands of units)
              periodicLY = round(rf(baseRev * 0.8, baseRev * 1.2) / 12);
              periodicCY = round(periodicLY * rf(0.97, 1.06));
            } else if (acct.code === "S700020") {
              // Price/Mix %
              periodicLY = round(rf(1.0, 4.0), 1);
              periodicCY = round(rf(1.5, 5.0), 1);
            } else if (acct.code === "S700030") {
              // FX Impact %
              periodicLY = round(rf(-3.0, 1.0), 1);
              periodicCY = round(rf(-2.5, 1.5), 1);
            } else {
              // Net Revenue
              periodicLY = round(baseRev / 12 * rf(0.9, 1.1));
              periodicCY = round(periodicLY * rf(1.02, 1.08));
            }
            break;

          case "Cost":
            periodicLY = round(baseRev / 12 * rf(0.15, 0.35));
            periodicCY = round(periodicLY * rf(0.98, 1.05));
            break;

          case "Margin":
            if (acct.code === "S200010") {
              // MAC
              periodicLY = round(baseRev / 12 * rf(0.25, 0.40));
              periodicCY = round(periodicLY * rf(1.01, 1.07));
            } else if (acct.code === "S300010") {
              // CE
              periodicLY = round(baseRev / 12 * rf(0.12, 0.22));
              periodicCY = round(periodicLY * rf(1.00, 1.06));
            } else {
              periodicLY = round(baseRev / 12 * rf(0.10, 0.30));
              periodicCY = round(periodicLY * rf(1.00, 1.08));
            }
            break;

          case "Overhead":
            periodicLY = round(baseRev / 12 * rf(0.05, 0.12));
            periodicCY = round(periodicLY * rf(0.97, 1.03));
            break;

          case "Cash Flow":
            if (acct.code === "S500010") {
              // NCFO
              periodicLY = round(baseRev / 12 * rf(0.08, 0.18));
              periodicCY = round(periodicLY * rf(1.01, 1.10));
            } else {
              periodicLY = round(baseRev / 12 * rf(0.03, 0.08));
              periodicCY = round(periodicLY * rf(0.95, 1.05));
            }
            break;

          default:
            periodicLY = round(baseRev / 12 * rf(0.05, 0.15));
            periodicCY = round(periodicLY * rf(0.98, 1.04));
        }

        rows.push({
          entity_id: entity.id,
          account_code: acct.code,
          date_id: period,
          ytd_ly_value: round(periodicLY * ytdMultiplier * 12),
          ytd_cy_value: round(periodicCY * ytdMultiplier * 12),
          periodic_ly_value: periodicLY,
          periodic_cy_value: periodicCY,
        });
      }
    }
  }

  return rows;
}

// ---- Replan / Budget data -------------------------------------------------

export interface ReplanRow {
  entity_id: string;
  account_code: string;
  date_id: string;
  actual_usd: number;
  replan_usd: number;
  variance: number;
  variance_pct: number;
}

function _generateReplanData(): ReplanRow[] {
  const entities = _generateEntities();
  const accounts = _generateAccounts().filter((a) =>
    ["S100010", "S200010", "S300010", "S500010"].includes(a.code)
  );
  const rows: ReplanRow[] = [];

  const levelScale: Record<string, number> = {
    Corporate: 50000,
    GBU: 12000,
    Division: 5000,
    Region: 2000,
    "Sub-unit": 800,
  };

  for (const entity of entities) {
    const base = levelScale[entity.level] ?? 1000;
    for (const acct of accounts) {
      for (const period of PERIODS) {
        const replan = round(base / 12 * rf(0.85, 1.15));
        // Actual is 90-110% of replan
        const actual = round(replan * rf(0.90, 1.10));
        const variance = round(actual - replan);
        const variancePct = round((variance / Math.abs(replan)) * 100, 1);

        rows.push({
          entity_id: entity.id,
          account_code: acct.code,
          date_id: period,
          actual_usd: actual,
          replan_usd: replan,
          variance,
          variance_pct: variancePct,
        });
      }
    }
  }

  return rows;
}

// ---- Market ticker data ---------------------------------------------------

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

function _generateMarketData(): MarketTicker[] {
  const commodities: { symbol: string; name: string; base: number }[] = [
    { symbol: "CC1", name: "Cocoa", base: 8240 },
    { symbol: "SB1", name: "Sugar #11", base: 19.45 },
    { symbol: "FCPO", name: "Palm Oil", base: 3920 },
    { symbol: "W_1", name: "Wheat", base: 582 },
    { symbol: "C_1", name: "Corn", base: 448 },
    { symbol: "NG1", name: "Natural Gas", base: 2.87 },
    { symbol: "KC1", name: "Coffee", base: 324.5 },
    { symbol: "CT1", name: "Cotton", base: 78.2 },
    { symbol: "BO1", name: "Soybean Oil", base: 42.6 },
    { symbol: "LC1", name: "Live Cattle", base: 198.4 },
    { symbol: "MILK", name: "Class III Milk", base: 18.75 },
    { symbol: "CL1", name: "Crude Oil WTI", base: 72.8 },
    { symbol: "PKG", name: "Packaging Index", base: 112.3 },
    { symbol: "EUR/USD", name: "Euro / Dollar", base: 1.084 },
    { symbol: "GBP/USD", name: "Pound / Dollar", base: 1.271 },
    { symbol: "BRL/USD", name: "Real / Dollar", base: 0.196 },
  ];

  return commodities.map((c) => {
    const changePct = round(rf(-3.5, 3.5), 2);
    const change = round(c.base * changePct / 100, c.base < 10 ? 4 : 2);
    return {
      symbol: c.symbol,
      name: c.name,
      price: round(c.base + change, c.base < 10 ? 4 : 2),
      change,
      changePercent: changePct,
    };
  });
}

// ---- Job board data -------------------------------------------------------

export interface Job {
  id: string;
  title: string;
  type: "PES" | "CI" | "Forecast" | "Ad-Hoc";
  status: "queued" | "processing" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  requestor: string;
  created_at: string;
  completed_at: string | null;
  sla_target_minutes: number;
  agent: string;
}

function _generateJobs(): Job[] {
  const types: Job["type"][] = ["PES", "CI", "Forecast", "Ad-Hoc"];
  const statuses: Job["status"][] = ["queued", "processing", "completed", "failed"];
  const priorities: Job["priority"][] = ["critical", "high", "medium", "low"];
  const requestors = [
    "Sarah.Chen@mars.com",
    "James.Wilson@mars.com",
    "Priya.Sharma@mars.com",
    "Michael.Brown@mars.com",
    "Emma.Taylor@mars.com",
    "Carlos.Garcia@mars.com",
    "Lisa.Wang@mars.com",
  ];
  const agents = [
    "Amira PES Agent",
    "Amira CI Agent",
    "Amira Forecast Agent",
    "Amira Planner Agent",
    "Amira Insight Agent",
  ];
  const titles = [
    "Petcare NA P06 PES Package",
    "CI Deep-Dive: Cocoa Price Spike Impact",
    "Snacking EU Q3 Forecast Refresh",
    "Ad-Hoc: Mars Wrigley Gum Margin Analysis",
    "Food & Nutrition APAC Replan Variance",
    "Full P&L Consolidation - Corporate",
    "NCFO Waterfall: Petcare Europe",
    "Competitor Benchmark: Nestle vs Petcare",
    "A&CP Efficiency Analysis - Snacking NA",
    "Volume Bridge: Wrigley International",
    "CE Shape Analysis - All GBUs",
    "Organic Growth Decomposition Q2",
    "FX Impact Assessment - BRL Devaluation",
    "MAC Bridge: Food & Nutrition NA",
    "Working Capital Optimization - Corporate",
    "SG&A Trending: Mars Wrigley NA",
    "Forecast Accuracy Review P01-P06",
    "Trade Spend ROI: Chocolate NA",
    "Overhead Benchmark vs Industry",
    "EBITDA Margin Walk - Petcare Global",
  ];

  return titles.map((title, i) => {
    const type = types[i % types.length];
    // Bias toward completed
    const statusIdx = i < 3 ? 0 : i < 6 ? 1 : i < 16 ? 2 : 3;
    const status = statuses[statusIdx];
    const priority = priorities[i % priorities.length];
    const createdDate = new Date(2025, 5, ri(1, 28), ri(6, 20), ri(0, 59));
    const sla = priority === "critical" ? 15 : priority === "high" ? 30 : priority === "medium" ? 60 : 120;
    const durationMin = ri(5, sla + 20);
    const completedDate =
      status === "completed" || status === "failed"
        ? new Date(createdDate.getTime() + durationMin * 60000)
        : null;

    return {
      id: `JOB-${String(1000 + i)}`,
      title,
      type,
      status,
      priority,
      requestor: pick(requestors),
      created_at: createdDate.toISOString(),
      completed_at: completedDate ? completedDate.toISOString() : null,
      sla_target_minutes: sla,
      agent: pick(agents),
    };
  });
}

// ---- Competitor data ------------------------------------------------------

export interface CompetitorRow {
  company: string;
  ticker: string;
  revenue_bn: number;
  organic_growth_pct: number;
  gross_margin_pct: number;
  operating_margin_pct: number;
  ebitda_margin_pct: number;
  pe_ratio: number;
  market_cap_bn: number;
}

function _generateCompetitorData(): CompetitorRow[] {
  const competitors: { company: string; ticker: string; rev: number; og: [number, number]; gm: [number, number]; om: [number, number] }[] = [
    { company: "Nestle", ticker: "NESN.SW", rev: 98.5, og: [2.0, 5.0], gm: [46, 50], om: [15, 18] },
    { company: "Mondelez International", ticker: "MDLZ", rev: 36.4, og: [3.0, 7.0], gm: [37, 42], om: [14, 18] },
    { company: "The Hershey Company", ticker: "HSY", rev: 11.2, og: [1.5, 5.5], gm: [42, 48], om: [18, 24] },
    { company: "Colgate-Palmolive", ticker: "CL", rev: 20.1, og: [3.0, 7.0], gm: [58, 62], om: [18, 22] },
    { company: "Freshpet", ticker: "FRPT", rev: 0.97, og: [20.0, 30.0], gm: [38, 44], om: [-4, 4] },
    { company: "J.M. Smucker", ticker: "SJM", rev: 8.7, og: [0.5, 4.0], gm: [36, 40], om: [14, 18] },
  ];

  return competitors.map((c) => {
    const og = round(rf(c.og[0], c.og[1]), 1);
    const gm = round(rf(c.gm[0], c.gm[1]), 1);
    const om = round(rf(c.om[0], c.om[1]), 1);
    const ebitda = round(om + rf(3, 7), 1);
    const pe = round(rf(18, 35), 1);
    const mcap = round(c.rev * rf(2.0, 5.5), 1);

    return {
      company: c.company,
      ticker: c.ticker,
      revenue_bn: c.rev,
      organic_growth_pct: og,
      gross_margin_pct: gm,
      operating_margin_pct: om,
      ebitda_margin_pct: ebitda,
      pe_ratio: pe,
      market_cap_bn: mcap,
    };
  });
}

// ---- Time series data for charts ------------------------------------------

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Generate a time series of monthly data points going back `months` months.
 * Returns an array of { date (YYYY-MM-DD), value }.
 * The series trends upward with realistic noise.
 */
function _generateTimeSeriesData(months: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = new Date(2025, 5, 30); // Pin to P06 2025
  let value = rf(80, 120);

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = d.toISOString().slice(0, 10);
    // Slight upward drift + noise
    value = value * (1 + rf(-0.03, 0.05)) + rf(-2, 2);
    points.push({ date: dateStr, value: round(value, 2) });
  }

  return points;
}

// ---- KPI summary data -----------------------------------------------------

export interface KPISummary {
  id: string;
  label: string;
  value: number;
  unit: "%" | "$M" | "$B";
  change: number;
  trend: number[];
  status: "positive" | "neutral" | "negative";
}

function _generateKPISummary(): KPISummary[] {
  // Generate mini-sparkline data (12 points)
  function sparkline(base: number, volatility: number): number[] {
    const pts: number[] = [];
    let v = base;
    for (let i = 0; i < 12; i++) {
      v += rf(-volatility, volatility * 1.2);
      pts.push(round(v, 1));
    }
    return pts;
  }

  const ogVal = round(rf(3.5, 5.5), 1);
  const macVal = round(rf(32, 38), 1);
  const acpVal = round(rf(8, 12), 1);
  const ceVal = round(rf(14, 20), 1);
  const ohVal = round(rf(6, 10), 1);
  const ncfoVal = round(rf(4.5, 7.5), 1);

  return [
    {
      id: "og",
      label: "Organic Growth",
      value: ogVal,
      unit: "%",
      change: round(rf(-0.8, 1.2), 1),
      trend: sparkline(ogVal - 1, 0.4),
      status: ogVal >= 4.0 ? "positive" : ogVal >= 3.0 ? "neutral" : "negative",
    },
    {
      id: "mac",
      label: "MAC Shape",
      value: macVal,
      unit: "%",
      change: round(rf(-1.5, 2.0), 1),
      trend: sparkline(macVal - 2, 0.8),
      status: macVal >= 35 ? "positive" : macVal >= 30 ? "neutral" : "negative",
    },
    {
      id: "acp",
      label: "A&CP Shape",
      value: acpVal,
      unit: "%",
      change: round(rf(-0.5, 0.5), 1),
      trend: sparkline(acpVal, 0.3),
      status: acpVal <= 10 ? "positive" : acpVal <= 12 ? "neutral" : "negative",
    },
    {
      id: "ce",
      label: "CE Shape",
      value: ceVal,
      unit: "%",
      change: round(rf(-1.0, 1.5), 1),
      trend: sparkline(ceVal - 1, 0.6),
      status: ceVal >= 17 ? "positive" : ceVal >= 14 ? "neutral" : "negative",
    },
    {
      id: "oh",
      label: "Overhead Shape",
      value: ohVal,
      unit: "%",
      change: round(rf(-0.8, 0.3), 1),
      trend: sparkline(ohVal, 0.4),
      status: ohVal <= 7 ? "positive" : ohVal <= 9 ? "neutral" : "negative",
    },
    {
      id: "ncfo",
      label: "NCFO",
      value: ncfoVal,
      unit: "$B",
      change: round(rf(-0.3, 0.8), 1),
      trend: sparkline(ncfoVal - 0.5, 0.3),
      status: ncfoVal >= 6 ? "positive" : ncfoVal >= 5 ? "neutral" : "negative",
    },
  ];
}

// ---------------------------------------------------------------------------
// Cached public API
// Each generator runs exactly once at module load in a fixed order, ensuring
// the PRNG sequence is identical on server and client (no hydration mismatch).
// ---------------------------------------------------------------------------

export const generateEntities    = once(_generateEntities);
export const generateAccounts    = once(_generateAccounts);
export const generateFinancialData = once(_generateFinancialData);
export const generateReplanData  = once(_generateReplanData);
export const generateMarketData  = once(_generateMarketData);
export const generateJobs        = once(_generateJobs);
export const generateCompetitorData = once(_generateCompetitorData);
export const generateKPISummary  = once(_generateKPISummary);

// Time series is parameterized by month count, so cache common variants
const _tsCache = new Map<number, TimeSeriesPoint[]>();
export function generateTimeSeriesData(months: number): TimeSeriesPoint[] {
  if (!_tsCache.has(months)) {
    _tsCache.set(months, _generateTimeSeriesData(months));
  }
  return _tsCache.get(months)!;
}

// Eagerly initialize all cached generators in a fixed order so the PRNG
// state is consumed identically regardless of which component imports first.
generateEntities();
generateAccounts();
generateFinancialData();
generateReplanData();
generateMarketData();
generateJobs();
generateCompetitorData();
generateTimeSeriesData(12);
generateTimeSeriesData(24);
generateKPISummary();
