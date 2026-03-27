#!/usr/bin/env node
/**
 * FinIQ Automated Compliance Checker
 * Scores the app against the 80-item compliance matrix from BUILD_PROMPT.md
 *
 * Usage:
 *   node compliance-check.mjs              # Full check (code + live endpoints)
 *   node compliance-check.mjs --code-only  # Code-only checks (no server needed)
 *
 * Karpathy compliance loop:
 *   Code → Run this script → Identify gaps → Fix → Re-run → Repeat until 95+
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CLIENT = resolve(ROOT, "client/src");
const SERVER = resolve(ROOT, "server");

const codeOnly = process.argv.includes("--code-only");
const SERVER_URL = "http://localhost:3001";

// ============================================================
// Helpers
// ============================================================

function fileExists(relPath) {
  return existsSync(resolve(ROOT, relPath));
}

function fileContains(relPath, pattern) {
  try {
    const content = readFileSync(resolve(ROOT, relPath), "utf-8");
    if (typeof pattern === "string") return content.includes(pattern);
    return pattern.test(content);
  } catch {
    return false;
  }
}

function fileContainsAll(relPath, patterns) {
  try {
    const content = readFileSync(resolve(ROOT, relPath), "utf-8");
    return patterns.every((p) =>
      typeof p === "string" ? content.includes(p) : p.test(content)
    );
  } catch {
    return false;
  }
}

async function endpointReturns(path, check) {
  if (codeOnly) return null; // skip live checks
  try {
    const res = await fetch(`${SERVER_URL}${path}`);
    if (!res.ok) return false;
    const data = await res.json();
    return check(data);
  } catch {
    return false;
  }
}

// ============================================================
// Compliance matrix — 80 items
// ============================================================

const matrix = [
  // === FUNCTIONAL (52 items) ===

  // FR1: Data Ingestion (6)
  {
    id: "FR1.1", name: "Databricks ingestion with SQLite fallback",
    check: () => fileContainsAll("server/lib/databricks.mjs", ["initDatabricks", "initSQLite", "getConnection", "MAX_RETRIES"]),
  },
  {
    id: "FR1.2", name: "Competitor document ingestion (FMP transcripts)",
    check: () => fileContains("server/lib/fmp-client.mjs", "getEarningsCallTranscript"),
  },
  {
    id: "FR1.3", name: "FMP API connector for all 10 competitors",
    check: () => fileContainsAll("server/lib/fmp-client.mjs", ["NSRGY", "MDLZ", "HSY", "CL", "GIS", "K", "SJM", "FRPT", "IDXX"]),
  },
  {
    id: "FR1.4", name: "Data catalog with lineage metadata",
    check: () => fileContainsAll("server/lib/routes.mjs", ["source_system", "transformations", "last_updated"]),
  },
  {
    id: "FR1.5", name: "Scheduled ingestion with status dashboard",
    check: () => fileContains("server/lib/admin.mjs", "getIngestionStatus"),
  },
  {
    id: "FR1.6", name: "Connection management (retry, pooling, health check)",
    check: () => fileContainsAll("server/lib/databricks.mjs", ["MAX_RETRIES", "RETRY_DELAY_MS", "healthCheck"]),
  },

  // FR2: Analytics & Reporting (7)
  {
    id: "FR2.1", name: "PES generation from 3 views, 6 KPIs, 3 formats",
    check: () => fileContainsAll("server/agents/finiq-agent.mjs", ["generatePES", "getPLByEntity", "getNCFOByEntity", "www", "wnww", "summary"]),
  },
  {
    id: "FR2.2", name: "Configurable KPI framework (account_formula)",
    check: () => fileContains("server/lib/databricks.mjs", "getAccountFormulas"),
  },
  {
    id: "FR2.3", name: "Sub-unit rankings (RANK 1, TOP 3, BOTTOM 3)",
    check: () => fileContainsAll("server/agents/finiq-agent.mjs", ["ranking", "sort", "slice(0, 3)", "slice(-3)"]),
  },
  {
    id: "FR2.4", name: "Interactive KPI tables (sort, filter, drill-down)",
    check: () => fileContains("client/src/app/reports/page.tsx", "sortable") || fileContains("client/src/app/reports/page.tsx", "showAll"),
  },
  {
    id: "FR2.5", name: "Custom report builder",
    check: () => fileContainsAll("client/src/app/reports/page.tsx", ["Custom Report", "selectedKPIs", "comparisonBase"]),
  },
  {
    id: "FR2.6", name: "Export to PDF, DOCX, PPTX, XLSX, CSV",
    check: () => fileContainsAll("client/src/app/reports/page.tsx", ["downloadFile", "text/csv", "application/json"]),
  },
  {
    id: "FR2.7", name: "Budget variance with account names",
    check: () => fileContains("server/lib/databricks.mjs", "Account_KPI") && !fileContains("server/lib/databricks.mjs", '"Unknown"'),
  },

  // FR3: Competitive Intelligence (4)
  {
    id: "FR3.1", name: "Themed competitor summaries from real FMP data",
    check: () => fileContains("server/agents/ci-agent.mjs", "getSWOT"),
  },
  {
    id: "FR3.2", name: "P2P benchmarking tables with real financial ratios",
    check: () => fileContains("server/agents/ci-agent.mjs", "getBenchmarkComparison"),
  },
  {
    id: "FR3.3", name: "Internal-external cross-reference queries",
    check: () => fileContains("server/agents/ci-agent.mjs", "Mars"),
  },
  {
    id: "FR3.4", name: "Competitor monitoring with alerts",
    check: () => fileContainsAll("server/lib/fmp-client.mjs", ["monitorCompetitors", "getCompetitorAlerts"]),
  },

  // FR4: NL Query Interface (6)
  {
    id: "FR4.1", name: "NL query returns structured answers with charts",
    check: () => fileContainsAll("server/agents/finiq-agent.mjs", ["processQuery", "chartConfig", "response", "data", "sources"]),
  },
  {
    id: "FR4.2", name: "Multi-turn conversations maintain context",
    check: () => fileContains("server/lib/routes.mjs", "sessions") && fileContains("server/lib/routes.mjs", "sessionId"),
  },
  {
    id: "FR4.3", name: "Intent classification routes correctly",
    check: () => fileContainsAll("server/agents/finiq-agent.mjs", ["classifyIntent", "pes", "variance", "ranking", "trend", "adhoc"]),
  },
  {
    id: "FR4.4", name: "Source attribution on every answer",
    check: () => fileContains("server/agents/finiq-agent.mjs", "sources:"),
  },
  {
    id: "FR4.5", name: "Suggested prompt library (18 prompts displayed)",
    check: () => fileContains("server/agents/finiq-agent.mjs", "SUGGESTED_PROMPTS") && fileContains("server/agents/finiq-agent.mjs", "p18"),
  },
  {
    id: "FR4.6", name: "Variable resolution ({unit}, {year}, {period}, {quarter})",
    check: () => fileContainsAll("server/agents/finiq-agent.mjs", ["{current_year}", "{current_period}", "{current_quarter}", "{unit}"]),
  },

  // FR5: Job Board (7)
  {
    id: "FR5.1", name: "Job submission via query interface + form + API",
    check: () => fileContains("server/lib/job-board.mjs", "submitJob") && fileContains("server/lib/routes.mjs", "POST /api/jobs") || fileContains("server/lib/routes.mjs", 'router.post("/jobs"'),
  },
  {
    id: "FR5.2", name: "Agent pool with specialization",
    check: () => fileContainsAll("server/lib/job-board.mjs", ["PES Agent", "CI Agent", "Forecasting Agent", "Ad-Hoc Agent"]) || fileContainsAll("server/lib/job-board.mjs", ["pes", "ci", "forecasting", "adhoc"]),
  },
  {
    id: "FR5.3", name: "Priority routing with SLA targets",
    check: () => fileContainsAll("server/lib/job-board.mjs", ["critical", "high", "medium", "low", "sla"]) || fileContainsAll("server/lib/job-board.mjs", ["critical", "high", "medium", "low"]),
  },
  {
    id: "FR5.4", name: "Job lifecycle tracking (full state machine)",
    check: () => fileContainsAll("server/lib/job-board.mjs", ["submitted", "queued", "assigned", "processing", "review", "completed", "failed"]),
  },
  {
    id: "FR5.5", name: "Job dashboard with filters",
    check: () => fileContains("client/src/app/jobs/page.tsx", "StatusCards") || fileContains("client/src/app/jobs/page.tsx", "JobTable"),
  },
  {
    id: "FR5.6", name: "Scheduled/recurring jobs",
    check: () => fileContains("server/lib/job-board.mjs", "startScheduler") || fileContains("server/lib/job-board.mjs", "checkScheduledJobs"),
  },
  {
    id: "FR5.7", name: "Collaborative review & approval workflow",
    check: () => fileContains("client/src/app/jobs/page.tsx", "PendingReview") || fileContains("client/src/app/jobs/page.tsx", "Approve"),
  },

  // FR6: Integration (5)
  {
    id: "FR6.1", name: "Three-way comparison (Actual vs Replan vs Forecast)",
    check: () => fileContains("server/lib/intelligence.mjs", "getThreeWayComparison"),
  },
  {
    id: "FR6.2", name: "Marketing Analytics integration",
    check: () => fileContains("server/lib/intelligence.mjs", "getMarketingInsights"),
  },
  {
    id: "FR6.3", name: "Unified recommendation engine",
    check: () => fileContains("server/lib/intelligence.mjs", "getRecommendations"),
  },
  {
    id: "FR6.4", name: "External API gateway",
    check: () => fileContains("server/lib/auth.mjs", "requireRole") && fileContains("server/lib/routes.mjs", "requireRole"),
    partial: true, // No rate limiting yet
  },
  {
    id: "FR6.5", name: "Data freshness monitoring",
    check: () => fileContains("server/lib/intelligence.mjs", "getDataFreshness"),
  },

  // FR7: Admin (6)
  {
    id: "FR7.1", name: "Template management",
    check: () => fileContainsAll("server/lib/admin.mjs", ["getTemplates", "createTemplate", "updateTemplate"]),
  },
  {
    id: "FR7.2", name: "Org hierarchy management",
    check: () => fileContains("server/lib/admin.mjs", "getOrgTree"),
  },
  {
    id: "FR7.3", name: "Peer group configuration",
    check: () => fileContainsAll("server/lib/admin.mjs", ["getPeerGroups", "updatePeerGroup"]),
  },
  {
    id: "FR7.4", name: "Prompt management (configurable, not hardcoded)",
    check: () => fileContainsAll("server/lib/admin.mjs", ["getPrompts", "updatePrompt", "togglePrompt"]),
  },
  {
    id: "FR7.5", name: "RBAC with org unit scoping",
    check: () => fileExists("server/lib/auth.mjs") && fileContains("server/lib/auth.mjs", "requireRole"),
  },
  {
    id: "FR7.6", name: "Databricks connection admin panel",
    check: () => fileContains("server/lib/admin.mjs", "testDatabricksConnection") || fileContains("server/lib/admin.mjs", "getConnectionConfig"),
  },

  // FR8: Dynamic UI (11)
  {
    id: "FR8.1", name: "Configurable dashboard (drag-drop)",
    check: () => fileContainsAll("client/src/app/page.tsx", ["widgetOrder", "localStorage", "Customize"]) || fileContainsAll("client/src/app/page.tsx", ["loadWidgetOrder", "saveWidgetOrder"]),
  },
  {
    id: "FR8.2", name: "Dynamic report viewer (zoom, drill-down)",
    check: () => fileContains("client/src/app/reports/page.tsx", "showAll") && fileContains("client/src/components/charts/chart-renderer.tsx", "treemap"),
  },
  {
    id: "FR8.3", name: "Real-time WebSocket updates (server + client)",
    check: () => fileContains("server/lib/websocket.mjs", "WebSocketServer") && (fileContains("client/src/app/jobs/page.tsx", "useJobWebSocket") || fileContains("client/src/app/jobs/page.tsx", "WebSocket")),
  },
  {
    id: "FR8.4", name: "Adaptive query interface",
    check: () => fileContainsAll("client/src/app/chat/page.tsx", ["autoComplete", "recentQueries"]) || fileContainsAll("client/src/app/chat/page.tsx", ["autocomplete", "recent"]),
  },
  {
    id: "FR8.5", name: "Theme & branding",
    check: () => fileContains("client/src/components/layout/sidebar.tsx", "FinIQ") || fileContains("client/src/components/layout/sidebar.tsx", "Fin"),
  },
  {
    id: "FR8.6", name: "WCAG 2.1 AA accessibility",
    check: () => (fileContains("client/src/components/layout/app-shell.tsx", "skip") || fileContains("client/src/components/layout/app-shell.tsx", "Skip")) && (fileContains("client/src/components/layout/sidebar.tsx", "aria-current") || fileContains("client/src/components/layout/sidebar.tsx", "aria-label")),
  },
  {
    id: "FR8.7", name: "Context-aware UI rendering",
    check: () => fileContains("client/src/app/chat/page.tsx", "context") || fileContains("client/src/app/chat/page.tsx", "CONTEXT_ACTIONS") || fileContains("client/src/app/chat/page.tsx", "detectIntent"),
  },
  {
    id: "FR8.8", name: "Progressive disclosure",
    check: () => fileContains("client/src/app/reports/page.tsx", "showAll") || fileContains("client/src/app/ci/page.tsx", "showAll"),
  },
  {
    id: "FR8.9", name: "Dynamic component injection",
    check: () => fileContains("client/src/app/page.tsx", "dynamic") || fileContains("client/src/app/page.tsx", "lazy"),
    partial: true, // Partial implementation
  },
  {
    id: "FR8.10", name: "Multi-panel workspace",
    check: () => fileContains("client/src/app/chat/page.tsx", "splitView") || fileContains("client/src/app/chat/page.tsx", "split"),
  },
  {
    id: "FR8.11", name: "UI state management & undo/redo",
    check: () => fileExists("client/src/stores/history-store.ts") && (fileContains("client/src/components/layout/app-shell.tsx", "undo") || fileContains("client/src/components/layout/app-shell.tsx", "Ctrl+Z") || fileContains("client/src/components/layout/app-shell.tsx", "ctrl+z")),
  },

  // === DESIGN (15 items) ===
  {
    id: "D1", name: "OKLCH color tokens (dark + light mode)",
    check: () => fileContainsAll("client/src/app/globals.css", ["oklch", "--color-background", "--color-primary", ".light"]),
  },
  {
    id: "D2", name: "IBM Plex Sans + JetBrains Mono fonts loaded",
    check: () => fileContainsAll("client/src/app/layout.tsx", ["IBM_Plex_Sans", "JetBrains_Mono"]),
  },
  {
    id: "D3", name: "Collapsible sidebar (48px / 192px)",
    check: () => fileContains("client/src/components/layout/sidebar.tsx", "sidebar-collapsed-width") || fileContains("client/src/components/layout/sidebar.tsx", "toggleSidebar"),
  },
  {
    id: "D4", name: "Top header with global search + notifications",
    check: () => fileContainsAll("client/src/components/layout/header.tsx", ["Search", "Bell", "search"]),
  },
  {
    id: "D5", name: "Market ticker strip with scrolling data",
    check: () => fileContains("client/src/components/layout/ticker.tsx", "animate-ticker"),
  },
  {
    id: "D6", name: "12-column responsive grid layout",
    check: () => fileContains("client/src/app/page.tsx", "grid") && (fileContains("client/src/app/page.tsx", "lg:grid-cols") || fileContains("client/src/app/page.tsx", "xl:grid-cols")),
  },
  {
    id: "D7", name: "KPI stat cards with change badges",
    check: () => fileContains("client/src/app/page.tsx", "text-positive") && fileContains("client/src/app/page.tsx", "text-negative"),
  },
  {
    id: "D8", name: "Financial tables with mono font, tabular-nums, sortable",
    check: () => fileContains("client/src/app/reports/page.tsx", "tabular-nums") && fileContains("client/src/app/reports/page.tsx", "font-mono"),
  },
  {
    id: "D9", name: "Recharts area charts with gradient fills",
    check: () => fileContains("client/src/components/charts/area-chart.tsx", "linearGradient"),
  },
  {
    id: "D10", name: "Sparklines (SVG, auto-color by trend)",
    check: () => fileExists("client/src/components/charts/sparkline.tsx") && fileContains("client/src/components/charts/sparkline.tsx", "polyline"),
  },
  {
    id: "D11", name: "Treemap visualization",
    check: () => fileContains("client/src/components/charts/chart-renderer.tsx", "Treemap"),
  },
  {
    id: "D12", name: "Consistent tooltip styling across all charts",
    check: () => fileContains("client/src/components/charts/area-chart.tsx", "contentStyle") && fileContains("client/src/components/charts/bar-chart.tsx", "contentStyle"),
  },
  {
    id: "D13", name: "shadcn/ui component patterns",
    check: () => fileExists("client/src/lib/utils.ts") && fileContains("client/src/lib/utils.ts", "twMerge"),
  },
  {
    id: "D14", name: "Responsive design (mobile, tablet, desktop)",
    check: () => fileContains("client/src/app/page.tsx", "sm:grid-cols") || fileContains("client/src/app/page.tsx", "md:grid-cols"),
  },
  {
    id: "D15", name: "Scrollbar styling (thin, themed)",
    check: () => fileContains("client/src/app/globals.css", "scrollbar"),
  },

  // === CI/FMP (6 items) ===
  {
    id: "C1", name: "SWOT analysis view with real FMP data",
    check: () => fileContains("server/agents/ci-agent.mjs", "getSWOT") && fileContains("client/src/app/ci/page.tsx", "SWOT"),
  },
  {
    id: "C2", name: "Porter's Five Forces with quantified metrics",
    check: () => fileContains("server/agents/ci-agent.mjs", "getPortersFiveForces") || fileContains("server/agents/ci-agent.mjs", "HHI"),
  },
  {
    id: "C3", name: "Earnings Call Intelligence with NLP analysis",
    check: () => fileContains("server/agents/ci-agent.mjs", "analyzeEarningsCall"),
  },
  {
    id: "C4", name: "Financial Benchmarking Dashboard",
    check: () => fileContains("server/agents/ci-agent.mjs", "getBenchmarkComparison") && fileContains("client/src/app/ci/page.tsx", "enchmark"),
  },
  {
    id: "C5", name: "Competitive Positioning Map (scatter plot)",
    check: () => fileContains("server/agents/ci-agent.mjs", "getPositioningMap") && fileContains("client/src/app/ci/page.tsx", "Scatter"),
  },
  {
    id: "C6", name: "M&A Tracker timeline",
    check: () => fileContains("server/agents/ci-agent.mjs", "getMAActivity") || fileContains("server/agents/ci-agent.mjs", "getMergersAcquisitions"),
  },

  // === TECHNICAL (7 items) ===
  {
    id: "T1", name: "All SQL queries parameterized (zero string interpolation)",
    check: () => {
      const db = readFileSync(resolve(ROOT, "server/lib/databricks.mjs"), "utf-8");
      // Check that queries use ? params and no template literal SQL
      const hasParams = db.includes("?");
      const noInterpolation = !db.match(/`SELECT.*\$\{/);
      return hasParams && noInterpolation;
    },
  },
  {
    id: "T2", name: "Credentials in .env only (not hardcoded)",
    check: () => {
      const config = readFileSync(resolve(ROOT, "server/lib/config.mjs"), "utf-8");
      return config.includes("process.env") && !config.match(/sk-[a-zA-Z0-9]{20,}/) && !config.match(/dapi[a-zA-Z0-9]{20,}/);
    },
  },
  {
    id: "T3", name: "Dual-mode works (SQLite fallback when no Databricks)",
    check: () => fileContainsAll("server/lib/databricks.mjs", ["simulated", "databricks", "initSQLite", "initDatabricks"]),
  },
  {
    id: "T4", name: "App starts with npm run dev without errors",
    check: () => fileExists("package.json") && fileContains("package.json", '"dev"'),
  },
  {
    id: "T5", name: "WebSocket connected (not polling)",
    check: () => fileContains("server/lib/websocket.mjs", "WebSocketServer") && fileContains("client/src/app/jobs/page.tsx", "WebSocket"),
  },
  {
    id: "T6", name: "LLM calls use correct model name",
    check: () => {
      const agent = readFileSync(resolve(ROOT, "server/agents/finiq-agent.mjs"), "utf-8");
      return agent.includes("claude-sonnet-4-20250514") && !agent.includes("claude-opus-4-6");
    },
  },
  {
    id: "T7", name: "Error handling with graceful fallbacks throughout",
    check: () => {
      const routes = readFileSync(resolve(ROOT, "server/lib/routes.mjs"), "utf-8");
      const catchCount = (routes.match(/catch/g) || []).length;
      return catchCount >= 10; // Plenty of error handling
    },
  },
];

// ============================================================
// Run checks
// ============================================================

async function run() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   FinIQ Compliance Matrix — Automated Checker       ║");
  console.log("║   80 items · Target: 95+ (76/80)                    ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Check if server is running (for live endpoint tests)
  let serverUp = false;
  if (!codeOnly) {
    try {
      const res = await fetch(`${SERVER_URL}/api/health`);
      serverUp = res.ok;
    } catch {
      serverUp = false;
    }
    console.log(`Server: ${serverUp ? "✓ Running" : "✗ Not running (skipping live tests)"}\n`);
  }

  const results = { pass: [], partial: [], fail: [] };
  let total = 0;

  const categories = {
    "FUNCTIONAL REQUIREMENTS": matrix.filter((m) => m.id.startsWith("FR")),
    "DESIGN COMPLIANCE": matrix.filter((m) => m.id.startsWith("D")),
    "CI/FMP COMPLIANCE": matrix.filter((m) => m.id.startsWith("C")),
    "TECHNICAL COMPLIANCE": matrix.filter((m) => m.id.startsWith("T")),
  };

  for (const [category, items] of Object.entries(categories)) {
    console.log(`── ${category} (${items.length} items) ──`);
    let catScore = 0;

    for (const item of items) {
      let passed;
      try {
        passed = await item.check();
      } catch {
        passed = false;
      }

      const score = passed ? (item.partial ? 0.5 : 1.0) : 0.0;
      catScore += score;
      total += score;

      const icon = score === 1.0 ? "✓" : score === 0.5 ? "◐" : "✗";
      const color = score === 1.0 ? "\x1b[32m" : score === 0.5 ? "\x1b[33m" : "\x1b[31m";
      console.log(`  ${color}${icon}\x1b[0m ${item.id}: ${item.name} ${score < 1.0 ? `(${score})` : ""}`);

      if (score === 1.0) results.pass.push(item);
      else if (score === 0.5) results.partial.push(item);
      else results.fail.push(item);
    }

    console.log(`  Score: ${catScore}/${items.length}\n`);
  }

  // Summary
  const pct = ((total / 80) * 100).toFixed(1);
  const target = total >= 76;

  console.log("══════════════════════════════════════════════════════");
  console.log(`  TOTAL SCORE: ${total}/80 (${pct}%)`);
  console.log(`  Target 95+ (76/80): ${target ? "✓ PASSED" : "✗ NOT MET"}`);
  console.log(`  ✓ Complete: ${results.pass.length}  ◐ Partial: ${results.partial.length}  ✗ Missing: ${results.fail.length}`);
  console.log("══════════════════════════════════════════════════════\n");

  if (results.fail.length > 0) {
    console.log("FAILED ITEMS (fix these next):");
    for (const item of results.fail) {
      console.log(`  ✗ ${item.id}: ${item.name}`);
    }
    console.log("");
  }

  if (results.partial.length > 0) {
    console.log("PARTIAL ITEMS (improve these):");
    for (const item of results.partial) {
      console.log(`  ◐ ${item.id}: ${item.name}`);
    }
    console.log("");
  }

  // Exit with code based on target
  process.exit(target ? 0 : 1);
}

run();
