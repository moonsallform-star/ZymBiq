// =============================================================================
// Zymbiq — src/app/api/pricing/route.ts
// Pricing tiers API: public GET for visible tiers, admin POST/PATCH/DELETE.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PricingTierSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// GET /api/pricing — public, returns visible tiers ordered by sortOrder
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const tiers = await prisma.pricingTier.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: tiers });
  } catch (error) {
    console.error("[GET /api/pricing]", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing tiers" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/pricing — admin only, creates a new pricing tier
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = PricingTierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tier = await prisma.pricingTier.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: tier }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pricing]", error);
    return NextResponse.json(
      { error: "Failed to create pricing tier" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/pricing — admin only, partially updates a pricing tier by id
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("id" in body) ||
      typeof (body as Record<string, unknown>).id !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include a string 'id' field" },
        { status: 400 }
      );
    }

    const { id, ...rest } = body as Record<string, unknown>;

    const parsed = PricingTierSchema.partial().safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the tier exists before attempting update
    const existing = await prisma.pricingTier.findUnique({
      where: { id: id as string },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.pricingTier.update({
      where: { id: id as string },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/pricing]", error);
    return NextResponse.json(
      { error: "Failed to update pricing tier" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/pricing — admin only, deletes a pricing tier by id
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("id" in body) ||
      typeof (body as Record<string, unknown>).id !== "string"
    ) {
      return NextResponse.json(
        { error: "Request body must include a string 'id' field" },
        { status: 400 }
      );
    }

    const { id } = body as { id: string };

    // Verify the tier exists before attempting delete
    const existing = await prisma.pricingTier.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pricing tier not found" },
        { status: 404 }
      );
    }

    await prisma.pricingTier.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/pricing]", error);
    return NextResponse.json(
      { error: "Failed to delete pricing tier" },
      { status: 500 }
    );
  }
}