// =============================================================================
// Zymbiq — src/app/api/projects/[slug]/route.ts
// Individual project API: public GET, admin PATCH (partial update), admin DELETE.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Route segment config — always dynamic (project data changes)
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helper — enforce admin session, returning a 401/403 response if not met
// ---------------------------------------------------------------------------

type AdminResult =
  | { session: null; error: NextResponse }
  | { session: import("next-auth").Session; error: null };

async function requireAdmin(): Promise<AdminResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!session.user.isAdmin) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/projects/[slug]
// Public — returns a single project with its FAQs ordered by sortOrder.
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: params.slug },
      include: {
        faqs: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[GET /api/projects/[slug]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/[slug]
// Admin only — partial update using ProjectSchema.partial().
// Handles slug uniqueness conflicts (P2002) as 409.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body: unknown = await request.json();

    const parsed = ProjectSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If the caller is changing the slug, verify the new slug is not already taken
    // by a different project before issuing the DB write.
    if (data.slug && data.slug !== params.slug) {
      const existing = await prisma.project.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Slug already in use", details: { slug: ["A project with this slug already exists."] } },
          { status: 409 }
        );
      }
    }

    const updatedProject = await prisma.project.update({
      where: { slug: params.slug },
      data,
      include: {
        faqs: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: updatedProject });
  } catch (error) {
    // Prisma unique constraint violation (race condition on slug check above)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Slug already in use", details: { slug: ["A project with this slug already exists."] } },
        { status: 409 }
      );
    }

    // Prisma record not found
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[PATCH /api/projects/[slug]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[slug]
// Admin only — deletes the project; cascade on ProjectFaq handled by Prisma
// schema (onDelete: Cascade on the ProjectFaq → Project relation).
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await prisma.project.delete({
      where: { slug: params.slug },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    // Prisma record not found
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.error("[DELETE /api/projects/[slug]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}