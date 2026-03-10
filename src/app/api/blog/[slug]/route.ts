// =============================================================================
// Zymbiq — src/app/api/blog/[slug]/route.ts
// Individual blog post: public GET, admin PATCH (partial update), admin DELETE.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlogPostSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// GET /api/blog/[slug]
// Public — returns published post only.
// Admin — returns any post (published or draft) for preview/edit.
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    const isAdmin = session?.user?.isAdmin === true;

    const post = await prisma.blogPost.findUnique({
      where: isAdmin
        ? { slug: params.slug }
        : { slug: params.slug, isPublished: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: post });
  } catch (err) {
    console.error("[GET /api/blog/[slug]]", err);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/blog/[slug]
// Admin only — partial update.
// Special case: isPublished false → true sets publishedAt = now().
//               isPublished true → false preserves existing publishedAt.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = BlogPostSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Determine publishedAt mutation:
    // - Publishing for the first time → set to now
    // - Unpublishing → leave publishedAt intact (preserve the date for re-publish)
    // - No change to isPublished → no publishedAt change
    let publishedAt: Date | undefined;

    if (data.isPublished === true) {
      // Check current post to see if it was previously unpublished
      const current = await prisma.blogPost.findUnique({
        where: { slug: params.slug },
        select: { isPublished: true, publishedAt: true },
      });

      if (!current) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (!current.isPublished) {
        // Transitioning from draft → published: stamp the publish date
        publishedAt = new Date();
      }
      // Already published: leave publishedAt unchanged (no override needed)
    }
    // isPublished === false or undefined: leave publishedAt as-is

    const updateData: Parameters<typeof prisma.blogPost.update>[0]["data"] = {
      ...data,
      ...(publishedAt !== undefined ? { publishedAt } : {}),
    };

    const updatedPost = await prisma.blogPost.update({
      where: { slug: params.slug },
      data: updateData,
    });

    return NextResponse.json({ data: updatedPost });
  } catch (err: unknown) {
    // Prisma P2025 — record not found
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    console.error("[PATCH /api/blog/[slug]]", err);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/blog/[slug]
// Admin only — permanently removes the post.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.blogPost.delete({
      where: { slug: params.slug },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    console.error("[DELETE /api/blog/[slug]]", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}