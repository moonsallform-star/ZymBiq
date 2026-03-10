// =============================================================================
// Zymbiq — src/app/api/orders/route.ts
// Orders API: role-aware GET (admin list / user own orders) + public POST
// with Prisma transaction order creation and Resend confirmation email.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/resend";
import { generateTrackingCode } from "@/lib/utils";
import OrderConfirmationEmail from "@/emails/order-confirmation";
import type { OrderType, PaymentMethod, Prisma } from "@prisma/client";
import type { PaginatedResponse } from "@/types/api";
import { DEFAULT_SITE_CONFIG } from "@/lib/constants";

// =============================================================================
// GET /api/orders
// Admin  → paginated list of all orders with search + status filters
// Client → their own orders with project and deliverables
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // -------------------------------------------------------------------------
    // Admin path — full order list with filters
    // -------------------------------------------------------------------------
    if (session.user.isAdmin) {
      const status = searchParams.get("status") ?? undefined;
      const paymentStatus = searchParams.get("paymentStatus") ?? undefined;
      const search = searchParams.get("search") ?? undefined;
      const cursor = searchParams.get("cursor") ?? undefined;
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "20", 10),
        100
      );

      const where: Prisma.OrderWhereInput = {};

      if (status) {
        where.status = status as Prisma.EnumOrderStatusFilter;
      }

      if (paymentStatus) {
        where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter;
      }

      if (search) {
        where.OR = [
          {
            user: {
              name: { contains: search, mode: "insensitive" },
            },
          },
          { guestName: { contains: search, mode: "insensitive" } },
          { guestEmail: { contains: search, mode: "insensitive" } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            project: {
              select: { title: true, slug: true },
            },
            messages: {
              select: {
                id: true,
                isAdmin: true,
                isRead: true,
                content: true,
                createdAt: true,
                threadId: true,
                user: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            deliverables: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.order.count({ where }),
      ]);

      const hasMore = orders.length > limit;
      const page = orders.slice(0, limit);
      const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

      const response: PaginatedResponse<(typeof page)[number]> & {
        nextCursor?: string;
      } = {
        data: page,
        total,
        page: cursor ? -1 : 1, // cursor-based — page number not meaningful
        pageSize: limit,
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
      };

      return NextResponse.json(response);
    }

    // -------------------------------------------------------------------------
    // Client path — own orders only
    // -------------------------------------------------------------------------
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: {
            title: true,
            slug: true,
            thumbnailUrl: true,
            category: true,
          },
        },
        deliverables: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error("[GET /api/orders] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/orders
// Public — guests and authenticated users may create orders.
// Validates body, creates order in a Prisma transaction, sends confirmation email.
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    // -------------------------------------------------------------------------
    // Parse and validate request body
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

    const parsed = OrderSchema.safeParse(rawBody);

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

    // -------------------------------------------------------------------------
    // Business rule: PREBUILT orders must reference a project
    // -------------------------------------------------------------------------
    if (data.orderType === "PREBUILT" && !data.projectId) {
      return NextResponse.json(
        { error: "A project must be selected for pre-built orders" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Business rule: guest orders must supply an email address
    // -------------------------------------------------------------------------
    const userId = session?.user?.id ?? null;
    const guestEmail = data.guestEmail ?? null;

    if (!userId && !guestEmail) {
      return NextResponse.json(
        {
          error:
            "An email address is required for guest orders. Please log in or provide your email.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // If projectId supplied, confirm project exists and is visible
    // -------------------------------------------------------------------------
    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: { id: true, isVisible: true },
      });

      if (!project || !project.isVisible) {
        return NextResponse.json(
          { error: "Project not found or no longer available" },
          { status: 404 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Create tracking code
    // -------------------------------------------------------------------------
    const trackingCode = generateTrackingCode();

    // -------------------------------------------------------------------------
    // Create order in a transaction
    // userId takes precedence when both are present (logged-in user at checkout)
    // -------------------------------------------------------------------------
    const order = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          trackingCode,
          orderType: data.orderType as OrderType,
          paymentMethod: data.paymentMethod as PaymentMethod,
          status: "NEW",
          paymentStatus: "PENDING",

          // Authenticated user
          ...(userId ? { userId } : {}),

          // Guest fields — stored for reference even when user is authenticated (custom orders)
          ...(guestEmail ? { guestEmail } : {}),
          ...(data.guestName ? { guestName: data.guestName } : {}),
          ...(data.guestPhone ? { guestPhone: data.guestPhone } : {}),

          // Project link
          ...(data.projectId ? { projectId: data.projectId } : {}),

          // Optional order metadata
          ...(data.customBrief !== undefined
            ? { customBrief: data.customBrief as Prisma.InputJsonValue }
            : {}),
          ...(data.estimatedPrice !== undefined
            ? { estimatedPrice: data.estimatedPrice }
            : {}),
          ...(data.estimatedTimeline !== undefined
            ? { estimatedTimeline: data.estimatedTimeline }
            : {}),
          ...(data.amountUsd !== undefined
            ? { amountUsd: data.amountUsd }
            : {}),
          ...(data.amountBdt !== undefined
            ? { amountBdt: data.amountBdt }
            : {}),
        },
      });
    });

    // -------------------------------------------------------------------------
    // Determine recipient email and client name for confirmation
    // -------------------------------------------------------------------------
    const recipientEmail =
      session?.user?.email ?? guestEmail;

    const clientName =
      session?.user?.name ??
      data.guestName ??
      (recipientEmail ? recipientEmail.split("@")[0] : "there");

    // Fetch platform name from SiteConfig for email branding
    let platformName = "Zymbiq";
    try {
      const platformConfig = await prisma.siteConfig.findUnique({
        where: { key: "platform" },
        select: { value: true },
      });
      if (platformConfig?.value) {
        const parsed = JSON.parse(platformConfig.value) as {
          name?: string;
        };
        if (parsed.name) platformName = parsed.name;
      }
    } catch {
      // Non-critical — use default platform name
    }

    // -------------------------------------------------------------------------
    // Send order confirmation email (non-blocking — never throws to caller)
    // -------------------------------------------------------------------------
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: `Order Received — ${platformName}`,
        react: OrderConfirmationEmail({
          clientName,
          orderType: order.orderType,
          trackingCode: order.trackingCode,
          platformName,
          supportEmail: DEFAULT_SITE_CONFIG.platform.supportEmail,
        }),
      });
    }

    return NextResponse.json(
      {
        data: {
          orderId: order.id,
          trackingCode: order.trackingCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/orders] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating your order" },
      { status: 500 }
    );
  }
}