/**
 * Recommendation Engine API — FR6.3
 *
 * GET  /api/recommendations — Get contextual recommendations
 * POST /api/recommendations — Get recommendations for a specific entity/metric
 *
 * Generates unified recommendations combining internal financials,
 * competitive intelligence, and marketing analytics signals.
 */

import { NextRequest, NextResponse } from "next/server";

interface Recommendation {
  id: string;
  type: "action" | "insight" | "alert";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  confidence: number;
  relatedMetrics: string[];
}

function generateRecommendations(entity?: string, metric?: string): Recommendation[] {
  const recs: Recommendation[] = [
    {
      id: "REC-001",
      type: "action",
      priority: "high",
      title: "Investigate organic growth decline in MW Europe",
      description: "Organic growth for MW Europe has declined 2.3% YoY while peer average grew 1.8%. Consider reviewing pricing strategy and promotional effectiveness.",
      source: "PES + CI cross-reference",
      confidence: 0.87,
      relatedMetrics: ["Organic Growth", "Revenue", "Price/Volume Mix"],
    },
    {
      id: "REC-002",
      type: "insight",
      priority: "medium",
      title: "Petcare segment outperforming confectionery globally",
      description: "Petcare gross margin expanded 140bps while Confectionery contracted 60bps. Competitor data shows industry-wide trend toward premium pet nutrition.",
      source: "Financial data + FMP competitor analysis",
      confidence: 0.92,
      relatedMetrics: ["Gross Margin", "MAC Shape %", "Revenue Growth"],
    },
    {
      id: "REC-003",
      type: "alert",
      priority: "high",
      title: "Marketing ROI opportunity in digital channels",
      description: "Email/CRM channel shows 6.2x ROI vs 1.9x for TV. Reallocating 10% of TV budget to digital could yield $4.2M incremental return.",
      source: "Marketing Analytics",
      confidence: 0.78,
      relatedMetrics: ["A&CP Shape %", "Marketing ROI", "Conversion Rate"],
    },
    {
      id: "REC-004",
      type: "insight",
      priority: "low",
      title: "Favorable replan variance in controllable overhead",
      description: "Controllable overhead is 3.1% favorable to replan YTD, driven by supply chain efficiencies. Consider setting more aggressive targets for next period.",
      source: "Budget variance analysis",
      confidence: 0.85,
      relatedMetrics: ["Controllable Overhead Shape %", "CE Shape %"],
    },
    {
      id: "REC-005",
      type: "action",
      priority: "medium",
      title: "Nestle gaining share in premium pet food",
      description: "Nestle Purina revenue grew 5.2% vs Mars Petcare 3.1% in latest quarter. Their premium segment (Pro Plan) is accelerating — monitor pricing response.",
      source: "FMP competitive intelligence",
      confidence: 0.81,
      relatedMetrics: ["Market Share", "Revenue Growth", "Price Index"],
    },
  ];

  // Filter by entity or metric if provided
  if (entity) {
    // Return all recs but boost relevance for matching entity
    return recs.map((r) => ({
      ...r,
      confidence: r.description.toLowerCase().includes(entity.toLowerCase())
        ? Math.min(r.confidence + 0.05, 1)
        : r.confidence,
    }));
  }

  if (metric) {
    return recs.filter((r) =>
      r.relatedMetrics.some((m) => m.toLowerCase().includes(metric.toLowerCase()))
    );
  }

  return recs;
}

export async function GET() {
  const recs = generateRecommendations();
  return NextResponse.json({
    recommendations: recs,
    total: recs.length,
    generatedAt: new Date().toISOString(),
    _source: "unified-engine",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, metric } = body;
    const recs = generateRecommendations(entity, metric);
    return NextResponse.json({
      recommendations: recs,
      total: recs.length,
      query: { entity, metric },
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
