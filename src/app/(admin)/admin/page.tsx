// =============================================================================
// Zymbiq — src/app/(admin)/admin/page.tsx
// Admin dashboard home — revenue, stats, recent activity, quick actions.
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  DollarSign,
  ShoppingCart,
  Users,
  FolderOpen,
  AlertCircle,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Hammer,
  MessageSquare,
  PackageCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderStatusCount {
  status: string;
  _count: { status: number };
}

// ---------------------------------------------------------------------------
// Status icon + colour helpers
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "NEW":
      return <Clock className="h-3.5 w-3.5 text-blue-500" />;
    case "IN_DISCUSSION":
      return <MessageSquare className="h-3.5 w-3.5 text-purple-500" />;
    case "BUILDING":
      return <Hammer className="h-3.5 w-3.5 text-amber-500" />;
    case "REVIEW":
      return <AlertCircle className="h-3.5 w-3.5 text-orange-500" />;
    case "DELIVERED":
      return <PackageCheck className="h-3.5 w-3.5 text-green-500" />;
    case "CANCELLED":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted" />;
  }
}

function paymentStatusClasses(status: string): string {
  switch (status) {
    case "PAID":
      return "text-green-700 bg-green-50 border-green-200";
    case "PENDING_MANUAL_VERIFICATION":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "PENDING":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "FAILED":
      return "text-red-700 bg-red-50 border-red-200";
    case "REFUNDED":
      return "text-purple-700 bg-purple-50 border-purple-200";
    default:
      return "text-muted bg-muted/10 border-border";
  }
}

function statusBarColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-blue-500";
    case "IN_DISCUSSION":
      return "bg-purple-500";
    case "BUILDING":
      return "bg-amber-500";
    case "REVIEW":
      return "bg-orange-500";
    case "DELIVERED":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-red-400";
    default:
      return "bg-muted";
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user || !session.user.isAdmin) {
    redirect("/dashboard");
  }

  // ── Data fetching (parallel) ───────────────────────────────────────────────
  const [
    revenueAgg,
    ordersByStatusRaw,
    recentOrders,
    totalUsers,
    totalProjects,
    pendingVerifications,
    totalOrderCount,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { amountUsd: true },
    }),

    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { title: true } },
      },
    }),

    prisma.user.count({ where: { isAdmin: false } }),

    prisma.project.count(),

    prisma.order.count({
      where: { paymentStatus: "PENDING_MANUAL_VERIFICATION" },
    }),

    prisma.order.count(),
  ]);

  const totalRevenue = revenueAgg._sum.amountUsd ?? 0;

  // Build status map: status → count
  const statusCountMap: Record<string, number> = {};
  for (const row of ordersByStatusRaw as OrderStatusCount[]) {
    statusCountMap[row.status] = row._count.status;
  }

  const orderedStatuses = [
    "NEW",
    "IN_DISCUSSION",
    "BUILDING",
    "REVIEW",
    "DELIVERED",
    "CANCELLED",
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page heading ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Welcome back. Here&apos;s what&apos;s happening on your platform.
          </p>
        </div>

        {pendingVerifications > 0 && (
          <Link
            href="/admin/payments"
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <AlertCircle className="h-4 w-4" />
            {pendingVerifications} payment{pendingVerifications !== 1 ? "s" : ""}{" "}
            pending verification
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Total Revenue
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-foreground">
              {formatCurrency(totalRevenue, "USD")}
            </p>
            <p className="mt-0.5 text-xs text-muted">From confirmed payments</p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Total Orders
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <ShoppingCart className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-foreground">
              {totalOrderCount}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {statusCountMap["DELIVERED"] ?? 0} delivered
            </p>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Clients
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Users className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-foreground">
              {totalUsers}
            </p>
            <p className="mt-0.5 text-xs text-muted">Registered accounts</p>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted">
              Projects
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <FolderOpen className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-foreground">
              {totalProjects}
            </p>
            <p className="mt-0.5 text-xs text-muted">In showroom</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Order status breakdown + Recent activity ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order status breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderedStatuses.map((status) => {
              const count = statusCountMap[status] ?? 0;
              const pct =
                totalOrderCount > 0
                  ? Math.round((count / totalOrderCount) * 100)
                  : 0;

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={status} />
                      <span className="text-foreground">
                        {ORDER_STATUS_LABELS[status] ?? status}
                      </span>
                    </div>
                    <span className="tabular-nums text-muted">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        statusBarColor(status)
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {totalOrderCount === 0 && (
              <p className="py-4 text-center text-sm text-muted">
                No orders yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Orders
            </CardTitle>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No orders yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const clientName =
                    order.user?.name ??
                    order.guestName ??
                    order.guestEmail ??
                    "Guest";
                  const projectLabel =
                    order.project?.title ??
                    (order.orderType === "CUSTOM"
                      ? "Custom Project"
                      : "Unknown");

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={order.status} />
                          <span className="truncate font-medium text-foreground">
                            {clientName}
                          </span>
                          <span className="hidden shrink-0 text-xs text-muted sm:inline">
                            — {projectLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate pl-[22px] text-xs text-muted">
                          {formatDate(order.createdAt, "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>

                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded border px-2 py-0.5 text-xs font-medium",
                            paymentStatusClasses(order.paymentStatus)
                          )}
                        >
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                            order.paymentStatus}
                        </span>
                        {order.amountUsd != null && (
                          <span className="hidden text-xs font-semibold text-foreground sm:inline">
                            {formatCurrency(order.amountUsd, "USD")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/projects"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/5 hover:border-accent/40"
          >
            <Plus className="h-4 w-4 text-accent" />
            Add Project
          </Link>

          <Link
            href="/admin/orders"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/5 hover:border-accent/40"
          >
            <ShoppingCart className="h-4 w-4 text-accent" />
            View Orders
          </Link>

          {pendingVerifications > 0 && (
            <Link
              href="/admin/payments"
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <CheckCircle2 className="h-4 w-4" />
              Verify Payments
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold">
                {pendingVerifications}
              </span>
            </Link>
          )}

          <Link
            href="/admin/messages"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/5 hover:border-accent/40"
          >
            <MessageSquare className="h-4 w-4 text-accent" />
            Messages
          </Link>

          <Link
            href="/admin/appearance"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/5 hover:border-accent/40"
          >
            <FolderOpen className="h-4 w-4 text-accent" />
            Appearance
          </Link>
        </div>
      </div>
    </div>
  );
}