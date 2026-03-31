import { NextRequest, NextResponse } from "next/server";
import { getPressReleases } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getPressReleases(ticker, limit);
    return NextResponse.json({ releases: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch press releases" },
      { status: 500 },
    );
  }
}
