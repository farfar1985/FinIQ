import { NextRequest, NextResponse } from "next/server";
import { queryTable, setModeOverride, isRealMode, isConfigured, type DataMode } from "@/data/databricks";

// Raw SQL execution — requires a server-side helper that accepts arbitrary SQL.
// We import executeRawSql which delegates to the shared Databricks connection.
import { executeRawSql } from "@/data/databricks";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, columns = [], filters = [], limit = 500, mode, sql } = body as {
      table: string;
      columns?: string[];
      filters?: { column: string; value: string }[];
      limit?: number;
      mode?: DataMode;
      sql?: string;
    };

    setModeOverride(mode || null);

    // Raw SQL mode: only allowed in non-simulated modes
    if (sql && table === "__raw_sql__") {
      if (!isRealMode() || !isConfigured()) {
        return NextResponse.json(
          { error: "Custom SQL queries are only available in LIVE mode with valid Databricks credentials." },
          { status: 400 },
        );
      }

      // Basic safety: reject dangerous statements
      const sqlUpper = sql.trim().toUpperCase();
      if (
        sqlUpper.startsWith("DROP") ||
        sqlUpper.startsWith("DELETE") ||
        sqlUpper.startsWith("TRUNCATE") ||
        sqlUpper.startsWith("ALTER") ||
        sqlUpper.startsWith("CREATE") ||
        sqlUpper.startsWith("INSERT") ||
        sqlUpper.startsWith("UPDATE") ||
        sqlUpper.startsWith("MERGE")
      ) {
        return NextResponse.json(
          { error: "Only SELECT queries are allowed." },
          { status: 400 },
        );
      }

      const rows = await executeRawSql(sql, Math.min(limit, 1000));
      return NextResponse.json({ rows, count: rows.length });
    }

    if (!table) {
      return NextResponse.json({ error: "Missing 'table' field" }, { status: 400 });
    }

    const rows = await queryTable(table, columns, filters, Math.min(limit, 1000));
    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
