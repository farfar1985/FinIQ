/**
 * Reports Data API — serves real Databricks data for Financial Reports page.
 * POST /api/reports — returns P&L data, variance data for given entity + period
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  executeRawSql,
  setModeOverride,
  getActiveConfig,
} from "@/data/databricks";

function fqn(table: string): string {
  const cfg = getActiveConfig();
  return `${cfg.catalog}.${cfg.schema}.${table}`;
}

export async function POST(request: NextRequest) {
  const dataMode = process.env.DATA_MODE || process.env.NEXT_PUBLIC_DATA_MODE || "simulated";

  if (dataMode !== "real" || !isConfigured()) {
    return NextResponse.json({ source: "simulated", data: null });
  }

  setModeOverride("real");
  try {
    const body = await request.json();
    const { type, unitAlias, dateId } = body as {
      type: "pes" | "variance" | "entities" | "accounts";
      unitAlias?: string;
      dateId?: number;
    };

    switch (type) {
      case "entities": {
        const rows = await executeRawSql(`
          SELECT DISTINCT Unit_Alias
          FROM ${fqn("finiq_vw_pl_unit")}
          WHERE Date_ID = ${dateId || 202503}
          ORDER BY Unit_Alias
          LIMIT 500
        `);
        return NextResponse.json({
          source: "databricks",
          entities: rows.map((r) => r.Unit_Alias as string),
        });
      }

      case "accounts": {
        const rows = await executeRawSql(`
          SELECT DISTINCT RL_Alias
          FROM ${fqn("finiq_vw_pl_unit")}
          WHERE Unit_Alias = '${(unitAlias || "Mars Incorporated (r)").replace(/'/g, "''")}'
            AND Date_ID = ${dateId || 202503}
          ORDER BY RL_Alias
          LIMIT 200
        `);
        return NextResponse.json({
          source: "databricks",
          accounts: rows.map((r) => r.RL_Alias as string),
        });
      }

      case "pes": {
        const safeUnit = (unitAlias || "Mars Incorporated (r)").replace(/'/g, "''");
        const safeDateId = dateId || 202503;

        const rows = await executeRawSql(`
          SELECT RL_Alias, Periodic_CY_Value, Periodic_LY_Value, YTD_CY_Value, YTD_LY_Value
          FROM ${fqn("finiq_vw_pl_unit")}
          WHERE Unit_Alias = '${safeUnit}'
            AND Date_ID = ${safeDateId}
          ORDER BY RL_Alias
          LIMIT 200
        `);

        // Also fetch NCFO
        const ncfoRows = await executeRawSql(`
          SELECT RL_Alias, Periodic_CY_Value, Periodic_LY_Value, YTD_CY_Value, YTD_LY_Value
          FROM ${fqn("finiq_vw_ncfo_unit")}
          WHERE Unit_Alias = '${safeUnit}'
            AND Date_ID = ${safeDateId}
          LIMIT 50
        `).catch(() => []);

        return NextResponse.json({
          source: "databricks",
          unit: unitAlias,
          dateId: safeDateId,
          plData: rows,
          ncfoData: ncfoRows,
        });
      }

      case "variance": {
        const safeUnit = (unitAlias || "Mars Incorporated (r)").replace(/'/g, "''");

        // Find the Unit_ID for this alias from the dim table
        const unitRows = await executeRawSql(`
          SELECT Child_Unit_ID, Child_Unit
          FROM ${fqn("finiq_dim_unit")}
          WHERE UPPER(Child_Unit) LIKE UPPER('%${safeUnit.split(" ")[0]}%')
          LIMIT 5
        `).catch(() => []);

        let varianceRows: Record<string, unknown>[] = [];
        if (unitRows.length > 0) {
          const unitId = unitRows[0].Child_Unit_ID;
          varianceRows = await executeRawSql(`
            SELECT Unit, Reporting_Line_KPI, Actual_USD_Value, Replan_USD_Value,
                   (Actual_USD_Value - Replan_USD_Value) AS Variance
            FROM ${fqn("finiq_financial_replan")}
            WHERE Unit_ID = ${unitId} AND Date_ID = ${dateId || 202503}
            LIMIT 100
          `);
        } else {
          // Try by unit name directly
          varianceRows = await executeRawSql(`
            SELECT Unit, Reporting_Line_KPI, Actual_USD_Value, Replan_USD_Value,
                   (Actual_USD_Value - Replan_USD_Value) AS Variance
            FROM ${fqn("finiq_financial_replan")}
            WHERE Unit LIKE '%${safeUnit.split(" ")[0]}%' AND Date_ID = ${dateId || 202503}
            LIMIT 100
          `);
        }

        return NextResponse.json({
          source: "databricks",
          unit: unitAlias,
          dateId: dateId || 202503,
          varianceData: varianceRows,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/reports] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report query failed" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
