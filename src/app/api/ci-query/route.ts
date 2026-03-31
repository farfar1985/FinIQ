import { NextRequest, NextResponse } from "next/server";
import { handleCIQuery } from "@/lib/ci/query-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body as { query: string };

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const response = await handleCIQuery(query);

    return NextResponse.json({
      response: response.text,
      blocks: response.blocks,
      companies: response.companies,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
