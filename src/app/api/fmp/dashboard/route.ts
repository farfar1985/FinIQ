import { NextResponse } from "next/server";
import { getCompetitiveDashboard } from "@/data/fmp";

export async function GET() {
  try {
    const data = await getCompetitiveDashboard();
    return NextResponse.json({ competitors: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch competitive data" },
      { status: 500 },
    );
  }
}
