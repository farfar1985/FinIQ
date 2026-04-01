/**
 * PDF Ingestion API — FR1.2
 *
 * POST /api/ingest  — Upload a PDF file for competitive intelligence document ingestion
 * GET  /api/ingest  — List all ingested documents
 *
 * Accepts multipart/form-data with a "file" field containing a PDF.
 * Extracts basic text content and stores document metadata in-memory.
 */

import { NextRequest, NextResponse } from "next/server";

// ---- Types ----------------------------------------------------------------

interface IngestedDocument {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  source: string;
  uploadedAt: string;
  extractedText: string;
  status: "processed" | "failed";
}

// ---- In-memory store (persists across hot-reloads) ------------------------

const globalStore = globalThis as unknown as { __finiq_ingested_docs?: Map<string, IngestedDocument> };
if (!globalStore.__finiq_ingested_docs) {
  globalStore.__finiq_ingested_docs = new Map<string, IngestedDocument>();
}
const ingestedDocs: Map<string, IngestedDocument> = globalStore.__finiq_ingested_docs;

// ---- Helpers --------------------------------------------------------------

function generateDocId(): string {
  return `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Basic text extraction from PDF buffer.
 * Looks for text streams between BT/ET operators and parenthesized strings.
 * This is a lightweight approach — production would use pdf-parse or similar.
 */
function extractTextFromPdfBuffer(buffer: Buffer): { text: string; pageCount: number } {
  const raw = buffer.toString("latin1");

  // Estimate page count from /Type /Page occurrences
  const pageMatches = raw.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  // Extract parenthesized text strings (PDF text objects)
  const textParts: string[] = [];
  const regex = /\(([^)]{1,500})\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const candidate = match[1];
    // Filter out binary/control sequences — keep readable ASCII strings
    if (/^[\x20-\x7E\t\n\r]{2,}$/.test(candidate)) {
      textParts.push(candidate);
    }
  }

  const text = textParts.join(" ").replace(/\s+/g, " ").trim();
  return { text: text || "(No extractable text found — PDF may contain scanned images)", pageCount };
}

// ---- GET /api/ingest — list ingested documents ----------------------------

export async function GET() {
  const docs = Array.from(ingestedDocs.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  return NextResponse.json({
    documents: docs,
    total: docs.length,
  });
}

// ---- POST /api/ingest — upload and process a PDF --------------------------

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field. Upload a PDF using multipart/form-data." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported for ingestion." },
        { status: 400 }
      );
    }

    // Size check (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB.` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const { text, pageCount } = extractTextFromPdfBuffer(buffer);

    // Build document record
    const doc: IngestedDocument = {
      id: generateDocId(),
      title: file.name.replace(/\.pdf$/i, ""),
      filename: file.name,
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size,
      pageCount,
      source: (formData.get("source") as string) || "manual-upload",
      uploadedAt: new Date().toISOString(),
      extractedText: text.substring(0, 50000), // Cap at 50k chars
      status: "processed",
    };

    ingestedDocs.set(doc.id, doc);

    return NextResponse.json(
      {
        document: {
          id: doc.id,
          title: doc.title,
          filename: doc.filename,
          sizeBytes: doc.sizeBytes,
          pageCount: doc.pageCount,
          source: doc.source,
          uploadedAt: doc.uploadedAt,
          status: doc.status,
          textPreview: doc.extractedText.substring(0, 500),
          textLength: doc.extractedText.length,
        },
        extractedText: doc.extractedText,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/ingest] Error:", err);
    return NextResponse.json(
      { error: "Failed to process uploaded file." },
      { status: 500 }
    );
  }
}
