// =============================================================================
// Zymbiq — src/app/api/analytics/route.ts
// Admin-only GET: aggregates AnalyticsEvent + Order data for the charts page.
// Supports ?range=7d | 30d | 90d
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types returned to the client (consumed by analytics-charts.tsx)
// ---------------------------------------------------------------------------

export interface PageViewPoint {
  date: string;      // "MMM d" e.g. "Mar 1"
  count: number;
}

export interface TopProject {
  title: string;
  views: number;
}

export interface OrderSourcePoint {
  source: string;    // "Showroom" | "Direct" | "Blog" | "Custom"
  count: number;
}

export interface AnalyticsData {
  // Stat cards
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;          // 0-100 percent
  totalPageViews: number;

  // Charts
  pageViews: PageViewPoint[];      // LineChart — views per day
  topProjects: TopProject[];       // BarChart — top 10 by views
  orderSources: OrderSourcePoint[]; // PieChart — order origin breakdown
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the ?range query param into a number of days. */
function parseDays(range: string | null): number {
  if (range === "7d") return 7;
  if (range === "90d") return 90;
  return 30; // default
}

/** Format a Date as ISO "YYYY-MM-DD" so the client can safely parseISO it. */
function fmtDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Build a map of dateStr → 0 for every day in [startDate, now]. */
function buildDayBuckets(startDate: Date, days: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    map.set(fmtDay(d), 0);
  }
  return map;
}

// ---------------------------------------------------------------------------
// GET /api/analytics?range=30d
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Date range ─────────────────────────────────────────────────────────────
  const range = request.nextUrl.searchParams.get("range");
  const days = parseDays(range);

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  try {
    // ── Parallel DB queries ─────────────────────────────────────────────────

    const [
      analyticsEvents,
      orders,
      paidOrders,
    ] = await Promise.all([
      // All analytics events in range
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          event: true,
          page: true,
          projectId: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // All orders in range (for conversion + sources)
      prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          orderType: true,
          paymentStatus: true,
          amountUsd: true,
          createdAt: true,
        },
      }),

      // Paid orders for revenue
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: "PAID",
        },
        select: { amountUsd: true },
      }),
    ]);

    // ── Page views per day ───────────────────────────────────────────────────

    const pageViewEvents = analyticsEvents.filter(
      (e) => e.event === "page_view"
    );

    const dayBuckets = buildDayBuckets(startDate, days);

    for (const ev of pageViewEvents) {
      const key = fmtDay(new Date(ev.createdAt));
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
      }
    }

    const pageViews: PageViewPoint[] = Array.from(dayBuckets.entries()).map(
      ([date, count]) => ({ date, count })
    );

    // ── Top projects by view count ───────────────────────────────────────────

    const projectViewCounts = new Map<string, number>();

    for (const ev of analyticsEvents) {
      if (ev.event === "project_view" && ev.projectId) {
        projectViewCounts.set(
          ev.projectId,
          (projectViewCounts.get(ev.projectId) ?? 0) + 1
        );
      }
    }

    // Fetch titles for all seen project IDs
    const projectIds = Array.from(projectViewCounts.keys());
    let topProjects: TopProject[] = [];

    if (projectIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, title: true },
      });

      const titleMap = new Map(projects.map((p) => [p.id, p.title]));

      topProjects = Array.from(projectViewCounts.entries())
        .map(([id, views]) => ({
          title: titleMap.get(id) ?? "Unknown Project",
          views,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    }

    // ── Order sources breakdown ──────────────────────────────────────────────
    // Derive source from: CUSTOM orders → "Custom", PREBUILT → check page
    // analytics event metadata for referrer heuristics, fallback "Direct".

    const checkoutEvents = analyticsEvents.filter(
      (e) => e.event === "checkout_visited"
    );

    // Build a rough source map from checkout events
    const sourceCounts = { Showroom: 0, Direct: 0, Blog: 0, Custom: 0 };

    for (const order of orders) {
      if (order.orderType === "CUSTOM") {
        sourceCounts.Custom += 1;
        continue;
      }
      // For PREBUILT, check if there's a matching checkout event with a page
      const matchingEvent = checkoutEvents.find((e) => {
        const meta = e.metadata as Record<string, unknown> | null;
        return meta?.orderId === order.id || e.page?.includes(order.id);
      });

      const page =
        (matchingEvent?.metadata as Record<string, unknown> | null)
          ?.referrer as string | undefined ??
        matchingEvent?.page ??
        "";

      if (page.includes("/blog")) {
        sourceCounts.Blog += 1;
      } else if (page.includes("/showroom") || page.includes("/projects")) {
        sourceCounts.Showroom += 1;
      } else {
        sourceCounts.Direct += 1;
      }
    }

    const orderSources: OrderSourcePoint[] = [
      { source: "Showroom", count: sourceCounts.Showroom },
      { source: "Direct", count: sourceCounts.Direct },
      { source: "Blog", count: sourceCounts.Blog },
      { source: "Custom", count: sourceCounts.Custom },
    ].filter((s) => s.count > 0);

    // If no orders at all, show placeholder so pie chart doesn't crash
    if (orderSources.length === 0) {
      orderSources.push({ source: "No orders yet", count: 1 });
    }

    // ── Stat card values ─────────────────────────────────────────────────────

    const totalOrders = orders.length;

    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (o.amountUsd ?? 0),
      0
    );

    const totalPageViews = pageViewEvents.length;

    // Conversion = paid orders / total checkout visits (if any)
    const checkoutVisits = analyticsEvents.filter(
      (e) => e.event === "checkout_visited"
    ).length;

    const conversionRate =
      checkoutVisits > 0
        ? Math.round((paidOrders.length / checkoutVisits) * 100)
        : 0;

    // ── Response ─────────────────────────────────────────────────────────────

    const data: AnalyticsData = {
      totalOrders,
      totalRevenue,
      conversionRate,
      totalPageViews,
      pageViews,
      topProjects,
      orderSources,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/analytics]", error);
    return NextResponse.json(
      { error: "Failed to load analytics data." },
      { status: 500 }
    );
  }
}