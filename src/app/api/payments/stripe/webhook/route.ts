// =============================================================================
// Zymbiq — src/app/api/payments/stripe/webhook/route.ts
// Stripe webhook handler: raw body parsing, signature verification,
// payment_intent.succeeded → PAID + IN_DISCUSSION + email,
// payment_intent.payment_failed → FAILED. Always returns HTTP 200.
// =============================================================================

import type Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import OrderConfirmationEmail from "@/emails/order-confirmation";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Next.js App Router: disable automatic body parsing so we receive raw bytes.
// constructWebhookEvent requires the exact bytes Stripe signed.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/payments/stripe/webhook
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // ── 1. Read raw body ──────────────────────────────────────────────────────
  let body: string;
  try {
    body = await request.text();
  } catch {
    console.error("[stripe-webhook] Failed to read request body.");
    return new Response("Could not read request body.", { status: 400 });
  }

  // ── 2. Extract Stripe-Signature header ────────────────────────────────────
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] Missing Stripe-Signature header.");
    return new Response("Missing Stripe-Signature header.", { status: 400 });
  }

  // ── 3. Verify webhook signature ───────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  // ── 4. Handle events ──────────────────────────────────────────────────────
  try {
    switch (event.type) {
      // ── 4a. Payment succeeded ─────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Find the order associated with this PaymentIntent
        const order = await prisma.order.findFirst({
          where: { paymentIntentId: pi.id },
          include: {
            user: {
              select: { name: true, email: true },
            },
            project: {
              select: { title: true },
            },
          },
        });

        if (!order) {
          // Log but do NOT fail — Stripe must receive 200.
          console.error(
            "[stripe-webhook] payment_intent.succeeded — no order found for paymentIntentId:",
            pi.id,
          );
          break;
        }

        // Idempotency guard — already processed
        if (order.paymentStatus === "PAID") {
          console.info(
            "[stripe-webhook] Order %s already PAID — skipping duplicate event.",
            order.id,
          );
          break;
        }

        // Update order: mark paid and move to first active status
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            status: "IN_DISCUSSION",
          },
        });

        // Resolve recipient email (registered user or guest)
        const recipientEmail: string | null =
          order.user?.email ?? order.guestEmail ?? null;

        const recipientName: string =
          order.user?.name ?? order.guestName ?? "there";

        // Resolve platform name from SiteConfig (non-blocking — fallback to Zymbiq)
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
          // Non-critical — use default
        }

        // Send order confirmation email (non-blocking failure)
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `Order Confirmed — ${platformName}`,
            react: OrderConfirmationEmail({
              clientName: recipientName,
              orderType: order.orderType,
              projectTitle: order.project?.title,
              trackingCode: order.trackingCode,
              platformName,
              supportEmail: "hello@zymbiq.com",
            }),
          });
        }

        console.info(
          "[stripe-webhook] Order %s → PAID + IN_DISCUSSION. Email sent to: %s",
          order.id,
          recipientEmail ?? "(none)",
        );
        break;
      }

      // ── 4b. Payment failed ────────────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;

        const order = await prisma.order.findFirst({
          where: { paymentIntentId: pi.id },
          select: { id: true, paymentStatus: true },
        });

        if (!order) {
          console.error(
            "[stripe-webhook] payment_intent.payment_failed — no order found for paymentIntentId:",
            pi.id,
          );
          break;
        }

        // Idempotency guard
        if (order.paymentStatus === "FAILED") {
          console.info(
            "[stripe-webhook] Order %s already FAILED — skipping duplicate event.",
            order.id,
          );
          break;
        }

        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "FAILED" },
        });

        console.info(
          "[stripe-webhook] Order %s → FAILED.",
          order.id,
        );
        break;
      }

      // ── 4c. Unhandled event types — log and ignore ────────────────────────
      default: {
        console.info(
          "[stripe-webhook] Unhandled event type: %s — ignored.",
          event.type,
        );
        break;
      }
    }
  } catch (err) {
    // Log processing errors server-side but always acknowledge to Stripe.
    // Returning non-200 here would cause Stripe to retry, potentially
    // creating duplicate order updates.
    console.error(
      "[stripe-webhook] Error processing event %s (%s):",
      event.type,
      event.id,
      err,
    );
  }

  // ── 5. Acknowledge receipt — Stripe requires 200 ─────────────────────────
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Satisfy TypeScript: ORDER_STATUS_LABELS is imported for label access
// in future extensions — referenced here to prevent dead-import warnings.
void ORDER_STATUS_LABELS;