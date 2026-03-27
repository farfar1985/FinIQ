/**
 * FinIQ Intelligence Layer
 * FR6.1: Three-way comparison (Actual vs Replan vs Forecast)
 * FR6.5: Data freshness monitoring
 * Unified recommendation engine
 */

import dataLayer from "./databricks.mjs";

// ============================================================
// Data freshness tracking
// ============================================================

const freshnessCache = {
  lastCheck: null,
  result: null,
  ttlMs: 60_000, // Re-check every 60s
};

/**
 * Check data freshness across key tables.
 * Returns latest Date_ID, row counts, and staleness warnings.
 */
async function getDataFreshness() {
  const now = Date.now();
  if (
    freshnessCache.result &&
    freshnessCache.lastCheck &&
    now - freshnessCache.lastCheck < freshnessCache.ttlMs
  ) {
    return freshnessCache.result;
  }

  const queries = {
    financial_cons: {
      latest: "SELECT MAX(Date_ID) as latest_date_id, COUNT(*) as row_count FROM finiq_financial_cons",
    },
    financial_replan: {
      latest: "SELECT MAX(Date_ID) as latest_date_id, COUNT(*) as row_count FROM finiq_financial_replan",
    },
    dim_entity: {
      latest: "SELECT COUNT(*) as row_count FROM finiq_dim_entity",
    },
    dim_account: {
      latest: "SELECT COUNT(*) as row_count FROM finiq_dim_account",
    },
  };

  const results = {};
  const warnings = [];
  const checkedAt = new Date().toISOString();

  for (const [table, q] of Object.entries(queries)) {
    try {
      const rows = await dataLayer.query(q.latest);
      const row = rows[0] || {};
      results[table] = {
        row_count: row.row_count || 0,
        latest_date_id: row.latest_date_id || null,
      };

      if (row.row_count === 0) {
        warnings.push({
          table,
          level: "error",
          message: `Table ${table} has zero rows — data may not be loaded`,
        });
      }
    } catch (err) {
      results[table] = { row_count: 0, latest_date_id: null, error: err.message };
      warnings.push({
        table,
        level: "error",
        message: `Failed to query ${table}: ${err.message}`,
      });
    }
  }

  // Check if the latest fiscal dates are recent enough
  // In synthetic data, Date_IDs are numeric fiscal period keys (e.g., 202505)
  // We flag staleness if the most recent date_id is more than 2 periods behind "now"
  const currentYearMonth = parseInt(
    new Date().getFullYear().toString() + String(new Date().getMonth() + 1).padStart(2, "0"),
    10
  );

  for (const table of ["financial_cons", "financial_replan"]) {
    const info = results[table];
    if (info && info.latest_date_id) {
      const latestId = parseInt(info.latest_date_id, 10);
      if (!isNaN(latestId) && !isNaN(currentYearMonth)) {
        // Rough check: if the latest date_id is more than 3 months behind, warn
        const diff = currentYearMonth - latestId;
        if (diff > 3) {
          warnings.push({
            table,
            level: "warning",
            message: `Latest Date_ID (${latestId}) is ${diff} periods behind current (${currentYearMonth}) — data may be stale`,
          });
        }
      }
    }
  }

  const freshness = {
    checked_at: checkedAt,
    mode: dataLayer.getMode(),
    tables: results,
    warnings,
    overall_status: warnings.some((w) => w.level === "error")
      ? "error"
      : warnings.length > 0
        ? "warning"
        : "healthy",
  };

  freshnessCache.result = freshness;
  freshnessCache.lastCheck = now;

  return freshness;
}

// ============================================================
// Three-way comparison: Actual vs Replan vs Forecast
// FR6.1 — Forecast is a stub with realistic mock data
// ============================================================

/**
 * Generate a mock forecast value from an actual value.
 * Applies a growth factor of 1.03–1.08x with slight per-account variation.
 */
function generateForecastValue(actual, accountName) {
  if (actual == null || isNaN(actual)) return null;

  // Deterministic-ish seed from account name so results are stable per request
  let hash = 0;
  for (let i = 0; i < (accountName || "").length; i++) {
    hash = ((hash << 5) - hash + accountName.charCodeAt(i)) | 0;
  }
  // Map hash to a growth factor between 1.03 and 1.08
  const normalized = (Math.abs(hash) % 500) / 10000; // 0.00 – 0.05
  const growthFactor = 1.03 + normalized;

  return Math.round(actual * growthFactor * 100) / 100;
}

/**
 * Get three-way comparison for an entity:
 *  - Actual: from finiq_financial_cons (aggregated by entity + account)
 *  - Replan: from finiq_financial_replan
 *  - Forecast: mock (growth factor applied to actuals)
 *
 * Since finiq_financial_cons uses IDs while finiq_financial_replan uses aliases,
 * we query replan directly (it already has Entity and Account_KPI as text)
 * and for actuals we JOIN dimension tables.
 */
async function getThreeWayComparison(entity) {
  // Get replan data (already has Entity alias and Account_KPI text)
  const replanRows = await dataLayer.query(
    `SELECT Entity, Account_KPI,
            SUM(Actual_USD_Value) as actual_total,
            SUM(Replan_USD_Value) as replan_total
     FROM finiq_financial_replan
     WHERE Entity = ?
     GROUP BY Entity, Account_KPI
     ORDER BY Account_KPI`,
    [entity]
  );

  // Build the three-way rows
  const comparison = replanRows.map((row) => {
    const actual = row.actual_total || 0;
    const replan = row.replan_total || 0;
    const forecast = generateForecastValue(actual, row.Account_KPI);

    const actualVsReplan = actual - replan;
    const actualVsReplanPct =
      replan !== 0 ? ((actual - replan) / Math.abs(replan)) * 100 : 0;

    const actualVsForecast = forecast != null ? actual - forecast : null;
    const actualVsForecastPct =
      forecast != null && forecast !== 0
        ? ((actual - forecast) / Math.abs(forecast)) * 100
        : null;

    return {
      entity: row.Entity,
      account: row.Account_KPI,
      actual: Math.round(actual * 100) / 100,
      replan: Math.round(replan * 100) / 100,
      forecast: forecast,
      actual_vs_replan: Math.round(actualVsReplan * 100) / 100,
      actual_vs_replan_pct: Math.round(actualVsReplanPct * 100) / 100,
      actual_vs_forecast: actualVsForecast != null ? Math.round(actualVsForecast * 100) / 100 : null,
      actual_vs_forecast_pct:
        actualVsForecastPct != null ? Math.round(actualVsForecastPct * 100) / 100 : null,
      replan_favorable: actualVsReplan >= 0,
      forecast_favorable: actualVsForecast != null ? actualVsForecast >= 0 : null,
    };
  });

  return {
    entity,
    generated_at: new Date().toISOString(),
    forecast_note:
      "Forecast values are simulated (1.03–1.08x growth factor on actuals). Connect Amira Forecasting API for real projections.",
    rows: comparison,
    summary: buildComparisonSummary(comparison),
  };
}

/**
 * Build a summary object from comparison rows.
 */
function buildComparisonSummary(rows) {
  if (rows.length === 0) return null;

  const totalActual = rows.reduce((sum, r) => sum + r.actual, 0);
  const totalReplan = rows.reduce((sum, r) => sum + r.replan, 0);
  const totalForecast = rows.reduce((sum, r) => sum + (r.forecast || 0), 0);
  const favorableReplan = rows.filter((r) => r.replan_favorable).length;
  const unfavorableReplan = rows.filter((r) => !r.replan_favorable).length;

  return {
    total_accounts: rows.length,
    total_actual: Math.round(totalActual * 100) / 100,
    total_replan: Math.round(totalReplan * 100) / 100,
    total_forecast: Math.round(totalForecast * 100) / 100,
    favorable_vs_replan: favorableReplan,
    unfavorable_vs_replan: unfavorableReplan,
  };
}

// ============================================================
// Recommendation engine
// ============================================================

/**
 * Generate text recommendations based on three-way comparison data.
 * This is a rule-based engine (no LLM call needed).
 */
async function getRecommendations(entity) {
  const comparison = await getThreeWayComparison(entity);
  const recommendations = [];

  if (!comparison.rows || comparison.rows.length === 0) {
    return {
      entity,
      generated_at: new Date().toISOString(),
      recommendations: [
        {
          severity: "info",
          category: "data",
          title: "No data available",
          message: `No financial data found for entity "${entity}". Verify the entity name matches a valid organizational unit.`,
        },
      ],
    };
  }

  // Analyze each account for significant variances
  for (const row of comparison.rows) {
    // Large unfavorable replan variance (> 10% negative)
    if (!row.replan_favorable && row.actual_vs_replan_pct < -10) {
      recommendations.push({
        severity: "high",
        category: "budget",
        title: `${row.account}: Significant budget shortfall`,
        message: `${row.account} is ${Math.abs(row.actual_vs_replan_pct).toFixed(1)}% below replan (Actual: ${formatCurrency(row.actual)}, Replan: ${formatCurrency(row.replan)}). Investigate root cause and consider replan adjustment.`,
        account: row.account,
        metric: "actual_vs_replan_pct",
        value: row.actual_vs_replan_pct,
      });
    }

    // Large favorable replan variance (> 15% positive) — may indicate conservative planning
    if (row.replan_favorable && row.actual_vs_replan_pct > 15) {
      recommendations.push({
        severity: "medium",
        category: "planning",
        title: `${row.account}: Outperforming replan significantly`,
        message: `${row.account} is ${row.actual_vs_replan_pct.toFixed(1)}% above replan (Actual: ${formatCurrency(row.actual)}, Replan: ${formatCurrency(row.replan)}). Consider whether replan targets are too conservative.`,
        account: row.account,
        metric: "actual_vs_replan_pct",
        value: row.actual_vs_replan_pct,
      });
    }

    // Actual below forecast (> 5% gap) — risk signal
    if (row.actual_vs_forecast_pct != null && row.actual_vs_forecast_pct < -5) {
      recommendations.push({
        severity: "medium",
        category: "forecast",
        title: `${row.account}: Below forecast trajectory`,
        message: `${row.account} is tracking ${Math.abs(row.actual_vs_forecast_pct).toFixed(1)}% below forecast (Actual: ${formatCurrency(row.actual)}, Forecast: ${formatCurrency(row.forecast)}). Monitor for continued underperformance.`,
        account: row.account,
        metric: "actual_vs_forecast_pct",
        value: row.actual_vs_forecast_pct,
      });
    }
  }

  // Overall summary recommendation
  const { summary } = comparison;
  if (summary) {
    const overallReplanVar =
      summary.total_replan !== 0
        ? ((summary.total_actual - summary.total_replan) / Math.abs(summary.total_replan)) * 100
        : 0;

    if (Math.abs(overallReplanVar) > 5) {
      recommendations.push({
        severity: overallReplanVar < 0 ? "high" : "low",
        category: "overview",
        title: `Overall performance ${overallReplanVar >= 0 ? "above" : "below"} replan`,
        message: `${entity} aggregate actuals are ${overallReplanVar >= 0 ? "+" : ""}${overallReplanVar.toFixed(1)}% vs replan across ${summary.total_accounts} accounts. ${summary.unfavorable_vs_replan} account(s) unfavorable, ${summary.favorable_vs_replan} favorable.`,
        metric: "overall_replan_variance_pct",
        value: Math.round(overallReplanVar * 100) / 100,
      });
    }
  }

  // FR6.3 — Incorporate marketing insights into recommendations
  try {
    const marketing = await getMarketingInsights(entity);
    const m = marketing.metrics;

    if (m.brand_awareness_pct < 65) {
      recommendations.push({
        severity: "medium",
        category: "marketing",
        title: "Brand awareness below target",
        message: `${entity} brand awareness is ${m.brand_awareness_pct}%, below the 65% benchmark. Consider increasing marketing investment in high-ROI channels.`,
        metric: "brand_awareness_pct",
        value: m.brand_awareness_pct,
      });
    }

    if (m.campaign_roi < 2.0) {
      recommendations.push({
        severity: "high",
        category: "marketing",
        title: "Campaign ROI underperforming",
        message: `${entity} campaign ROI is ${m.campaign_roi}x, below the 2.0x target. Review marketing spend allocation across channels for optimization opportunities.`,
        metric: "campaign_roi",
        value: m.campaign_roi,
      });
    }

    if (m.digital_engagement_rate_pct < 3.0) {
      recommendations.push({
        severity: "low",
        category: "marketing",
        title: "Low digital engagement",
        message: `${entity} digital engagement rate is ${m.digital_engagement_rate_pct}%. Consider boosting social media and e-commerce initiatives.`,
        metric: "digital_engagement_rate_pct",
        value: m.digital_engagement_rate_pct,
      });
    }

    // Identify best-performing channel for positive recommendation
    const bestChannel = marketing.channels.reduce((best, ch) =>
      ch.roi > best.roi ? ch : best
    );
    if (bestChannel.roi > 2.5) {
      recommendations.push({
        severity: "low",
        category: "marketing",
        title: `High-ROI channel: ${bestChannel.name}`,
        message: `${bestChannel.name} delivers ${bestChannel.roi}x ROI with ${bestChannel.spend_share_pct}% spend share. Consider increasing allocation to this channel.`,
        metric: "channel_roi",
        value: bestChannel.roi,
      });
    }
  } catch (err) {
    console.warn("[intelligence] Marketing insights unavailable:", err.message);
  }

  // Data freshness check
  const freshness = await getDataFreshness();
  if (freshness.overall_status !== "healthy") {
    for (const warning of freshness.warnings) {
      recommendations.push({
        severity: warning.level === "error" ? "high" : "medium",
        category: "data_quality",
        title: `Data quality: ${warning.table}`,
        message: warning.message,
      });
    }
  }

  // Sort: high severity first
  const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
  recommendations.sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  return {
    entity,
    generated_at: new Date().toISOString(),
    forecast_note: comparison.forecast_note,
    recommendation_count: recommendations.length,
    recommendations,
  };
}

// ============================================================
// FR6.2 — Marketing API stub (mock data)
// ============================================================

/**
 * Returns mock marketing insights for an entity.
 * In production, this would call the Amira Marketing Analytics API.
 */
async function getMarketingInsights(entity) {
  // Deterministic seed from entity name for stable mock data
  let hash = 0;
  for (let i = 0; i < entity.length; i++) {
    hash = ((hash << 5) - hash + entity.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);

  const brandAwareness = 55 + (seed % 35);          // 55-89%
  const campaignROI = 1.5 + (seed % 30) / 10;       // 1.5-4.5x
  const digitalEngagement = 20 + (seed % 50) / 10;  // 2.0-7.0%
  const socialSentiment = 60 + (seed % 30);          // 60-89%
  const adSpendEfficiency = 0.7 + (seed % 25) / 100; // 0.70-0.94

  return {
    entity,
    source: "Amira Marketing Analytics API (simulated)",
    generated_at: new Date().toISOString(),
    metrics: {
      brand_awareness_pct: brandAwareness,
      campaign_roi: Math.round(campaignROI * 100) / 100,
      digital_engagement_rate_pct: Math.round(digitalEngagement * 100) / 100,
      social_sentiment_score: socialSentiment,
      ad_spend_efficiency: Math.round(adSpendEfficiency * 100) / 100,
    },
    channels: [
      {
        name: "Digital / E-Commerce",
        spend_share_pct: 35 + (seed % 10),
        roi: Math.round((campaignROI * 1.2) * 100) / 100,
        trend: "increasing",
      },
      {
        name: "TV / Broadcast",
        spend_share_pct: 25 + (seed % 8),
        roi: Math.round((campaignROI * 0.8) * 100) / 100,
        trend: "stable",
      },
      {
        name: "In-Store / Trade",
        spend_share_pct: 20 + (seed % 6),
        roi: Math.round((campaignROI * 1.1) * 100) / 100,
        trend: "stable",
      },
      {
        name: "Social Media",
        spend_share_pct: 15 + (seed % 5),
        roi: Math.round((campaignROI * 1.5) * 100) / 100,
        trend: "increasing",
      },
    ],
    note: "Connect Amira Marketing Analytics API for real marketing data. These values are simulated for demonstration.",
  };
}

// ============================================================
// Helpers
// ============================================================

function formatCurrency(value) {
  if (value == null || isNaN(value)) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// ============================================================
// Exports
// ============================================================

export { getThreeWayComparison, getDataFreshness, getRecommendations, getMarketingInsights };
