"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  generateEntities,
  generateAccounts,
  generateFinancialData,
  generateReplanData,
  type Entity,
  type FinancialRow,
} from "@/data/simulated";

// ---------------------------------------------------------------------------
// KPI definitions mapping account codes to narrative KPIs
// ---------------------------------------------------------------------------

interface KPIDef {
  key: string;
  label: string;
  metric: string;
  accountCode: string;
  unit: "%" | "$M" | "$B";
  /** For percentage KPIs, higher is better. For cost KPIs (A&CP, Overhead), lower is better. */
  higherIsBetter: boolean;
}

const KPI_DEFS: KPIDef[] = [
  { key: "og", label: "Organic Growth", metric: "OG%", accountCode: "S900083", unit: "%", higherIsBetter: true },
  { key: "mac", label: "MAC Shape", metric: "MAC%", accountCode: "S200010", unit: "$M", higherIsBetter: true },
  { key: "acp", label: "A&CP Efficiency", metric: "A&CP%", accountCode: "S200020", unit: "$M", higherIsBetter: false },
  { key: "ce", label: "CE Shape", metric: "CE%", accountCode: "S300010", unit: "$M", higherIsBetter: true },
  { key: "oh", label: "Overhead Shape", metric: "OH%", accountCode: "S300020", unit: "$M", higherIsBetter: false },
  { key: "ncfo", label: "NCFO", metric: "NCFO", accountCode: "S500010", unit: "$M", higherIsBetter: true },
];

// Map real Databricks RL_Alias names to simulated account codes
// so computeNarratives can match either format
const RL_ALIAS_TO_CODE: Record<string, string> = {
  "Growth % - 3rd Party Organic": "S900083",
  "Margin After Conversion": "S200010",
  "Advertising & Cons Promotion": "S200020",
  "Controllable Earnings": "S300010",
  "Controllable Overhead Costs": "S300020",
  "Net Cash From Operations": "S500010",
  "Net Sales Total": "S100010",
  "Net Sales 3rd Party": "S100010",
  "Gross Profit": "S100020",
  "COGS": "S100030",
  "Prime Costs": "S100030",
  "Depreciation": "S400020",
  "EBITDA": "S600010",
  "Net Income": "S600020",
  "Operating Profit": "S400010",
  "Trade Expenditures": "S700010",
  "Price Growth %": "S700020",
  "Growth % - 3rd P Volume": "S700010",
  "3rd Party Volume - Tonnes": "S800010",
  "Controllable Contribution": "S350010",
  "Controllable Profit": "S350020",
  "General & Admin Overheads": "S300030",
};

// ---------------------------------------------------------------------------
// Data-driven narrative generation
// ---------------------------------------------------------------------------

interface NarrativeCard {
  kpi: string;
  metric: string;
  metricValue: string;
  narrative: string;
  changePercent: number;
  ytdChangePercent: number;
  isPositive: boolean;
  top3: { name: string; value: string }[];
  bottom3: { name: string; value: string }[];
}

function getChildEntityIds(entities: Entity[], parentId: string): string[] {
  const children: string[] = [];
  const queue = [parentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const e of entities) {
      if (e.parent_id === current) {
        children.push(e.id);
        queue.push(e.id);
      }
    }
  }
  return children;
}

function getDirectChildIds(entities: Entity[], parentId: string): string[] {
  return entities.filter((e) => e.parent_id === parentId).map((e) => e.id);
}

function formatValue(value: number, unit: "%" | "$M" | "$B"): string {
  if (unit === "%") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }
  if (unit === "$B") {
    return `$${(value / 1000).toFixed(2)}B`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
}

function computeNarratives(
  entityId: string,
  entityName: string,
  period: string,
  entities: Entity[],
  financialData: FinancialRow[]
): NarrativeCard[] {
  const directChildIds = getDirectChildIds(entities, entityId);
  // If no direct children, try grandchildren via all descendants
  const childIdsForRanking = directChildIds.length > 0 ? directChildIds : getChildEntityIds(entities, entityId);
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  const cards: NarrativeCard[] = [];

  for (const kpiDef of KPI_DEFS) {
    // Get data for the selected entity and period
    const entityRow = financialData.find(
      (r) => r.entity_id === entityId && r.account_code === kpiDef.accountCode && r.date_id === period
    );

    if (!entityRow) {
      continue;
    }

    const periodicCY = entityRow.periodic_cy_value;
    const periodicLY = entityRow.periodic_ly_value;
    const ytdCY = entityRow.ytd_cy_value;
    const ytdLY = entityRow.ytd_ly_value;

    const periodicChange = periodicLY !== 0 ? ((periodicCY - periodicLY) / Math.abs(periodicLY)) * 100 : 0;
    const ytdChange = ytdLY !== 0 ? ((ytdCY - ytdLY) / Math.abs(ytdLY)) * 100 : 0;

    // Determine if performance is positive based on the KPI type
    const isPositive = kpiDef.higherIsBetter ? periodicChange > 0 : periodicChange < 0;

    // Compute child rankings by periodic change %
    const childRankings: { name: string; change: number }[] = [];
    for (const childId of childIdsForRanking) {
      const childRow = financialData.find(
        (r) => r.entity_id === childId && r.account_code === kpiDef.accountCode && r.date_id === period
      );
      if (childRow && childRow.periodic_ly_value !== 0) {
        const childChange =
          ((childRow.periodic_cy_value - childRow.periodic_ly_value) / Math.abs(childRow.periodic_ly_value)) * 100;
        const childEntity = entityMap.get(childId);
        childRankings.push({
          name: childEntity?.name ?? childId,
          change: childChange,
        });
      }
    }

    // Sort: for higherIsBetter KPIs, top = highest change; for lowerIsBetter, top = most negative change
    if (kpiDef.higherIsBetter) {
      childRankings.sort((a, b) => b.change - a.change);
    } else {
      childRankings.sort((a, b) => a.change - b.change);
    }

    const top3 = childRankings.slice(0, 3).map((c) => ({
      name: c.name,
      value: `${c.change >= 0 ? "+" : ""}${c.change.toFixed(1)}%`,
    }));

    const bottom3 = childRankings
      .slice(-3)
      .reverse()
      .map((c) => ({
        name: c.name,
        value: `${c.change >= 0 ? "+" : ""}${c.change.toFixed(1)}%`,
      }));

    // Build the metric value display
    let metricValue: string;
    if (kpiDef.unit === "%") {
      metricValue = `${periodicCY >= 0 ? "+" : ""}${periodicCY.toFixed(1)}%`;
    } else if (kpiDef.unit === "$B") {
      metricValue = `$${(periodicCY / 1000).toFixed(2)}B`;
    } else {
      metricValue = `$${periodicCY.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }

    // Build narrative text dynamically from the data
    const changeBps = Math.abs(periodicChange * 10).toFixed(0);
    const ytdChangeBps = Math.abs(ytdChange * 10).toFixed(0);
    const direction = periodicChange >= 0 ? "improvement" : "decline";
    const ytdDirection = ytdChange >= 0 ? "improvement" : "decline";
    const periodLabel = period.replace("_", " ");

    let narrative = `${kpiDef.label} for ${entityName} was ${metricValue} in ${periodLabel}, `;
    narrative += `a ${direction} of ${changeBps} bps vs prior year (periodic). `;
    narrative += `YTD, ${kpiDef.label} shows a ${ytdDirection} of ${ytdChangeBps} bps year-over-year `;
    narrative += `(CY: ${formatValue(ytdCY, kpiDef.unit)} vs LY: ${formatValue(ytdLY, kpiDef.unit)}). `;

    if (top3.length > 0) {
      narrative += `Top performers: ${top3.map((t) => `${t.name} (${t.value})`).join(", ")}. `;
    }
    if (bottom3.length > 0) {
      narrative += `Bottom performers: ${bottom3.map((b) => `${b.name} (${b.value})`).join(", ")}.`;
    }

    cards.push({
      kpi: kpiDef.label,
      metric: kpiDef.metric,
      metricValue,
      narrative,
      changePercent: periodicChange,
      ytdChangePercent: ytdChange,
      isPositive,
      top3,
      bottom3,
    });
  }

  return cards;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NarrativeCardComponent({ card }: { card: NarrativeCard }) {
  const valueColor = card.isPositive ? "text-emerald-400" : "text-red-400";
  const changeIcon = card.isPositive ? (
    <TrendingUp className="size-4" />
  ) : (
    <TrendingDown className="size-4" />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{card.kpi}</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={valueColor}>{changeIcon}</span>
            <span className={`font-mono text-lg font-semibold ${valueColor}`}>
              {card.metricValue}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">
          {card.metric} | YoY: {card.changePercent >= 0 ? "+" : ""}
          {card.changePercent.toFixed(1)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-muted-foreground">{card.narrative}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Top 3
            </p>
            <ul className="space-y-1">
              {card.top3.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="ml-2 font-mono text-emerald-400">{item.value}</span>
                </li>
              ))}
              {card.top3.length === 0 && (
                <li className="text-xs text-muted-foreground/60">No sub-units</li>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Bottom 3
            </p>
            <ul className="space-y-1">
              {card.bottom3.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="ml-2 font-mono text-red-400">{item.value}</span>
                </li>
              ))}
              {card.bottom3.length === 0 && (
                <li className="text-xs text-muted-foreground/60">No sub-units</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sortable KPI Data Table
// ---------------------------------------------------------------------------

type SortColumn =
  | "account"
  | "code"
  | "periodic_cy"
  | "periodic_ly"
  | "periodic_var"
  | "ytd_cy"
  | "ytd_ly"
  | "ytd_var";
type SortDirection = "asc" | "desc";

function KPIDataTable({
  entity,
  period,
}: {
  entity: string;
  period: string;
}) {
  const financialData = useMemo(() => generateFinancialData(), []);
  const accounts = useMemo(() => generateAccounts(), []);

  const [sortColumn, setSortColumn] = useState<SortColumn>("account");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn]
  );

  const filtered = useMemo(() => {
    const rows = accounts.map((acct) => {
      const row = financialData.find(
        (r) => r.entity_id === entity && r.account_code === acct.code && r.date_id === period
      );
      const periodicVar = row ? row.periodic_cy_value - row.periodic_ly_value : 0;
      const ytdVar = row ? row.ytd_cy_value - row.ytd_ly_value : 0;
      return { account: acct, data: row, periodicVar, ytdVar };
    });

    // Sort
    const dir = sortDirection === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortColumn) {
        case "account":
          return dir * a.account.name.localeCompare(b.account.name);
        case "code":
          return dir * a.account.code.localeCompare(b.account.code);
        case "periodic_cy":
          return dir * ((a.data?.periodic_cy_value ?? 0) - (b.data?.periodic_cy_value ?? 0));
        case "periodic_ly":
          return dir * ((a.data?.periodic_ly_value ?? 0) - (b.data?.periodic_ly_value ?? 0));
        case "periodic_var":
          return dir * (a.periodicVar - b.periodicVar);
        case "ytd_cy":
          return dir * ((a.data?.ytd_cy_value ?? 0) - (b.data?.ytd_cy_value ?? 0));
        case "ytd_ly":
          return dir * ((a.data?.ytd_ly_value ?? 0) - (b.data?.ytd_ly_value ?? 0));
        case "ytd_var":
          return dir * (a.ytdVar - b.ytdVar);
        default:
          return 0;
      }
    });

    return rows;
  }, [financialData, accounts, entity, period, sortColumn, sortDirection]);

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline size-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 inline size-3 text-primary" />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">KPI Detail</CardTitle>
        <CardDescription>Financial data for selected entity and period (click headers to sort)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("account")}
              >
                Account <SortIcon column="account" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("code")}
              >
                Code <SortIcon column="code" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("periodic_cy")}
              >
                Periodic CY <SortIcon column="periodic_cy" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("periodic_ly")}
              >
                Periodic LY <SortIcon column="periodic_ly" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("periodic_var")}
              >
                Var <SortIcon column="periodic_var" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("ytd_cy")}
              >
                YTD CY <SortIcon column="ytd_cy" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("ytd_ly")}
              >
                YTD LY <SortIcon column="ytd_ly" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("ytd_var")}
              >
                YTD Var <SortIcon column="ytd_var" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ account, data, periodicVar, ytdVar }) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {account.code}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {data ? data.periodic_cy_value.toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {data ? data.periodic_ly_value.toLocaleString() : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-mono ${
                    periodicVar >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {data ? (periodicVar >= 0 ? "+" : "") + periodicVar.toFixed(2) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {data ? data.ytd_cy_value.toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {data ? data.ytd_ly_value.toLocaleString() : "-"}
                </TableCell>
                <TableCell
                  className={`text-right font-mono ${
                    ytdVar >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {data ? (ytdVar >= 0 ? "+" : "") + ytdVar.toFixed(2) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Budget Variance Tab (unchanged)
// ---------------------------------------------------------------------------

function BudgetVarianceTab() {
  const replanDataSim = useMemo(() => generateReplanData(), []);
  const entities = useMemo(() => generateEntities(), []);
  const accounts = useMemo(() => generateAccounts(), []);

  const [selectedEntity, setSelectedEntity] = useState("MARS");
  const [selectedPeriod, setSelectedPeriod] = useState("P06_2025");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [realVariance, setRealVariance] = useState<Record<string, unknown>[] | null>(null);
  const [loadingVariance, setLoadingVariance] = useState(false);

  // Fetch real variance data when entity/period changes
  useEffect(() => {
    let cancelled = false;
    async function fetchVariance() {
      setLoadingVariance(true);
      try {
        const eName = entities.find((e) => e.id === selectedEntity)?.name || selectedEntity;
        const dateId = parseInt(selectedPeriod.replace("P", "").replace("_", ""));
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "variance", unitAlias: eName, dateId }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.source === "databricks" && json.varianceData?.length > 0) {
          setRealVariance(json.varianceData);
        } else {
          setRealVariance(null);
        }
      } catch {
        setRealVariance(null);
      } finally {
        if (!cancelled) setLoadingVariance(false);
      }
    }
    fetchVariance();
    return () => { cancelled = true; };
  }, [selectedEntity, selectedPeriod, entities]);

  const entityMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of entities) map[e.id] = e.name;
    return map;
  }, [entities]);

  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of accounts) map[a.code] = a.name;
    return map;
  }, [accounts]);

  const filtered = useMemo(() => {
    // If we have real data, map it to the expected shape
    if (realVariance && realVariance.length > 0) {
      return realVariance.map((r) => ({
        entity_id: selectedEntity,
        account_code: String(r.Reporting_Line_KPI || ""),
        date_id: selectedPeriod,
        actual_usd: (r.Actual_USD_Value as number) || 0,
        replan_usd: (r.Replan_USD_Value as number) || 0,
        variance: (r.Variance as number) || 0,
        variance_pct: ((r.Replan_USD_Value as number) || 0) !== 0
          ? (((r.Actual_USD_Value as number) || 0) - ((r.Replan_USD_Value as number) || 0)) / Math.abs((r.Replan_USD_Value as number)) * 100
          : 0,
      }));
    }
    // Fall back to simulated
    return replanDataSim.filter(
      (r) => r.entity_id === selectedEntity && r.date_id === selectedPeriod
    );
  }, [realVariance, replanDataSim, selectedEntity, selectedPeriod]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-56">
          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
          >
            {entities.map((e) => (
              <SelectOption key={e.id} value={e.id}>
                {e.name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {Array.from({ length: 13 }, (_, i) => {
              const p = `P${String(i + 1).padStart(2, "0")}_${selectedYear}`;
              return (
                <SelectOption key={p} value={p}>
                  P{String(i + 1).padStart(2, "0")}
                </SelectOption>
              );
            })}
          </Select>
        </div>
        <div className="w-28">
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <SelectOption value="2026">FY2026</SelectOption>
            <SelectOption value="2025">FY2025</SelectOption>
            <SelectOption value="2024">FY2024</SelectOption>
            <SelectOption value="2023">FY2023</SelectOption>
            <SelectOption value="2022">FY2022</SelectOption>
            <SelectOption value="2021">FY2021</SelectOption>
            <SelectOption value="2020">FY2020</SelectOption>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Budget Variance Analysis</CardTitle>
          <CardDescription>
            Actual vs Replan for {entityMap[selectedEntity] ?? selectedEntity} -{" "}
            {selectedPeriod.replace("_", " ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Actual ($M)</TableHead>
                <TableHead className="text-right">Replan ($M)</TableHead>
                <TableHead className="text-right">Variance ($M)</TableHead>
                <TableHead className="text-right">Variance (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {entityMap[row.entity_id] ?? row.entity_id}
                  </TableCell>
                  <TableCell>{accountMap[row.account_code] ?? row.account_code}</TableCell>
                  <TableCell className="text-right font-mono">
                    {row.actual_usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.replan_usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      row.variance >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {row.variance >= 0 ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      {row.variance >= 0 ? "+" : ""}
                      {row.variance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono ${
                      row.variance_pct >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.variance_pct >= 0 ? "+" : ""}
                    {row.variance_pct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No data available for selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReportsContent() {
  const [entities, setEntities] = useState(() => generateEntities());
  const [financialData, setFinancialData] = useState(() => generateFinancialData());
  const [realEntities, setRealEntities] = useState<string[]>([]);

  // Fetch real entity list from Databricks on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchRealEntities() {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "entities", dateId: 202503 }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.source === "databricks" && json.entities?.length > 0) {
          setRealEntities(json.entities);
        }
      } catch {
        // Keep simulated fallback
      }
    }
    fetchRealEntities();
    return () => { cancelled = true; };
  }, []);

  const [selectedEntity, setSelectedEntity] = useState("MARS");
  const [selectedPeriod, setSelectedPeriod] = useState("P06_2025");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedFormat, setSelectedFormat] = useState("summary");
  const [generated, setGenerated] = useState(false);
  const [realPLData, setRealPLData] = useState<FinancialRow[] | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Use real entity name from Databricks if available, else simulated
  const selectedEntityName = useMemo(() => {
    if (realEntities.length > 0 && realEntities.includes(selectedEntity)) {
      return selectedEntity; // Real entities use Unit_Alias as both ID and name
    }
    const e = entities.find((e) => e.id === selectedEntity);
    return e ? e.name : selectedEntity;
  }, [entities, realEntities, selectedEntity]);

  // When "Generate Report" is clicked, fetch real data from Databricks
  const handleGenerate = useCallback(async () => {
    setGenerated(true);
    setLoadingReport(true);
    try {
      const unitAlias = realEntities.includes(selectedEntity) ? selectedEntity : selectedEntityName;
      const yearNum = selectedYear;
      const periodNum = selectedPeriod.replace(`_${yearNum}`, "").replace("P", "");
      const dateId = parseInt(`${yearNum}${periodNum.padStart(2, "0")}`);

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pes", unitAlias, dateId }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();

      if (json.source === "databricks" && json.plData?.length > 0) {
        // Convert Databricks rows to FinancialRow shape for computeNarratives
        // Map RL_Alias to simulated account codes so narrative engine can match
        const converted: FinancialRow[] = json.plData.map((r: Record<string, unknown>) => {
          const rlAlias = r.RL_Alias as string;
          const accountCode = RL_ALIAS_TO_CODE[rlAlias] || rlAlias;
          return {
            entity_id: selectedEntity,
            account_code: accountCode,
            date_id: selectedPeriod,
            periodic_cy_value: (r.Periodic_CY_Value as number) || 0,
            periodic_ly_value: (r.Periodic_LY_Value as number) || 0,
            ytd_cy_value: (r.YTD_CY_Value as number) || 0,
            ytd_ly_value: (r.YTD_LY_Value as number) || 0,
          };
        });
        setRealPLData(converted);
      }
    } catch {
      // Fall back to simulated
      setRealPLData(null);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedEntity, selectedEntityName, selectedPeriod, selectedYear, realEntities]);

  const entityName = selectedEntityName;

  // Compute data-driven narratives — use real data if available, else simulated
  const narratives = useMemo(() => {
    if (!generated) return [];
    const dataToUse = realPLData ?? financialData;
    return computeNarratives(selectedEntity, entityName, selectedPeriod, entities, dataToUse);
  }, [generated, selectedEntity, entityName, selectedPeriod, entities, financialData, realPLData]);

  // Apply format filter: Summary=all, WWW=positive only, WNWW=negative only
  const filteredNarratives = useMemo(() => {
    switch (selectedFormat) {
      case "www":
        return narratives.filter((card) => card.isPositive);
      case "wnww":
        return narratives.filter((card) => !card.isPositive);
      default:
        return narratives;
    }
  }, [narratives, selectedFormat]);

  // Data freshness label
  const freshnessLabel = useMemo(() => {
    const pNum = selectedPeriod.split("_")[0];
    return `${pNum}, ${selectedYear}`;
  }, [selectedPeriod, selectedYear]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="size-5 text-primary" />
          Financial Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate period-end summaries, budget variance analyses, and custom financial reports.
        </p>
      </div>

      <Tabs defaultValue="pes">
        <TabsList>
          <TabsTrigger value="pes">Period End Summary</TabsTrigger>
          <TabsTrigger value="budget">Budget Variance</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        {/* ---- Period End Summary ---- */}
        <TabsContent value="pes">
          <div className="space-y-4">
            {/* Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Entity
                    </label>
                    <div className="w-52">
                      <Select
                        value={selectedEntity}
                        onChange={(e) => {
                          setSelectedEntity(e.target.value);
                          setGenerated(false);
                        }}
                      >
                        {realEntities.length > 0
                          ? realEntities.slice(0, 50).map((name) => (
                              <SelectOption key={name} value={name}>
                                {name}
                              </SelectOption>
                            ))
                          : entities
                              .filter((e) => ["Corporate", "GBU"].includes(e.level))
                              .map((e) => (
                                <SelectOption key={e.id} value={e.id}>
                                  {e.name}
                                </SelectOption>
                              ))}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Period
                    </label>
                    <div className="w-36">
                      <Select
                        value={selectedPeriod}
                        onChange={(e) => {
                          setSelectedPeriod(e.target.value);
                          setGenerated(false);
                        }}
                      >
                        {Array.from({ length: 13 }, (_, i) => {
                          const p = `P${String(i + 1).padStart(2, "0")}_${selectedYear}`;
                          return (
                            <SelectOption key={p} value={p}>
                              P{String(i + 1).padStart(2, "0")}
                            </SelectOption>
                          );
                        })}
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Year
                    </label>
                    <div className="w-28">
                      <Select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setGenerated(false);
                        }}
                      >
                        <SelectOption value="2026">FY2026</SelectOption>
                        <SelectOption value="2025">FY2025</SelectOption>
                        <SelectOption value="2024">FY2024</SelectOption>
                        <SelectOption value="2023">FY2023</SelectOption>
                        <SelectOption value="2022">FY2022</SelectOption>
                        <SelectOption value="2021">FY2021</SelectOption>
                        <SelectOption value="2020">FY2020</SelectOption>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Format
                    </label>
                    <div className="w-32">
                      <Select
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                      >
                        <SelectOption value="summary">Summary</SelectOption>
                        <SelectOption value="www">WWW</SelectOption>
                        <SelectOption value="wnww">WNWW</SelectOption>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleGenerate} disabled={loadingReport}>
                    {loadingReport ? "Fetching from Databricks..." : "Generate Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Narrative cards - shown after generate */}
            {generated && (
              <>
                {/* Data freshness indicator */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    Period End Summary: {entityName}
                  </h2>
                  <Badge variant="outline" className="gap-1.5">
                    <Clock className="size-3" />
                    Data as of {freshnessLabel}
                  </Badge>
                </div>

                {filteredNarratives.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredNarratives.map((card) => (
                      <NarrativeCardComponent key={card.kpi} card={card} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground">
                        No KPIs match the selected format filter (
                        {selectedFormat === "www" ? "positive changes only" : "negative changes only"}
                        ).
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* KPI detail table */}
                <KPIDataTable entity={selectedEntity} period={selectedPeriod} />
              </>
            )}

            {!generated && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Select parameters and click{" "}
                    <span className="font-medium text-foreground">Generate Report</span> to
                    view the Period End Summary.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ---- Budget Variance ---- */}
        <TabsContent value="budget">
          <BudgetVarianceTab />
        </TabsContent>

        {/* ---- Custom Reports ---- */}
        <TabsContent value="custom">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                <FileText className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">Custom Reports</h3>
              <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                Coming Soon. Custom report builder with drag-and-drop KPI selection,
                configurable layouts, and scheduled distribution will be available in the next
                release.
              </p>
              <Badge variant="secondary" className="mt-4">
                Q3 2025
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
