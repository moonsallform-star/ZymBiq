// =============================================================================
// Zymbiq — src/app/api/faq/route.ts
// FAQ items API — public GET of visible items, admin POST/PATCH/DELETE CRUD.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FaqSchema } from "@/lib/validations";

// =============================================================================
// GET /api/faq
// Public — returns all visible FAQ items ordered by category then sortOrder.
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const faqs = await prisma.faqItem.findMany({
      where: { isVisible: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ data: faqs });
  } catch (error) {
    console.error("[GET /api/faq]", error);
    return NextResponse.json(
      { error: "Failed to fetch FAQ items" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/faq
// Admin only — creates a new FAQ item from FaqSchema-validated body.
// =============================================================================

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
    const parsed = FaqSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const faq = await prisma.faqItem.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: faq }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/faq]", error);
    return NextResponse.json(
      { error: "Failed to create FAQ item" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/faq
// Admin only — partial update of an existing FAQ item by id.
// Body must include id plus any fields from FaqSchema to update.
// =============================================================================

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
        { error: "Request body must include a string id field" },
        { status: 400 }
      );
    }

    const { id, ...rest } = body as Record<string, unknown>;

    const parsed = FaqSchema.partial().safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify item exists before update
    const existing = await prisma.faqItem.findUnique({
      where: { id: id as string },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.faqItem.update({
      where: { id: id as string },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/faq]", error);
    return NextResponse.json(
      { error: "Failed to update FAQ item" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/faq
// Admin only — deletes a FAQ item by id from request body.
// =============================================================================

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
        { error: "Request body must include a string id field" },
        { status: 400 }
      );
    }

    const { id } = body as { id: string };

    // Verify item exists before deletion
    const existing = await prisma.faqItem.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "FAQ item not found" },
        { status: 404 }
      );
    }

    await prisma.faqItem.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/faq]", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ item" },
      { status: 500 }
    );
  }
}