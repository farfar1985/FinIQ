import { NextRequest, NextResponse } from "next/server";

/**
 * Generic FMP proxy route used by the CI page client-side fetcher.
 * Accepts: GET /api/fmp?endpoint=profile&symbol=MDLZ&period=quarter&limit=8
 * Proxies to FMP v3 API using server-side FMP_API_KEY.
 */

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

export async function GET(request: NextRequest) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get("endpoint");
  const symbol = searchParams.get("symbol") || "";

  if (!endpoint) {
    return NextResponse.json({ error: "Missing 'endpoint' parameter" }, { status: 400 });
  }

  // Build extra params (exclude endpoint, symbol, and apikey)
  const extra: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    if (!["endpoint", "symbol", "apikey"].includes(k)) {
      extra[k] = v;
    }
  });

  let url: string;
  const key = `&apikey=${apiKey}`;

  switch (endpoint) {
    case "profile":
      url = `${FMP_BASE}/profile/${symbol}?apikey=${apiKey}`;
      break;
    case "income-statement":
      url = `${FMP_BASE}/income-statement/${symbol}?period=${extra.period || "quarter"}&limit=${extra.limit || "8"}&apikey=${apiKey}`;
      break;
    case "esg-environmental-social-governance-data":
      url = `${FMP_BASE}/esg-environmental-social-governance-data?symbol=${symbol}${key}`;
      break;
    case "analyst-estimates":
      url = `${FMP_BASE}/analyst-estimates/${symbol}?limit=${extra.limit || "8"}&apikey=${apiKey}`;
      break;
    case "price-target":
      url = `${FMP_BASE}/price-target?symbol=${symbol}${key}`;
      break;
    case "stock-news":
      url = `${FMP_BASE}/stock_news?tickers=${symbol}&limit=${extra.limit || "10"}${key}`;
      break;
    case "earning-call-transcript": {
      const year = extra.year || "2025";
      const quarter = extra.quarter || "4";
      url = `${FMP_BASE}/earning_call_transcript/${symbol}?year=${year}&quarter=${quarter}&apikey=${apiKey}`;
      break;
    }
    case "earnings":
      url = `${FMP_BASE}/historical/earning_calendar/${symbol}?apikey=${apiKey}`;
      break;
    case "mergers-acquisitions-search": {
      const name = extra.name || symbol;
      url = `${FMP_BASE}/mergers-acquisitions/search?name=${encodeURIComponent(name)}&apikey=${apiKey}`;
      break;
    }
    case "press-releases":
      url = `${FMP_BASE}/press-releases/${symbol}?limit=${extra.limit || "10"}&apikey=${apiKey}`;
      break;
    case "ratios":
      url = `${FMP_BASE}/ratios/${symbol}?limit=${extra.limit || "1"}&apikey=${apiKey}`;
      break;
    default:
      url = `${FMP_BASE}/${endpoint}/${symbol}?apikey=${apiKey}`;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FinIQ/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `FMP API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FMP fetch failed" },
      { status: 500 }
    );
  }
}
