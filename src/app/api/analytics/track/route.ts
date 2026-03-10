// =============================================================================
// Zymbiq — src/app/api/analytics/track/route.ts
// Public analytics event tracking — always returns 200, never throws.
// =============================================================================

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Valid event names — sanitized client-side inputs mapped to known values
// ---------------------------------------------------------------------------

const VALID_EVENTS = new Set([
  "page_view",
  "project_view",
  "order_started",
  "checkout_visited",
  "demo_clicked",
]);

// ---------------------------------------------------------------------------
// POST /api/analytics/track
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const body: {
      event?: unknown;
      page?: unknown;
      projectId?: unknown;
      metadata?: unknown;
    } = await request.json().catch(() => ({}));

    // Sanitize event name — lowercase, max 50 chars, fallback to 'unknown'
    const rawEvent =
      typeof body.event === "string"
        ? body.event.toLowerCase().slice(0, 50)
        : "unknown";

    const event = VALID_EVENTS.has(rawEvent) ? rawEvent : "unknown";

    const page =
      typeof body.page === "string" ? body.page.slice(0, 500) : undefined;

    const projectId =
      typeof body.projectId === "string" ? body.projectId : undefined;

    const metadata =
      body.metadata !== null &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined;

    // Create analytics event record
    await prisma.analyticsEvent.create({
      data: {
        event,
        page: page ?? null,
        projectId: projectId ?? null,
        metadata: metadata as unknown as import('@prisma/client').Prisma.InputJsonValue ?? undefined,
      },
    });

    // If project_view with a valid projectId — increment views fire-and-forget
    if (event === "project_view" && projectId) {
      prisma.project
        .update({
          where: { id: projectId },
          data: { views: { increment: 1 } },
        })
        .catch((err: unknown) => {
          console.error("Analytics: project view increment failed:", err);
        });
    }
  } catch (e) {
    console.error("Analytics track failed:", e);
  }

  return Response.json({ data: { tracked: true } });
}