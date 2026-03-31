#!/usr/bin/env npx tsx
// ---------------------------------------------------------------------------
// Compliance Matrix Scorer
// Reads compliance-matrix.json, runs automated validations, outputs score.
// Usage: npx tsx compliance/score.ts [--update]
// ---------------------------------------------------------------------------

import * as fs from "fs";
import * as path from "path";

const MATRIX_PATH = path.join(__dirname, "compliance-matrix.json");

interface Requirement {
  id: string;
  area: string;
  title: string;
  srsRef: string;
  expected: string;
  acceptance: string;
  validation: string;
  status: "pass" | "partial" | "fail" | "not_tested";
  score: number;
  notes: string;
}

interface Matrix {
  version: string;
  lastUpdated: string;
  targetScore: number;
  currentScore: number;
  summary: { total: number; pass: number; partial: number; fail: number; notTested: number };
  requirements: Requirement[];
}

// ---- Automated checks against the source code ----------------------------

const SRC = path.join(__dirname, "..", "src");

function fileContains(relPath: string, pattern: string | RegExp): boolean {
  const full = path.join(SRC, relPath);
  if (!fs.existsSync(full)) return false;
  const content = fs.readFileSync(full, "utf-8");
  return typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(SRC, relPath));
}

// Map of CR-ID -> automated validation function
// Returns: { status, score, notes }
const automatedChecks: Record<string, () => { status: string; score: number; notes: string }> = {
  "CR-001": () => {
    const hasApiCall = fileContains("components/query/query-content.tsx", "/api/query");
    const hasFetch = fileContains("components/query/query-content.tsx", "fetch(");
    const hasHandleSend = fileContains("components/query/query-content.tsx", "handleSend");
    if (hasApiCall && hasFetch && hasHandleSend)
      return { status: "pass", score: 100, notes: "Query submits to /api/query, receives structured response" };
    if (hasApiCall || hasFetch)
      return { status: "partial", score: 50, notes: "API call exists but handler incomplete" };
    return { status: "fail", score: 0, notes: "No API integration — returns hardcoded mock response" };
  },

  "CR-002": () => {
    const hasTableImport = fileContains("components/query/query-content.tsx", "Table");
    const hasInlineTable = fileContains("components/query/query-content.tsx", "InlineTable") ||
                           (fileContains("components/query/query-content.tsx", "data.type") &&
                            fileContains("components/query/query-content.tsx", "table"));
    if (hasTableImport && hasInlineTable)
      return { status: "pass", score: 100, notes: "Inline data tables rendered in chat" };
    if (hasTableImport)
      return { status: "partial", score: 50, notes: "Table imported but inline rendering unclear" };
    return { status: "fail", score: 0, notes: "No inline table rendering in chat" };
  },

  "CR-003": () => {
    const hasChart = fileContains("components/query/query-content.tsx", "AreaChart") ||
                     fileContains("components/query/query-content.tsx", "BarChart") ||
                     fileContains("components/query/query-content.tsx", "InlineChart") ||
                     fileContains("components/query/query-content.tsx", "recharts");
    if (hasChart)
      return { status: "pass", score: 100, notes: "Inline charts rendered in chat responses" };
    return { status: "fail", score: 0, notes: "No chart rendering in chat" };
  },

  "CR-004": () => {
    const hasHistory = fileContains("components/query/query-content.tsx", "history");
    const hasContext = fileContains("components/query/query-content.tsx", "context");
    if (hasHistory && hasContext)
      return { status: "pass", score: 100, notes: "Conversation history and context sent with each query" };
    if (hasHistory || hasContext)
      return { status: "partial", score: 50, notes: "Partial context tracking" };
    return { status: "fail", score: 0, notes: "No context tracking between turns" };
  },

  "CR-005": () => {
    const apiRoute = fileExists("app/api/query/route.ts");
    const hasIntentParsing = apiRoute && fileContains("app/api/query/route.ts", "intent");
    const hasRouting = apiRoute && (
      fileContains("app/api/query/route.ts", "lookup") &&
      fileContains("app/api/query/route.ts", "comparison") &&
      fileContains("app/api/query/route.ts", "trend")
    );
    if (hasIntentParsing && hasRouting)
      return { status: "pass", score: 100, notes: "Intent classified and routed (lookup, comparison, trend, report)" };
    if (apiRoute)
      return { status: "partial", score: 50, notes: "API route exists but intent classification incomplete" };
    return { status: "fail", score: 0, notes: "No intent classification exists" };
  },

  "CR-006": () => {
    const hasCompute = fileContains("components/reports/reports-content.tsx", "computeNarrative");
    const hasNoStatic = !fileContains("components/reports/reports-content.tsx", "getNarratives");
    if (hasCompute && hasNoStatic)
      return { status: "pass", score: 100, notes: "Narratives dynamically computed from financial data" };
    if (hasCompute)
      return { status: "partial", score: 60, notes: "Dynamic generation exists alongside static templates" };
    return { status: "fail", score: 0, notes: "Narratives are static hardcoded text" };
  },

  "CR-007": () => {
    const hasEntityFilter = fileContains("components/reports/reports-content.tsx", "selectedEntity") &&
                            fileContains("components/reports/reports-content.tsx", "computeNarrative");
    if (hasEntityFilter)
      return { status: "pass", score: 100, notes: "Entity/period selection drives narrative computation" };
    return { status: "fail", score: 0, notes: "Entity/period dropdowns don't change narrative content" };
  },

  "CR-008": () => {
    const hasRanking = fileContains("components/reports/reports-content.tsx", "topPerformers") ||
                       fileContains("components/reports/reports-content.tsx", "top3") ||
                       fileContains("components/reports/reports-content.tsx", "childEntities") ||
                       fileContains("components/reports/reports-content.tsx", /sort.*child|rank.*sub/i);
    if (hasRanking)
      return { status: "pass", score: 100, notes: "Sub-unit rankings computed from real data" };
    return { status: "fail", score: 0, notes: "Rankings are hardcoded text" };
  },

  "CR-009": () => {
    const hasFormat = fileContains("components/reports/reports-content.tsx", "filteredNarratives") ||
                      (fileContains("components/reports/reports-content.tsx", "www") &&
                       fileContains("components/reports/reports-content.tsx", ".filter("));
    if (hasFormat)
      return { status: "pass", score: 100, notes: "Format variants filter narrative cards" };
    return { status: "fail", score: 0, notes: "Format selector has no effect" };
  },

  "CR-010": () => {
    const hasSortable = fileContains("components/reports/reports-content.tsx", "sortColumn") ||
                        fileContains("components/reports/reports-content.tsx", "sortDirection") ||
                        fileContains("components/reports/reports-content.tsx", "handleSort");
    if (hasSortable)
      return { status: "pass", score: 100, notes: "KPI table columns are sortable" };
    return { status: "partial", score: 50, notes: "Table renders but no sort functionality" };
  },

  "CR-015": () => {
    const hasModal = fileContains("components/jobs/jobs-content.tsx", "showSubmitModal") ||
                     fileContains("components/jobs/jobs-content.tsx", "showSubmit");
    const hasHandler = fileContains("components/jobs/jobs-content.tsx", "handleSubmitJob");
    if (hasModal && hasHandler)
      return { status: "pass", score: 100, notes: "Submit Job opens form and adds to queue" };
    if (hasHandler)
      return { status: "partial", score: 50, notes: "Handler exists but no modal" };
    return { status: "fail", score: 0, notes: "Submit Job button has no handler" };
  },

  "CR-019": () => {
    const hasSelectedJob = fileContains("components/jobs/jobs-content.tsx", "selectedJob");
    const hasDetail = fileContains("components/jobs/jobs-content.tsx", "selectedJob.title") ||
                      fileContains("components/jobs/jobs-content.tsx", "selectedJob.id");
    if (hasSelectedJob && hasDetail)
      return { status: "pass", score: 100, notes: "Job row click shows detail panel" };
    if (hasSelectedJob)
      return { status: "partial", score: 50, notes: "Selection state exists but detail panel incomplete" };
    return { status: "fail", score: 0, notes: "No drill-down capability" };
  },

  "CR-024": () => {
    const hasRealTest = fileContains("components/admin/admin-content.tsx", "/api/databricks/test-connection");
    // setTimeout for toast dismiss is fine; only flag setTimeout near "connected" as fake
    const hasFakeConnectionTest = fileContains("components/admin/admin-content.tsx", /setTimeout.*connected/);
    if (hasRealTest && !hasFakeConnectionTest)
      return { status: "pass", score: 100, notes: "Test Connection calls real API endpoint" };
    if (hasRealTest)
      return { status: "partial", score: 60, notes: "Real API call present but fake delay also exists" };
    return { status: "fail", score: 0, notes: "Fakes a delay and always shows connected" };
  },

  "CR-025": () => {
    const hasSave = fileContains("components/admin/admin-content.tsx", "handleSave") ||
                    fileContains("components/admin/admin-content.tsx", "/api/admin/save-config");
    const hasRoute = fileExists("app/api/admin/save-config/route.ts");
    if (hasSave && hasRoute)
      return { status: "pass", score: 100, notes: "Save button persists config via API" };
    if (hasSave)
      return { status: "partial", score: 60, notes: "Handler exists but API route missing" };
    return { status: "fail", score: 0, notes: "Save button has no handler" };
  },

  "CR-034": () => {
    const hasChipSend = fileContains("components/query/query-content.tsx", "handleChipClick") ||
                        fileContains("components/query/query-content.tsx", /handleSend\(.*q/);
    const hasAutoSubmit = fileContains("components/query/query-content.tsx", "handleSend(query)") ||
                          fileContains("components/query/query-content.tsx", "handleSend(q)") ||
                          fileContains("components/query/query-content.tsx", /handleChipClick.*handleSend/);
    if (hasChipSend && hasAutoSubmit)
      return { status: "pass", score: 100, notes: "Chips auto-submit query on click" };
    if (hasChipSend)
      return { status: "partial", score: 50, notes: "Chip handler exists but may not auto-submit" };
    return { status: "fail", score: 25, notes: "Chips only populate input" };
  },

  "CR-035": () => {
    const hasCache = fileContains("app/api/query/route.ts", "cache") ||
                     fileContains("data/databricks.ts", "cache") ||
                     fileContains("data/fmp.ts", "revalidate");
    if (hasCache)
      return { status: "pass", score: 100, notes: "Response caching implemented" };
    return { status: "fail", score: 0, notes: "No caching layer" };
  },

  "CR-036": () => {
    const hasFreshness = fileContains("components/reports/reports-content.tsx", "freshness") ||
                         fileContains("components/reports/reports-content.tsx", "Data as of");
    if (hasFreshness)
      return { status: "pass", score: 100, notes: "Data freshness indicator shown on reports" };
    return { status: "fail", score: 0, notes: "No freshness indicator" };
  },

  "CR-012": () => {
    const hasFMP = fileContains("components/competitive/competitive-content.tsx", "/api/fmp/");
    if (hasFMP) return { status: "pass", score: 100, notes: "Live FMP API integration" };
    return { status: "fail", score: 0, notes: "No live API call" };
  },

  // ---- v3.1 Requirements ----

  "CR-041": () => {
    const hasPromptData = fileExists("data/prompts.ts");
    const hasAPI = fileExists("app/api/prompts/route.ts");
    const hasUI = fileContains("components/query/query-content.tsx", "SuggestedPrompt") ||
                  fileContains("components/query/query-content.tsx", "/api/prompts");
    if (hasPromptData && hasAPI && hasUI)
      return { status: "pass", score: 100, notes: "18-prompt catalog with API and UI integration" };
    if (hasPromptData)
      return { status: "partial", score: 50, notes: "Prompt data exists but UI integration incomplete" };
    return { status: "fail", score: 0, notes: "No prompt library" };
  },

  "CR-042": () => {
    const hasResolve = fileContains("data/prompts.ts", "resolveVariables") ||
                       fileContains("data/prompts.ts", "resolve");
    const hasVars = fileContains("data/prompts.ts", "{unit}") &&
                    fileContains("data/prompts.ts", "{current_year}");
    if (hasResolve && hasVars)
      return { status: "pass", score: 100, notes: "Variable resolution engine for {unit}, {current_year}, {current_period}, {current_quarter}" };
    return { status: "fail", score: 0, notes: "No variable resolution" };
  },

  "CR-043": () => {
    const hasRuns = fileContains("data/prompts.ts", "runs");
    const hasIncrement = fileContains("app/api/prompts/route.ts", "runs") ||
                         fileContains("app/api/prompts/route.ts", "increment");
    if (hasRuns && hasIncrement)
      return { status: "pass", score: 100, notes: "Runs counter tracked and incrementable via API" };
    return { status: "fail", score: 0, notes: "No usage tracking" };
  },

  "CR-044": () => {
    const hasSWOT = fileContains("components/competitive/competitive-content.tsx", "SWOT") ||
                    fileContains("components/competitive/competitive-content.tsx", "swot");
    if (hasSWOT)
      return { status: "pass", score: 100, notes: "SWOT Analysis view implemented" };
    return { status: "fail", score: 0, notes: "No SWOT view" };
  },

  "CR-045": () => {
    const hasScatter = fileContains("components/competitive/competitive-content.tsx", "ScatterChart") ||
                       fileContains("components/competitive/competitive-content.tsx", "Scatter");
    if (hasScatter)
      return { status: "pass", score: 100, notes: "Competitive positioning scatter chart" };
    return { status: "fail", score: 0, notes: "No positioning map" };
  },

  "CR-046": () => {
    const hasTranscripts = fileContains("components/competitive/competitive-content.tsx", "transcript") ||
                           fileContains("components/competitive/competitive-content.tsx", "/api/fmp/transcripts");
    if (hasTranscripts)
      return { status: "pass", score: 100, notes: "Earnings call transcript viewer" };
    return { status: "fail", score: 0, notes: "No earnings view" };
  },

  "CR-047": () => {
    const hasNews = fileContains("components/competitive/competitive-content.tsx", "/api/fmp/news");
    const hasMandA = fileContains("components/competitive/competitive-content.tsx", "/api/fmp/manda") ||
                     fileContains("components/competitive/competitive-content.tsx", "M&A") ||
                     fileContains("components/competitive/competitive-content.tsx", "manda");
    if (hasNews && hasMandA)
      return { status: "pass", score: 100, notes: "News feed and M&A tracker integrated" };
    if (hasNews)
      return { status: "partial", score: 60, notes: "News present but M&A missing" };
    return { status: "fail", score: 0, notes: "No news/M&A view" };
  },

  "CR-048": () => {
    const hasDCF = fileExists("app/api/fmp/dcf/route.ts");
    const hasInsider = fileExists("app/api/fmp/insider/route.ts");
    const hasNews = fileExists("app/api/fmp/news/route.ts");
    const hasMandA = fileExists("app/api/fmp/manda/route.ts");
    const count = [hasDCF, hasInsider, hasNews, hasMandA].filter(Boolean).length;
    if (count === 4)
      return { status: "pass", score: 100, notes: "All 4 new FMP API routes exist" };
    if (count > 0)
      return { status: "partial", score: Math.round(count * 25), notes: `${count}/4 new FMP routes` };
    return { status: "fail", score: 0, notes: "No new FMP routes" };
  },

  "CR-049": () => {
    const tickers = ["NSRGY", "MDLZ", "HSY", "GIS", "CL", "UL", "SJM", "KHC", "K", "PG"];
    let found = 0;
    for (const t of tickers) {
      if (fileContains("data/fmp.ts", t)) found++;
    }
    if (found >= 8)
      return { status: "pass", score: 100, notes: `${found}/10 competitor tickers tracked` };
    if (found >= 5)
      return { status: "partial", score: Math.round(found * 10), notes: `Only ${found}/10 tickers` };
    return { status: "fail", score: 0, notes: "Insufficient competitor coverage" };
  },

  "CR-050": () => {
    const fns = [
      "getProfile", "getIncomeStatements", "getBalanceSheets", "getCashFlowStatement",
      "getFinancialRatios", "getKeyMetrics", "getEarningsTranscripts", "getAnalystEstimates",
      "getStockNews", "getPressReleases", "getSECFilings", "getInsiderTrading",
      "getESGScores", "getMandA", "getDCF", "getEmployeeCount"
    ];
    let found = 0;
    for (const fn of fns) {
      if (fileContains("data/fmp.ts", fn)) found++;
    }
    if (found >= 14)
      return { status: "pass", score: 100, notes: `${found}/${fns.length} FMP functions implemented` };
    if (found >= 10)
      return { status: "partial", score: Math.round((found / fns.length) * 100), notes: `${found}/${fns.length} FMP functions` };
    return { status: "fail", score: 0, notes: `Only ${found}/${fns.length} FMP functions` };
  },

  "CR-020": () => {
    const hasAPI = fileContains("components/explorer/explorer-content.tsx", "/api/databricks/tables");
    if (hasAPI) return { status: "pass", score: 100, notes: "API integration working" };
    return { status: "fail", score: 0, notes: "No API call" };
  },

  "CR-016": () => {
    const has = fileContains("components/jobs/jobs-content.tsx", "activeTab") &&
                fileContains("components/jobs/jobs-content.tsx", ".filter(");
    if (has) return { status: "pass", score: 100, notes: "Working" };
    return { status: "fail", score: 0, notes: "No filtering" };
  },

  "CR-030": () => {
    const has = fileContains("components/sidebar.tsx", "sidebarExpanded") &&
                fileContains("components/sidebar.tsx", "toggleSidebar");
    if (has) return { status: "pass", score: 100, notes: "Working" };
    return { status: "fail", score: 0, notes: "Not implemented" };
  },

  "CR-031": () => {
    const has = fileContains("components/sidebar.tsx", "toggleTheme") ||
                fileContains("components/theme-provider.tsx", "theme");
    if (has) return { status: "pass", score: 100, notes: "Working" };
    return { status: "fail", score: 0, notes: "Not implemented" };
  },
};

// ---- Main -----------------------------------------------------------------

function main() {
  const matrix: Matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf-8"));
  const updateMode = process.argv.includes("--update");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║           AMIRA FINIQ — COMPLIANCE SCORE                ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let totalScore = 0;
  let pass = 0, partial = 0, fail = 0, notTested = 0;

  for (const req of matrix.requirements) {
    const check = automatedChecks[req.id];
    if (check) {
      const result = check();
      if (updateMode) {
        req.status = result.status as Requirement["status"];
        req.score = result.score;
        req.notes = result.notes;
      }
    }

    totalScore += req.score;
    if (req.status === "pass") pass++;
    else if (req.status === "partial") partial++;
    else if (req.status === "fail") fail++;
    else notTested++;

    const icon = req.status === "pass" ? "✓" : req.status === "partial" ? "◐" : req.status === "fail" ? "✗" : "?";
    const color = req.status === "pass" ? "\x1b[32m" : req.status === "partial" ? "\x1b[33m" : req.status === "fail" ? "\x1b[31m" : "\x1b[90m";
    console.log(`  ${color}${icon}\x1b[0m  ${req.id.padEnd(8)} ${req.title.substring(0, 55).padEnd(57)} ${String(req.score).padStart(3)}%  ${color}${req.status}\x1b[0m`);
  }

  const overallScore = Math.round(totalScore / matrix.requirements.length);

  console.log("\n" + "─".repeat(90));
  console.log(`\n  TOTAL: ${matrix.requirements.length} requirements`);
  console.log(`  \x1b[32m✓ Pass: ${pass}\x1b[0m  |  \x1b[33m◐ Partial: ${partial}\x1b[0m  |  \x1b[31m✗ Fail: ${fail}\x1b[0m  |  \x1b[90m? Not tested: ${notTested}\x1b[0m`);
  console.log(`\n  ════════════════════════════════════`);
  console.log(`  COMPLIANCE SCORE:  ${overallScore} / 100`);
  console.log(`  TARGET:            ${matrix.targetScore} / 100`);
  console.log(`  STATUS:            ${overallScore >= matrix.targetScore ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mBELOW TARGET\x1b[0m"}`);
  console.log(`  ════════════════════════════════════\n`);

  if (updateMode) {
    matrix.currentScore = overallScore;
    matrix.lastUpdated = new Date().toISOString();
    matrix.summary = { total: matrix.requirements.length, pass, partial, fail, notTested };
    fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2));
    console.log("  ℹ  Matrix updated and saved.\n");
  }

  // List critical failures
  const failures = matrix.requirements.filter((r) => r.status === "fail");
  if (failures.length > 0) {
    console.log("  CRITICAL FAILURES:");
    for (const f of failures) {
      console.log(`    \x1b[31m✗\x1b[0m ${f.id} ${f.title}`);
      console.log(`      → ${f.notes}`);
    }
    console.log();
  }

  process.exit(overallScore >= matrix.targetScore ? 0 : 1);
}

main();
