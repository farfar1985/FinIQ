/**
 * FinIQ Agent — LLM-Powered Natural Language Query Processing
 * Uses Anthropic Claude for intent classification, SQL generation, and response summarization
 * Phase 1.5: LLM Integration
 */

import Anthropic from '@anthropic-ai/sdk';
import * as db from '../lib/databricks.mjs';
import { config } from '../lib/config.mjs';
import { SCHEMA_CONTEXT } from '../lib/schema-context.mjs';

// Initialize Anthropic client
let anthropic = null;
if (config.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: config.ANTHROPIC_API_KEY,
  });
}

/**
 * Process a natural language query using LLM
 * LLM Intent Classification → LLM SQL Generation → Query Execution → LLM Response Summarization
 *
 * @param {string} query - User's natural language query
 * @param {Object} ctx - Shared context (config, db, etc.)
 * @returns {Object} - Structured response with intent, data, and formatted output
 */
export async function processQuery(query, ctx) {
  console.log(`🤖 FinIQ Agent processing: "${query}"`);

  if (!anthropic) {
    console.warn('⚠️  No LLM configured — falling back to simple keyword matching');
    return fallbackProcessQuery(query);
  }

  try {
    // Step 1: LLM Intent Classification + SQL Generation
    console.log('🧠 Using Claude for intent classification and SQL generation...');
    const analysisResult = await analyzeQueryWithLLM(query);

    if (!analysisResult) {
      console.warn('⚠️  LLM returned null, falling back');
      return fallbackProcessQuery(query);
    }

    console.log(`📊 Intent: ${analysisResult.intent}`);
    console.log(`🏢 Entity: ${analysisResult.entity}`);
    console.log(`📅 Period: ${analysisResult.period || 'all periods'}`);
    console.log(`📝 SQL: ${analysisResult.sql.substring(0, 100)}...`);

    // Step 2: Execute SQL query
    const data = await db.query(analysisResult.sql);
    console.log(`✅ Query executed: ${data.length} rows returned`);

    // Step 3: LLM Response Summarization
    console.log('✨ Using Claude to generate summary...');
    const summary = await summarizeResultsWithLLM(query, analysisResult, data);

    // Step 4: Calculate KPIs
    const kpis = calculateKPIs(analysisResult.intent, data);

    return {
      success: true,
      query,
      intent: analysisResult.intent,
      entity: analysisResult.entity,
      period: analysisResult.period,
      summary,
      kpis,
      data: data.slice(0, 100), // Limit to first 100 rows for frontend
      dataSource: analysisResult.sql,
      rowCount: data.length,
      timestamp: new Date().toISOString(),
      llmUsed: true,
    };

  } catch (error) {
    console.error('❌ LLM Agent error:', error);
    console.warn('⚠️  Falling back to simple processing');
    return fallbackProcessQuery(query);
  }
}

/**
 * Use Claude to analyze the query, classify intent, and generate SQL
 * @param {string} query - User's natural language query
 * @returns {Object} - { intent, entity, period, sql, explanation }
 */
async function analyzeQueryWithLLM(query) {
  const prompt = `You are a financial data analyst assistant for Mars, Incorporated.
You have access to a Databricks database with financial data.

${SCHEMA_CONTEXT}

USER QUERY: "${query}"

Your task:
1. Classify the intent (pes, ncfo, variance, product, adhoc)
2. Extract the entity name (e.g., 'Mars Inc', 'Petcare', 'Snacking')
3. Extract the period if specified (e.g., 'P06')
4. Generate a valid SQL query against the schema above

Return a JSON object with this structure:
{
  "intent": "pes|ncfo|variance|product|adhoc",
  "entity": "Mars Inc",
  "period": "P06" or null,
  "sql": "SELECT ... FROM finiq_vw_pl_entity ...",
  "explanation": "Brief explanation of what the query does"
}

IMPORTANT:
- Use exact entity names from the schema (case-sensitive)
- Period format must be P01-P12
- For PES queries, use finiq_vw_pl_entity
- For NCFO queries, use finiq_vw_ncfo_entity
- For variance queries, use finiq_financial_replan
- For product queries, use finiq_vw_pl_brand_product
- Always include ORDER BY and LIMIT clauses
- Do NOT use catalog.schema prefix in table names (will be added automatically)

Return ONLY valid JSON, no other text.`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
  } catch (apiError) {
    console.warn('⚠️  LLM API call failed, falling back to keyword mode:', apiError.message);
    return null;
  }

  const responseText = message.content[0].text.trim();

  // Parse JSON response
  let result;
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                      responseText.match(/```\n([\s\S]*?)\n```/) ||
                      [null, responseText];
    result = JSON.parse(jsonMatch[1]);
  } catch (e) {
    throw new Error(`Failed to parse LLM response as JSON: ${responseText}`);
  }

  return result;
}

/**
 * Use Claude to generate a human-readable summary of the results
 * @param {string} query - Original query
 * @param {Object} analysisResult - Intent classification result
 * @param {Array} data - Query results
 * @returns {string} - Natural language summary
 */
async function summarizeResultsWithLLM(query, analysisResult, data) {
  // Limit data sample to first 10 rows for LLM context
  const dataSample = data.slice(0, 10);

  const prompt = `You are a financial analyst summarizing query results for Mars executives.

USER ASKED: "${query}"

INTENT: ${analysisResult.intent}
ENTITY: ${analysisResult.entity}
PERIOD: ${analysisResult.period || 'all periods'}

RESULTS (first 10 rows of ${data.length} total):
${JSON.stringify(dataSample, null, 2)}

Generate a concise 1-2 sentence executive summary focusing on:
- Key metrics (growth, variance, performance)
- Trends (up/down, positive/negative)
- Notable insights

Use professional financial language. Do NOT use words like "replace" or "fragmented".
Return ONLY the summary text, no JSON or formatting.`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt }
      ],
    });
  } catch (apiError) {
    console.warn('⚠️  LLM summarization failed:', apiError.message);
    return null;
  }

  return message.content[0].text.trim();
}

/**
 * Calculate KPI metrics from query results
 * @param {string} intent - Query intent type
 * @param {Array} data - Query results
 * @returns {Array} - KPI objects
 */
function calculateKPIs(intent, data) {
  const kpis = [];

  // Guard against undefined/null data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return kpis;
  }

  if (intent === 'pes' || intent === 'ncfo' || intent === 'product') {
    // Calculate growth metrics from YTD/Periodic columns
    const totalYTDCY = data.reduce((sum, row) => sum + (parseFloat(row.YTD_CY) || 0), 0);
    const totalYTDLY = data.reduce((sum, row) => sum + (parseFloat(row.YTD_LY) || 0), 0);
    const ytdGrowth = totalYTDLY !== 0 ? ((totalYTDCY - totalYTDLY) / Math.abs(totalYTDLY)) * 100 : 0;

    const totalPeriodicCY = data.reduce((sum, row) => sum + (parseFloat(row.Periodic_CY) || 0), 0);
    const totalPeriodicLY = data.reduce((sum, row) => sum + (parseFloat(row.Periodic_LY) || 0), 0);
    const periodicGrowth = totalPeriodicLY !== 0 ? ((totalPeriodicCY - totalPeriodicLY) / Math.abs(totalPeriodicLY)) * 100 : 0;

    kpis.push(
      { label: 'YTD CY', value: totalYTDCY, format: 'currency', trend: ytdGrowth >= 0 ? 'up' : 'down' },
      { label: 'YTD LY', value: totalYTDLY, format: 'currency' },
      { label: 'YTD Growth', value: ytdGrowth, format: 'percentage', trend: ytdGrowth >= 0 ? 'up' : 'down' },
      { label: 'Periodic CY', value: totalPeriodicCY, format: 'currency', trend: periodicGrowth >= 0 ? 'up' : 'down' },
      { label: 'Periodic LY', value: totalPeriodicLY, format: 'currency' },
      { label: 'Periodic Growth', value: periodicGrowth, format: 'percentage', trend: periodicGrowth >= 0 ? 'up' : 'down' }
    );
  } else if (intent === 'variance') {
    // Calculate variance metrics from Actual/Replan columns
    const totalActual = data.reduce((sum, row) => sum + (parseFloat(row.Actual_USD_Value) || 0), 0);
    const totalReplan = data.reduce((sum, row) => sum + (parseFloat(row.Replan_USD_Value) || 0), 0);
    const totalVariance = totalActual - totalReplan;
    const variancePct = totalReplan !== 0 ? (totalVariance / Math.abs(totalReplan)) * 100 : 0;

    kpis.push(
      { label: 'Actual', value: totalActual, format: 'currency' },
      { label: 'Replan', value: totalReplan, format: 'currency' },
      { label: 'Variance ($)', value: totalVariance, format: 'currency', trend: totalVariance >= 0 ? 'up' : 'down' },
      { label: 'Variance (%)', value: variancePct, format: 'percentage', trend: variancePct >= 0 ? 'up' : 'down' }
    );
  }

  return kpis;
}

/**
 * Fallback processing without LLM (keyword-based)
 * Used when LLM is not available
 */
async function fallbackProcessQuery(query) {
  const lowerQuery = query.toLowerCase();

  // Simple intent classification
  let intent = 'pes';
  if (lowerQuery.includes('ncfo') || lowerQuery.includes('cash flow')) intent = 'ncfo';
  if (lowerQuery.includes('variance') || lowerQuery.includes('budget')) intent = 'variance';
  if (lowerQuery.includes('product') || lowerQuery.includes('brand')) intent = 'product';

  // Extract entity
  const entityPatterns = [
    { pattern: /mars inc/i, name: 'Mars Inc' },
    { pattern: /petcare/i, name: 'Petcare' },
    { pattern: /snacking/i, name: 'Snacking' },
    { pattern: /food & nutrition/i, name: 'Food & Nutrition' },
  ];
  let entity = 'Mars Inc';
  for (const ep of entityPatterns) {
    if (ep.pattern.test(query)) {
      entity = ep.name;
      break;
    }
  }

  // Extract period
  const periodMatch = query.match(/P(\d+)/i);
  const period = periodMatch ? `P${periodMatch[1].padStart(2, '0')}` : null;

  // Execute query
  let data;
  let sql;
  if (intent === 'pes') {
    data = await db.getPLData(entity, period);
    sql = `SELECT * FROM finiq_vw_pl_entity WHERE Entity = '${entity}'`;
  } else if (intent === 'ncfo') {
    data = await db.getNCFOData(entity, period);
    sql = `SELECT * FROM finiq_vw_ncfo_entity WHERE Entity = '${entity}'`;
  } else if (intent === 'variance') {
    data = await db.getBudgetVariance(entity, period);
    sql = `SELECT * FROM finiq_financial_replan WHERE Entity = '${entity}'`;
  }

  const kpis = calculateKPIs(intent, data);

  return {
    success: true,
    query,
    intent,
    entity,
    period,
    summary: `${entity} ${intent.toUpperCase()} data${period ? ` for ${period}` : ''}: ${data.length} records found.`,
    kpis,
    data: data.slice(0, 100),
    dataSource: sql,
    rowCount: data.length,
    timestamp: new Date().toISOString(),
    llmUsed: false,
  };
}

export default {
  processQuery,
};
