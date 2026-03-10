// =============================================================================
// Zymbiq — src/app/api/admin/site-config/route.ts
// Public GET for theming/config data + admin PATCH for upsert with ISR revalidation.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Sensitive keys / fields to strip before sending config to the public
// ---------------------------------------------------------------------------

/** Keys whose raw value must be sanitised before leaving the server. */
const SENSITIVE_KEYS = new Set<string>([SITE_CONFIG_KEYS.DEVFORGE]);

/**
 * Strip sensitive fields from a parsed config object so the response
 * is safe to expose to client components (e.g. useSiteConfig hook).
 *
 * devforge → remove apiKey
 */
function sanitiseValue(key: string, parsed: unknown): unknown {
  if (key === SITE_CONFIG_KEYS.DEVFORGE && parsed !== null && typeof parsed === "object") {
    const { apiKey, ...safe } = parsed as Record<string, unknown>;
    return {
      ...safe,
      hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
    };
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// GET /api/admin/site-config
// Public — returns all SiteConfig records as a key→value map.
// Sensitive fields are stripped before the response is sent.
// ---------------------------------------------------------------------------

// Cache the config response for 5 minutes at the CDN/edge level.
// The PATCH handler calls revalidatePath('/') on writes, so the cache
// is invalidated immediately when an admin saves changes.
export const revalidate = 300;

export async function GET(): Promise<NextResponse> {
  noStore();
  try {
    const records = await prisma.siteConfig.findMany();

    const configMap: Record<string, unknown> = {};

    for (const record of records) {
      try {
        const parsed: unknown = JSON.parse(record.value);
        configMap[record.key] = SENSITIVE_KEYS.has(record.key)
          ? sanitiseValue(record.key, parsed)
          : parsed;
      } catch {
        // If a value is malformed JSON, return an empty object for that key
        // so consumers can fall back to DEFAULT_SITE_CONFIG without throwing.
        configMap[record.key] = {};
      }
    }

    return NextResponse.json({ data: configMap }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("[site-config GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch site configuration." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/site-config
// Admin only — upserts a single SiteConfig record by key.
// Triggers ISR revalidation on "/" after a successful write.
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("key" in body) ||
    !("value" in body)
  ) {
    return NextResponse.json(
      { error: "Request body must contain 'key' and 'value' fields." },
      { status: 400 }
    );
  }

  const { key, value } = body as { key: unknown; value: unknown };

  // ── Validate key ───────────────────────────────────────────────────────────
  if (typeof key !== "string") {
    return NextResponse.json(
      { error: "'key' must be a string." },
      { status: 400 }
    );
  }

  const allowedKeys = Object.values(SITE_CONFIG_KEYS) as string[];
  if (!allowedKeys.includes(key)) {
    return NextResponse.json(
      {
        error: `Invalid config key '${key}'. Must be one of: ${allowedKeys.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // ── Serialise value ────────────────────────────────────────────────────────
  let valueStr: string;
  try {
    valueStr = JSON.stringify(value);
  } catch (err) {
    console.error("[site-config PATCH] JSON.stringify failure:", err);
    return NextResponse.json(
      { error: "Value could not be serialised to JSON." },
      { status: 500 }
    );
  }

  // ── Upsert ─────────────────────────────────────────────────────────────────
  try {
    await prisma.siteConfig.upsert({
      where: { key },
      update: { value: valueStr },
      create: {
        key,
        value: valueStr,
        category: key,
      },
    });
  } catch (error) {
    console.error("[site-config PATCH] DB upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save configuration." },
      { status: 500 }
    );
  }

  // Only revalidate layout for appearance changes — those affect server-rendered
  // CSS custom properties injected on <html>. All other keys are consumed
  // client-side via useSiteConfig and do not need ISR revalidation.
  if (key === SITE_CONFIG_KEYS.APPEARANCE) {
    try {
      revalidatePath("/", "layout");
    } catch (revalidateError) {
      console.warn("[site-config PATCH] revalidatePath warning:", revalidateError);
    }
  }

  return NextResponse.json({ data: { updated: true, key } });
}