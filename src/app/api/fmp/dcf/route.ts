import { NextRequest, NextResponse } from "next/server";
import { getDCF } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker' parameter" }, { status: 400 });
  }
  try {
    const data = await getDCF(ticker);
    return NextResponse.json({ dcf: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch DCF data" },
      { status: 500 },
    );
  }
}
