// =============================================================================
// Zymbiq — src/app/api/payments/stripe/create-intent/route.ts
// Creates or retrieves a Stripe PaymentIntent for a pre-built project purchase.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent, stripe } from "@/lib/stripe";
import { PaymentStatus, OrderType, PaymentMethod, OrderStatus } from "@prisma/client";

// =============================================================================
// POST /api/payments/stripe/create-intent
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------------------------------------------------------------------------
  // 1. Authentication — must be a logged-in user
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorised. Please sign in to continue." },
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
      { error: "Invalid request body. Expected JSON." },
      { status: 400 }
    );
  }

 const b = body as Record<string, unknown>;
  const projectId = typeof b.projectId === "string" ? b.projectId : null;
  const orderId = typeof b.orderId === "string" ? b.orderId : null;

  if (!projectId && !orderId) {
    return NextResponse.json(
      { error: "Missing required field: projectId or orderId." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // 3a. CUSTOM ORDER path — orderId provided directly
  // ---------------------------------------------------------------------------
  if (orderId && !projectId) {
    const customOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        paymentStatus: true,
        paymentIntentId: true,
        estimatedPrice: true,
        amountUsd: true,
        orderType: true,
      },
    });

    if (!customOrder || customOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (customOrder.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json({ error: "Order already paid.", orderId }, { status: 409 });
    }

    const amount = customOrder.amountUsd ?? customOrder.estimatedPrice ?? 0;

    if (amount <= 0) {
      return NextResponse.json({ error: "Order has no price set yet." }, { status: 400 });
    }

    // Reuse or create intent
    if (customOrder.paymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(customOrder.paymentIntentId);
        if (
          existing.status === "requires_payment_method" ||
          existing.status === "requires_confirmation" ||
          existing.status === "requires_action"
        ) {
          return NextResponse.json({ data: { clientSecret: existing.client_secret, orderId } });
        }
      } catch {}
    }

    const intent = await createPaymentIntent(amount, {
      orderId,
      userId: session.user.id,
      orderType: "CUSTOM",
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentIntentId: intent.id, amountUsd: amount, paymentMethod: PaymentMethod.STRIPE },
    });

    return NextResponse.json({ data: { clientSecret: intent.client_secret, orderId } });
  }

  // ---------------------------------------------------------------------------
  // 3b. PREBUILT ORDER path — projectId provided
  // ---------------------------------------------------------------------------
  const project = await prisma.project.findUnique({
    where: { id: projectId!, isVisible: true },
    select: { id: true, title: true, price: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Project not found or is no longer available." },
      { status: 404 }
    );
  }

  const existingPaidOrder = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      projectId: projectId!,
      paymentStatus: PaymentStatus.PAID,
    },
    select: { id: true },
  });

  if (existingPaidOrder) {
    return NextResponse.json(
      { error: "You have already purchased this project.", orderId: existingPaidOrder.id },
      { status: 409 }
    );
  }

  const existingOrder = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      projectId: projectId!,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    },
    select: { id: true, paymentIntentId: true },
  });

  if (existingOrder?.paymentIntentId) {
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(
        existingOrder.paymentIntentId
      );

      // Only reuse the intent if it is still in a usable state
      if (
        existingIntent.status === "requires_payment_method" ||
        existingIntent.status === "requires_confirmation" ||
        existingIntent.status === "requires_action"
      ) {
        return NextResponse.json({
          data: {
            clientSecret: existingIntent.client_secret,
            orderId: existingOrder.id,
          },
        });
      }

      // Intent is in a terminal or unexpected state — fall through to create a
      // new one below (the order record will be reused but get a new intent).
    } catch (stripeError) {
      // Log the retrieval failure but continue to create a fresh intent.
      console.error(
        "[create-intent] Failed to retrieve existing PaymentIntent:",
        stripeError
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Create or reuse an Order record, then create a fresh PaymentIntent
  // ---------------------------------------------------------------------------
  try {
    // Determine the order ID to associate with the PaymentIntent metadata.
    // If an order already exists (no valid intent), reuse it; otherwise create.
    let orderId: string;

    if (existingOrder) {
      orderId = existingOrder.id;

      // Reset payment status to PENDING so the new intent can be used
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PENDING,
          paymentIntentId: null,
          paymentMethod: PaymentMethod.STRIPE,
        },
      });
    } else {
      // No prior order exists — create one now
      const newOrder = await prisma.order.create({
        data: {
          userId: session.user.id,
          ...(projectId ? { projectId } : {}),
          orderType: OrderType.PREBUILT,
          status: OrderStatus.NEW,
          paymentMethod: PaymentMethod.STRIPE,
          paymentStatus: PaymentStatus.PENDING,
          amountUsd: project.price,
        },
        select: { id: true },
      });

      orderId = newOrder.id;
    }

    // -------------------------------------------------------------------------
    // 7. Create Stripe PaymentIntent
    // -------------------------------------------------------------------------
    const paymentIntent = await createPaymentIntent(project.price, {
      ...(projectId ? { projectId } : {}),
      userId: session.user.id,
      orderId,
      projectTitle: project.title,
    });

    // -------------------------------------------------------------------------
    // 8. Persist the PaymentIntent ID on the order record for webhook lookup
    // -------------------------------------------------------------------------
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentIntentId: paymentIntent.id },
    });

    // -------------------------------------------------------------------------
    // 9. Return client secret and order ID to the frontend
    // -------------------------------------------------------------------------
    return NextResponse.json({
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId,
      },
    });
  } catch (error) {
    console.error("[create-intent] PaymentIntent creation failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to initialise payment. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}