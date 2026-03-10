// =============================================================================
// Zymbiq — src/app/api/blog/route.ts
// Public paginated GET for published posts + admin POST for new post creation.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlogPostSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { BLOG_PAGE_SIZE } from "@/lib/constants";
import type { PaginatedResponse } from "@/types/api";
import type { BlogPostSummary } from "@/types/database";

// =============================================================================
// GET /api/blog
// Public: returns paginated published posts (BlogPostSummary shape).
// Admin with ?all=true: returns all posts regardless of publish state.
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(
        50,
        parseInt(searchParams.get("pageSize") ?? String(BLOG_PAGE_SIZE), 10)
      )
    );
    const allFlag = searchParams.get("all") === "true";

    // Determine visibility filter
    let showAll = false;
    if (allFlag) {
      const session = await auth();
      showAll = session?.user?.isAdmin === true;
    }

    const where = showAll ? {} : { isPublished: true };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          readTime: true,
          publishedAt: true,
          isPublished: true,
        },
        orderBy: { publishedAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.blogPost.count({ where }),
    ]);

    const response: PaginatedResponse<BlogPostSummary> = {
      data: posts as BlogPostSummary[],
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/blog]", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/blog
// Admin only. Creates a new blog post, auto-generating slug from title when
// not provided. Sets publishedAt to now() when isPublished is true.
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate body — slug may be absent; we'll generate it from title
    const rawBody = body as Record<string, unknown>;

    // Auto-generate slug from title if not provided or empty
    if (!rawBody.slug || (rawBody.slug as string).trim() === "") {
      const title =
        typeof rawBody.title === "string" ? rawBody.title : "";
      rawBody.slug = slugify(title);
    }

    const parsed = BlogPostSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const publishedAt =
      data.isPublished ? new Date() : null;

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImageUrl: data.coverImageUrl ?? null,
        readTime: data.readTime,
        isPublished: data.isPublished,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        publishedAt,
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    // Prisma unique constraint violation on slug
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }

    console.error("[POST /api/blog]", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}