// =============================================================================
// Zymbiq — src/app/api/projects/route.ts
// Public paginated project list with filtering/sorting + admin project creation.
// =============================================================================

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { PROJECT_PAGE_SIZE } from "@/lib/constants";
import type { ProjectWithFaqs } from "@/types/database";
import type { Prisma } from "@prisma/client";

// =============================================================================
// GET /api/projects
// Public endpoint — returns a paginated, filtered, sorted project list.
// =============================================================================

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl;

    // -------------------------------------------------------------------------
    // Parse query parameters
    // -------------------------------------------------------------------------
    const category = searchParams.get("category") ?? undefined;
    const techStackParam = searchParams.get("techStack");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const complexity = searchParams.get("complexity") ?? undefined;
    const sort = searchParams.get("sort") ?? "newest";
    const search = searchParams.get("search") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit");
    const excludeParam = searchParams.get("exclude");
    const featured = searchParams.get("featured");

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : PROJECT_PAGE_SIZE;
    const techStack = techStackParam
      ? techStackParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const excludeIds = excludeParam
      ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    // -------------------------------------------------------------------------
    // Build Prisma where clause
    // -------------------------------------------------------------------------
    const where: Prisma.ProjectWhereInput = {
      isVisible: true,
      ...(category && { category }),
      ...(techStack?.length && { techStack: { hasSome: techStack } }),
      ...(minPrice !== undefined && !isNaN(minPrice) && {
        price: { gte: minPrice },
      }),
      ...(maxPrice !== undefined && !isNaN(maxPrice) && {
        price: {
          ...(minPrice !== undefined && !isNaN(minPrice) ? { gte: minPrice } : {}),
          lte: maxPrice,
        },
      }),
      ...(complexity && { complexity }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(excludeIds?.length && { id: { notIn: excludeIds } }),
      ...(featured === "true" && { isFeatured: true }),
    };

    // -------------------------------------------------------------------------
    // Merge price range if both min and max provided (avoid duplicate key)
    // -------------------------------------------------------------------------
    if (
      minPrice !== undefined &&
      !isNaN(minPrice) &&
      maxPrice !== undefined &&
      !isNaN(maxPrice)
    ) {
      where.price = { gte: minPrice, lte: maxPrice };
    }

    // -------------------------------------------------------------------------
    // Build orderBy clause
    // -------------------------------------------------------------------------
    let orderBy: Prisma.ProjectOrderByWithRelationInput | Prisma.ProjectOrderByWithRelationInput[];

    switch (sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "featured":
        orderBy = [{ isFeatured: "desc" }, { sortOrder: "asc" }];
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // -------------------------------------------------------------------------
    // Parallel: paginated fetch + total count
    // -------------------------------------------------------------------------
    const [rawProjects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        take: limit + 1, // fetch one extra to determine hasMore
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
          faqs: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    // -------------------------------------------------------------------------
    // Cursor pagination — determine hasMore and nextCursor
    // -------------------------------------------------------------------------
    const hasMore = rawProjects.length > limit;
    const projects: ProjectWithFaqs[] = hasMore
      ? rawProjects.slice(0, limit)
      : rawProjects;
    const nextCursor = hasMore ? projects[projects.length - 1]?.id : undefined;

    return Response.json({
      data: projects,
      hasMore,
      nextCursor: nextCursor ?? null,
      total,
    });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/projects
// Admin-only — creates a new project.
// =============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // -------------------------------------------------------------------------
    // Auth check — admin only
    // -------------------------------------------------------------------------
    const session = await auth();

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // Parse and validate request body
    // -------------------------------------------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ProjectSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // -------------------------------------------------------------------------
    // Generate slug from title if not provided or empty
    // -------------------------------------------------------------------------
    const slug =
      data.slug?.trim() ? data.slug.trim() : slugify(data.title);

    // -------------------------------------------------------------------------
    // Create project
    // -------------------------------------------------------------------------
    const project = await prisma.project.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        category: data.category,
        techStack: data.techStack,
        price: data.price,
        demoUrl: data.demoUrl || null,
        githubRepo: data.githubRepo || null,
        features: data.features,
        qualityScore: data.qualityScore,
        buildTime: data.buildTime,
        fileCount: data.fileCount,
        thumbnailUrl: data.thumbnailUrl || null,
        isFeatured: data.isFeatured,
        isVisible: data.isVisible,
        complexity: data.complexity,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        faqs: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return Response.json({ data: project }, { status: 201 });
  } catch (error) {
    // -------------------------------------------------------------------------
    // Prisma unique constraint violation — duplicate slug
    // -------------------------------------------------------------------------
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "A project with this slug already exists" },
        { status: 409 }
      );
    }

    console.error("[POST /api/projects]", error);
    return Response.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}