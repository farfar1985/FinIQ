import { NextRequest, NextResponse } from "next/server";
import { getSECFilings } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  const type = request.nextUrl.searchParams.get("type") || "10-K";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getSECFilings(ticker, type, limit);
    return NextResponse.json({ filings: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch filings" },
      { status: 500 },
    );
  }
}
