// =============================================================================
// Zymbiq — src/app/api/admin/ai-config/route.ts
// Admin AI configuration API route — GET to read, PATCH to update AI config.
// No ISR revalidation needed: AI config is consumed at request time by AI
// API routes, never cached in page rendering.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Default AI config fallback — mirrors DEFAULT_SITE_CONFIG.ai shape.
// Defined inline to avoid importing constants (which pulls in other deps).
// ---------------------------------------------------------------------------

const DEFAULT_AI_CONFIG = {
  orderFlowQuestions: [
    {
      id: "q1",
      question: "What type of website do you need? (e.g. restaurant, portfolio, e-commerce)",
      type: "text",
      sortOrder: 1,
    },
    {
      id: "q2",
      question: "What industry or niche is your business in?",
      type: "text",
      sortOrder: 2,
    },
    {
      id: "q3",
      question: "What key features do you need? (e.g. booking system, payment, gallery)",
      type: "text",
      sortOrder: 3,
    },
    {
      id: "q4",
      question: "What is your approximate budget in USD?",
      type: "text",
      sortOrder: 4,
    },
    {
      id: "q5",
      question: "What is your desired timeline or deadline?",
      type: "text",
      sortOrder: 5,
    },
  ],
  chatbotKnowledgeBase:
    "I am a helpful assistant for a web development platform. I can answer questions about our services, pricing, and process. We build premium production-ready websites for businesses.",
  recommenderPrompt:
    "Based on the user's industry and requirements, recommend the most suitable projects from our portfolio.",
  pricingLogic:
    "Base pricing: Simple sites $300-500, Medium complexity $500-1000, Complex $1000-2000, Enterprise $2000+. Factors: feature count, integrations, timeline urgency.",
};

// ---------------------------------------------------------------------------
// Shared admin guard — returns 403 response or null if authorised.
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return null;
}

// =============================================================================
// GET /api/admin/ai-config
// Admin only. Returns the parsed AI SiteConfig or DEFAULT_AI_CONFIG fallback.
// =============================================================================

export async function GET(): Promise<NextResponse> {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: "ai" },
      select: { value: true },
    });

    if (!record?.value) {
      return NextResponse.json({ data: DEFAULT_AI_CONFIG });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(record.value);
    } catch {
      // Corrupted value — return safe default
      return NextResponse.json({ data: DEFAULT_AI_CONFIG });
    }

    // Merge with default to ensure all keys exist even if DB record is partial
    const merged = {
      ...DEFAULT_AI_CONFIG,
      ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    };

    return NextResponse.json({ data: merged });
  } catch (error) {
    console.error("[GET /api/admin/ai-config] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI configuration" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/admin/ai-config
// Admin only. Merges partial AI config into existing record and upserts.
// No revalidatePath call — AI config is consumed at request time only.
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  try {
    // Fetch the current AI config so we can deep-merge rather than replace
    const existing = await prisma.siteConfig.findUnique({
      where: { key: "ai" },
      select: { value: true },
    });

    let existingParsed: Record<string, unknown> = { ...DEFAULT_AI_CONFIG };

    if (existing?.value) {
      try {
        const raw = JSON.parse(existing.value);
        if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
          existingParsed = raw as Record<string, unknown>;
        }
      } catch {
        // Keep default if existing value is malformed
      }
    }

    // Merge — incoming fields overwrite existing, unset fields preserved
    const merged: Record<string, unknown> = {
      ...existingParsed,
      ...(body as Record<string, unknown>),
    };

    const valueStr = JSON.stringify(merged);

    await prisma.siteConfig.upsert({
      where: { key: "ai" },
      update: {
        value: valueStr,
      },
      create: {
        key: "ai",
        value: valueStr,
        category: "ai",
      },
    });

    // No revalidatePath — AI routes read config fresh on each request
    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    console.error("[PATCH /api/admin/ai-config] Error:", error);
    return NextResponse.json(
      { error: "Failed to update AI configuration" },
      { status: 500 }
    );
  }
}