import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat } from "docx";
import fs from "fs";

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 60, bottom: 60, left: 100, right: 100 };
const TW = 9360;

function hc(text, w) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: "1B2A4A", type: ShadingType.CLEAR }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] });
}
function tc(text, w, shade) {
  const o = { borders, width: { size: w, type: WidthType.DXA }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text: String(text || ""), font: "Arial", size: 18 })] })] };
  if (shade) o.shading = { fill: shade, type: ShadingType.CLEAR };
  return new TableCell(o);
}
function winnerCell(text, w, shade) {
  const colors = { "Ale": "27AE60", "Ours": "2980B9", "Tie": "8E44AD", "New": "E67E22", "Combine": "E67E22" };
  const color = Object.entries(colors).find(([k]) => text.startsWith(k))?.[1] || "333333";
  const o = { borders, width: { size: w, type: WidthType.DXA }, margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color, font: "Arial", size: 18 })] })] };
  if (shade) o.shading = { fill: shade, type: ShadingType.CLEAR };
  return new TableCell(o);
}
function mt(headers, rows, cw, winnerCol = -1) {
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: cw,
    rows: [
      new TableRow({ children: headers.map((h, i) => hc(h, cw[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((c, ci) => ci === winnerCol ? winnerCell(c, cw[ci], ri % 2 === 1 ? "F5F7FA" : null) : tc(c, cw[ci], ri % 2 === 1 ? "F5F7FA" : null))
      })),
    ] });
}

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: t, font: "Arial" })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text: t, font: "Arial" })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: t, font: "Arial" })] }); }
function p(t) { return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, font: "Arial", size: 22 })] }); }
function pb(l, v) { return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: l, bold: true, font: "Arial", size: 22 }), new TextRun({ text: v, font: "Arial", size: 22 })] }); }
function bullet(t) { return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: "Arial", size: 22 })] }); }
function numberedItem(t) { return new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: "Arial", size: 22 })] }); }
function emptyLine() { return new Paragraph({ spacing: { after: 120 }, children: [] }); }

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ] },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: "1B2A4A" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: "2C3E50" }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: "34495E" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } },
    },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "FinIQ Merge Plan — Confidential", italics: true, font: "Arial", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Amira Technologies | Page ", font: "Arial", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" })] })] }) },
    children: [
      // ========== TITLE PAGE ==========
      new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FinIQ Merge Plan", bold: true, font: "Arial", size: 56, color: "1B2A4A" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "Combining Farzaneh + Alessandro + Rajiv Builds", font: "Arial", size: 28, color: "555555" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Into a Unified Production-Ready Application", font: "Arial", size: 28, color: "555555" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: "Prepared: March 31, 2026", font: "Arial", size: 22, color: "777777" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "Authors: Farzaneh + Alessandro", font: "Arial", size: 22, color: "777777" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "Target Repo: github.com/quantumdatatechnologies/fin_iq", font: "Consolas", size: 20, color: "2980B9" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "Client: Mars, Incorporated", font: "Arial", size: 22, color: "777777" })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== EXECUTIVE SUMMARY ==========
      h1("1. Executive Summary"),
      p("All three builds have reached strong individual milestones against the SRS v3.1 requirements. Rather than continuing parallel efforts, this plan proposes merging the best components from each into a single unified application. The merged build will use Alessandro's repo (quantumdatatechnologies/fin_iq) as the base."),
      emptyLine(),
      pb("Farzaneh's build (v2-fresh): ", "80/80 compliance, Node/Express + Next.js, Anthropic LLM, OpenAI voice agent, WebSocket real-time, XLSX export, full job board backend, rate limiting, real Databricks schema documentation"),
      pb("Alessandro's build (Atlas): ", "50/50 compliance, pure Next.js monolith, Recharts, TanStack tables, OKLCH dark theme, Data Explorer with SQL builder, seeded simulated data, 16 FMP endpoints"),
      pb("Rajiv's build (Asimov): ", "94% compliance, CI module with 10 tabs (incl. Alerts, ESG, Analysts), intent-driven CI query engine, clean header with relevant competitor tickers, ProvenanceBadge, auto-detect chart type. Deployed live at finiq-app.onrender.com"),
      emptyLine(),
      p("The merged application will be a Next.js monolith (Alessandro's architecture) enhanced with Farzaneh's backend intelligence and Rajiv's competitive intelligence module."),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== SIDE BY SIDE ==========
      h1("2. Side-by-Side Comparison"),
      p("Color key: Green = Ale, Blue = Ours, Purple = Rajiv, Orange = combine/new"),
      emptyLine(),
      mt(
        ["Component", "Farzaneh", "Alessandro", "Rajiv", "Winner"],
        [
          ["Tech Stack", "Node/Express + Next.js", "Pure Next.js + API routes", "Next.js + API routes", "Ale"],
          ["Data Explorer", "Basic table view", "SQL builder, charts, inspector", "None", "Ale"],
          ["Dashboard", "3 KPI cards", "6 KPIs, area chart, P&L", "Chat-first, 4 prompts", "Ale"],
          ["Reports / PES", "KPI calcs", "Narratives, WWW/WNWW", "Entity+period selector", "Ale"],
          ["Styling", "OKLCH dark", "Full OKLCH, polished", "Google-light only", "Ale"],
          ["Admin", "Config viewer", "Templates, users, health", "DB test, entity tree", "Ale"],
          ["CI Module", "SWOT, Porter's", "7 tabs, positioning", "10 tabs, Alerts, ESG", "Rajiv"],
          ["Header/Ticker", "Scrolling all stocks", "Scrolling all stocks", "Competitor-only, LIVE", "Rajiv"],
          ["Provenance", "None", "None", "Source badge on all", "Rajiv"],
          ["Chart Auto-detect", "None", "Manual toggle", "Area vs bar auto", "Rajiv"],
          ["Voice Agent", "OpenAI Realtime", "None", "None", "Ours"],
          ["NL Query", "Anthropic LLM", "Regex", "Regex", "Ours"],
          ["Job Board", "Full backend, SLA", "UI + filter only", "Mock setTimeout", "Ours"],
          ["WebSocket", "Server + client", "None", "None", "Ours"],
          ["Export", "XLSX Mars-branded", "None", "CSV only", "Ours"],
          ["Rate Limiting", "100 RPM + 10 chat", "None", "None", "Ours"],
          ["DB Safety", "maxRows, SELECT-only", "maxRows, LIMIT append", "None", "Ours + New"],
          ["Schema Docs", "Full 21-object ref", "None", "None", "Ours"],
        ],
        [1600, 1700, 1700, 1700, 2660],
        4
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== MERGE STRATEGY ==========
      h1("3. Merge Strategy"),

      h2("3.1 Base: Alessandro's Codebase"),
      p("We use Alessandro's repo as the foundation because:"),
      bullet("Pure Next.js monolith is simpler to deploy and maintain than separate Node/Express + Next.js"),
      bullet("His UI components, styling system, and page layouts are more polished"),
      bullet("His Data Explorer is production-ready and would be expensive to rebuild"),
      bullet("His compliance matrix structure can be extended to cover the full 80 items"),

      h2("3.2 What We Cherry-Pick From Rajiv's Build"),

      h3("A. CI Module (REPLACE Ale's competitive page)"),
      bullet("Port his 10-tab CI structure: Overview, Financials, Earnings, Benchmarking, Strategy, ESG, Analysts, News, SWOT, Alerts"),
      bullet("Adopt his intent-driven CI query engine (isCIQuery, detectCompanies, detectMetrics, detectIntent)"),
      bullet("Adopt his CIRenderer block system (ci-summary, ci-comparison, ci-chart, ci-news, ci-profile)"),
      bullet("Port Alerts system: custom threshold rules stored in localStorage"),
      bullet("Adapt styling to Ale's OKLCH dark theme (Rajiv uses light-only Google palette)"),
      bullet("Estimated effort: 1 day"),

      h3("B. Header Design (REPLACE scrolling ticker)"),
      bullet("Remove Ale's full stock ticker marquee (per Ale's request: 'not AAPL, TESLA...')"),
      bullet("Adopt Rajiv's cleaner ticker: only Mars competitor tickers (MDLZ, HSY, GIS, CL, UL, SJM)"),
      bullet("Keep 'LIVE Databricks' indicator with pulsing dot"),
      bullet("Adapt to dark theme"),
      bullet("Estimated effort: 0.5 day"),

      h3("C. ProvenanceBadge Component (ADD)"),
      bullet("Shows data source on every response: 'Source: finiq_vw_pl_unit | Period 13, 2025'"),
      bullet("Add to chat responses, PES reports, Data Explorer results"),
      bullet("Estimated effort: 0.25 day"),

      h3("D. SimpleChart Auto-Detection (ADOPT pattern)"),
      bullet("Auto-detects time-series (area chart) vs comparison (bar chart) from data shape"),
      bullet("Integrate into Ale's existing chart components"),
      bullet("Estimated effort: 0.25 day"),

      h2("3.3 What We Add From Farzaneh's Build"),

      h3("E. Voice Agent (NEW PAGE: /voice)"),
      bullet("Port OpenAI Realtime API integration as Next.js API route + client component"),
      bullet("WebSocket proxy: /api/voice-ws endpoint"),
      bullet("Function calling: queries Mars data, CI, submits jobs mid-conversation"),
      bullet("Sage voice, interrupt handling, multi-turn memory"),
      bullet("Estimated effort: 1 day"),

      h3("F. Anthropic LLM Integration (REPLACE regex query parsing)"),
      bullet("Replace src/app/api/query/route.ts regex logic with Anthropic Haiku/Sonnet"),
      bullet("Real SQL generation from natural language (not pattern matching)"),
      bullet("Intent classification, multi-turn context, source attribution"),
      bullet("Schema context injection (using REAL_DATABRICKS_SCHEMA.md)"),
      bullet("Estimated effort: 0.5 day"),

      h3("G. Job Board Backend (ENHANCE existing UI)"),
      bullet("Keep Alessandro's job board frontend (KPI cards, filtering, detail panel)"),
      bullet("Add server-side job processing: agent pool, SLA routing, retry logic"),
      bullet("Add WebSocket for real-time job status updates"),
      bullet("Store job results (currently in-memory; discuss persistence with Cesar)"),
      bullet("Estimated effort: 1 day"),

      h3("H. Export Service (ADD to existing pages)"),
      bullet("XLSX export for Reports, Data Explorer, and Dashboard"),
      bullet("Mars-branded formatting (headers, colors, logos)"),
      bullet("PDF export for PES reports (optional, Phase 2)"),
      bullet("Estimated effort: 0.5 day"),

      h3("I. Safety & Performance Layer (ADD to data layer)"),
      bullet("Query timeout: 30 seconds for all Databricks queries"),
      bullet("Table whitelist: block LLM from querying 5.7B-row fact tables"),
      bullet("Rate limiting: 100 RPM general, 10 RPM for LLM/chat endpoints"),
      bullet("Result caching: Redis-compatible in-memory cache for repeated queries"),
      bullet("Estimated effort: 0.5 day"),

      h3("J. Real Databricks Schema (UPDATE data layer)"),
      bullet("Rename simulated data to match real column names (Entity->Unit, Account->RL)"),
      bullet("Update all queries to use production schema names"),
      bullet("Add warehouse connection config with HTTP path"),
      bullet("Inject REAL_DATABRICKS_SCHEMA.md into LLM context for SQL generation"),
      bullet("Estimated effort: 1 day"),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== COMPONENT DECISIONS ==========
      h1("4. Component-by-Component Decisions"),

      mt(
        ["Component", "Decision", "Source", "Notes"],
        [
          ["src/app/layout.tsx", "Keep Ale's", "Ale", "Better theme provider, font loading"],
          ["src/app/page.tsx (Dashboard)", "Keep Ale's", "Ale", "6 KPIs, area chart, P&L table"],
          ["src/app/explorer/", "Keep Ale's", "Ale", "His strongest feature"],
          ["src/app/reports/", "Keep Ale's, enhance", "Ale + Ours", "Add XLSX export button"],
          ["src/app/competitive/", "Replace with Rajiv's", "Rajiv", "10-tab CI + Alerts, styled to dark theme"],
          ["src/app/query/", "Keep Ale's frontend", "Ale + Ours", "Replace regex API with Anthropic LLM"],
          ["src/app/jobs/", "Keep Ale's UI, add backend", "Ale + Ours", "Add WebSocket + agent processing"],
          ["src/app/admin/", "Keep Ale's", "Ale", "More complete (templates, users, health)"],
          ["src/app/voice/ (NEW)", "Add from ours", "Ours", "Entirely new page"],
          ["src/components/ui/", "Keep Ale's", "Ale", "Richer component library"],
          ["src/components/sidebar.tsx", "Keep Ale's, add Voice link", "Ale", "Add voice nav item"],
          ["src/components/header.tsx", "Replace ticker with Rajiv's", "Rajiv", "Competitor-only tickers + LIVE badge"],
          ["ProvenanceBadge (NEW)", "Add from Rajiv", "Rajiv", "Data source badge on all responses"],
          ["SimpleChart auto-detect", "Adopt pattern from Rajiv", "Rajiv", "Area vs bar auto-selection"],
          ["CI query engine", "Add from Rajiv", "Rajiv", "Intent routing, fuzzy company matching"],
          ["src/data/databricks.ts", "Keep Ale's, add safeguards", "Ale + Ours", "Add timeout, whitelist, rate limit"],
          ["src/data/fmp.ts", "Keep Ale's", "Ale", "16 endpoints, well-structured"],
          ["src/data/simulated.ts", "Rebuild", "New", "Match real Databricks column names"],
          ["src/data/prompts.ts", "Keep Ale's", "Ale", "18 prompts with variable resolution"],
          ["src/stores/", "Keep Ale's", "Ale", "Zustand, clean"],
          ["compliance/", "Extend to 80 items", "Both", "Merge both matrices"],
          ["REAL_DATABRICKS_SCHEMA.md", "Add from ours", "Ours", "Critical for LLM + Data Explorer"],
          ["globals.css", "Keep Ale's", "Ale", "Full OKLCH system"],
        ],
        [2600, 1800, 1400, 3560],
        2
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== EXECUTION PLAN ==========
      h1("5. Execution Plan"),

      h2("Phase 1: Foundation (Day 1)"),
      numberedItem("Create 'merged' branch on Alessandro's repo"),
      numberedItem("Add REAL_DATABRICKS_SCHEMA.md and scan outputs"),
      numberedItem("Rebuild simulated data to match real Databricks column names (Entity->Unit, Account->RL)"),
      numberedItem("Update all existing queries to use real schema names"),
      numberedItem("Verify app runs with renamed simulated data"),
      numberedItem("Run compliance check — baseline score"),

      h2("Phase 2: Intelligence Layer (Day 2)"),
      numberedItem("Add Anthropic SDK dependency"),
      numberedItem("Replace /api/query regex with LLM-powered SQL generation"),
      numberedItem("Inject schema context into LLM prompts"),
      numberedItem("Add query safety layer: timeout, whitelist, rate limiting"),
      numberedItem("Port Voice Agent as /voice page + /api/voice-ws"),
      numberedItem("Add sidebar navigation for Voice"),

      h2("Phase 3: Enhancement + Rajiv Cherry-Pick (Day 3)"),
      numberedItem("Port Rajiv's CI module (10 tabs + Alerts) — replace Ale's competitive page"),
      numberedItem("Port Rajiv's header design (competitor-only ticker + LIVE badge)"),
      numberedItem("Add ProvenanceBadge component from Rajiv"),
      numberedItem("Adopt SimpleChart auto-detection pattern"),
      numberedItem("Enhance Job Board with server-side processing logic"),
      numberedItem("Add WebSocket for real-time job status"),
      numberedItem("Add XLSX export to Reports, Explorer, Dashboard"),
      numberedItem("Add result caching layer"),
      numberedItem("Run full compliance check — target 80/80"),

      h2("Phase 4: Polish & Test (Day 4)"),
      numberedItem("Test all pages with simulated data"),
      numberedItem("Test Databricks connection with real production data (with safeguards)"),
      numberedItem("Fix any compliance gaps"),
      numberedItem("Update compliance matrix to 80-item version"),
      numberedItem("Push final version to Alessandro's repo"),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== RISK & SAFETY ==========
      h1("6. Risk Mitigation"),

      h2("6.1 Code Safety"),
      bullet("Alessandro's current main branch stays untouched — merge happens on a new branch"),
      bullet("Farzaneh's v2-fresh branch stays untouched — used as reference only"),
      bullet("All work on 'merged' branch — only promoted to main after both approve"),

      h2("6.2 Real Data Safety"),
      bullet("3 fact tables are 5.7B+ rows each — NEVER queried directly by app or LLM"),
      bullet("Views used for all PES/financial queries — always filtered by Unit_Alias"),
      bullet("Query timeout: 30 seconds hard limit"),
      bullet("Table whitelist prevents LLM from generating SQL against base tables"),
      bullet("maxRows: 10,000 per query (already in Databricks connector)"),

      h2("6.3 Secrets Management"),
      bullet("No tokens/keys in code — all via .env"),
      bullet("GitHub push protection active (already caught a leak in our repo)"),
      bullet("Databricks token, Anthropic key, FMP key, OpenAI key all in .env only"),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== WHAT THE MERGED APP LOOKS LIKE ==========
      h1("7. The Merged Application"),
      p("After merge, the application will have:"),
      emptyLine(),

      mt(
        ["Feature", "Status", "Source"],
        [
          ["Dashboard (6 KPIs, charts, P&L table)", "Complete", "Ale"],
          ["Data Explorer (SQL builder, charts, column inspector)", "Complete", "Ale"],
          ["Reports / PES (narratives, rankings, WWW/WNWW)", "Complete", "Ale"],
          ["Competitive Intel (10 tabs, Alerts, ESG, Analysts)", "Complete", "Rajiv + Both"],
          ["NL Query (LLM-powered SQL, inline charts, 18 prompts)", "Complete", "Both"],
          ["Job Board (full lifecycle, SLA, real-time status)", "Complete", "Both"],
          ["Voice Agent (conversational, function calling)", "Complete", "Farzaneh"],
          ["Admin (connection, templates, users, health)", "Complete", "Ale"],
          ["XLSX Export (Mars-branded)", "Complete", "Farzaneh"],
          ["Bloomberg OKLCH Dark Theme", "Complete", "Ale"],
          ["Clean Header (competitor tickers + LIVE)", "Complete", "Rajiv"],
          ["ProvenanceBadge (data source tracking)", "Complete", "Rajiv"],
          ["Smart Chart Auto-Detection", "Complete", "Rajiv"],
          ["Real Databricks Connection (with safeguards)", "Complete", "Both"],
          ["Query Safety (timeout, whitelist, rate limiting)", "Complete", "Farzaneh"],
          ["WebSocket Real-time Updates", "Complete", "Farzaneh"],
          ["Compliance Matrix (80 items)", "Target: 80/80", "Both"],
        ],
        [4500, 1800, 3060],
        2
      ),

      emptyLine(),
      p("Target: A single, production-ready application with the best UI from Alessandro and the best backend intelligence from Farzaneh. Ready for the April 21 MLT demo."),

      new Paragraph({ children: [new PageBreak()] }),

      // ========== REPO PLAN ==========
      h1("8. Repository Plan"),
      emptyLine(),
      pb("Target repo: ", "github.com/quantumdatatechnologies/fin_iq"),
      pb("Merge branch: ", "'merged' (created from main)"),
      pb("Promote to main: ", "After both Farzaneh and Alessandro approve"),
      pb("Farzaneh's reference: ", "github.com/farfar1985/FinIQ (v2-fresh branch, read-only during merge)"),
      pb("Rajiv's reference: ", "github.com/rajivchandrasekaran-paintrobot/finiq (cherry-pick CI + header only)"),
      emptyLine(),
      p("Going forward, all development happens on Alessandro's repo. Farzaneh's and Rajiv's repos remain as archive/reference."),

      new Paragraph({ children: [new PageBreak()] }),

      emptyLine(),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "C:\\Users\\farza\\Desktop\\FinIQ Merge Plan.docx";
fs.writeFileSync(outPath, buffer);
console.log(`Saved to ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
