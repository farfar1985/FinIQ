import { NextRequest, NextResponse } from "next/server";
import { getInsiderTrading } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
  try {
    const data = await getInsiderTrading(ticker, limit);
    return NextResponse.json({ trades: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch insider trading data" },
      { status: 500 },
    );
  }
}
