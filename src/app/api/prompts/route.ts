import { NextRequest, NextResponse } from "next/server";
import {
  SUGGESTED_PROMPTS,
  type SuggestedPrompt,
  type PromptCategory,
  PROMPT_CATEGORIES,
} from "@/data/prompts";

// ---------------------------------------------------------------------------
// In-memory run counters (persisted for the lifetime of the server process).
// In production this would be backed by a database.
// ---------------------------------------------------------------------------

const runCounters = new Map<string, number>(
  SUGGESTED_PROMPTS.map((p) => [p.id, p.runs]),
);

// ---------------------------------------------------------------------------
// GET /api/prompts?category=margin
// Returns all active prompts, optionally filtered by category.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryParam = searchParams.get("category");

  let prompts: SuggestedPrompt[] = SUGGESTED_PROMPTS.filter((p) => p.isActive);

  if (
    categoryParam &&
    (PROMPT_CATEGORIES as readonly string[]).includes(categoryParam)
  ) {
    prompts = prompts.filter(
      (p) => p.category === (categoryParam as PromptCategory),
    );
  }

  // Merge live run counters
  const result = prompts.map((p) => ({
    ...p,
    runs: runCounters.get(p.id) ?? p.runs,
  }));

  return NextResponse.json({ prompts: result });
}

// ---------------------------------------------------------------------------
// POST /api/prompts   body: { id: string }
// Increments the run counter for the given prompt id.
// ---------------------------------------------------------------------------

interface IncrementBody {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: IncrementBody = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'id' field" },
        { status: 400 },
      );
    }

    const current = runCounters.get(id);
    if (current === undefined) {
      return NextResponse.json(
        { error: `Prompt '${id}' not found` },
        { status: 404 },
      );
    }

    const updated = current + 1;
    runCounters.set(id, updated);

    return NextResponse.json({ id, runs: updated });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
