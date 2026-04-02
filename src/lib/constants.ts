export const ENTITIES = [
  "RC France", "RC Germany", "RC UK", "RC Italy", "RC Spain", "RC Nordics",
  "RC USA East", "RC USA West", "RC Canada",
  "RC Japan", "RC Australia", "RC China", "RC Brazil", "RC Mexico", "RC Southeast Asia",
  "MPC Canada East", "MPC US Central", "MPC US Northeast", "MPC US Southeast", "MPC US West",
] as const;

export const ENTITY_HIERARCHY: Record<string, string[]> = {
  "Mars Inc": ["Petcare"],
  "Petcare": ["Royal Canin", "Mars Petcare"],
  "Royal Canin": ["RC Europe", "RC North America", "RC Asia Pacific"],
  "RC Europe": ["RC France", "RC Germany", "RC UK", "RC Italy", "RC Spain", "RC Nordics"],
  "RC North America": ["RC USA East", "RC USA West", "RC Canada"],
  "RC Asia Pacific": ["RC Japan", "RC Australia", "RC China", "RC Brazil", "RC Mexico", "RC Southeast Asia"],
  "Mars Petcare": ["MPC Canada East", "MPC US Central", "MPC US Northeast", "MPC US Southeast", "MPC US West"],
};

export const PARENT_ENTITIES = ["Royal Canin", "RC Europe", "RC North America", "RC Asia Pacific", "Mars Petcare", "Petcare"] as const;

export function getChildEntities(parent: string): string[] {
  const children = ENTITY_HIERARCHY[parent];
  if (!children) return [];
  const leaves: string[] = [];
  for (const child of children) {
    if (ENTITY_HIERARCHY[child]) {
      leaves.push(...getChildEntities(child));
    } else {
      leaves.push(child);
    }
  }
  return leaves;
}

export const ACCOUNTS = [
  "Organic Growth", "Organic Growth %", "MAC Shape", "Net Revenue",
  "Gross Profit", "A&CP Total", "Advertising", "Media Spend",
  "Cost of Goods Sold", "Material Costs", "Distribution Costs",
  "Total Growth", "Price", "Volume", "Mix",
] as const;

export const ACCOUNT_ALIASES: Record<string, string> = {
  "og": "Organic Growth",
  "organic growth": "Organic Growth",
  "og%": "Organic Growth %",
  "mac": "MAC Shape",
  "mac shape": "MAC Shape",
  "revenue": "Net Revenue",
  "net revenue": "Net Revenue",
  "gross profit": "Gross Profit",
  "gp": "Gross Profit",
  "acp": "A&CP Total",
  "a&cp": "A&CP Total",
  "advertising": "Advertising",
  "media": "Media Spend",
  "media spend": "Media Spend",
  "cogs": "Cost of Goods Sold",
  "cost of goods": "Cost of Goods Sold",
  "material": "Material Costs",
  "material costs": "Material Costs",
  "distribution": "Distribution Costs",
  "total growth": "Total Growth",
  "price": "Price",
  "volume": "Volume",
  "mix": "Mix",
};

export const PERIODS = Array.from({ length: 13 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`);

export const FMP_COMPETITORS = ["NSRGY", "MDLZ", "HSY", "CL", "SJM", "GIS", "PG", "UL", "KHC", "K"] as const;

export const DEFAULT_PROMPTS = [
  "Show me RC Japan P13 results",
  "Compare all RC Europe entities",
  "What is the Organic Growth trend for RC France?",
  "Show RC North America MAC Shape",
] as const;

export const MORE_PROMPTS = [
  "RC Germany P13 full P&L",
  "How is RC UK performing?",
  "Show all entities for latest period",
  "RC Canada Net Revenue trend",
  "Compare Royal Canin vs Mars Petcare",
  "Show Gross Profit for RC Nordics",
  "MPC US West P13 summary",
  "RC Australia A&CP breakdown",
  "Show Volume and Price for RC Spain",
  "RC Brazil Distribution Costs",
  "Show P13 results for RC Asia Pacific",
  "MPC US Central Organic Growth trend",
] as const;

export const SUGGESTED_PROMPTS = [...DEFAULT_PROMPTS, ...MORE_PROMPTS] as const;
