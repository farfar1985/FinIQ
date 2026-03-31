// ---------------------------------------------------------------------------
// Suggested Prompt Library — FR4.5, FR4.6, Appendix C (SRS v3.1)
// ---------------------------------------------------------------------------

export interface SuggestedPrompt {
  id: string;
  description: string;
  template: string;
  category: "bridge" | "margin" | "revenue" | "narrative" | "customer" | "cost";
  kpis: string[];
  tags: string[];
  runs: number;
  isActive: boolean;
  displayOrder: number;
}

// ---------------------------------------------------------------------------
// Prompt catalog — 18 prompts from Appendix C
// ---------------------------------------------------------------------------

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "SP-001",
    description: "MFG Conversion Costs bridge by Supply Segment",
    template:
      "for {unit}, give me a bridge for MFG CONVERSION COSTS broken by Supply Segment in {current_year} {current_period} ytd vs ly",
    category: "bridge",
    kpis: ["MFG Conversion Costs"],
    tags: ["bridge", "supply segment", "ytd", "vs ly"],
    runs: 142,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "SP-002",
    description: "A&CP bridge by Product Consolidation",
    template:
      "for {unit}, give me a bridge for Advertising & Cons Promotion broken by Product_Consolidation in {current_year} {current_period} ytd vs ly",
    category: "bridge",
    kpis: ["Advertising & Cons Promotion"],
    tags: ["bridge", "a&cp", "product consolidation", "ytd"],
    runs: 118,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "SP-003",
    description: "GSV 3rd Party bridge by Product Consolidation",
    template:
      "for {unit}, give me a bridge for GSV 3rd Pty broken by Product_Consolidation in {current_year} {current_period} ytd vs ly",
    category: "bridge",
    kpis: ["GSV 3rd Pty"],
    tags: ["bridge", "gsv", "third party", "product consolidation"],
    runs: 97,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "SP-004",
    description: "Prime/tonne trend vs previous year",
    template:
      "what is the prime/tonne trend across p1-{current_period} in {current_year} for {unit} and how does it compare to the previous year...",
    category: "margin",
    kpis: ["Prime/Tonne"],
    tags: ["trend", "prime costs", "tonne", "yoy"],
    runs: 205,
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "SP-005",
    description: "Narrative summary — unit-level performance",
    template:
      "Generate a narrative summary analysis for the {unit}, focusing on unit-level performance breakdown for {current_year}, YTD {current_period}...",
    category: "narrative",
    kpis: ["Net Sales", "MAC", "CE"],
    tags: ["narrative", "summary", "performance", "ytd"],
    runs: 310,
    isActive: true,
    displayOrder: 5,
  },
  {
    id: "SP-006",
    description: "Organic sales growth YTD",
    template:
      "For {unit}, what was the Organic sales growth for {current_period} ytd {current_year}",
    category: "revenue",
    kpis: ["Organic Sales Growth"],
    tags: ["organic growth", "revenue", "ytd"],
    runs: 276,
    isActive: true,
    displayOrder: 6,
  },
  {
    id: "SP-007",
    description: "Despatch volume by top 5 customers",
    template:
      "for {unit}, give me an analysis for DESPATCH VOLUME...broken by the top 5 customer...",
    category: "customer",
    kpis: ["Despatch Volume"],
    tags: ["customer", "volume", "top 5", "despatch"],
    runs: 88,
    isActive: true,
    displayOrder: 7,
  },
  {
    id: "SP-008",
    description: "Net Sales, MAC & MAC% — TY YTD vs LY",
    template:
      "for {unit}, what is the NET SALES TOTAL, margin after conversion, and mac% in this year ytd vs ly same periods",
    category: "margin",
    kpis: ["Net Sales Total", "Margin After Conversion", "MAC%"],
    tags: ["net sales", "mac", "mac%", "ytd", "vs ly"],
    runs: 193,
    isActive: true,
    displayOrder: 8,
  },
  {
    id: "SP-009",
    description: "MAC & MAC% quarterly vs Plan",
    template:
      "for {unit}, what is my MARGIN AFTER CONVERSION and mac% for the first {current_quarter} quarters in {current_year} and how does it compare vs plan?",
    category: "margin",
    kpis: ["Margin After Conversion", "MAC%"],
    tags: ["mac", "mac%", "quarterly", "vs plan"],
    runs: 154,
    isActive: true,
    displayOrder: 9,
  },
  {
    id: "SP-010",
    description: "MAC & MAC% quarterly vs LY",
    template:
      "for {unit}, what is my MARGIN AFTER CONVERSION and mac% for the first {current_quarter} quarters in {current_year} and how does it compare vs LY?",
    category: "margin",
    kpis: ["Margin After Conversion", "MAC%"],
    tags: ["mac", "mac%", "quarterly", "vs ly"],
    runs: 149,
    isActive: true,
    displayOrder: 10,
  },
  {
    id: "SP-011",
    description: "MAC%, Prime Costs/Tonne & Conversion Costs/Tonne Y/Y",
    template:
      "For {unit}, how have the MAC% and PRIME COSTS/Tonne and CONVERSION COSTS/Tonne changed Y/Y for YTD periods?",
    category: "margin",
    kpis: ["MAC%", "Prime Costs/Tonne", "Conversion Costs/Tonne"],
    tags: ["mac%", "prime costs", "conversion costs", "tonne", "yoy"],
    runs: 131,
    isActive: true,
    displayOrder: 11,
  },
  {
    id: "SP-012",
    description: "Net Sales growth by brand",
    template:
      "Generate a summary analysis of NET SALES TOTAL growth % and absolute by brand...",
    category: "revenue",
    kpis: ["Net Sales Total"],
    tags: ["net sales", "growth", "brand", "summary"],
    runs: 167,
    isActive: true,
    displayOrder: 12,
  },
  {
    id: "SP-013",
    description: "MAC% period trend",
    template:
      "For {unit}, give me the MAC% trend across {current_year} in p1-{current_period}...",
    category: "margin",
    kpis: ["MAC%"],
    tags: ["mac%", "trend", "periodic"],
    runs: 189,
    isActive: true,
    displayOrder: 13,
  },
  {
    id: "SP-014",
    description: "Narrative summary — unit performance breakdown",
    template:
      "Generate a narrative summary analysis for the {unit}, focusing on unit-level performance breakdown...",
    category: "narrative",
    kpis: ["Net Sales", "MAC", "CE", "Overheads"],
    tags: ["narrative", "summary", "performance", "breakdown"],
    runs: 221,
    isActive: true,
    displayOrder: 14,
  },
  {
    id: "SP-015",
    description: "%NS Overheads shape Y/Y by division",
    template:
      "How have the %NS Overheads shape changed Y/Y for each division during YTD periods in {unit}",
    category: "cost",
    kpis: ["%NS Overheads"],
    tags: ["overheads", "%ns", "yoy", "division"],
    runs: 76,
    isActive: true,
    displayOrder: 15,
  },
  {
    id: "SP-016",
    description: "Fastest-growing COGS components (3-year)",
    template:
      "For {unit}, what components of COGS have grown the fastest over the past 3 years...",
    category: "cost",
    kpis: ["COGS"],
    tags: ["cogs", "growth", "3-year", "components"],
    runs: 64,
    isActive: true,
    displayOrder: 16,
  },
  {
    id: "SP-017",
    description: "3rd Party Volume growth this period",
    template:
      "What was 3RD PARTY VOLUME - TONNES Growth this period for {unit}?",
    category: "revenue",
    kpis: ["3rd Party Volume"],
    tags: ["volume", "tonnes", "growth", "periodic"],
    runs: 112,
    isActive: true,
    displayOrder: 17,
  },
  {
    id: "SP-018",
    description: "Prime Costs by period (current year)",
    template:
      "Show me the Prime Costs of {unit} for each period of the current year",
    category: "cost",
    kpis: ["Prime Costs"],
    tags: ["prime costs", "periodic", "current year"],
    runs: 93,
    isActive: true,
    displayOrder: 18,
  },
];

// ---------------------------------------------------------------------------
// Variable resolution
// ---------------------------------------------------------------------------

export interface PromptContext {
  unit?: string;
}

/**
 * Replaces template variables with contextual values.
 *  - {unit}            -> context.unit or "MARS INC"
 *  - {current_year}    -> 2025
 *  - {current_period}  -> "P06"
 *  - {current_quarter} -> "2"
 */
export function resolveVariables(
  template: string,
  context: PromptContext,
): string {
  const unit = context.unit || "MARS INC";
  return template
    .replace(/\{unit\}/g, unit)
    .replace(/\{current_year\}/g, "2025")
    .replace(/\{current_period\}/g, "P06")
    .replace(/\{current_quarter\}/g, "2");
}

// ---------------------------------------------------------------------------
// Category grouping helper
// ---------------------------------------------------------------------------

export function getPromptsByCategory(): Record<string, SuggestedPrompt[]> {
  const grouped: Record<string, SuggestedPrompt[]> = {};
  for (const prompt of SUGGESTED_PROMPTS) {
    if (!prompt.isActive) continue;
    if (!grouped[prompt.category]) {
      grouped[prompt.category] = [];
    }
    grouped[prompt.category].push(prompt);
  }
  // Sort each group by displayOrder
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// All unique categories in display order
// ---------------------------------------------------------------------------

export const PROMPT_CATEGORIES = [
  "bridge",
  "margin",
  "revenue",
  "narrative",
  "customer",
  "cost",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

export const CATEGORY_META: Record<
  PromptCategory,
  { label: string; color: string }
> = {
  bridge: {
    label: "Bridge",
    color: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  },
  margin: {
    label: "Margin",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  },
  revenue: {
    label: "Revenue",
    color: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  },
  narrative: {
    label: "Narrative",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
  customer: {
    label: "Customer",
    color: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  },
  cost: {
    label: "Cost",
    color: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  },
};
