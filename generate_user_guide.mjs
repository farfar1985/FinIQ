import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, InternalHyperlink, Bookmark
} from './node_modules/docx/dist/index.mjs';
import fs from 'fs';

// ── Color palette ──
const BLUE_DARK = "1B3A5C";
const BLUE_MED = "2E75B6";
const BLUE_LIGHT = "D5E8F0";
const BLUE_ACCENT = "4A90D9";
const GRAY_DARK = "333333";
const GRAY_MED = "666666";
const GRAY_LIGHT = "F2F2F2";
const WHITE = "FFFFFF";

// ── Helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const PAGE_WIDTH = 12240;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9360

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })],
  });
}

function dataCell(text, width, shade = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: GRAY_LIGHT, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK })] })],
  });
}

function spacer(pts = 200) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}

function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    ...opts,
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_DARK, ...(opts.run || {}) })],
  });
}

function boldBodyPara(label, text) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [
      new TextRun({ text: label, font: "Arial", size: 22, color: GRAY_DARK, bold: true }),
      new TextRun({ text, font: "Arial", size: 22, color: GRAY_DARK }),
    ],
  });
}

function bulletItem(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80, line: 276 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_DARK })],
  });
}

function subBulletItem(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 1 },
    spacing: { after: 60, line: 276 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_DARK })],
  });
}

function tipBox(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120, line: 276 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE_ACCENT, space: 8 } },
    children: [
      new TextRun({ text: "Tip: ", font: "Arial", size: 22, bold: true, color: BLUE_MED }),
      new TextRun({ text, font: "Arial", size: 22, color: GRAY_DARK }),
    ],
  });
}

function sectionIntro(text) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: GRAY_MED, italics: true })],
  });
}

// ── Build document ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BLUE_DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BLUE_MED },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: BLUE_ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [
    // ════════════════════ COVER PAGE ════════════════════
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        spacer(600),
        spacer(600),
        spacer(600),
        spacer(600),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE_MED, space: 12 } },
          children: [new TextRun({ text: "Amira FinIQ", font: "Arial", size: 72, bold: true, color: BLUE_DARK })],
        }),
        spacer(100),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "User Guide", font: "Arial", size: 52, color: BLUE_MED })],
        }),
        spacer(100),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Unified Financial Analytics Hub", font: "Arial", size: 28, color: GRAY_MED, italics: true })],
        }),
        spacer(600),
        spacer(600),
        spacer(600),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "April 2026", font: "Arial", size: 24, color: GRAY_MED })],
        }),
      ],
    },

    // ════════════════════ TOC + MAIN CONTENT ════════════════════
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE_LIGHT, space: 4 } },
            children: [
              new TextRun({ text: "Amira FinIQ \u2014 User Guide", font: "Arial", size: 18, color: GRAY_MED, italics: true }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: BLUE_LIGHT, space: 4 } },
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: GRAY_MED }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_MED }),
            ],
          })],
        }),
      },
      children: [
        // ── Table of Contents (manual for Google Docs compatibility) ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
        spacer(80),
        ...([
          ["sec1", "1. Introduction"],
          ["sec2", "2. Getting Started"],
          ["sec3", "3. Dashboard"],
          ["sec4", "4. Query Interface"],
          ["sec5", "5. Financial Reports"],
          ["sec6", "6. Competitive Intelligence"],
          ["sec7", "7. Enterprise Agent Job Board"],
          ["sec8", "8. Data Explorer"],
          ["sec9", "9. Voice Agent"],
          ["sec10", "10. Admin Panel"],
          ["sec11", "11. Tips and Best Practices"],
          ["sec12", "12. Glossary"],
        ]).map(([anchor, title]) =>
          new Paragraph({
            spacing: { after: 100, line: 360 },
            children: [new InternalHyperlink({
              anchor,
              children: [new TextRun({ text: title, font: "Arial", size: 24, color: BLUE_MED, underline: {} })],
            })],
          })
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 1. INTRODUCTION ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec1", children: [new TextRun("1. Introduction")] })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 What is FinIQ?")] }),
        bodyPara("Amira FinIQ is a unified financial analytics platform that consolidates Mars\u2019s Period End Summary (PES) reporting and Competitive Intelligence capabilities into a single intelligent hub. Powered by AI and connected to Mars\u2019s Databricks production warehouse in real time, FinIQ transforms how financial teams access, analyze, and act on data."),
        bodyPara("Instead of switching between separate tools for internal performance summaries and competitor analysis, FinIQ provides a single interface where natural language questions produce instant, sourced answers drawn from Mars\u2019s own financial data, live competitor market data, and macroeconomic indicators."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Key Capabilities")] }),
        bulletItem("Real-time financial analytics from Mars\u2019s Databricks production warehouse"),
        bulletItem("AI-powered natural language queries \u2014 ask questions in plain English"),
        bulletItem("Competitive intelligence with live market data for 10 tracked competitors"),
        bulletItem("Enterprise agent job board for complex, background-processed queries"),
        bulletItem("Voice interaction \u2014 hands-free data access via speech"),
        bulletItem("Budget variance analysis (Actual vs. Replan)"),
        bulletItem("Macroeconomic context enrichment \u2014 understand why trends are happening"),
        bulletItem("Period End Summary generation with executive narratives"),
        bulletItem("XLSX export with Mars-branded formatting"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Data Sources")] }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2400, 4560, 2400],
          rows: [
            new TableRow({ children: [
              headerCell("Source", 2400),
              headerCell("What It Provides", 4560),
              headerCell("Used In", 2400),
            ]}),
            new TableRow({ children: [
              dataCell("Databricks (FinSight)", 2400),
              dataCell("Internal financials \u2014 P&L, revenue, organic growth, NCFO, budget variance, 766 org units, 725 reporting lines", 4560),
              dataCell("Dashboard, Query, Reports, Jobs", 2400),
            ]}),
            new TableRow({ children: [
              dataCell("FMP API", 2400, true),
              dataCell("Competitor stock prices, financials, earnings transcripts, analyst estimates, M&A, ESG, news", 4560, true),
              dataCell("Competitive Intelligence, Query", 2400, true),
            ]}),
            new TableRow({ children: [
              dataCell("QML / Q.Enterprise", 2400),
              dataCell("Macroeconomic indicators \u2014 consumer confidence, CPI, commodity futures, FRED economic data (122K+ datasources)", 4560),
              dataCell("Query (\u201CWhy\u201D follow-up chips)", 2400),
            ]}),
            new TableRow({ children: [
              dataCell("OpenAI", 2400, true),
              dataCell("AI processing \u2014 natural language understanding, SQL generation, narrative synthesis, follow-up suggestions", 4560, true),
              dataCell("All sections", 2400, true),
            ]}),
          ],
        }),
        spacer(),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 2. GETTING STARTED ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec2", children: [new TextRun("2. Getting Started")] })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Accessing the Application")] }),
        bodyPara("Open the deployed URL in any modern web browser. Google Chrome is recommended for the best experience, including voice agent functionality."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Navigation")] }),
        bodyPara("The application uses a collapsible left sidebar for navigation. The main sections are:"),
        bulletItem("Dashboard \u2014 Executive KPI overview"),
        bulletItem("Query \u2014 Natural language question interface"),
        bulletItem("Reports \u2014 PES narratives and budget variance"),
        bulletItem("Competitive Intelligence \u2014 Competitor analysis (10 tabs)"),
        bulletItem("Jobs \u2014 Enterprise agent job board"),
        bulletItem("Data Explorer \u2014 Direct Databricks catalog browsing"),
        spacer(80),
        bodyPara("Additional access points include the Voice Agent (microphone icon) and Admin Panel."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 First-Time Tips")] }),
        bulletItem("The Dashboard loads automatically with cached KPI data on your first visit."),
        bulletItem("The Databricks serverless warehouse may take 2\u20133 minutes to warm up on first access. This is normal. A keep-alive system pings every 5 minutes to prevent idle timeout after that."),
        bulletItem("The header displays a \u201CLIVE\u201D badge confirming you are connected to Mars\u2019s production Databricks warehouse."),
        bulletItem("Competitor stock tickers scroll across the top showing real-time prices from FMP API."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 3. DASHBOARD ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec3", children: [new TextRun("3. Dashboard")] })] }),
        sectionIntro("Executive snapshot of Mars financial performance at a glance."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 What You See")] }),
        bulletItem("6 KPI Cards \u2014 Organic Growth, MAC Shape %, A&CP Shape %, CE Shape %, Controllable Overhead Shape %, NCFO"),
        bulletItem("Revenue Trend Charts \u2014 Area charts showing revenue over time"),
        bulletItem("P&L Summary Table \u2014 Key profit and loss metrics"),
        bulletItem("Competitor Overview Card \u2014 Live stock prices for tracked competitors"),
        bulletItem("Revenue Treemap \u2014 Visual breakdown of revenue distribution across business units"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 How to Use")] }),
        bodyPara("The Dashboard loads automatically when you access the application. No manual action is required."),
        bulletItem("KPI cards display current period vs. last year with directional indicators (green for up, red for down)."),
        bulletItem("Data refreshes automatically every 5 minutes from the Databricks cache."),
        bulletItem("The competitor card shows live stock prices pulled from the FMP API."),
        bulletItem("The treemap provides an at-a-glance view of which business units contribute the most revenue."),

        tipBox("On first load after a period of inactivity, the dashboard may take 2\u20133 minutes to populate while the Databricks warehouse warms up. Subsequent loads are near-instant from cache."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 4. QUERY INTERFACE ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec4", children: [new TextRun("4. Query Interface")] })] }),
        sectionIntro("Ask any financial question in plain English and get instant, sourced answers."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 How to Use")] }),
        bulletItem("Type a question in the chat box at the bottom of the screen."),
        bulletItem("The AI translates your question into SQL, runs it against Databricks, and returns a formatted answer \u2014 often with charts."),
        bulletItem("Click follow-up chips below any response to drill deeper. These are contextually generated based on your previous answer."),
        bulletItem("Click \u201CShow as chart\u201D to visualize any tabular result."),
        bulletItem("Recent queries are saved locally for quick re-access."),
        bulletItem("Hover over any message (yours or the AI\u2019s) to reveal the copy button."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 What You Can Ask")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Financial Queries")] }),
        bodyPara("Revenue, P&L, organic growth, margins, NCFO for any entity and period."),
        bulletItem("\"What is Petcare organic growth for P03 FY2026?\""),
        bulletItem("\"Show me Mars Inc revenue YTD\""),
        bulletItem("\"Compare Royal Canin vs Pedigree MAC Shape\""),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Budget Variance")] }),
        bodyPara("Compare actual performance against replan (budget) figures."),
        bulletItem("\"Show me actual vs replan for Mars Inc P03 FY2026\""),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Competitor Queries")] }),
        bodyPara("Pull live FMP data inline without switching to the Competitive Intelligence tab."),
        bulletItem("\"How is Nestle performing?\""),
        bulletItem("\"What is Mondelez revenue growth?\""),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Cross-Reference (Internal + External)")] }),
        bodyPara("Combine Mars\u2019s Databricks data with competitor FMP data in a single answer."),
        bulletItem("\"Compare Mars organic growth to Nestle\""),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Dashboard & Job Board")] }),
        bulletItem("\"How is Mars doing?\" \u2014 returns KPI summary inline"),
        bulletItem("\"What\u2019s on the job board?\" \u2014 shows active jobs inline"),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Macroeconomic Context")] }),
        bodyPara("When query results show declining or growing trends, a follow-up chip appears:"),
        bulletItem("\"Why is this happening?\" (for declining trends)"),
        bulletItem("\"What\u2019s driving this?\" (for growing trends)"),
        bodyPara("Clicking these chips fetches macroeconomic data (consumer confidence, commodity futures, CPI) and generates a narrative explaining potential external drivers behind internal trends."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.3 Provenance Badges")] }),
        bodyPara("Every response displays a colored badge showing the data source:"),
        bulletItem("Databricks \u2014 Mars internal financial data"),
        bulletItem("FMP API \u2014 Competitor market data"),
        bulletItem("Databricks + FMP \u2014 Cross-reference response"),
        bulletItem("MACRO \u2014 Macroeconomic context from QML/Q.Enterprise"),
        bulletItem("Job Board \u2014 Agent job board data"),
        bulletItem("Dashboard Cache \u2014 Cached KPI summary"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.4 Tips for Best Results")] }),
        bulletItem("Use official entity names (e.g., \u201CMW USA Market\u201D) for highest accuracy. The system recognizes ~45 common aliases (e.g., \u201CPetcare\u201D, \u201CRoyal Canin\u201D, \u201CMars Inc\u201D)."),
        bulletItem("For budget variance queries, always specify the period and fiscal year."),
        bulletItem("Multi-turn context is maintained \u2014 after a periodic query, you can say \u201Cnow show me YTD\u201D without repeating the entity."),
        bulletItem("Ask \u201CShow as chart\u201D or \u201CPlot this\u201D after any tabular result to get a visualization. The system auto-detects bar vs. area charts and formats percentages correctly."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 5. FINANCIAL REPORTS ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec5", children: [new TextRun("5. Financial Reports")] })] }),
        sectionIntro("Generate structured financial reports \u2014 Period End Summaries and Budget Variance analysis."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Period End Summary (PES)")] }),
        bodyPara("The PES report generates AI-powered executive narratives for 6 Key Performance Indicators, providing performance context with rankings and trend analysis."),

        boldBodyPara("How to generate a PES report:", ""),
        bulletItem("Select an entity from the dropdown (500+ Mars organizational units available)."),
        bulletItem("Select the fiscal year (FY2020\u2013FY2026) and period (P01\u2013P13)."),
        bulletItem("Choose a format:"),
        subBulletItem("Summary \u2014 Balanced overview of performance"),
        subBulletItem("What\u2019s Working Well (WWW) \u2014 Positive performance highlights"),
        subBulletItem("What\u2019s Not Working Well (WNWW) \u2014 Areas requiring attention"),
        bulletItem("Click Generate. The AI produces the narrative within seconds."),

        boldBodyPara("Reading the report:", ""),
        bulletItem("Each KPI is displayed as a collapsible card. Click the header to expand or collapse."),
        bulletItem("KPI detail tables show Current Year vs. Last Year with basis point (bps) changes."),
        bulletItem("Click any row in a detail table to drill down into sub-unit breakdowns."),
        bulletItem("Rankings show RANK 1, TOP 3, and BOTTOM 3 performers within each KPI."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Budget Variance")] }),
        bodyPara("Compares Actual financial performance against Replan (budget revision) figures. This is critical for finance teams tracking plan adherence."),
        bulletItem("The entity dropdown shows names from the replan table (UPPERCASE format)."),
        bulletItem("Shows variance amounts and percentages for each reporting line."),
        bulletItem("Only rows with meaningful replan data are displayed to keep the view clean."),
        bulletItem("If no data exists for the selected period, an amber message shows which periods have available data."),
        bulletItem("Default view: P03 FY2026 / MARS INCORPORATED (R) \u2014 where data is known to exist."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Custom Report Builder")] }),
        bodyPara("For tailored analysis, use the Custom Report Builder to select specific KPIs, an entity, and a period range. The system queries Databricks directly and presents the results."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.4 Export")] }),
        bodyPara("Reports can be exported to XLSX format with Mars-branded formatting for use in presentations and distribution."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 6. COMPETITIVE INTELLIGENCE ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec6", children: [new TextRun("6. Competitive Intelligence")] })] }),
        sectionIntro("Monitor and analyze Mars\u2019s competitive landscape with live market data."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Tracked Competitors")] }),
        bodyPara("FinIQ tracks 10 competitors across Mars\u2019s key business segments:"),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [headerCell("Competitor", 4680), headerCell("Ticker", 4680)] }),
            ...[
              ["Nestle", "NSRGY"], ["Mondelez International", "MDLZ"], ["The Hershey Company", "HSY"],
              ["Ferrero", "Private"], ["Colgate-Palmolive", "CL"], ["General Mills", "GIS"],
              ["Kellanova", "K"], ["J.M. Smucker", "SJM"], ["Freshpet", "FRPT"], ["IDEXX Laboratories", "IDXX"],
            ].map(([name, ticker], i) => new TableRow({ children: [
              dataCell(name, 4680, i % 2 === 1), dataCell(ticker, 4680, i % 2 === 1),
            ]})),
          ],
        }),
        spacer(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Analysis Tabs")] }),
        bodyPara("The Competitive Intelligence page provides 10 specialized analysis views:"),
        spacer(40),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [800, 2000, 6560],
          rows: [
            new TableRow({ children: [headerCell("#", 800), headerCell("Tab", 2000), headerCell("Description", 6560)] }),
            ...([
              ["1", "Overview", "Summary cards for all 10 competitors with key financial metrics"],
              ["2", "Financials", "Revenue, margins, and growth rates from live FMP API data"],
              ["3", "Earnings Intelligence", "NLP sentiment analysis on earnings call transcripts, topic extraction, and key quotes"],
              ["4", "Benchmarking", "Peer-to-peer comparison tables (Organic Growth %, Price, Volume, Mix)"],
              ["5", "Strategy", "Strategic positioning analysis for each competitor"],
              ["6", "ESG", "Environmental, Social, and Governance scores and rankings"],
              ["7", "Analysts", "Analyst estimates and consensus price targets"],
              ["8", "News", "Latest news and press releases per competitor"],
              ["9", "SWOT", "Auto-generated quarterly SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)"],
              ["10", "M&A Timeline", "Visual timeline of mergers, acquisitions, and divestitures with deal cards and links"],
            ]).map(([n, tab, desc], i) => new TableRow({ children: [
              dataCell(n, 800, i % 2 === 1), dataCell(tab, 2000, i % 2 === 1), dataCell(desc, 6560, i % 2 === 1),
            ]})),
          ],
        }),
        spacer(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Porter\u2019s Five Forces")] }),
        bodyPara("A quantified competitive force analysis with peer data and scoring. Each of the five forces is evaluated and scored based on available market data."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.4 Alerts")] }),
        bodyPara("Set custom threshold rules to be notified when competitor metrics cross defined boundaries. For example: alert when a competitor\u2019s stock drops below a specific price. Alert rules are saved locally in your browser."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 7. JOB BOARD ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec7", children: [new TextRun("7. Enterprise Agent Job Board")] })] }),
        sectionIntro("Submit complex financial queries as background jobs processed by AI agents."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 How to Submit a Job")] }),
        bulletItem("From the Query page: After receiving a response, click \u201CSubmit to Job Board\u201D to create a deeper analysis job based on that query."),
        bulletItem("From the Jobs page: Click \u201CNew Job\u201D to submit directly with a title, description, and priority level."),
        bulletItem("Via voice: Say \u201CSubmit a job for [description]\u201D to the voice agent."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2 Priority Levels & SLAs")] }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ children: [headerCell("Priority", 3120), headerCell("SLA Target", 3120), headerCell("Use When", 3120)] }),
            new TableRow({ children: [dataCell("Critical", 3120), dataCell("1 hour", 3120), dataCell("Urgent executive requests", 3120)] }),
            new TableRow({ children: [dataCell("High", 3120, true), dataCell("4 hours", 3120, true), dataCell("Time-sensitive analysis", 3120, true)] }),
            new TableRow({ children: [dataCell("Medium", 3120), dataCell("8 hours", 3120), dataCell("Standard analysis tasks", 3120)] }),
            new TableRow({ children: [dataCell("Low", 3120, true), dataCell("24 hours", 3120, true), dataCell("Background research", 3120, true)] }),
          ],
        }),
        spacer(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3 Job Lifecycle")] }),
        bodyPara("Each job progresses through the following stages:"),
        bulletItem("Submitted \u2014 Job created and queued"),
        bulletItem("Queued \u2014 Waiting for an available AI agent"),
        bulletItem("Processing \u2014 Agent is actively working on the query"),
        bulletItem("Completed \u2014 Results available for review"),
        bulletItem("Failed \u2014 Error occurred (automatic retry available)"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.4 Features")] }),
        bulletItem("Real-time status updates via live streaming \u2014 watch jobs progress in real time."),
        bulletItem("Edit jobs: Change the title or priority on any non-processing job. The SLA automatically recalculates."),
        bulletItem("Export results to XLSX with Mars-branded formatting."),
        bulletItem("Job persistence: All jobs survive application restarts."),
        bulletItem("Schedule recurring jobs on a cron schedule (e.g., \u201CRun this every Monday at 9am\u201D)."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 8. DATA EXPLORER ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec8", children: [new TextRun("8. Data Explorer")] })] }),
        sectionIntro("Directly browse and query the Databricks catalog for advanced users."),

        bulletItem("Browse the Databricks catalog structure \u2014 tables, views, and columns."),
        bulletItem("SQL query builder \u2014 construct and execute queries against production data."),
        bulletItem("Data dictionary sidebar \u2014 view column definitions and data relationships."),
        bulletItem("Results displayed in interactive tables with sorting and filtering."),

        tipBox("The Data Explorer provides direct access to Databricks. Some views scan billions of rows \u2014 rate limiting is in place to prevent accidental overload. If a query takes a long time, it\u2019s likely performing a large table scan."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 9. VOICE AGENT ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec9", children: [new TextRun("9. Voice Agent")] })] }),
        sectionIntro("Hands-free interaction with FinIQ using natural speech."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.1 How to Use")] }),
        bulletItem("Click the microphone icon to activate the voice agent."),
        bulletItem("Speak your question naturally (e.g., \u201CWhat is Petcare organic growth?\u201D)."),
        bulletItem("The AI processes your query, fetches data from the relevant source, and responds with both voice audio and an on-screen transcript."),
        bulletItem("Speak while the AI is responding to interrupt and ask a new question."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.2 Voice Agent Capabilities")] }),
        bodyPara("The voice agent has access to all major FinIQ functions:"),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            new TableRow({ children: [headerCell("Capability", 4680), headerCell("Example", 4680)] }),
            ...[
              ["Query financial data", "\"What is Mars revenue for P03?\""],
              ["Get competitor analysis", "\"How is Nestle performing?\""],
              ["Submit a job", "\"Submit a job to analyze Petcare trends\""],
              ["Check job board", "\"What jobs are running?\""],
              ["Generate PES report", "\"Generate a PES for Petcare P03 FY2026\""],
              ["Get budget variance", "\"Show actual vs replan for Mars Inc\""],
              ["Retrieve dashboard KPIs", "\"What are the current dashboard KPIs?\""],
            ].map(([cap, ex], i) => new TableRow({ children: [
              dataCell(cap, 4680, i % 2 === 1), dataCell(ex, 4680, i % 2 === 1),
            ]})),
          ],
        }),
        spacer(),

        bulletItem("Inline charts: When the voice agent returns numerical data, charts render automatically on screen."),
        tipBox("The first voice query of the day may take 2\u20133 minutes if the Databricks warehouse is cold. Subsequent queries are much faster."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 10. ADMIN PANEL ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec10", children: [new TextRun("10. Admin Panel")] })] }),
        sectionIntro("System configuration and user management."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.1 Connection Status")] }),
        bodyPara("Always displays \u201CLIVE \u2014 Connected to Databricks\u201D confirming the application is connected to Mars\u2019s production data warehouse. FinIQ operates exclusively on real data."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.2 Role-Based Access Control (RBAC)")] }),
        bodyPara("Four roles are defined with specific permissions:"),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell("Role", 2340), headerCell("Permissions", 7020)] }),
            new TableRow({ children: [dataCell("Admin", 2340), dataCell("Full access \u2014 all features, user management, configuration", 7020)] }),
            new TableRow({ children: [dataCell("Analyst", 2340, true), dataCell("Query, reports, CI, job board, data explorer", 7020, true)] }),
            new TableRow({ children: [dataCell("Viewer", 2340), dataCell("Dashboard, reports (read-only), CI (read-only)", 7020)] }),
            new TableRow({ children: [dataCell("Auditor", 2340, true), dataCell("Read-only access to all data with full audit trail", 7020, true)] }),
          ],
        }),
        spacer(),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.3 Organization Hierarchy")] }),
        bodyPara("Displays the 6-level organizational structure:"),
        bulletItem("Mars, Incorporated (top level)"),
        bulletItem("Global Business Units (GBUs)"),
        bulletItem("Divisions"),
        bulletItem("Regions"),
        bulletItem("Markets"),
        bulletItem("Sub-units"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("10.4 Peer Groups")] }),
        bodyPara("Four predefined peer groups for benchmarking comparisons across business segments."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 11. TIPS & BEST PRACTICES ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec11", children: [new TextRun("11. Tips and Best Practices")] })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.1 Entity Names")] }),
        bodyPara("Use official Databricks unit names for highest query accuracy. The system recognizes ~45 common aliases, but exact names always work:"),
        bulletItem("\"Petcare\" \u2192 resolves correctly"),
        bulletItem("\"Royal Canin\" \u2192 resolves correctly"),
        bulletItem("\"Mars Inc\" \u2192 resolves correctly"),
        bulletItem("\"MW USA Market\" \u2192 exact name, always works"),
        tipBox("If a query returns unexpected results, try using the exact entity name from the Reports dropdown."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.2 Warehouse Performance")] }),
        bulletItem("First access of the day: Allow 2\u20133 minutes for the serverless warehouse to warm up."),
        bulletItem("The keep-alive system prevents idle timeout after the initial warm-up."),
        bulletItem("Some views scan billions of rows. A query taking 1\u20133 minutes is normal for large table scans."),
        bulletItem("Rate limiting protects against accidental overload."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.3 Charts and Visualization")] }),
        bulletItem("After any tabular result, ask \u201CShow as chart\u201D or \u201CPlot this\u201D to visualize."),
        bulletItem("The system auto-detects the best chart type (area vs. bar) based on data shape."),
        bulletItem("Columns with percentages, growth, or margin in the name are automatically formatted as percentages."),
        bulletItem("Values automatically display with appropriate units ($K for thousands, $M for millions)."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.4 Macroeconomic Context")] }),
        bodyPara("When a \u201CWhy is this happening?\u201D or \u201CWhat\u2019s driving this?\u201D chip appears after a query result, click it to access macroeconomic data from 122,000+ external datasources. This unique feature connects internal financial trends to external market conditions such as consumer confidence, commodity prices, and inflation data."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.5 Keyboard Shortcuts")] }),
        bulletItem("Ctrl+Z \u2014 Undo in the query interface"),
        bulletItem("Ctrl+Y \u2014 Redo in the query interface"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("11.6 Export")] }),
        bodyPara("Use XLSX export on the Job Board for Mars-branded spreadsheet output suitable for presentations and distribution."),
        new Paragraph({ children: [new PageBreak()] }),

        // ════════════════════ 12. GLOSSARY ════════════════════
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: "sec12", children: [new TextRun("12. Glossary")] })] }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell("Term", 2340), headerCell("Definition", 7020)] }),
            ...([
              ["PES", "Period End Summary \u2014 AI-generated executive performance narrative"],
              ["WWW / WNWW", "What\u2019s Working Well / What\u2019s Not Working Well \u2014 PES report formats"],
              ["KPI", "Key Performance Indicator (Organic Growth, MAC Shape %, A&CP Shape %, CE Shape %, Controllable Overhead Shape %, NCFO)"],
              ["OG", "Organic Growth \u2014 Revenue growth excluding acquisitions and currency effects"],
              ["MAC", "Material and Conversion costs"],
              ["A&CP", "Advertising and Consumer Promotion"],
              ["CE", "Customer Engagement"],
              ["NCFO", "Net Cash From Operations"],
              ["GBU", "Global Business Unit"],
              ["FMP", "Financial Modeling Prep \u2014 Real-time competitor financial data API"],
              ["QML", "Quantum Macro Library \u2014 Macroeconomic data from Q.Enterprise platform"],
              ["SLA", "Service Level Agreement \u2014 Target processing time for job board entries"],
              ["Replan", "Budget or forecast revision, compared against actual performance"],
              ["Provenance", "Data source attribution displayed on every query response"],
              ["FY", "Fiscal Year \u2014 Mars uses a 13-period fiscal calendar (P01\u2013P13)"],
              ["bps", "Basis points \u2014 1 bps = 0.01 percentage points"],
              ["RL", "Reporting Line \u2014 Financial line item in Databricks (e.g., Net Revenue, Gross Profit)"],
            ]).map(([term, def], i) => new TableRow({ children: [
              dataCell(term, 2340, i % 2 === 1), dataCell(def, 7020, i % 2 === 1),
            ]})),
          ],
        }),
        spacer(400),

        // ── Footer ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: BLUE_LIGHT, space: 12 } },
          spacing: { before: 400 },
          children: [new TextRun({ text: "End of Document", font: "Arial", size: 20, color: GRAY_MED, italics: true })],
        }),
      ],
    },
  ],
});

// ── Write ──
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("D:/Amira FinIQ/FinIQ User Guide v1.0.docx", buffer);
console.log("Done: FinIQ User Guide v1.0.docx");
