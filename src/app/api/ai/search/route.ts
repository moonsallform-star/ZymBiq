// =============================================================================
// Zymbiq — src/app/api/ai/search/route.ts
// AI-powered project search: extracts intent via Groq, queries Prisma DB.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callGroqStructured } from "@/lib/groq";
import type { ApiResponse, AiSearchResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Groq intent extraction schema
// ---------------------------------------------------------------------------

const IntentSchema = z.object({
  industry: z.string().optional(),
  features: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  priceHint: z.string().optional(),
  complexityHint: z.string().optional(),
});

type Intent = z.infer<typeof IntentSchema>;

// ---------------------------------------------------------------------------
// POST /api/ai/search
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AiSearchResponse> | { error: string }>> {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = z
    .object({
      query: z.string().optional(),
      filters: z.record(z.unknown()).optional(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawQuery = parsed.data.query ?? "";
  const trimmed = rawQuery.trim();

  // ── 2. Empty query → return all visible projects (no AI call) ─────────────
  if (!trimmed) {
    const projects = await prisma.project.findMany({
      where: { isVisible: true },
      include: { faqs: { orderBy: { sortOrder: "asc" } } },
      take: 20,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      data: { projects, query: "" },
    });
  }

  // ── 3. Cap query length ────────────────────────────────────────────────────
  const query = trimmed.slice(0, 500);

  // ── 4. AI intent extraction ────────────────────────────────────────────────
  let intent: Intent = {};

  try {
    intent = await callGroqStructured(
      query,
      IntentSchema,
      "Extract search intent from this web development project marketplace query. " +
        "Identify the industry/category, required features, preferred tech stack, " +
        "any price hints (e.g. 'cheap', 'affordable', 'premium'), and complexity hints " +
        "(e.g. 'simple', 'enterprise'). Return JSON only."
    );
  } catch (err) {
    // Groq failure is non-fatal — fall through to text-only search
    console.error("[ai/search] Groq extraction failed, using text fallback:", err);
  }

  // ── 5. Build Prisma where clause ───────────────────────────────────────────
  type StringFilter = { contains: string; mode: "insensitive" };
  type WhereClause = {
    isVisible: true;
    category?: StringFilter;
    techStack?: { hasSome: string[] };
    complexity?: StringFilter;
    OR: Array<{ title: StringFilter } | { description: StringFilter }>;
  };

  const where: WhereClause = {
    isVisible: true,

    // Industry → category (case-insensitive contains)
    ...(intent.industry
      ? { category: { contains: intent.industry, mode: "insensitive" } }
      : {}),

    // Tech stack → any match (Prisma array hasSome)
    ...(intent.techStack && intent.techStack.length > 0
      ? { techStack: { hasSome: intent.techStack } }
      : {}),

    // Complexity hint → map common words to schema values
    ...(intent.complexityHint
      ? {
          complexity: {
            contains: mapComplexityHint(intent.complexityHint),
            mode: "insensitive",
          },
        }
      : {}),

    // Always include text search across title + description
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  // ── 6. Execute query ───────────────────────────────────────────────────────
  let projects: Awaited<ReturnType<typeof prisma.project.findMany>>;

  try {
    projects = await prisma.project.findMany({
      where,
      include: { faqs: { orderBy: { sortOrder: "asc" } } },
      take: 20,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    });
  } catch (err) {
    console.error("[ai/search] Prisma query failed:", err);
    return NextResponse.json(
      { error: "Failed to search projects. Please try again." },
      { status: 500 }
    );
  }

  // ── 7. Fallback: if AI-augmented query returned 0 results, retry with text only ──
  if (projects.length === 0 && (intent.industry || intent.techStack?.length)) {
    try {
      projects = await prisma.project.findMany({
        where: {
          isVisible: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { faqs: { orderBy: { sortOrder: "asc" } } },
        take: 20,
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      });
    } catch (err) {
      console.error("[ai/search] Text fallback query failed:", err);
      // Return empty results rather than error
      projects = [];
    }
  }

  // ── 8. Return ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    data: { projects, query },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps natural-language complexity hints from the AI to the schema values
 * stored in the database: simple | medium | complex | enterprise.
 */
function mapComplexityHint(hint: string): string {
  const lower = hint.toLowerCase();
  if (lower.includes("enterprise") || lower.includes("large")) return "enterprise";
  if (lower.includes("complex") || lower.includes("advanced")) return "complex";
  if (lower.includes("simple") || lower.includes("basic") || lower.includes("small")) return "simple";
  return "medium";
}