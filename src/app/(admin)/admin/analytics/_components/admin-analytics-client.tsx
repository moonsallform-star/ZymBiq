// =============================================================================
// Zymbiq — src/app/(admin)/admin/analytics/_components/admin-analytics-client.tsx
// Client: date range selector + dynamically loaded AnalyticsCharts.
// =============================================================================
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Lazy-load AnalyticsCharts — recharts is heavy, admin-only
// ---------------------------------------------------------------------------

const AnalyticsCharts = dynamic(
  () => import("@/components/admin/analytics-charts"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 flex items-center justify-center text-muted">
        <Loader2 className="animate-spin h-6 w-6" />
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = "7d" | "30d" | "90d";

interface RangeOption {
  value: DateRange;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAnalyticsClient() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-[--zymbiq-radius] p-1 w-fit">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setDateRange(option.value)}
            className={cn(
              "px-4 py-1.5 text-sm rounded-[calc(var(--zymbiq-radius)-2px)] font-medium transition-colors",
              dateRange === option.value
                ? "bg-primary text-background"
                : "text-muted hover:text-foreground hover:bg-muted/10"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Charts — re-renders when dateRange changes */}
      <AnalyticsCharts dateRange={dateRange} />
    </div>
  );
}