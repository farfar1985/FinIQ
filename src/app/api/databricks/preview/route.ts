import { NextRequest, NextResponse } from "next/server";
import { previewTable, setModeOverride, type DataMode } from "@/data/databricks";

export async function GET(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table");
  const limitStr = request.nextUrl.searchParams.get("limit");
  const mode = request.nextUrl.searchParams.get("mode") as DataMode | null;
  if (!table) {
    return NextResponse.json({ error: "Missing 'table' parameter" }, { status: 400 });
  }

  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 1000) : 100;

  try {
    setModeOverride(mode);
    const rows = await previewTable(table, limit);
    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to preview table" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
