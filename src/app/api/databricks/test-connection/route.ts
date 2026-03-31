import { NextRequest, NextResponse } from "next/server";
import { testConnection, getActiveConfig, getDataMode, setModeOverride, type DataMode } from "@/data/databricks";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") as DataMode | null;
  try {
    setModeOverride(mode);
    const config = getActiveConfig();
    const result = await testConnection();
    return NextResponse.json({
      ...result,
      mode: getDataMode(),
      host: config.host,
      catalog: config.catalog,
      schema: config.schema,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Connection test failed" },
      { status: 500 },
    );
  } finally {
    setModeOverride(null);
  }
}
