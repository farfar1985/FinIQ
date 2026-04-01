/**
 * Dashboard Data API — serves real Databricks data for all dashboard widgets.
 * GET /api/dashboard — returns KPIs, revenue time series, P&L summary, entity list
 *
 * When DATA_MODE=real and Databricks is configured, queries production.
 * Otherwise falls back to simulated data.
 */

import { NextResponse } from "next/server";
import {
  isRealMode,
  isConfigured,
  executeRawSql,
  setModeOverride,
  getActiveConfig,
} from "@/data/databricks";
import {
  generateKPISummary,
  generateTimeSeriesData,
  generateFinancialData,
  generateEntities,
  generateAccounts,
  generateReplanData,
  generateCompetitorData,
  type KPISummary,
} from "@/data/simulated";

function fqn(table: string): string {
  const cfg = getActiveConfig();
  return `${cfg.catalog}.${cfg.schema}.${table}`;
}

// Latest period with actuals
const CURRENT_PERIOD = 202503; // FY2026 P03 — latest with actuals

async function fetchRealKPIs(): Promise<KPISummary[]> {
  // Fetch key reporting lines for Mars Inc from the P&L view
  const rows = await executeRawSql(`
    SELECT RL_Alias, Date_ID, Periodic_CY_Value, Periodic_LY_Value, YTD_CY_Value, YTD_LY_Value
    FROM ${fqn("finiq_vw_pl_unit")}
    WHERE Unit_Alias = 'Mars Incorporated (r)'
      AND Date_ID = ${CURRENT_PERIOD}
      AND RL_Alias IN (
        'Growth % - 3rd Party Organic',
        'Margin After Conversion',
        'Advertising & Cons Promotion',
        'Controllable Earnings',
        'Controllable Overhead Costs',
        'Net Sales Total'
      )
    LIMIT 20
  `);

  // Also get NCFO
  const ncfoRows = await executeRawSql(`
    SELECT RL_Alias, Periodic_CY_Value, Periodic_LY_Value, YTD_CY_Value, YTD_LY_Value
    FROM ${fqn("finiq_vw_ncfo_unit")}
    WHERE Unit_Alias = 'Mars Incorporated (r)'
      AND Date_ID = ${CURRENT_PERIOD}
      AND RL_Alias = 'Net Cash From Operations'
    LIMIT 5
  `);

  const allRows = [...rows, ...ncfoRows];

  // Extract Net Sales for computing shape percentages
  const netSalesRow = rows.find((r) => r.RL_Alias === "Net Sales Total");
  const netSalesCY = (netSalesRow?.Periodic_CY_Value as number) || 1;
  const netSalesLY = (netSalesRow?.Periodic_LY_Value as number) || 1;

  const kpis: KPISummary[] = [];

  // Build a lookup for easy access
  const rowMap: Record<string, { cy: number; ly: number }> = {};
  for (const row of allRows) {
    const rl = row.RL_Alias as string;
    rowMap[rl] = {
      cy: (row.Periodic_CY_Value as number) || 0,
      ly: (row.Periodic_LY_Value as number) || 0,
    };
  }

  // Organic Growth — already a ratio (e.g., 0.051 = 5.1%), multiply by 100
  const ogData = rowMap["Growth % - 3rd Party Organic"];
  if (ogData) {
    const val = ogData.cy * 100;
    const lyVal = ogData.ly * 100;
    kpis.push({
      id: "og", label: "Organic Growth", value: parseFloat(val.toFixed(1)), unit: "%",
      change: parseFloat((val - lyVal).toFixed(1)),
      trend: [lyVal, val],
      status: val > 0 ? "positive" : val < 0 ? "negative" : "neutral",
    });
  }

  // MAC Shape % = MAC / Net Sales * 100
  const macData = rowMap["Margin After Conversion"];
  if (macData) {
    const val = (macData.cy / netSalesCY) * 100;
    const lyVal = (macData.ly / netSalesLY) * 100;
    kpis.push({
      id: "mac", label: "MAC Shape %", value: parseFloat(val.toFixed(1)), unit: "%",
      change: parseFloat((val - lyVal).toFixed(1)),
      trend: [lyVal, val],
      status: val - lyVal > 0 ? "positive" : val - lyVal < 0 ? "negative" : "neutral",
    });
  }

  // A&CP Shape % = A&CP / Net Sales * 100
  const acpData = rowMap["Advertising & Cons Promotion"];
  if (acpData) {
    const val = (acpData.cy / netSalesCY) * 100;
    const lyVal = (acpData.ly / netSalesLY) * 100;
    kpis.push({
      id: "acp", label: "A&CP Shape %", value: parseFloat(val.toFixed(1)), unit: "%",
      change: parseFloat((val - lyVal).toFixed(1)),
      trend: [lyVal, val],
      status: val - lyVal > 0 ? "positive" : val - lyVal < 0 ? "negative" : "neutral",
    });
  }

  // CE Shape % = CE / Net Sales * 100
  const ceData = rowMap["Controllable Earnings"];
  if (ceData) {
    const val = (ceData.cy / netSalesCY) * 100;
    const lyVal = (ceData.ly / netSalesLY) * 100;
    kpis.push({
      id: "ce", label: "CE Shape %", value: parseFloat(val.toFixed(1)), unit: "%",
      change: parseFloat((val - lyVal).toFixed(1)),
      trend: [lyVal, val],
      status: val - lyVal > 0 ? "positive" : val - lyVal < 0 ? "negative" : "neutral",
    });
  }

  // Overhead Shape % = Overhead / Net Sales * 100
  const ohData = rowMap["Controllable Overhead Costs"];
  if (ohData) {
    const val = (ohData.cy / netSalesCY) * 100;
    const lyVal = (ohData.ly / netSalesLY) * 100;
    kpis.push({
      id: "oh", label: "Ctrl. Overhead %", value: parseFloat(val.toFixed(1)), unit: "%",
      change: parseFloat((val - lyVal).toFixed(1)),
      trend: [lyVal, val],
      // Lower overhead is better — flip status
      status: val - lyVal < 0 ? "positive" : val - lyVal > 0 ? "negative" : "neutral",
    });
  }

  // NCFO — raw dollars, show in $B
  const ncfoData = rowMap["Net Cash From Operations"];
  if (ncfoData) {
    const val = ncfoData.cy / 1_000_000_000;
    const lyVal = ncfoData.ly / 1_000_000_000;
    const change = lyVal !== 0 ? ((val - lyVal) / Math.abs(lyVal)) * 100 : 0;
    kpis.push({
      id: "ncfo", label: "NCFO", value: parseFloat(val.toFixed(1)), unit: "$B",
      change: parseFloat(change.toFixed(1)),
      trend: [lyVal, val],
      status: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
    });
  }

  // Fill in any missing KPIs with defaults
  for (const [, meta] of Object.entries(rlMap)) {
    if (!kpis.find((k) => k.id === meta.id)) {
      kpis.push({
        id: meta.id,
        label: meta.label,
        value: 0,
        unit: meta.unit,
        change: 0,
        trend: [0, 0],
        status: "neutral",
      });
    }
  }

  return kpis;
}

async function fetchRealTimeSeries(): Promise<{ date: string; value: number }[]> {
  const rows = await executeRawSql(`
    SELECT Date_ID, Periodic_CY_Value
    FROM ${fqn("finiq_vw_pl_unit")}
    WHERE Unit_Alias = 'Mars Incorporated (r)'
      AND RL_Alias = 'Net Sales Total'
      AND Date_ID >= 202401 AND Date_ID <= 202513
    ORDER BY Date_ID
    LIMIT 25
  `);

  return rows.map((r) => ({
    date: `FY${String(r.Date_ID).slice(0, 4)}-P${String(r.Date_ID).slice(4)}`,
    value: (r.Periodic_CY_Value as number) || 0,
  }));
}

async function fetchRealPLSummary(): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
}> {
  // Get P&L for top-level units — simple query, no subquery
  const rows = await executeRawSql(`
    SELECT Unit_Alias, RL_Alias, Periodic_CY_Value, Periodic_LY_Value
    FROM ${fqn("finiq_vw_pl_unit")}
    WHERE Date_ID = ${CURRENT_PERIOD}
      AND RL_Alias IN ('Net Sales Total', 'Growth % - 3rd Party Organic', 'Margin After Conversion', 'Controllable Earnings')
    ORDER BY Periodic_CY_Value DESC
    LIMIT 300
  `);

  // Pivot: group by Unit_Alias, spread RL_Alias into columns
  const byUnit: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const unit = r.Unit_Alias as string;
    if (!byUnit[unit]) byUnit[unit] = { Entity: unit };
    const rl = r.RL_Alias as string;
    const cy = r.Periodic_CY_Value as number;
    const ly = r.Periodic_LY_Value as number;

    if (rl === "Net Sales Total") {
      byUnit[unit]["Revenue ($M)"] = `$${(cy / 1_000_000).toFixed(1)}M`;
      byUnit[unit]["Rev YoY"] = ly ? `${(((cy - ly) / Math.abs(ly)) * 100).toFixed(1)}%` : "N/A";
    } else if (rl === "Growth % - 3rd Party Organic") {
      byUnit[unit]["OG %"] = `${cy.toFixed(1)}%`;
    } else if (rl === "Margin After Conversion") {
      byUnit[unit]["MAC ($M)"] = `$${(cy / 1_000_000).toFixed(1)}M`;
    } else if (rl === "Controllable Earnings") {
      byUnit[unit]["CE ($M)"] = `$${(cy / 1_000_000).toFixed(1)}M`;
    }
  }

  const tableRows = Object.values(byUnit).sort((a, b) =>
    parseFloat(String(a["Revenue ($M)"] ?? "0").replace(/[^0-9.\-]/g, "")) >
    parseFloat(String(b["Revenue ($M)"] ?? "0").replace(/[^0-9.\-]/g, ""))
      ? -1
      : 1
  );

  return {
    columns: ["Entity", "Revenue ($M)", "Rev YoY", "OG %", "MAC ($M)", "CE ($M)"],
    rows: tableRows,
  };
}

async function fetchRealEntities(): Promise<{ id: number; name: string; level: number }[]> {
  const rows = await executeRawSql(`
    SELECT Child_Unit_ID, Child_Unit, Unit_Level
    FROM ${fqn("finiq_dim_unit")}
    WHERE Unit_Level <= 3
    ORDER BY Unit_Level, Child_Unit
    LIMIT 200
  `);
  return rows.map((r) => ({
    id: r.Child_Unit_ID as number,
    name: r.Child_Unit as string,
    level: r.Unit_Level as number,
  }));
}

// In-memory cache — survives across requests, cleared on server restart
const _cache: { data: Record<string, unknown> | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const dataMode = process.env.DATA_MODE || process.env.NEXT_PUBLIC_DATA_MODE || "simulated";

  // Return cached data if fresh
  if (_cache.data && Date.now() - _cache.timestamp < CACHE_TTL) {
    return NextResponse.json(_cache.data);
  }

  if (dataMode === "real") {
    setModeOverride("real");
    try {
      if (isConfigured()) {
        // Run sequentially — first query wakes the warehouse, subsequent ones succeed
        const kpis = await fetchRealKPIs().catch((e) => { console.warn("[dashboard] KPI fetch failed:", e.message || e); return null; });
        const timeSeries = await fetchRealTimeSeries().catch((e) => { console.warn("[dashboard] TimeSeries fetch failed:", e.message || e); return null; });
        const plSummary = await fetchRealPLSummary().catch((e) => { console.warn("[dashboard] PL fetch failed:", e.message || e); return null; });
        const entities = await fetchRealEntities().catch((e) => { console.warn("[dashboard] Entities fetch failed:", e.message || e); return null; });

        const result = {
          source: "databricks",
          kpis: kpis && kpis.length > 0 ? kpis : generateKPISummary(),
          timeSeries: timeSeries && timeSeries.length > 0 ? timeSeries : generateTimeSeriesData(12),
          plSummary: plSummary && plSummary.rows.length > 0 ? plSummary : { columns: [], rows: [] },
          entities: entities ?? [],
        };

        // Only cache if we got real data (not all fallbacks)
        if ((kpis && kpis.length > 0) || (timeSeries && timeSeries.length > 0) || (plSummary && plSummary.rows.length > 0)) {
          _cache.data = result;
          _cache.timestamp = Date.now();
        }

        return NextResponse.json(result);
      }
    } catch (err) {
      console.error("[/api/dashboard] Databricks fetch failed:", err);
    } finally {
      setModeOverride(null);
    }
  }

  // Fallback to simulated
  return NextResponse.json({
    source: "simulated",
    kpis: generateKPISummary(),
    timeSeries: generateTimeSeriesData(12),
    plSummary: { columns: [], rows: [] },
    entities: [],
  });
}
