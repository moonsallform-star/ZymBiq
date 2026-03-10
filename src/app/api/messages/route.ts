// =============================================================================
// Zymbiq — src/app/api/messages/route.ts
// Messages API: admin thread summary GET, user-specific GET, public POST.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// GET /api/messages
// Admin: returns all thread summaries with unread counts.
// Authenticated user: returns threads belonging to that user.
// Unauthenticated: 401.
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.isAdmin) {
      // -----------------------------------------------------------------------
      // Admin view — one row per unique threadId, most recent message first.
      // Attach the associated user record when present (logged-in visitor).
      // -----------------------------------------------------------------------
      const latestPerThread = await prisma.message.findMany({
        distinct: ["threadId"],
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          threadId: true,
          content: true,
          createdAt: true,
          isRead: true,
          isAdmin: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Count unread (non-admin) messages per thread in a single query.
      const unreadCounts = await prisma.message.groupBy({
        by: ["threadId"],
        where: { isRead: false, isAdmin: false },
        _count: { _all: true },
      });

      const unreadMap = new Map(
        unreadCounts.map((r) => [r.threadId, r._count._all])
      );

      const threads = latestPerThread.map((msg) => ({
        ...msg,
        unreadCount: unreadMap.get(msg.threadId) ?? 0,
      }));

      return NextResponse.json({ data: threads });
    }

    // -------------------------------------------------------------------------
    // Authenticated non-admin — return only threads where this user has messages.
    // -------------------------------------------------------------------------
    const userThreads = await prisma.message.findMany({
      where: { userId: session.user.id },
      distinct: ["threadId"],
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        threadId: true,
        content: true,
        createdAt: true,
        isRead: true,
        isAdmin: true,
        userId: true,
      },
    });

    return NextResponse.json({ data: userThreads });
  } catch (error) {
    console.error("[GET /api/messages]", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/messages
// Public — no authentication required (anonymous visitors can start a thread).
// Creates a message record and returns it with the threadId so the client can
// persist the value in localStorage for future messages.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = MessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { content, threadId: providedThreadId, orderId: providedOrderId } = parsed.data;

    // Explicit guard matching the route spec (Zod already handles min/max but
    // we keep this clear for readability and defence in depth).
    if (!content || content.length > 5000) {
      return NextResponse.json(
        { error: "Message content is required and must be under 5000 characters" },
        { status: 400 }
      );
    }

    // Resolve threadId — use the provided one or generate a new UUID.
    const threadId = providedThreadId?.trim() || randomUUID();

    // Determine session-based metadata without requiring auth.
    const session = await auth();
    const isAdmin = session?.user?.isAdmin ?? false;
    const userId = session?.user?.id ?? null;

    const message = await prisma.message.create({
      data: {
        content,
        threadId,
        isAdmin,
        ...(userId ? { userId } : {}),
        ...(providedOrderId ? { orderId: providedOrderId } : {}),
      },
      select: {
        id: true,
        threadId: true,
        content: true,
        isAdmin: true,
        isRead: true,
        userId: true,
        createdAt: true,
      },
    });

    // Return the full message including threadId so the client can store it.
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/messages]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}