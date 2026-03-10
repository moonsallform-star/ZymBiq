// =============================================================================
// Zymbiq — src/app/api/payments/manual/route.ts
// Manual payment submission — records bKash/Nagad transaction ID, updates
// order to PENDING_MANUAL_VERIFICATION, and notifies client + admin via email.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManualPaymentSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/resend";
import ManualPaymentReceivedEmail from "@/emails/manual-payment-received";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------------------------------------------------------------------------
  // 1. Authentication — session required
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Parse and validate request body
  // ---------------------------------------------------------------------------
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const parsed = ManualPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { orderId, paymentMethod, transactionId, amountBdt } = parsed.data;

  // ---------------------------------------------------------------------------
  // 3. Fetch order — verify ownership
  // ---------------------------------------------------------------------------
  let order: {
    id: string;
    trackingCode: string;
    paymentStatus: PaymentStatus;
    userId: string | null;
    guestEmail: string | null;
    guestName: string | null;
    user: { email: string | null; name: string | null } | null;
  } | null;

  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        trackingCode: true,
        paymentStatus: true,
        userId: true,
        guestEmail: true,
        guestName: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[manual-payment] DB error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to retrieve order" },
      { status: 500 }
    );
  }

  // Return 404 in both not-found and wrong-owner cases — no info leak
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Guard — reject if payment already submitted or confirmed
  // ---------------------------------------------------------------------------
  if (order.paymentStatus !== PaymentStatus.PENDING) {
    return NextResponse.json(
      { error: "Payment already submitted for this order" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Transaction ID uniqueness check across all orders
  // ---------------------------------------------------------------------------
  let duplicateTx: { id: string } | null;

  try {
    duplicateTx = await prisma.order.findFirst({
      where: {
        manualTxId: transactionId,
        id: { not: orderId }, // same order re-submitting is fine (idempotent)
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("[manual-payment] DB error checking transaction ID:", error);
    return NextResponse.json(
      { error: "Failed to validate transaction ID" },
      { status: 500 }
    );
  }

  if (duplicateTx) {
    return NextResponse.json(
      { error: "Transaction ID already used for another order" },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Update order — record payment details and set status
  // ---------------------------------------------------------------------------
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: paymentMethod as PaymentMethod,
        manualTxId: transactionId,
        amountBdt,
        paymentStatus: PaymentStatus.PENDING_MANUAL_VERIFICATION,
      },
    });
  } catch (error) {
    console.error("[manual-payment] DB error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update payment record" },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------------------------
  // 7. Resolve platform name for email templates
  // ---------------------------------------------------------------------------
  let platformName = "Zymbiq";

  try {
    const platformConfig = await prisma.siteConfig.findUnique({
      where: { key: "platform" },
      select: { value: true },
    });

    if (platformConfig?.value) {
      const parsed = JSON.parse(platformConfig.value) as { name?: string };
      if (parsed.name) platformName = parsed.name;
    }
  } catch {
    // Non-critical — fall back to default name
  }

  // ---------------------------------------------------------------------------
  // 8. Resolve client details for email
  // ---------------------------------------------------------------------------
  const clientEmail = order.user?.email ?? order.guestEmail ?? null;
  const clientName =
    order.user?.name ?? order.guestName ?? "Valued Client";

  // ---------------------------------------------------------------------------
  // 9. Send client confirmation email (non-blocking — never throws)
  // ---------------------------------------------------------------------------
  if (clientEmail) {
    sendEmail({
      to: clientEmail,
      subject: `Payment Received — Awaiting Verification | ${platformName}`,
      react: ManualPaymentReceivedEmail({
        clientName,
        paymentMethod,
        transactionId,
        amountBdt,
        platformName,
      }),
    }).catch((error) => {
      console.error(
        "[manual-payment] Failed to send client email:",
        error
      );
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Send admin notification email (non-blocking — never throws)
  // ---------------------------------------------------------------------------
  const adminEmail = process.env.RESEND_FROM_EMAIL;

  if (adminEmail) {
    sendEmail({
      to: adminEmail,
      subject: `New Manual Payment to Verify — ${paymentMethod} | ${platformName}`,
      react: ManualPaymentReceivedEmail({
        clientName,
        paymentMethod,
        transactionId,
        amountBdt,
        platformName,
        isAdminCopy: true,
        clientEmail: clientEmail ?? undefined,
      }),
    }).catch((error) => {
      console.error(
        "[manual-payment] Failed to send admin email:",
        error
      );
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Return success — client uses trackingCode for status page
  // ---------------------------------------------------------------------------
  return NextResponse.json(
    {
      data: {
        status: "pending_verification",
        trackingCode: order.trackingCode,
      },
    },
    { status: 200 }
  );
}