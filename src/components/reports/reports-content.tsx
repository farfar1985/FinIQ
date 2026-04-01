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
  realData,
}: {
  entity: string;
  period: string;
  realData?: FinancialRow[] | null;
}) {
  const financialData = realData && realData.length > 0 ? realData : generateFinancialData();
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
        // Build correct Date_ID: YYYYPP format (e.g., 202506 for FY2025 P06)
        const periodNum = selectedPeriod.match(/P(\d+)/)?.[1] || "06";
        const dateId = parseInt(`${selectedYear}${periodNum.padStart(2, "0")}`);
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
  }, [selectedEntity, selectedPeriod, selectedYear, entities]);

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
// ---------------------------------------------------------------------------
// Custom Report Builder (FR2.5)
// ---------------------------------------------------------------------------

const AVAILABLE_KPIS = [
  { code: "S900083", label: "Organic Growth", alias: "Growth % - 3rd Party Organic" },
  { code: "S100010", label: "Net Revenue", alias: "Net Sales Total" },
  { code: "S200010", label: "MAC", alias: "Margin After Conversion" },
  { code: "S200020", label: "A&CP", alias: "Advertising & Cons Promotion" },
  { code: "S300010", label: "CE", alias: "Controllable Earnings" },
  { code: "S300020", label: "Overhead", alias: "Controllable Overhead Costs" },
  { code: "S500010", label: "NCFO", alias: "Net Cash From Operations" },
  { code: "S100020", label: "Gross Profit", alias: "Gross Profit" },
  { code: "S600010", label: "EBITDA", alias: "EBITDA" },
  { code: "S400020", label: "Depreciation", alias: "Depreciation" },
];

function CustomReportBuilder() {
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(
    new Set(["S900083", "S100010", "S200010", "S300010", "S500010"])
  );
  const [reportEntity, setReportEntity] = useState("Mars Incorporated (r)");
  const [reportPeriods, setReportPeriods] = useState("202501,202502,202503");
  const [reportData, setReportData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleKPI = (code: string) => {
    setSelectedKPIs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleBuildReport = async () => {
    setLoading(true);
    try {
      const selectedAliases = AVAILABLE_KPIS
        .filter((k) => selectedKPIs.has(k.code))
        .map((k) => `'${k.alias}'`)
        .join(", ");
      const periods = reportPeriods.split(",").map((p) => p.trim()).join(", ");

      const res = await fetch("/api/databricks/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "__raw_sql__",
          mode: "real",
          sql: `SELECT Date_ID, Unit_Alias, RL_Alias, Periodic_CY_Value, Periodic_LY_Value, YTD_CY_Value, YTD_LY_Value FROM corporate_finance_analytics_prod.finsight_core_model.finiq_vw_pl_unit WHERE LOWER(Unit_Alias) LIKE LOWER('%${reportEntity.replace(/'/g, "''")}%') AND Date_ID IN (${periods}) AND RL_Alias IN (${selectedAliases}) ORDER BY Date_ID, RL_Alias`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setReportData(json.rows || []);
      }
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
          <CardDescription>Select KPIs, entity, and periods to build a custom report from live Databricks data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select KPIs
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABLE_KPIS.map((kpi) => (
                <button
                  key={kpi.code}
                  onClick={() => toggleKPI(kpi.code)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedKPIs.has(kpi.code)
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-muted/50 text-muted-foreground border border-transparent hover:border-foreground/10"
                  }`}
                >
                  {kpi.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity & Periods */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</label>
              <input
                type="text"
                value={reportEntity}
                onChange={(e) => setReportEntity(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                placeholder="e.g., Mars Incorporated (r)"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Periods (Date_IDs)</label>
              <input
                type="text"
                value={reportPeriods}
                onChange={(e) => setReportPeriods(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                placeholder="e.g., 202501,202502,202503"
              />
            </div>
          </div>

          <Button onClick={handleBuildReport} disabled={loading || selectedKPIs.size === 0}>
            {loading ? "Building from Databricks..." : `Build Report (${selectedKPIs.size} KPIs)`}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {reportData && reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results — {reportData.length} rows</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(reportData[0]).map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((val, j) => (
                      <TableCell key={j} className="text-xs font-mono tabular-nums">
                        {typeof val === "number"
                          ? Math.abs(val) >= 1000000
                            ? `$${(val / 1000000).toFixed(1)}M`
                            : val.toFixed(2)
                          : String(val ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportData && reportData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No data found. Check entity name and periods.
          </CardContent>
        </Card>
      )}
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
  // FR2.1: Each format produces distinct narrative tone
  const filteredNarratives = useMemo(() => {
    let filtered: typeof narratives;
    switch (selectedFormat) {
      case "www":
        filtered = narratives.filter((card) => card.isPositive);
        // Enhance narrative with positive framing
        return filtered.map((card) => ({
          ...card,
          narrative: card.narrative
            .replace(/decline/g, "moderation")
            .replace(/deterioration/g, "stabilization") +
            (card.top3.length > 0 ? ` Top performers: ${card.top3.map((t) => t.name).join(", ")}.` : ""),
        }));
      case "wnww":
        filtered = narratives.filter((card) => !card.isPositive);
        // Enhance narrative with action-oriented framing
        return filtered.map((card) => ({
          ...card,
          narrative: card.narrative +
            " This requires attention and corrective action." +
            (card.bottom3.length > 0 ? ` Underperformers: ${card.bottom3.map((t) => t.name).join(", ")}.` : ""),
        }));
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
                <KPIDataTable entity={selectedEntity} period={selectedPeriod} realData={realPLData} />
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

        {/* ---- Custom Reports (FR2.5) ---- */}
        <TabsContent value="custom">
          <CustomReportBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
