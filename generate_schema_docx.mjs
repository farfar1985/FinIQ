import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat } from "docx";
import fs from "fs";

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };
const TABLE_WIDTH = 9360;

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1B2A4A", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })],
  });
}

function cell(text, width, shade = null) {
  const opts = { borders, width: { size: width, type: WidthType.DXA }, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text: String(text || ""), font: "Arial", size: 18 })] })] };
  if (shade) opts.shading = { fill: shade, type: ShadingType.CLEAR };
  return new TableCell(opts);
}

function riskCell(risk, width) {
  const colors = { EXTREME: "C0392B", HIGH: "E67E22", MEDIUM: "F1C40F", SAFE: "27AE60", "USE WITH FILTER": "3498DB" };
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text: risk, bold: true, color: colors[risk] || "000000", font: "Arial", size: 18 })] })],
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((c, ci) => {
          if (headers[ci] === "Risk") return riskCell(c, colWidths[ci]);
          return cell(c, colWidths[ci], ri % 2 === 1 ? "F5F7FA" : null);
        })
      })),
    ],
  });
}

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, font: "Arial" })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, font: "Arial" })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, font: "Arial" })] }); }
function p(text) { return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }
function pb(label, value) { return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: label, bold: true, font: "Arial", size: 22 }), new TextRun({ text: value, font: "Arial", size: 22 })] }); }
function code(text) { return new Paragraph({ spacing: { before: 80, after: 80 }, indent: { left: 360 }, children: [new TextRun({ text, font: "Consolas", size: 18, color: "2C3E50" })] }); }
function bullet(text) { return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1B2A4A" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2C3E50" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "34495E" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "FinIQ Real Databricks Schema Reference", italics: true, font: "Arial", size: 16, color: "888888" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Amira Technologies | Confidential | Page ", font: "Arial", size: 16, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" })],
      })] }),
    },
    children: [
      // TITLE PAGE
      new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "Real Databricks Schema Reference", bold: true, font: "Arial", size: 52, color: "1B2A4A" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
        new TextRun({ text: "Amira FinIQ - Unified Financial Analytics Hub", font: "Arial", size: 28, color: "555555" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [
        new TextRun({ text: "Catalog: corporate_finance_analytics_prod", font: "Consolas", size: 20, color: "2980B9" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [
        new TextRun({ text: "Schema: finsight_core_model", font: "Consolas", size: 20, color: "2980B9" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [
        new TextRun({ text: "Discovered: March 31, 2026", font: "Arial", size: 22, color: "777777" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [
        new TextRun({ text: "Prepared by: Claude Code (for Farzaneh / QDT Team)", font: "Arial", size: 22, color: "777777" }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [
        new TextRun({ text: "Client: Mars, Incorporated", font: "Arial", size: 22, color: "777777" }),
      ] }),

      new Paragraph({ children: [new PageBreak()] }),

      // CONNECTION DETAILS
      h1("Connection Details"),
      pb("Warehouse: ", "Serverless Starter Warehouse (de640b2f8ef3d9b2)"),
      pb("HTTP Path: ", "/sql/1.0/warehouses/de640b2f8ef3d9b2"),
      pb("Catalog: ", "corporate_finance_analytics_prod"),
      pb("Schema: ", "finsight_core_model"),
      pb("Last Data Change: ", "2026-03-31T11:00:42.012Z (Version 8289)"),

      // TABLE INVENTORY
      new Paragraph({ children: [new PageBreak()] }),
      h1("Table Inventory (21 Objects)"),
      p("The schema contains 17 tables and 4 views. Three fact tables contain billions of rows and must never be queried without filters."),
      makeTable(
        ["Table", "Type", "Rows", "Risk"],
        [
          ["finiq_financial", "Fact (denormalized)", "5,758,891,376", "EXTREME"],
          ["finiq_financial_cons", "Fact (consolidated)", "5,781,441,613", "EXTREME"],
          ["finiq_financial_base", "Fact (normalized)", "739,574,399", "HIGH"],
          ["finiq_financial_replan", "Fact (budget vs actual)", "2,740,193", "MEDIUM"],
          ["finiq_financial_replan_cons", "Fact (replan consolidated)", "185,574", "SAFE"],
          ["finiq_dim_unit", "Dimension (org hierarchy)", "766", "SAFE"],
          ["finiq_dim_rl", "Dimension (reporting lines)", "725", "SAFE"],
          ["finiq_rl_formula", "Reference (KPI formulas)", "725", "SAFE"],
          ["finiq_rl_input", "Reference (input lines)", "110", "SAFE"],
          ["finiq_date", "Dimension (fiscal calendar)", "117", "SAFE"],
          ["finiq_economic_cell", "Dimension (business cells)", "175", "SAFE"],
          ["finiq_composite_item", "Dimension (product master)", "9,478", "SAFE"],
          ["finiq_item", "Dimension (granular product)", "381,113", "SAFE"],
          ["finiq_item_composite_item", "Bridge (item-to-product)", "388,782", "SAFE"],
          ["finiq_customer", "Dimension (customer master)", "21,204", "SAFE"],
          ["finiq_customer_map", "Bridge (customer hierarchy)", "210,913", "SAFE"],
          ["finiq_rls_last_change", "Metadata", "1", "SAFE"],
          ["finiq_vw_pl_unit", "View (P&L by unit)", "scans 5.7B", "USE WITH FILTER"],
          ["finiq_vw_pl_brand_product", "View (P&L by product)", "scans 5.7B", "USE WITH FILTER"],
          ["finiq_vw_ncfo_unit", "View (NCFO by unit)", "852,836", "SAFE"],
          ["anomalydetection_vw_*", "View (anomaly detection)", "9,811", "SAFE"],
        ],
        [2800, 2600, 2000, 1960]
      ),

      // JOIN PATHS
      new Paragraph({ children: [new PageBreak()] }),
      h1("Join Paths"),
      h2("Primary Join Keys"),
      p("All join relationships verified via cardinality analysis across tables."),
      makeTable(
        ["Source Table", "Key", "Target Table", "Key", "Cardinality"],
        [
          ["finiq_financial*", "Unit_ID", "finiq_dim_unit", "Child_Unit_ID", "766 units"],
          ["finiq_financial*", "RL_ID", "finiq_dim_rl", "Child_RL_ID", "725 RLs"],
          ["finiq_financial*", "Date_ID", "finiq_date", "Date_ID", "117 dates"],
          ["finiq_financial*", "Composite_Item_ID", "finiq_composite_item", "Composite_Item_ID", "9,478 products"],
          ["finiq_financial_base", "Economic_Cell_ID", "finiq_economic_cell", "Economic_Cell_ID", "175 (123 used)"],
          ["finiq_financial_base", "Unit_Customer_ID", "finiq_customer", "Unit_Customer_ID", "21,204"],
          ["finiq_customer_map", "Child_Unit_ID", "finiq_dim_unit", "Child_Unit_ID", "553 of 766"],
          ["finiq_item_composite_item", "Composite_Item_ID", "finiq_composite_item", "Composite_Item_ID", "9,478 (1:1)"],
          ["finiq_item_composite_item", "Item_ID", "finiq_item", "Item_ID", "381K items"],
          ["finiq_financial_replan", "Unit_ID", "finiq_dim_unit", "Child_Unit_ID", "716 of 766"],
          ["finiq_financial_replan", "Reporting_Line_ID", "finiq_dim_rl", "Child_RL_ID", "642 of 725"],
          ["finiq_financial_replan", "Date_ID", "finiq_date", "Date_ID", "19 dates"],
        ],
        [2000, 1600, 2000, 1760, 2000]
      ),

      h2("View External Dependencies"),
      p("The views reference external dimension tables in the finsight_core_model_mvp3 schema:"),
      bullet("Dimensions_View_Date_Map - Maps Target_Date_ID to Source_Date_ID with View_ID (1=Periodic, 2=YTD)"),
      bullet("Dimensions_Date - Fiscal date lookup"),
      bullet("Dimensions_Unit - Maps Unit_ID to Unit_Alias (Title Case)"),
      bullet("Dimensions_Reporting_Line - Maps RL_ID to RL_Alias"),
      bullet("Dimensions_Unit_Consolidation - Used by anomaly detection view"),

      // ORG HIERARCHY
      new Paragraph({ children: [new PageBreak()] }),
      h1("Organization Hierarchy (finiq_dim_unit)"),
      pb("Total nodes: ", "766 across 11 levels"),
      makeTable(
        ["Level", "Count", "Parents", "Children", "Example"],
        [
          ["0", "3", "1", "3", "MARS INCORPORATED (R)"],
          ["1", "9", "2", "9", "GBU PETCARE EX RUSSIA"],
          ["2", "21", "8", "21", "PET NUTRITION DIVISION EX RUSSIA"],
          ["3", "51", "14", "51", "PN EUROPE REGION"],
          ["4", "118", "25", "118", "PN NORTH AMERICA REGION"],
          ["5", "144", "39", "144", "PN USA"],
          ["6", "203", "67", "203", "PN USA MARKET"],
          ["7", "124", "43", "124", "MW SWITZERLAND MARKET"],
          ["8", "72", "21", "72", "MW EFFEM MEXICO MARKET"],
          ["9", "17", "6", "17", "(operational units)"],
          ["10", "4", "2", "4", "(lowest level)"],
        ],
        [900, 900, 1200, 1200, 5160]
      ),

      h2("Top-Level GBUs (Level 1)"),
      bullet("GBU FOOD NUTRITION & MULTISALES X RUSSIA"),
      bullet("GBU MARS SNACKING EX RUSSIA"),
      bullet("GBU PETCARE EX RUSSIA"),
      bullet("GBU UNASSIGNED"),
      bullet("GLOBAL CORPORATE"),
      bullet("MARS GLOBAL SERVICES"),
      bullet("GBU FOOD, NUTRITION & MS RUSSIA"),
      bullet("GBU MARS SNACKING RUSSIA"),
      bullet("GBU PETCARE RUSSIA"),

      h2("Unit Prefix Guide"),
      makeTable(["Prefix", "Division"], [
        ["MW", "Mars Wrigley (Snacking)"], ["PN", "Pet Nutrition"], ["RC", "Royal Canin"],
        ["AC", "Accelerator Division"], ["SDX", "Science & Diagnostics"], ["MVH", "Mars Vet Health"],
        ["KN", "Kellanova"], ["HC", "Hotel Chocolat"], ["FOOD", "Food & Nutrition"], ["WWY", "Wrigley (legacy)"],
      ], [2000, 7360]),

      // REPORTING LINES
      new Paragraph({ children: [new PageBreak()] }),
      h1("Reporting Lines Hierarchy (finiq_dim_rl)"),
      pb("Total: ", "725 reporting lines with array-based parent hierarchy"),
      h2("Hierarchy Depth"),
      makeTable(["Depth", "Count", "Description"], [
        ["-1", "62", "No parents (orphans/top-level)"],
        ["1", "527", "Single parent (leaf lines)"],
        ["2", "117", "Two-level (intermediate)"],
        ["3", "19", "Three-level (high aggregation)"],
      ], [1500, 1500, 6360]),

      h2("7 Financial Statements"),
      bullet("P&L - Profit & Loss"),
      bullet("BS - Balance Sheet"),
      bullet("BSR - Balance Sheet Reclassification"),
      bullet("EP - Earnings/Performance"),
      bullet("S&U - Sources & Uses"),
      bullet("Overheads - Overhead cost allocation"),
      bullet("Others - Miscellaneous"),

      h2("Key P&L Reporting Lines"),
      makeTable(["RL_ID", "RL Name", "Sign"], [
        ["856", "NET SALES TOTAL", "+1"],
        ["3767", "GSV 3RD PARTY", "+1"],
        ["918", "PRIME COSTS", "-1"],
        ["922", "CONVERSION COSTS", "-1"],
        ["1000", "MARGIN AFTER CONVERSION", "+1"],
        ["1666", "A&CP SHAPE %", "(KPI)"],
        ["3803", "CE SHAPE %", "(KPI)"],
        ["3770", "CONTROLLABLE OVERHEAD COSTS", "-1"],
        ["1085", "CONTROLLABLE PROFIT", "+1"],
      ], [1500, 5860, 2000]),

      h2("Growth KPIs (Computed in Views)"),
      makeTable(["Parent_RL_ID", "Formula", "Description"], [
        ["5723", "RL 5472 / RL 5464 - 1", "Organic Growth"],
        ["5727", "RL 5581 / RL 5464", "Growth via Price"],
        ["7451", "RL 5582 / RL 5464", "Growth via Volume"],
        ["7450", "RL 5583 / RL 5464", "Growth via Mix"],
        ["74510", "RL 5586 / RL 5464", "Growth % - 3rd P Mix"],
        ["74500", "RL 5587 / RL 5464", "Growth % - 3rd P Volume"],
      ], [1800, 4000, 3560]),
      p("RL 5464 = denominator for all growth KPIs (Net Sales LY reference)"),

      // FISCAL CALENDAR
      new Paragraph({ children: [new PageBreak()] }),
      h1("Fiscal Calendar (finiq_date)"),
      bullet("Date_ID format: YYYYPP (e.g., 202506 = 2025, Period 06)"),
      bullet("Range: 202001 to 202813 (FY2020 through FY2028)"),
      bullet("13 periods per year (Mars fiscal calendar, Period 13 = Q4 adjustment)"),
      bullet("Quarters: Q1 (P01-03), Q2 (P04-06), Q3 (P07-09), Q4 (P10-13)"),
      bullet("Replan data range: 202501 to 202613 (FY2025-FY2026 only, 19 dates)"),

      // PRODUCT HIERARCHY
      h1("Product Hierarchy"),
      pb("3-tier: ", "Item -> Composite_Item -> (dimension attributes)"),
      makeTable(["Dimension", "Distinct Values"], [
        ["EC Groups", "205"], ["Segments", "12"], ["Business Segments", "9"],
        ["Brands", "458"], ["Technologies", "54"], ["Product Consolidations", "23"], ["Product Categories", "75"],
      ], [5000, 4360]),
      p("Top EC Groups: SEASONAL (1,303), FRUITY CONF (783), MW OTHER (673), BAR (646), BITESIZE (621), GUM (560)"),

      // ECONOMIC CELLS
      h1("Economic Cell Archetypes"),
      makeTable(["Archetype", "Count", "Purpose"], [
        ["GROWTH ENGINE", "49", "High-growth priority areas"],
        ["SEED", "33", "Emerging/developing areas"],
        ["FUEL FOR GROWTH", "32", "Cash generators funding growth"],
        ["HARVEST", "31", "Mature, maximize profit"],
        ["OTHER", "30", "Unclassified"],
      ], [2500, 1500, 5360]),

      // CUSTOMER
      h1("Customer Dimension"),
      makeTable(["Dimension", "Distinct Values"], [
        ["Countries", "139"], ["Channels", "8"], ["Formats", "24"],
        ["Level 1 groups", "398"], ["Level 2 groups", "1,230"],
      ], [5000, 4360]),
      p("Unit_Customer_ID format: {Unit_ID}#{Customer_ID} (e.g., 10416#S0690690011028A)"),

      // VIEW SQL LOGIC
      new Paragraph({ children: [new PageBreak()] }),
      h1("View SQL Logic"),

      h2("finiq_vw_pl_unit - P&L by Unit"),
      bullet("Source: FinIQ_Financial_Cons joined with Dimensions_View_Date_Map and Dimensions_Date"),
      bullet("Filters to 27 specific RL_IDs (P&L KPIs only)"),
      bullet("Date_Offset logic: 0 = Current Year, 100 = Last Year"),
      bullet("View_ID: 1 = Periodic, 2 = YTD"),
      bullet("Growth KPIs computed as ratios: numerator RL / denominator RL (5464) - 1"),
      bullet("Special handling: RL 5464 gets +100/+200 Date_Offset"),
      bullet("Output joins Dimensions_Unit (Unit_Alias) and Dimensions_Reporting_Line (RL_Alias)"),

      h2("finiq_vw_pl_brand_product - P&L by Brand/Product"),
      bullet("Same as vw_pl_unit but adds JOIN to FinIQ_Composite_Item"),
      bullet("Creates 3-way UNION: by Brand, by Product_Category, by Product_Consolidation"),
      bullet("Item column contains COALESCE(Brand/Category/Consolidation, 'EMPTY ...')"),

      h2("finiq_vw_ncfo_unit - NCFO by Unit"),
      bullet("Same source pattern but filters to 16 different RL_IDs (NCFO-specific)"),
      bullet("No growth KPI computation (simpler view)"),
      bullet("No special Date_Offset for RL 5464"),

      // SAFE QUERY PATTERNS
      new Paragraph({ children: [new PageBreak()] }),
      h1("Safe Query Patterns"),

      h2("ALWAYS Use Views with Unit_Alias Filter"),
      code("SELECT * FROM finiq_vw_pl_unit"),
      code("WHERE Unit_Alias = 'MARS INCORPORATED (R)'"),
      code("AND Date_ID = 202506"),

      h2("Dimension Lookups (Always Safe)"),
      code("SELECT Child_Unit_ID, Child_Unit, Unit_Level"),
      code("FROM finiq_dim_unit"),
      code("WHERE Unit_Level <= 3"),
      code("ORDER BY Unit_Level, Child_Unit"),

      h2("Budget Variance (Use Date_ID Filter)"),
      code("SELECT Unit, Reporting_Line_KPI, Actual_USD_Value, Replan_USD_Value"),
      code("FROM finiq_financial_replan"),
      code("WHERE Unit_ID = 13000 AND Date_ID = 202506"),

      h2("NEVER Do This"),
      code("SELECT * FROM finiq_financial        -- 5.7B rows, will timeout"),
      code("SELECT COUNT(*) FROM finiq_financial_cons  -- scans 5.8B rows"),
      code("SELECT * FROM finiq_vw_pl_unit       -- no WHERE = full 5.7B scan"),

      // APPENDICES
      new Paragraph({ children: [new PageBreak()] }),
      h1("Appendix A: External Dimensions Tables"),
      p("The views reference Dimensions_* tables in the finsight_core_model_mvp3 schema (older version)."),
      h3("6 Schemas in Catalog"),
      bullet("default"),
      bullet("finsight_core_model (CURRENT)"),
      bullet("finsight_core_model_archive_2025"),
      bullet("finsight_core_model_archive_mvp23"),
      bullet("finsight_core_model_mvp3 (contains 35 Dimensions_* tables)"),
      bullet("information_schema"),
      p("The views resolve these via Unity Catalog cross-schema references. We don't query these directly."),

      h1("Appendix B: Replan (Budget vs Actual)"),
      pb("Submission Types: ", "ID 1 and 2"),
      makeTable(["Year", "Quarter", "Rows", "Has Actual", "Has Replan"], [
        ["2025", "Q1", "476,180", "476,180", "0"],
        ["2025", "Q2", "485,561", "485,561", "0"],
        ["2025", "Q3", "489,756", "489,756", "0"],
        ["2025", "Q4", "662,634", "662,634", "0"],
        ["2026", "Q1", "516,641", "479,810", "36,831"],
        ["2026", "Q2", "36,325", "0", "36,325"],
        ["2026", "Q3", "36,410", "0", "36,410"],
        ["2026", "Q4", "36,686", "0", "36,686"],
      ], [1200, 1200, 2000, 2480, 2480]),
      p("FY2025 has actuals only. FY2026 Q1 has both. FY2026 Q2-Q4 have replan (budget) only."),

      h1("Appendix C: NCFO View KPI Lines"),
      makeTable(["RL_Alias", "Category"], [
        ["Controllable Cash From P&L", "Top-line cash"],
        ["Controllable Working Capital Addition", "Working capital"],
        ["Change in A/R 3rd Party", "Working capital"],
        ["Change in Accrued Liab", "Working capital"],
        ["Change in Accts Payable", "Working capital"],
        ["Change in Fin Goods", "Working capital"],
        ["Change in Inv Raws", "Working capital"],
        ["Change in Oth CurrAssets", "Working capital"],
        ["Change in Rec/Pay Affil", "Working capital"],
        ["Change in Rec/Pay Brokers", "Working capital"],
        ["Change in Resv for Restruct", "Working capital"],
        ["Change In ROU Assets/Liabilities", "Non-current"],
        ["Change In Non-Current", "Non-current"],
        ["Fixed Asset Additions", "CapEx"],
        ["Tax Payments - Total", "Tax"],
        ["Net Cash From Operations", "Bottom line"],
      ], [5500, 3860]),

      new Paragraph({ children: [new PageBreak()] }),
      h1("Appendix D: View Unit_Alias Values"),
      p("Views use Title Case (e.g., 'MW Estonia Market' not 'MW ESTONIA MARKET'). The mapping happens through the external Dimensions_Unit table."),
      p("Sample values: MW Estonia Market, PN Austria Market, MW USA, RC Korea, MW Thailand Market, AC Romania Market, RC USA Supply, PN Mexico, Food Denmark Market, PN ANZ, RC International Division, Mars Wrigley Division Shared, PN Bulgaria Market"),

      h1("Appendix E: Customer Channels & Formats"),
      makeTable(["Channel", "Count"], [
        ["PET SPECIALIST", "3,972"], ["MODERN GROCERY", "3,259"], ["OTHER SPECIALIST", "1,673"],
        ["CONVENIENCE", "1,403"], ["TRADT'L INDEPENDENCE", "1,368"], ["DIGITAL COMMERCE", "996"],
        ["OUT OF HOME", "814"], ["UNMAPPED", "269"], ["(null)", "7,450"],
      ], [5500, 3860]),
      p("Customer Map Hierarchy: 553 child units to 286 parent units, 54,438 child customers to 14,230 parent customers"),

      h1("Appendix F: Composite_Item_ID Encoding"),
      p("Format: EC_Group_ID#Tech_ID#Segment_ID#BizSeg_ID#Market_ID#Brand_ID#Format_ID#???#???"),
      p("Example: 106#200#501#1#23#442#17#35864#25099 decodes to: EC_Group=BAR, Brand=MARATHON, Segment=CHOCOLATE, Product_Category=PERFORMANCE SNACKS"),
      p("The finiq_item_composite_item bridge maps 381K granular items to 9,478 composite items."),

      h1("Appendix G: Anomaly Detection View"),
      p("anomalydetection_vw_pbi_anomaly_detector_mw_na - Mars Wrigley North America only"),
      p("6 units: MW Canada Market, MW Ethel M Market, MW North America Region, MW North America Supply, MW USA, MW USA Market"),
      p("87 columns: 11 dimension columns + 76 pivoted financial metric columns. Power BI-optimized wide table."),

      h1("Appendix H: Base to Financial Denormalization"),
      p("finiq_financial_base (740M rows, 7 columns) to finiq_financial (5.7B rows, 42 columns)"),
      p("Multiplier: ~7.8x - caused by JOINing base with unit consolidation hierarchy. Each financial record appears once per parent unit (market rolls up to region, division, GBU, and Mars Inc)."),
      pb("Base columns (IDs only): ", "Date_ID, Unit_ID, RL_ID, Composite_Item_ID, Economic_Cell_ID, Unit_Customer_ID, USD_Value"),
      pb("Financial adds: ", "Year, Period, Quarter, Parent_Unit, Unit, Unit_Level, Parent_Reporting_Line, Reporting_Line_KPI, Statement, EC_Group, Brand, Segment, Market_Segment, Technology, Supply_Tech, Product_Consolidation, Product_Category, Business_Segment, Pack_Format, Economic_Cell, Archetype, Customer_ID, Country, Customer_Name, SCM_ID, Customer_Level_1-3, Customer_Channel/Format/Subformat, Currency, Sign_Conversion, Reporting_Line_ID, Brand_ID, Local_Value"),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "C:\\Users\\farza\\Desktop\\FinIQ Real Databricks Schema Reference.docx";
fs.writeFileSync(outPath, buffer);
console.log(`Saved to ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
