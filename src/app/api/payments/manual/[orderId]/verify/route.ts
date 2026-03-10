// =============================================================================
// Zymbiq — src/app/api/payments/manual/[orderId]/verify/route.ts
// Admin endpoint to confirm or reject pending bKash/Nagad payment submissions.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import ManualPaymentConfirmedEmail from "@/emails/manual-payment-confirmed";
import { PaymentStatus, OrderStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerifyRouteContext {
  params: { orderId: string };
}

interface VerifyRequestBody {
  action: "confirm" | "reject";
  note?: string;
}

// ---------------------------------------------------------------------------
// PATCH /api/payments/manual/[orderId]/verify
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: VerifyRouteContext
): Promise<NextResponse> {
  // ── Auth: admin only ──────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: VerifyRequestBody;

  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { action, note } = body;

  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'confirm' or 'reject'" },
      { status: 400 }
    );
  }

  // ── Fetch order ───────────────────────────────────────────────────────────
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // ── Guard: must be awaiting verification ──────────────────────────────────
  if (order.paymentStatus !== PaymentStatus.PENDING_MANUAL_VERIFICATION) {
    return NextResponse.json(
      { error: "Order not in pending verification state" },
      { status: 400 }
    );
  }

  // ── Resolve recipient details ─────────────────────────────────────────────
  const recipientEmail = order.user?.email ?? order.guestEmail ?? null;
  const recipientName =
    order.user?.name ?? order.guestName ?? "Valued Client";

  // ── Resolve platform name for emails ─────────────────────────────────────
  const platformConfig = await prisma.siteConfig.findUnique({
    where: { key: "platform" },
    select: { value: true },
  });

  let platformName = "Zymbiq";
  if (platformConfig?.value) {
    try {
      const parsed = JSON.parse(platformConfig.value) as { name?: string };
      if (parsed.name) platformName = parsed.name;
    } catch {
      // fall back to default
    }
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (action === "confirm") {
    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.IN_DISCUSSION,
      },
    });

    if (recipientEmail) {
      void sendEmail({
        to: recipientEmail,
        subject: `Payment Confirmed — ${platformName}`,
        react: ManualPaymentConfirmedEmail({
          clientName: recipientName,
          paymentMethod: order.paymentMethod,
          amountBdt: order.amountBdt ?? 0,
          trackingCode: order.trackingCode,
          platformName,
        }),
      });
    }

    return NextResponse.json({
      data: { updated: true, action: "confirm" },
    });
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  await prisma.order.update({
    where: { id: params.orderId },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      ...(note ? { adminNotes: note } : {}),
    },
  });

  if (recipientEmail) {
    // Reuse a simple transactional email for rejection notice
    void sendEmail({
      to: recipientEmail,
      subject: `Payment Verification Update — ${platformName}`,
      react: ManualPaymentConfirmedEmail({
        clientName: recipientName,
        paymentMethod: order.paymentMethod,
        amountBdt: order.amountBdt ?? 0,
        trackingCode: order.trackingCode,
        platformName,
        rejected: true,
        rejectionNote: note,
      }),
    });
  }

  return NextResponse.json({
    data: { updated: true, action: "reject" },
  });
}