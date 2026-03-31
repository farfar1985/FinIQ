import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getCompanyDetail(ticker);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch company data" },
      { status: 500 },
    );
  }
}
