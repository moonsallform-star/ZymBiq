// Zymbiq — src/app/(dashboard)/dashboard/orders/page.tsx
// Dashboard orders page: order list sidebar + selected order detail panel.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import OrderTimeline from "@/components/orders/order-timeline";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { OrderWithDetails } from "@/types/database";
import { ExternalLink, Package, Wrench, Download, CreditCard } from "lucide-react";

// =============================================================================
// Force dynamic — order data changes frequently, no stale cache
// =============================================================================

export const dynamic = "force-dynamic";

// =============================================================================
// HELPERS
// =============================================================================

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "accent" | "success" | "warning" | "muted" {
  switch (status) {
    case "NEW":
      return "secondary";
    case "IN_DISCUSSION":
      return "warning";
    case "BUILDING":
      return "accent";
    case "REVIEW":
      return "warning";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "destructive";
    default:
      return "muted";
  }
}

function getPaymentVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "accent" | "success" | "warning" | "muted" {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "muted";
    case "PENDING_MANUAL_VERIFICATION":
      return "warning";
    case "FAILED":
      return "destructive";
    case "REFUNDED":
      return "outline";
    default:
      return "muted";
  }
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/10">
        <Package className="h-8 w-8 text-muted" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">No orders yet</h2>
      <p className="mb-6 max-w-sm text-sm text-muted">
        You haven't placed any orders. Browse our showroom or start a custom order.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/showroom"
          className="inline-flex h-10 items-center rounded-[--zymbiq-radius] bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Browse Showroom
        </Link>
        <Link
          href="/order"
          className="inline-flex h-10 items-center rounded-[--zymbiq-radius] border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted/10"
        >
          Order Custom
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// ORDER LIST ITEM
// =============================================================================

interface OrderListItemProps {
  order: OrderWithDetails;
  isActive: boolean;
}

function OrderListItem({ order, isActive }: OrderListItemProps) {
  const title =
    order.orderType === "PREBUILT" && order.project
      ? order.project.title
      : "Custom Order";

  return (
    <Link
      href={`/dashboard/orders?orderId=${order.id}`}
      className={cn(
        "block border-b border-border px-4 py-3 transition-colors hover:bg-muted/5",
        isActive && "bg-accent/5 border-l-2 border-l-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium leading-snug",
              isActive ? "text-accent" : "text-foreground"
            )}
          >
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={getStatusVariant(order.status)} className="shrink-0 text-[10px]">
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-xs text-muted">
          {order.orderType === "PREBUILT" ? (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" /> Pre-built
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" /> Custom
            </span>
          )}
        </span>
        {order.amountUsd !== null && order.amountUsd !== undefined && (
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(order.amountUsd, "USD")}
          </span>
        )}
      </div>
    </Link>
  );
}

// =============================================================================
// ORDER DETAIL PANEL
// =============================================================================

interface OrderDetailPanelProps {
  order: OrderWithDetails;
}

function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  const title =
    order.orderType === "PREBUILT" && order.project
      ? order.project.title
      : "Custom Order";

  const readyDeliverables = order.deliverables.filter(
    (d) => d.status === "ready" || d.status === "delivered"
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="mt-0.5 text-sm text-muted">
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <Link
            href={`/track/${order.trackingCode}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Track Order
          </Link>
        </div>

        {/* Meta badges + Pay Now */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(order.status)}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </Badge>
          <Badge variant={getPaymentVariant(order.paymentStatus)}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </Badge>
          {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
            <Link
              href={
                order.orderType === "CUSTOM"
                  ? `/checkout/order/${order.id}`
                  : `/checkout/${(order as unknown as { projectId?: string | null }).projectId ?? ""}`
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Now
            </Link>
          )}
          {order.amountUsd !== null && order.amountUsd !== undefined && (
            <Badge variant="outline">
              {formatCurrency(order.amountUsd, "USD")}
            </Badge>
          )}
          {order.amountBdt !== null && order.amountBdt !== undefined && (
            <Badge variant="outline">
              {formatCurrency(order.amountBdt, "BDT")}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
        {/* Timeline */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Order Progress
          </h2>
          <OrderTimeline order={order} />
        </div>

        {/* Sidebar: details + deliverables */}
        <div className="w-full lg:w-64 lg:shrink-0">
          {/* Order details */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Details
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Type</dt>
                <dd className="font-medium text-foreground capitalize">
                  {order.orderType === "PREBUILT" ? "Pre-built" : "Custom"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Placed</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(order.createdAt)}
                </dd>
              </div>
              {order.deadline && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Deadline</dt>
                  <dd className="font-medium text-foreground">
                    {formatDate(order.deadline)}
                  </dd>
                </div>
              )}
              {order.estimatedTimeline && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Est. delivery</dt>
                  <dd className="font-medium text-foreground">
                    {order.estimatedTimeline}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Tracking</dt>
                <dd className="font-mono text-xs font-medium text-foreground">
                  {order.trackingCode}
                </dd>
              </div>
            </dl>
          </div>

          {/* Deliverables */}
          {readyDeliverables.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
                Deliverables
              </h2>
              <ul className="space-y-2">
                {readyDeliverables.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{d.label}</span>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-accent hover:text-accent/80"
                        aria-label={`Download ${d.label}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : (
                      <Badge variant="muted" className="text-[10px]">
                        {d.status}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE
// =============================================================================

interface DashboardOrdersPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function DashboardOrdersPage({
  searchParams,
}: DashboardOrdersPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?returnUrl=/dashboard/orders");
  }

  const allOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      user: true,
      project: true,
      messages: {
        include: {
          user: {
            select: { name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      deliverables: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (allOrders.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">My Orders</h1>
        <EmptyOrdersState />
      </div>
    );
  }

  const { orderId } = await searchParams;
  const selectedOrder =
    (orderId ? allOrders.find((o) => o.id === orderId) : null) ?? allOrders[0];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">My Orders</h1>

      <div
        className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
        style={{ minHeight: "600px" }}
      >
        <div className="grid h-full"
          style={{ gridTemplateColumns: "320px 1fr" }}
        >
          {/* ----------------------------------------------------------------
              Left sidebar — order list
          ---------------------------------------------------------------- */}
          <aside className="overflow-y-auto border-r border-border">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {allOrders.length} {allOrders.length === 1 ? "Order" : "Orders"}
              </p>
            </div>
            {allOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order as OrderWithDetails}
                isActive={order.id === selectedOrder?.id}
              />
            ))}
          </aside>

          {/* ----------------------------------------------------------------
              Right panel — order detail
          ---------------------------------------------------------------- */}
          <main className="overflow-hidden">
            {selectedOrder ? (
              <OrderDetailPanel order={selectedOrder as OrderWithDetails} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Select an order to view details.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}