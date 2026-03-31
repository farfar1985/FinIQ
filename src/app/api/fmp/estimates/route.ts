import { NextRequest, NextResponse } from "next/server";
import { getAnalystEstimates } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  const period = (request.nextUrl.searchParams.get("period") || "annual") as "annual" | "quarter";
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getAnalystEstimates(ticker, period, 4);
    return NextResponse.json({ estimates: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch estimates" },
      { status: 500 },
    );
  }
}
