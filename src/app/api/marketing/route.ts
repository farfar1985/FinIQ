/**
 * Marketing Analytics Integration API — FR6.2
 *
 * GET  /api/marketing         — Get marketing analytics summary
 * POST /api/marketing/query   — Query marketing data
 *
 * Integrates with Amira Marketing Analytics API.
 * Currently returns simulated data; production will connect to real API.
 */

import { NextRequest, NextResponse } from "next/server";

interface MarketingMetric {
  channel: string;
  spend: number;
  impressions: number;
  conversions: number;
  roi: number;
  cpa: number;
  period: string;
}

// Simulated marketing data — will be replaced by Amira Marketing Analytics API
const MARKETING_DATA: MarketingMetric[] = [
  { channel: "Digital Display", spend: 12_500_000, impressions: 450_000_000, conversions: 890_000, roi: 3.2, cpa: 14.04, period: "FY2025 P6" },
  { channel: "Social Media", spend: 8_200_000, impressions: 320_000_000, conversions: 1_200_000, roi: 4.8, cpa: 6.83, period: "FY2025 P6" },
  { channel: "TV/Broadcast", spend: 25_000_000, impressions: 180_000_000, conversions: 420_000, roi: 1.9, cpa: 59.52, period: "FY2025 P6" },
  { channel: "Search/SEM", spend: 6_800_000, impressions: 95_000_000, conversions: 780_000, roi: 5.1, cpa: 8.72, period: "FY2025 P6" },
  { channel: "In-Store Promotions", spend: 15_300_000, impressions: 60_000_000, conversions: 2_100_000, roi: 3.8, cpa: 7.29, period: "FY2025 P6" },
  { channel: "Email/CRM", spend: 2_100_000, impressions: 45_000_000, conversions: 560_000, roi: 6.2, cpa: 3.75, period: "FY2025 P6" },
];

export async function GET() {
  const totalSpend = MARKETING_DATA.reduce((s, m) => s + m.spend, 0);
  const totalConversions = MARKETING_DATA.reduce((s, m) => s + m.conversions, 0);
  const weightedROI = MARKETING_DATA.reduce((s, m) => s + m.roi * m.spend, 0) / totalSpend;

  return NextResponse.json({
    summary: {
      totalSpend,
      totalConversions,
      avgROI: parseFloat(weightedROI.toFixed(2)),
      topChannel: MARKETING_DATA.reduce((best, m) => (m.roi > best.roi ? m : best)).channel,
      period: "FY2025 P6",
    },
    channels: MARKETING_DATA,
    _source: "simulated",
    _note: "Connect AMIRA_MARKETING_API_URL in .env for live data",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, metric } = body;

    let filtered = MARKETING_DATA;
    if (channel) {
      filtered = filtered.filter((m) => m.channel.toLowerCase().includes(channel.toLowerCase()));
    }

    const result = filtered.map((m) => ({
      channel: m.channel,
      value: metric && metric in m ? m[metric as keyof MarketingMetric] : m,
      period: m.period,
    }));

    return NextResponse.json({ data: result, query: body });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
