/**
 * FinIQ Competitive Intelligence Agent
 * FR3: Competitive Intelligence Integration
 *
 * MVP Implementation:
 * - Cross-reference internal vs competitor metrics (FR3.3 - Critical)
 * - Basic competitor data search and comparison
 *
 * Future phases (not in MVP):
 * - FR3.1: Document ingestion pipeline
 * - FR3.2: Themed summaries
 * - FR3.4: P2P benchmarking
 * - FR3.5: Azure AI Search RAG
 */

import * as db from '../lib/databricks.mjs';

/**
 * Compare Mars metrics with competitor benchmarks
 * FR3.3: Internal-external cross-reference (Critical)
 *
 * @param {string} competitor - Competitor name
 * @param {string} metric - Metric to compare (e.g., 'Organic Growth', 'Gross Profit')
 * @param {string} period - Period (e.g., 'P06')
 * @returns {Object} - Comparison result
 */
export async function compareWithCompetitor(competitor, metric = null, period = null) {
  console.log(`🔍 [CI Agent] Comparing Mars with ${competitor}`);

  try {
    // Get Mars data (from Mars Inc entity)
    const marsData = await db.getPLData('Mars Inc', period);

    if (!marsData || marsData.length === 0) {
      return {
        success: false,
        error: 'No Mars data found for comparison',
        competitor,
        period,
      };
    }

    // MVP: For now, we don't have actual competitor data in the database
    // We'll generate a simulated comparison based on Mars data
    // In Phase 2, this would query actual competitor documents from Azure AI Search

    const comparison = generateComparisonReport(marsData, competitor, metric, period);

    return {
      success: true,
      competitor,
      metric,
      period,
      marsData: comparison.marsMetrics,
      competitorData: comparison.competitorMetrics,
      insights: comparison.insights,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`❌ [CI Agent] Error comparing with ${competitor}:`, error);
    return {
      success: false,
      error: error.message,
      competitor,
      period,
    };
  }
}

/**
 * Generate comparison report between Mars and competitor
 * MVP: Simulated competitor data based on Mars metrics
 *
 * @param {Array} marsData - Mars financial data
 * @param {string} competitor - Competitor name
 * @param {string} targetMetric - Specific metric to compare
 * @param {string} period - Period
 * @returns {Object} - Comparison report
 */
function generateComparisonReport(marsData, competitor, targetMetric, period) {
  // Extract Mars metrics
  const marsMetrics = {};
  for (const row of marsData) {
    marsMetrics[row.Account_KPI] = {
      ytdCY: parseFloat(row.YTD_CY) || 0,
      ytdLY: parseFloat(row.YTD_LY) || 0,
      periodicCY: parseFloat(row.Periodic_CY) || 0,
      periodicLY: parseFloat(row.Periodic_LY) || 0,
    };
  }

  // Calculate Mars growth rates
  const marsGrowth = calculateGrowthRates(marsMetrics);

  // MVP: Simulate competitor data
  // In Phase 2, this would come from ingested competitor documents
  const competitorMetrics = simulateCompetitorData(competitor, marsMetrics);
  const competitorGrowth = calculateGrowthRates(competitorMetrics);

  // Generate insights
  const insights = generateInsights(marsGrowth, competitorGrowth, competitor, targetMetric);

  return {
    marsMetrics: marsGrowth,
    competitorMetrics: competitorGrowth,
    insights,
  };
}

/**
 * Calculate growth rates from metrics
 */
function calculateGrowthRates(metrics) {
  const result = {};

  for (const [kpi, values] of Object.entries(metrics)) {
    const ytdGrowth = values.ytdLY !== 0
      ? ((values.ytdCY - values.ytdLY) / Math.abs(values.ytdLY)) * 100
      : 0;

    const periodicGrowth = values.periodicLY !== 0
      ? ((values.periodicCY - values.periodicLY) / Math.abs(values.periodicLY)) * 100
      : 0;

    result[kpi] = {
      ytdCY: values.ytdCY,
      ytdLY: values.ytdLY,
      ytdGrowth,
      periodicCY: values.periodicCY,
      periodicLY: values.periodicLY,
      periodicGrowth,
    };
  }

  return result;
}

/**
 * Simulate competitor data based on Mars metrics
 * MVP: Generate synthetic competitor data for demo
 *
 * Competitor assumptions:
 * - Nestle: Larger scale (+20%), slower growth (-2%)
 * - Mondelez: Similar scale (+5%), similar growth
 * - Hershey: Smaller scale (-30%), higher growth (+3%)
 * - Ferrero: Mid-scale (+10%), strong growth (+5%)
 */
function simulateCompetitorData(competitor, marsMetrics) {
  const profiles = {
    'Nestle': { scaleFactor: 1.20, growthAdjustment: -2 },
    'Mondelez': { scaleFactor: 1.05, growthAdjustment: 0 },
    'Hershey': { scaleFactor: 0.70, growthAdjustment: 3 },
    'Ferrero': { scaleFactor: 1.10, growthAdjustment: 5 },
    'Default': { scaleFactor: 1.0, growthAdjustment: 0 },
  };

  const profile = profiles[competitor] || profiles['Default'];
  const result = {};

  for (const [kpi, values] of Object.entries(marsMetrics)) {
    // Apply scale factor to absolute values
    // Apply growth adjustment to growth rates
    const baseYtdGrowth = values.ytdLY !== 0
      ? ((values.ytdCY - values.ytdLY) / Math.abs(values.ytdLY)) * 100
      : 0;

    const basePeriodicGrowth = values.periodicLY !== 0
      ? ((values.periodicCY - values.periodicLY) / Math.abs(values.periodicLY)) * 100
      : 0;

    const adjustedYtdGrowth = baseYtdGrowth + profile.growthAdjustment;
    const adjustedPeriodicGrowth = basePeriodicGrowth + profile.growthAdjustment;

    // Reconstruct CY values based on adjusted growth
    const ytdCY = values.ytdLY * profile.scaleFactor * (1 + adjustedYtdGrowth / 100);
    const periodicCY = values.periodicLY * profile.scaleFactor * (1 + adjustedPeriodicGrowth / 100);

    result[kpi] = {
      ytdCY,
      ytdLY: values.ytdLY * profile.scaleFactor,
      periodicCY,
      periodicLY: values.periodicLY * profile.scaleFactor,
    };
  }

  return result;
}

/**
 * Generate competitive insights
 */
function generateInsights(marsGrowth, competitorGrowth, competitor, targetMetric) {
  const insights = [];

  // Key metrics to compare
  const keyMetrics = targetMetric
    ? [targetMetric]
    : ['Organic Growth', 'Gross Profit', 'Operating Profit', 'Net Revenue'];

  for (const metric of keyMetrics) {
    const mars = marsGrowth[metric];
    const comp = competitorGrowth[metric];

    if (!mars || !comp) continue;

    // YTD comparison
    const ytdDiff = mars.ytdGrowth - comp.ytdGrowth;
    const ytdOutperforming = ytdDiff > 0;

    insights.push({
      metric,
      period: 'YTD',
      marsGrowth: mars.ytdGrowth.toFixed(2) + '%',
      competitorGrowth: comp.ytdGrowth.toFixed(2) + '%',
      difference: ytdDiff.toFixed(2) + '%',
      outperforming: ytdOutperforming,
      message: ytdOutperforming
        ? `Mars is outperforming ${competitor} on ${metric} YTD by ${Math.abs(ytdDiff).toFixed(2)}%`
        : `${competitor} is outperforming Mars on ${metric} YTD by ${Math.abs(ytdDiff).toFixed(2)}%`,
    });

    // Periodic comparison
    const periodicDiff = mars.periodicGrowth - comp.periodicGrowth;
    const periodicOutperforming = periodicDiff > 0;

    insights.push({
      metric,
      period: 'Periodic',
      marsGrowth: mars.periodicGrowth.toFixed(2) + '%',
      competitorGrowth: comp.periodicGrowth.toFixed(2) + '%',
      difference: periodicDiff.toFixed(2) + '%',
      outperforming: periodicOutperforming,
      message: periodicOutperforming
        ? `Mars is outperforming ${competitor} on ${metric} Periodic by ${Math.abs(periodicDiff).toFixed(2)}%`
        : `${competitor} is outperforming Mars on ${metric} Periodic by ${Math.abs(periodicDiff).toFixed(2)}%`,
    });
  }

  return insights;
}

/**
 * Search for competitor information
 * MVP: Returns simulated data
 * Phase 2: Would query Azure AI Search with RAG
 *
 * @param {string} query - Search query
 * @returns {Object} - Search results
 */
export async function searchCompetitorInfo(query) {
  console.log(`🔍 [CI Agent] Searching competitor info: "${query}"`);

  // MVP: Return placeholder
  return {
    success: true,
    query,
    message: 'CI document search not yet implemented (Phase 2). For MVP, use compareWithCompetitor() for metric comparisons.',
    suggestedCompetitors: ['Nestle', 'Mondelez', 'Hershey', 'Ferrero'],
    timestamp: new Date().toISOString(),
  };
}

export default {
  compareWithCompetitor,
  searchCompetitorInfo,
};
