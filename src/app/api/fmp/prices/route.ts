import { NextRequest, NextResponse } from "next/server";
import { getHistoricalPrices } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  const from = request.nextUrl.searchParams.get("from") || undefined;
  const to = request.nextUrl.searchParams.get("to") || undefined;
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getHistoricalPrices(ticker, from, to);
    return NextResponse.json({ prices: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch prices" },
      { status: 500 },
    );
  }
}
