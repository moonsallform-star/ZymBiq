// =============================================================================
// Zymbiq — src/app/api/orders/[id]/status/route.ts
// Admin-only PATCH endpoint to update an order's status, with payment guard
// for DELIVERED and a non-blocking status-update email to the client.
// =============================================================================

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import OrderStatusUpdateEmail from "@/emails/order-status-update";

// ---------------------------------------------------------------------------
// Valid OrderStatus values — mirrors the Prisma enum
// ---------------------------------------------------------------------------

const VALID_ORDER_STATUSES = [
  "NEW",
  "IN_DISCUSSION",
  "BUILDING",
  "REVIEW",
  "DELIVERED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

function isValidOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (VALID_ORDER_STATUSES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// PATCH /api/orders/[id]/status
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ── Parse and validate body ────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body)
  ) {
    return Response.json(
      { error: "Missing required field: status" },
      { status: 400 }
    );
  }

  const { status } = body as { status: unknown };

  if (!isValidOrderStatus(status)) {
    return Response.json(
      {
        error: `Invalid status value. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // ── Fetch current order ────────────────────────────────────────────────────
  let order: Awaited<ReturnType<typeof prisma.order.findUnique>> & {
    user?: { email: string | null; name: string | null } | null;
  } | null;

  try {
    order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[status] DB fetch error:", error);
    return Response.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }

  if (!order) {
    return Response.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // ── Business rule: DELIVERED requires confirmed payment ────────────────────
  if (status === "DELIVERED" && order.paymentStatus !== "PAID") {
    return Response.json(
      {
        error:
          "Cannot mark as delivered — payment not confirmed. Please verify payment first.",
      },
      { status: 400 }
    );
  }

  // ── Update order status ────────────────────────────────────────────────────
  let updatedOrder: Awaited<ReturnType<typeof prisma.order.update>>;

  try {
    updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    });
  } catch (error) {
    console.error("[status] DB update error:", error);
    return Response.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }

  // ── Non-blocking status update email ──────────────────────────────────────
  // Resolve recipient — authenticated user takes precedence over guest email
  const recipientEmail = order.user?.email ?? order.guestEmail;
  const recipientName =
    order.user?.name ?? order.guestName ?? "Client";

  // Resolve platform name from SiteConfig, falling back to "Zymbiq"
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
    // Non-fatal — fall back to default platform name
  }

  if (recipientEmail) {
    // Fire-and-forget — email failure must never break the status update response
    sendEmail({
      to: recipientEmail,
      subject: `Order Update — ${ORDER_STATUS_LABELS[status] ?? status}`,
      react: OrderStatusUpdateEmail({
        clientName: recipientName,
        newStatus: status,
        orderType: order.orderType,
        trackingCode: order.trackingCode,
        platformName,
      }),
    }).catch((err: unknown) => {
      console.error("[status] Email send failed:", err);
    });
  }

  // ── Success response ───────────────────────────────────────────────────────
  return Response.json(
    {
      data: {
        updated: true,
        status: updatedOrder.status,
      },
    },
    { status: 200 }
  );
}