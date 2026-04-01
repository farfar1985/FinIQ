/**
 * PDF Upload API — FR1.2 (Competitor Document Ingestion)
 *
 * POST /api/upload — Accept a PDF file, extract text, store in memory
 *
 * Accepts multipart/form-data with a "file" field containing a PDF.
 * Extracts readable text from the PDF buffer and stores it in an
 * in-memory Map keyed by filename for downstream CI processing.
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory document store (persists across hot-reloads via globalThis)
// ---------------------------------------------------------------------------

interface StoredDocument {
  filename: string;
  text: string;
  size: number;
  uploadedAt: string;
  pages: number;
}

const g = globalThis as unknown as { __finiq_docs?: Map<string, StoredDocument> };
if (!g.__finiq_docs) {
  g.__finiq_docs = new Map<string, StoredDocument>();
}
const documentStore: Map<string, StoredDocument> = g.__finiq_docs;

// ---------------------------------------------------------------------------
// Lightweight PDF text extraction
// ---------------------------------------------------------------------------

/**
 * Extract readable ASCII/UTF-8 text from a raw PDF buffer.
 * This is a lightweight approach that pulls text from stream objects
 * without requiring a full PDF parsing library.
 */
function extractTextFromPDF(buffer: Buffer): { text: string; pages: number } {
  const raw = buffer.toString("latin1");

  // Count pages via /Type /Page (not /Pages)
  const pageMatches = raw.match(/\/Type\s*\/Page[^s]/g);
  const pages = pageMatches ? pageMatches.length : 1;

  // Extract text between BT (begin text) and ET (end text) operators
  const textBlocks: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract strings in parentheses (PDF literal strings)
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch: RegExpExecArray | null;
    while ((strMatch = stringRegex.exec(block)) !== null) {
      const decoded = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")");
      if (decoded.trim()) {
        textBlocks.push(decoded.trim());
      }
    }
    // Extract hex strings <...>
    const hexRegex = /<([0-9A-Fa-f\s]+)>/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hex = hexMatch[1].replace(/\s/g, "");
      let str = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code >= 32 && code < 127) {
          str += String.fromCharCode(code);
        }
      }
      if (str.trim()) {
        textBlocks.push(str.trim());
      }
    }
  }

  // Fallback: if BT/ET extraction found nothing, try to grab any readable text
  let text = textBlocks.join(" ");
  if (!text.trim()) {
    // Pull printable ASCII sequences of 4+ characters
    const printable = raw.match(/[\x20-\x7E]{4,}/g);
    if (printable) {
      // Filter out PDF structural keywords
      const filtered = printable.filter(
        (s) =>
          !s.startsWith("/") &&
          !s.startsWith("<<") &&
          !s.includes("endobj") &&
          !s.includes("stream") &&
          !s.includes("xref")
      );
      text = filtered.join(" ");
    }
  }

  return { text, pages };
}

// ---------------------------------------------------------------------------
// POST /api/upload
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data with a 'file' field" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field in form data" },
        { status: 400 }
      );
    }

    // Validate file type
    const filename = file.name;
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Size limit: 20 MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 20 MB limit" },
        { status: 400 }
      );
    }

    // Read file buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { text, pages } = extractTextFromPDF(buffer);

    // Store in memory
    const doc: StoredDocument = {
      filename,
      text,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      pages,
    };
    documentStore.set(filename, doc);

    return NextResponse.json({
      success: true,
      filename,
      pages,
      textLength: text.length,
      storedDocuments: documentStore.size,
    });
  } catch (err) {
    console.error("[POST /api/upload] Error:", err);
    return NextResponse.json(
      { error: "Failed to process uploaded file" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/upload — List stored documents
// ---------------------------------------------------------------------------

export async function GET() {
  const docs = Array.from(documentStore.values()).map((d) => ({
    filename: d.filename,
    size: d.size,
    pages: d.pages,
    textLength: d.text.length,
    uploadedAt: d.uploadedAt,
  }));

  return NextResponse.json({ documents: docs, total: docs.length });
}
