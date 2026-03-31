import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["host", "token", "httpPath", "catalog", "schema"];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== "string") {
        return NextResponse.json(
          { success: false, error: `Missing or invalid field: ${field}` },
          { status: 400 },
        );
      }
    }

    // In production this would persist to a database or config file.
    // For now we acknowledge receipt and log the save.
    console.log("[admin/save-config] Configuration saved:", {
      host: body.host,
      httpPath: body.httpPath,
      catalog: body.catalog,
      schema: body.schema,
      // token intentionally omitted from logs
    });

    return NextResponse.json({
      success: true,
      message: "Configuration saved",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save configuration",
      },
      { status: 500 },
    );
  }
}
