// =============================================================================
// Zymbiq — src/app/api/messages/[threadId]/route.ts
// Thread-specific messages: fetch history and mark as read.
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// =============================================================================
// GET /api/messages/[threadId]
// Fetch all messages in a thread ordered chronologically.
//
// Access control:
//   - Admin: any thread
//   - Authenticated user: only threads where at least one message has userId === session.user.id
//   - Anonymous (no session): allowed — threadId itself is the auth token for
//     anonymous visitors who stored it in localStorage
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  try {
    const { threadId } = params;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const session = await auth();

    // -------------------------------------------------------------------------
    // Access control for authenticated (non-admin) users:
    // Verify they own at least one message in this thread.
    // -------------------------------------------------------------------------
    if (session?.user && !session.user.isAdmin) {
      const ownerCheck = await prisma.message.findFirst({
        where: {
          threadId,
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (!ownerCheck) {
        // Thread exists but user has no messages in it — deny access
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Fetch messages — admin sees any thread, anonymous / verified user proceeds
    // -------------------------------------------------------------------------
    const messages = await prisma.message.findMany({
      where: { threadId },
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
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("[GET /api/messages/[threadId]]", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/messages/[threadId]
// Mark messages in a thread as read.
//
// - Admin marks visitor messages (isAdmin=false) as read
// - Authenticated user marks admin messages (isAdmin=true) as read
// - Unauthenticated: 401
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  try {
    const { threadId } = params;
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.message.deleteMany({ where: { threadId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error('[DELETE /api/messages/[threadId]]', error);
    return NextResponse.json({ error: 'Failed to delete thread' }, { status: 500 });
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  try {
    const { threadId } = params;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // Mark the opposing party's messages as read:
    //   Admin reading → marks visitor messages (isAdmin=false) as read
    //   User reading  → marks admin messages (isAdmin=true) as read
    // -------------------------------------------------------------------------
    await prisma.message.updateMany({
      where: {
        threadId,
        isAdmin: !session.user.isAdmin,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    console.error("[PATCH /api/messages/[threadId]]", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}