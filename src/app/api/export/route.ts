/**
 * Export API — FR2.6: Export to XLSX, CSV, JSON
 *
 * POST /api/export
 *   Body: { data: rows[], filename?: string, title?: string }
 *   Query: ?format=xlsx|csv|json (default: xlsx)
 *
 * Returns the file as a binary download with appropriate Content-Type.
 * XLSX includes Mars branding: header row + confidential footer.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ============================================================
// POST /api/export
// ============================================================

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers: rlHeaders } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const body = await request.json();
    const { data, filename = "finiq-export", title = "FinIQ Report" } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'data' array in request body" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";

    switch (format) {
      case "json":
        return exportJSON(data, filename, title);
      case "csv":
        return exportCSV(data, filename, title);
      case "xlsx":
        return exportXLSX(data, filename, title);
      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}. Use xlsx, csv, or json.` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[POST /api/export] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}

// ============================================================
// JSON export
// ============================================================

function exportJSON(
  data: Record<string, unknown>[],
  filename: string,
  title: string
): NextResponse {
  const payload = {
    title: `Amira FinIQ - ${title}`,
    generated_at: new Date().toISOString(),
    record_count: data.length,
    confidential: "Confidential - Mars, Incorporated",
    data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}.json"`,
    },
  });
}

// ============================================================
// CSV export
// ============================================================

function exportCSV(
  data: Record<string, unknown>[],
  filename: string,
  title: string
): NextResponse {
  if (data.length === 0) {
    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const columns = Object.keys(data[0]);
  const lines: string[] = [];

  // Header comment with Mars branding
  lines.push(`# Amira FinIQ - ${title}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Confidential - Mars, Incorporated`);
  lines.push("");

  // Column headers
  lines.push(columns.map(escapeCsvField).join(","));

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => {
      const val = row[col];
      return escapeCsvField(val == null ? "" : String(val));
    });
    lines.push(values.join(","));
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// ============================================================
// XLSX export (using xlsx / SheetJS)
// ============================================================

async function exportXLSX(
  data: Record<string, unknown>[],
  filename: string,
  title: string
): Promise<NextResponse> {
  try {
    // Dynamic import — xlsx may not be installed yet
    const XLSX = await import("xlsx");

    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const now = new Date().toISOString();

    // Build worksheet data: branding header + column headers + data + footer
    const wsData: (string | number | null)[][] = [];

    // Row 1: Branding header
    wsData.push([`Amira FinIQ - ${title}`]);

    // Row 2: Generated timestamp
    wsData.push([`Generated: ${now}`]);

    // Row 3: Empty separator
    wsData.push([]);

    // Row 4: Column headers
    wsData.push(columns);

    // Data rows
    for (const row of data) {
      const values = columns.map((col) => {
        const val = row[col];
        if (val == null) return null;
        if (typeof val === "number") return val;
        return String(val);
      });
      wsData.push(values);
    }

    // Footer rows
    wsData.push([]);
    wsData.push([`Confidential - Mars, Incorporated`]);
    wsData.push([`${data.length} records exported`]);

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths based on content
    const colWidths = columns.map((col) => {
      const maxLen = Math.max(
        col.length,
        ...data.map((row) => String(row[col] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;

    // Merge branding header across all columns
    if (columns.length > 1) {
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
      ];
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    // Write to buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (err) {
    // Fallback to CSV if xlsx package not available
    console.warn("[Export] xlsx package not available, falling back to CSV:", err);
    return exportCSV(data, filename, title) as unknown as NextResponse;
  }
}
