import { NextRequest, NextResponse } from "next/server";
import { listColumns, setModeOverride, type DataMode } from "@/data/databricks";

export async function GET(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table");
  const mode = request.nextUrl.searchParams.get("mode") as DataMode | null;
  if (!table) {
    return NextResponse.json({ error: "Missing 'table' parameter" }, { status: 400 });
  }
  try {
    setModeOverride(mode);
    const columns = await listColumns(table);
    return NextResponse.json({ columns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list columns" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
