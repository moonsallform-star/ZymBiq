// =============================================================================
// Zymbiq — src/app/(admin)/admin/analytics/page.tsx
// Admin analytics page shell with date range selector and dynamic charts.
// =============================================================================

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminAnalyticsClient from "./_components/admin-analytics-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics — Admin",
};

export default async function AdminAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-semibold text-foreground">
          Analytics
        </h1>
        <p className="text-muted text-sm mt-1">
          Platform performance and traffic insights.
        </p>
      </div>

      <AdminAnalyticsClient />
    </div>
  );
}