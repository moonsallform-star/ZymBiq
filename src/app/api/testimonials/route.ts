// =============================================================================
// Zymbiq — src/app/api/testimonials/route.ts
// Public GET + admin POST / PATCH / DELETE for testimonials.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TestimonialSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// GET /api/testimonials — public, returns all visible testimonials
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: testimonials });
  } catch (error) {
    console.error("[GET /api/testimonials]", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/testimonials — admin only, creates a new testimonial
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
    const parsed = TestimonialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const testimonial = await prisma.testimonial.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: testimonial }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/testimonials]", error);
    return NextResponse.json(
      { error: "Failed to create testimonial" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/testimonials — admin only, partial update by id
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
        { error: "Missing or invalid 'id' field" },
        { status: 400 }
      );
    }

    const { id, ...rest } = body as Record<string, unknown>;

    const parsed = TestimonialSchema.partial().safeParse(rest);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Ensure the record exists before updating
    const existing = await prisma.testimonial.findUnique({
      where: { id: id as string },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.testimonial.update({
      where: { id: id as string },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/testimonials]", error);
    return NextResponse.json(
      { error: "Failed to update testimonial" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/testimonials — admin only, deletes by id
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
        { error: "Missing or invalid 'id' field" },
        { status: 400 }
      );
    }

    const { id } = body as { id: string };

    // Guard against deleting a non-existent record (Prisma P2025)
    const existing = await prisma.testimonial.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    }

    await prisma.testimonial.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/testimonials]", error);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}