// src/app/(public)/track/[trackingCode]/page.tsx

import { Metadata } from "next";
import Link from "next/link";
import { Package, Calendar, Hash, User, Download, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import OrderTimeline from "@/components/orders/order-timeline";
import { formatDate, cn } from "@/lib/utils";
import type { OrderWithDetails } from "@/types/database";

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({
  params,
}: {
  params: { trackingCode: string };
}): Promise<Metadata> {
  return {
    title: `Order Tracker — ${params.trackingCode}`,
  };
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getOrder(trackingCode: string): Promise<OrderWithDetails | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { trackingCode },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        project: {
          select: {
            title: true,
            thumbnailUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 5,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        deliverables: true,
      },
    });

    return order as OrderWithDetails | null;
  } catch {
    return null;
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface OrderHeaderProps {
  order: OrderWithDetails;
}

function OrderHeader({ order }: OrderHeaderProps) {
  const clientName =
    order.user?.name ?? order.guestName ?? "Guest Order";

  const isGuest = !order.userId;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: order type + tracking code */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                order.orderType === "PREBUILT"
                  ? "bg-accent/10 text-accent"
                  : "bg-primary/10 text-primary"
              )}
            >
              {order.orderType === "PREBUILT" ? "Pre-built Project" : "Custom Order"}
            </span>
            {isGuest && (
              <span className="inline-flex items-center rounded-full bg-muted/20 px-2.5 py-0.5 text-xs font-medium text-muted">
                Guest
              </span>
            )}
          </div>

          {order.project?.title && (
            <h1 className="mt-1 text-xl font-semibold text-foreground">
              {order.project.title}
            </h1>
          )}
          {!order.project?.title && order.orderType === "CUSTOM" && (
            <h1 className="mt-1 text-xl font-semibold text-foreground">
              Custom Development Order
            </h1>
          )}
        </div>

        {/* Right: meta info */}
        <div className="flex flex-col gap-1.5 text-sm text-muted sm:items-end">
          <span className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-mono font-medium tracking-wide text-foreground">
              {order.trackingCode}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {clientName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(new Date(order.createdAt as string | Date))}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DeliverablesSectionProps {
  order: OrderWithDetails;
}

function DeliverablesSection({ order }: DeliverablesSectionProps) {
  const readyDeliverables = order.deliverables.filter(
    (d) => d.status === "ready" || d.status === "delivered"
  );

  if (readyDeliverables.length === 0) return null;
  if (order.status !== "DELIVERED") return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
        <Package className="h-4 w-4 text-accent" />
        Your Deliverables
      </h2>

      <ul className="flex flex-col gap-2">
        {readyDeliverables.map((deliverable) => (
          <li
            key={deliverable.id}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
          >
            <span className="text-sm font-medium text-foreground">
              {deliverable.label}
            </span>

            <div className="flex items-center gap-3">
              {deliverable.note && (
                <span className="text-xs text-muted">{deliverable.note}</span>
              )}
              {deliverable.url ? (
                <a
                  href={deliverable.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              ) : (
                <span className="text-xs text-muted">Link coming soon</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PaymentBannerProps {
  order: OrderWithDetails;
}

function PaymentBanner({ order }: PaymentBannerProps) {
  const needsPayment =
    order.paymentStatus === "PENDING" &&
    order.status !== "CANCELLED" &&
    order.status !== "DELIVERED";

  if (!needsPayment) return null;

  const amount = (order as unknown as { amountUsd?: number | null; estimatedPrice?: number | null }).amountUsd
    ?? (order as unknown as { estimatedPrice?: number | null }).estimatedPrice
    ?? null;

  const isCustom = order.orderType === "CUSTOM";
  const orderId = (order as unknown as { id: string }).id;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <CreditCard className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Payment required</p>
          <p className="text-xs text-muted mt-0.5">
            {isCustom
              ? "Complete payment to begin your custom project."
              : "Complete payment to receive your project files."}
            {amount !== null && (
              <span className="ml-1 font-medium text-foreground">
                Amount due: ${amount.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>
      <a
        href={isCustom ? `/checkout/order/${orderId}` : `/checkout/${(order as unknown as { projectId?: string | null }).projectId ?? ""}`}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors shrink-0"
      >
        <CreditCard className="h-4 w-4" />
        Pay Now
      </a>
    </div>
  );
}

function OrderNotFound({ trackingCode }: { trackingCode: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/20">
        <Package className="h-8 w-8 text-muted" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Order not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        We couldn&apos;t find an order with tracking code{" "}
        <span className="font-mono font-medium text-foreground">
          {trackingCode}
        </span>
        . Please check that you have the correct link.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/10"
        >
          Go Home
        </Link>
        <Link
          href="/order"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Place a New Order
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE — no ISR, always fresh
// =============================================================================

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params,
}: {
  params: { trackingCode: string };
}) {
  const order = await getOrder(params.trackingCode);

  if (!order) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <OrderNotFound trackingCode={params.trackingCode} />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-sm text-muted">Track your order</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          Order Status
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Order summary header */}
        <OrderHeader order={order} />

        {/* Payment banner — shown when payment is still pending */}
        <PaymentBanner order={order} />

        {/* Interactive timeline */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-foreground">
            Progress
          </h2>
          <OrderTimeline order={order} />
        </div>

        {/* Deliverables (only when DELIVERED + has files) */}
        <DeliverablesSection order={order} />

        {/* Help footer */}
        <p className="text-center text-xs text-muted">
          Questions about your order?{" "}
          <Link
            href="/contact"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Get in touch
          </Link>
        </p>
      </div>
    </main>
  );
}