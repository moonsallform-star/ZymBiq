// =============================================================================
// Zymbiq — src/app/api/orders/[id]/route.ts
// Individual order API: role-aware GET + admin-only PATCH for order field updates.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/orders/[id]
// Admin  → full order with all relations
// Client → own order only (404 if not owner, to prevent info leak)
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        project: true,
        messages: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        deliverables: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Admin sees everything; client only sees their own order.
    // Return 404 (not 403) for non-owner to avoid confirming the order exists.
    if (!session.user.isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[GET /api/orders/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/orders/[id]
// Admin only — updates administrative / metadata fields on an order.
// Does NOT update status or payment status (those have dedicated routes).
// =============================================================================

const PATCHABLE_FIELDS = [
  "adminNotes",
  "notes",
  "deadline",
  "estimatedTimeline",
  "devforgeProjectId",
  "buildPhase",
] as const;

type PatchableField = (typeof PATCHABLE_FIELDS)[number];

interface PatchBody {
  adminNotes?: string | null;
  notes?: string | null;
  deadline?: string | null;
  estimatedTimeline?: string | null;
  devforgeProjectId?: string | null;
  buildPhase?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // Parse request body
    // -------------------------------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Build update data — only allow whitelisted fields to prevent mass assignment
    // -------------------------------------------------------------------------
    const body = rawBody as Record<string, unknown>;
    const updateData: Partial<Record<PatchableField, string | null>> = {};

    for (const field of PATCHABLE_FIELDS) {
      if (!(field in body)) continue;

      const value = body[field];

      if (value === null || value === undefined) {
        updateData[field] = null;
        continue;
      }

      if (typeof value !== "string") {
        return NextResponse.json(
          { error: `Field "${field}" must be a string or null` },
          { status: 400 }
        );
      }

      // Validate deadline is a parseable date string when provided
      if (field === "deadline" && value !== "") {
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "deadline must be a valid ISO date string" },
            { status: 400 }
          );
        }
      }

      updateData[field] = value === "" ? null : value;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Confirm order exists before updating
    // -------------------------------------------------------------------------
    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // Apply update — coerce deadline string to Date when present
    // -------------------------------------------------------------------------
    const prismaData: Parameters<typeof prisma.order.update>[0]["data"] = {
      ...updateData,
      ...(updateData.deadline !== undefined
        ? {
            deadline:
              updateData.deadline !== null
                ? new Date(updateData.deadline)
                : null,
          }
        : {}),
    };

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: prismaData,
      include: {
        user: true,
        project: true,
        messages: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        deliverables: true,
      },
    });

    return NextResponse.json({ data: updatedOrder });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}