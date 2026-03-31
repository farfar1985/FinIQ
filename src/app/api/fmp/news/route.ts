import { NextRequest, NextResponse } from "next/server";
import { getStockNews } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get("tickers");
  if (!tickersParam) {
    return NextResponse.json({ error: "Missing 'tickers' parameter" }, { status: 400 });
  }
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
  try {
    const tickers = tickersParam.split(",").map((t) => t.trim()).filter(Boolean);
    const data = await getStockNews(tickers, limit);
    return NextResponse.json({ news: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stock news" },
      { status: 500 },
    );
  }
}
