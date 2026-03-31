import { NextRequest, NextResponse } from "next/server";
import { getEarningsTranscripts } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  const year = parseInt(request.nextUrl.searchParams.get("year") || "2025", 10);
  const quarter = parseInt(request.nextUrl.searchParams.get("quarter") || "1", 10);
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getEarningsTranscripts(ticker, year, quarter);
    return NextResponse.json({ transcripts: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transcripts" },
      { status: 500 },
    );
  }
}
