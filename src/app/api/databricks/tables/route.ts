import { NextRequest, NextResponse } from "next/server";
import { listTables, getActiveConfig, setModeOverride, type DataMode } from "@/data/databricks";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") as DataMode | null;
  try {
    setModeOverride(mode);
    const tables = await listTables();
    const cfg = getActiveConfig();
    return NextResponse.json({
      tables,
      mode: mode || "env",
      catalog: cfg.catalog,
      schema: cfg.schema,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list tables" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
