// =============================================================================
// Zymbiq — src/app/api/admin/content/route.ts
// Admin content API: GET current content SiteConfig, PATCH a named section
// into the merged content JSON and revalidate all affected public paths.
// =============================================================================

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_CONFIG } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All recognised content section names that a PATCH may target. */
const CONTENT_SECTIONS = [
  "heroHeadline",
  "heroSubheadline",
  "heroCta1",
  "heroCta2",
  "trustStrip",
  "processSteps",
  "aboutText",
  "footerTagline",
  "footerLinks",
  "finalCtaHeadline",
  "finalCtaSubheadline",
] as const;

type ContentSection = (typeof CONTENT_SECTIONS)[number];

interface PatchBody {
  section: ContentSection | string | null;
  data: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch and parse the 'content' SiteConfig record.
 * Falls back to DEFAULT_SITE_CONFIG.content if the record is absent or unparseable.
 */
async function fetchParsedContent(): Promise<Record<string, unknown>> {
  noStore();
  const record = await prisma.siteConfig.findUnique({
    where: { key: "content" },
  });

  if (!record) {
    return DEFAULT_SITE_CONFIG.content as unknown as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(record.value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Corrupt value — fall through to default
  }

  return DEFAULT_SITE_CONFIG.content as unknown as Record<string, unknown>;
}

/**
 * Revalidate all public paths that may render content from SiteConfig.
 * Called after every successful PATCH regardless of section so that a
 * section rename never silently leaves stale pages.
 */
function revalidateContentPaths(): void {
  const pages = [
    "/",
    "/about",
    "/process",
    "/pricing",
    "/faq",
    "/contact",
    "/showroom",
    "/order",
    "/blog",
  ];

  for (const path of pages) {
    revalidatePath(path, "page");
  }

  // Revalidate the root layout so header/footer text also updates.
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// GET /api/admin/content
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  // Admin guard
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const content = await fetchParsedContent();

    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[GET /api/admin/content] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content configuration" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/content
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // Admin guard
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Parse request body
  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate body shape
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be an object" },
      { status: 400 }
    );
  }

  const { section, data } = body;

  // section may be null when the caller wants to merge a full flat object
  // of multiple fields atomically (avoids parallel-write race conditions).
  if (section !== null && (typeof section !== "string" || section.trim() === "")) {
    return NextResponse.json(
      { error: "Field 'section' must be a non-empty string or null" },
      { status: 400 }
    );
  }

  if (data === undefined) {
    return NextResponse.json(
      { error: "Field 'data' is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch existing content to merge into
    const existingContent = await fetchParsedContent();

    // Remove legacy nested keys that were saved incorrectly before the fix
    const LEGACY_KEYS = ['hero', 'about', 'footer'];
    const cleanedExisting: Record<string, unknown> = { ...existingContent };
    for (const legacyKey of LEGACY_KEYS) {
      delete cleanedExisting[legacyKey];
    }

    // Deep-merge: if section is null, data is a flat object of multiple fields
    // merged atomically. Otherwise replace the single named section wholesale.
    const updatedContent: Record<string, unknown> =
      section === null && data !== null && typeof data === "object" && !Array.isArray(data)
        ? { ...cleanedExisting, ...(data as Record<string, unknown>) }
        : { ...cleanedExisting, [section as string]: data };

    // Serialise
    let valueStr: string;
    try {
      valueStr = JSON.stringify(updatedContent);
    } catch (serializeError) {
      console.error("[PATCH /api/admin/content] Serialization error:", serializeError);
      return NextResponse.json(
        { error: "Failed to serialize content data" },
        { status: 500 }
      );
    }

    // Upsert into SiteConfig
    const upsertResult = await prisma.siteConfig.upsert({
      where: { key: "content" },
      update: {
        value: valueStr,
      },
      create: {
        key: "content",
        value: valueStr,
        category: "content",
      },
    });

    console.log("[PATCH /api/admin/content] upsert result:", JSON.stringify(upsertResult));
    console.log("[PATCH /api/admin/content] saved value:", valueStr.slice(0, 300));

    // Verify what's actually in DB now
    const verify = await prisma.siteConfig.findUnique({ where: { key: "content" } });
    console.log("[PATCH /api/admin/content] DB verify:", verify?.value?.slice(0, 300));

    // Trigger ISR revalidation for all content-consuming public pages
    revalidateContentPaths();

    return NextResponse.json({
      data: {
        updated: true,
        section,
        savedValue: JSON.parse(valueStr),
      },
    });
  } catch (error) {
    console.error("[PATCH /api/admin/content] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update content configuration" },
      { status: 500 }
    );
  }
}