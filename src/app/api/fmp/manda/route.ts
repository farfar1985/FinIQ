import { NextRequest, NextResponse } from "next/server";
import { getMandA } from "@/data/fmp";

export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get("company");
  if (!company) {
    return NextResponse.json({ error: "Missing 'company' parameter" }, { status: 400 });
  }
  try {
    const data = await getMandA(company);
    return NextResponse.json({ deals: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch M&A data" },
      { status: 500 },
    );
  }
}
