// Zymbiq — src/app/(dashboard)/dashboard/page.tsx
// Client dashboard home: active orders, completed orders, recent messages,
// and download links for delivered projects.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import {
  Package,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Download,
  ArrowRight,
  Clock,
  ShoppingBag,
  Wand2,
  CreditCard,
} from "lucide-react";

// Force dynamic rendering — dashboard is personalized and always fresh.
export const dynamic = "force-dynamic";

// =============================================================================
// Status → badge variant mapping
// =============================================================================

function getStatusVariant(
  status: string
): "default" | "accent" | "success" | "warning" | "muted" | "destructive" {
  switch (status) {
    case "NEW":
      return "muted";
    case "IN_DISCUSSION":
      return "accent";
    case "BUILDING":
      return "warning";
    case "REVIEW":
      return "default";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
      return "destructive";
    default:
      return "muted";
  }
}

// =============================================================================
// DashboardPage — Server Component
// =============================================================================

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // ---------------------------------------------------------------------------
  // Parallel DB fetches
  // ---------------------------------------------------------------------------

  const [orders, recentMessages] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: {
            title: true,
            thumbnailUrl: true,
            slug: true,
          },
        },
        deliverables: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.message.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  // ---------------------------------------------------------------------------
  // Split orders into active and completed
  // ---------------------------------------------------------------------------

  const activeOrders = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
  );

  const completedOrders = orders.filter((o) => o.status === "DELIVERED");

  const hasOrders = orders.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Welcome heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-semibold text-foreground">
            Welcome back
            {session.user.name ? (
              <span className="text-accent">, {session.user.name.split(" ")[0]}</span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Here's an overview of your orders and messages.
          </p>
        </div>

        {/* Empty state — no orders yet */}
        {!hasOrders && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
              No orders yet
            </h2>
            <p className="text-sm text-muted max-w-sm mb-6">
              Browse our pre-built projects or tell us about your custom idea and
              we'll build it for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/showroom"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-[--zymbiq-radius]",
                  "text-sm font-medium px-5 py-2.5 transition-colors"
                )}
                style={{ background: 'var(--zymbiq-accent)', color: '#fff' }}
              >
                <Package className="w-4 h-4" />
                Browse Projects
              </Link>
              <Link
                href="/order"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-[--zymbiq-radius]",
                  "border border-border bg-surface text-foreground text-sm font-medium px-5 py-2.5",
                  "hover:bg-accent/5 transition-colors"
                )}
              >
                <Wand2 className="w-4 h-4" />
                Order Custom
              </Link>
            </div>
          </div>
        )}

        {/* Main grid — only when orders exist */}
        {hasOrders && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ----------------------------------------------------------------
                Active Orders Card
            ---------------------------------------------------------------- */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      Active Orders
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      {activeOrders.length === 0
                        ? "No active orders"
                        : `${activeOrders.length} order${activeOrders.length === 1 ? "" : "s"} in progress`}
                    </CardDescription>
                  </div>
                  <Link
                    href="/dashboard/orders"
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardHeader>

                <CardContent>
                  {activeOrders.length === 0 ? (
                    <p className="text-sm text-muted py-4 text-center">
                      All caught up — no active orders right now.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {activeOrders.map((order) => (
                        <li
                          key={order.id}
                          className="py-3 flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Order type icon */}
                            <div className="w-8 h-8 rounded-[--zymbiq-radius] bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                              {order.orderType === "PREBUILT" ? (
                                <Package className="w-4 h-4 text-accent" />
                              ) : (
                                <Wand2 className="w-4 h-4 text-accent" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {order.project?.title ??
                                  (order.orderType === "CUSTOM"
                                    ? "Custom Project"
                                    : "Project")}
                              </p>
                              <p className="text-xs text-muted mt-0.5">
                                {order.orderType === "PREBUILT"
                                  ? "Pre-built"
                                  : "Custom"}{" "}
                                · {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <Badge variant={getStatusVariant(order.status)}>
                              {ORDER_STATUS_LABELS[order.status] ?? order.status}
                            </Badge>
                            {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
                              <Link
                                href={
                                  order.orderType === "CUSTOM"
                                    ? `/checkout/order/${order.id}`
                                    : `/checkout/${order.projectId ?? ""}`
                                }
                                className="text-xs text-white bg-accent hover:bg-accent/90 transition-colors rounded px-2 py-1 flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                Pay Now
                              </Link>
                            )}
                            <Link
                              href={`/track/${order.trackingCode}`}
                              className="text-xs text-accent hover:underline flex items-center gap-1"
                            >
                              Track <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* ----------------------------------------------------------------
                  Completed Orders Card
              ---------------------------------------------------------------- */}
              {completedOrders.length > 0 && (
                <Card className="mt-6">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Completed Orders
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {completedOrders.length} delivered project
                        {completedOrders.length === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="divide-y divide-border">
                      {completedOrders.map((order) => (
                        <li
                          key={order.id}
                          className="py-3 flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-[--zymbiq-radius] bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {order.project?.title ??
                                  (order.orderType === "CUSTOM"
                                    ? "Custom Project"
                                    : "Project")}
                              </p>
                              <p className="text-xs text-muted mt-0.5">
                                Delivered {formatDate(order.updatedAt)}
                              </p>

                              {/* Deliverable download links */}
                              {order.deliverables.length > 0 && (
                                <ul className="mt-2 flex flex-wrap gap-2">
                                  {order.deliverables
                                    .filter(
                                      (d) => d.status === "delivered" && d.url
                                    )
                                    .map((deliverable) => (
                                      <li key={deliverable.id}>
                                        <a
                                          href={deliverable.url!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "inline-flex items-center gap-1.5 text-xs",
                                            "text-accent hover:underline"
                                          )}
                                        >
                                          <Download className="w-3 h-3" />
                                          {deliverable.label}
                                        </a>
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <Link
                              href={`/track/${order.trackingCode}`}
                              className="text-xs text-accent hover:underline flex items-center gap-1"
                            >
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ----------------------------------------------------------------
                Messages Card
            ---------------------------------------------------------------- */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-accent" />
                      Messages
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Recent conversations
                    </CardDescription>
                  </div>
                  <Link
                    href="/dashboard/messages"
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardHeader>

                <CardContent>
                  {recentMessages.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-muted mb-3">
                        No messages yet.
                      </p>
                      <Link
                        href="/dashboard/messages"
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          "text-accent hover:underline"
                        )}
                      >
                        Start a conversation <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentMessages.map((message) => (
                        <li key={message.id} className="py-3">
                          <div className="flex items-start gap-2">
                            {/* Admin vs client indicator */}
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                                message.isAdmin
                                  ? "bg-accent"
                                  : "bg-muted"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">
                                {message.isAdmin ? "Developer" : "You"}
                              </p>
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                {message.content}
                              </p>
                              <p className="text-xs text-muted/60 mt-1">
                                {formatDate(message.createdAt, "MMM d, h:mm a")}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/showroom"
                        className={cn(
                          "flex items-center gap-2 w-full text-sm text-foreground",
                          "hover:text-accent transition-colors group"
                        )}
                      >
                        <Package className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                        Browse Projects
                        <ArrowRight className="w-3 h-3 ml-auto text-muted group-hover:text-accent transition-colors" />
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/order"
                        className={cn(
                          "flex items-center gap-2 w-full text-sm text-foreground",
                          "hover:text-accent transition-colors group"
                        )}
                      >
                        <Wand2 className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                        Order Custom Site
                        <ArrowRight className="w-3 h-3 ml-auto text-muted group-hover:text-accent transition-colors" />
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/orders"
                        className={cn(
                          "flex items-center gap-2 w-full text-sm text-foreground",
                          "hover:text-accent transition-colors group"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                        All Orders
                        <ArrowRight className="w-3 h-3 ml-auto text-muted group-hover:text-accent transition-colors" />
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}