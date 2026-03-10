// =============================================================================
// Zymbiq — src/app/api/orders/[id]/deliverables/route.ts
// Admin-only: add, update, and delete deliverables on an order.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/orders/[id]/deliverables — add a new deliverable
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as {
      label?: string;
      url?: string;
      status?: string;
      note?: string;
    };

    if (!body.label?.trim()) {
      return NextResponse.json(
        { error: "label is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const deliverable = await prisma.orderDeliverable.create({
      data: {
        orderId: params.id,
        label: body.label.trim(),
        url: body.url?.trim() || null,
        status: body.status ?? "pending",
        note: body.note?.trim() || null,
      },
    });

    return NextResponse.json({ data: deliverable }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders/[id]/deliverables]", error);
    return NextResponse.json({ error: "Failed to create deliverable" }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/deliverables — update a deliverable by deliverableId in body
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as {
      deliverableId?: string;
      label?: string;
      url?: string;
      status?: string;
      note?: string;
    };

    if (!body.deliverableId) {
      return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });
    }

    const deliverable = await prisma.orderDeliverable.update({
      where: { id: body.deliverableId },
      data: {
        ...(body.label ? { label: body.label.trim() } : {}),
        ...(body.url !== undefined ? { url: body.url?.trim() || null } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.note !== undefined ? { note: body.note?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ data: deliverable });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]/deliverables]", error);
    return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 });
  }
}

// DELETE /api/orders/[id]/deliverables — delete by deliverableId in body
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as { deliverableId?: string };
    if (!body.deliverableId) {
      return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });
    }

    await prisma.orderDeliverable.delete({ where: { id: body.deliverableId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/orders/[id]/deliverables]", error);
    return NextResponse.json({ error: "Failed to delete deliverable" }, { status: 500 });
  }
}