// =============================================================================
// Zymbiq — src/components/providers/query-provider.tsx
// TanStack Query client boundary.
// Creates a stable QueryClient instance per browser session with platform-wide
// defaults — never shared across server requests because it is created inside
// useState().
// =============================================================================

"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  SITE_CONFIG_STALE_TIME_MS,
  PROJECT_STALE_TIME_MS,
  ORDER_STALE_TIME_MS,
  BLOG_STALE_TIME_MS,
} from "@/lib/constants";

// =============================================================================
// Factory — builds a QueryClient with Zymbiq-specific defaults.
// Extracted so tests can call it directly without mounting the component.
// =============================================================================

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // -----------------------------------------------------------------------
        // Global stale time — individual query hooks override this where needed.
        // SITE_CONFIG_STALE_TIME_MS (5 min) is the longest cache window on the
        // platform; PROJECT / ORDER / BLOG overrides live in their own hooks.
        // We use the shortest non-zero value here as a safe global floor so that
        // any query that forgets to set its own staleTime still gets a reasonable
        // cache window and does not hammer the server on every re-render.
        // -----------------------------------------------------------------------
        // 60 s is a safe global floor; individual hooks override with their own
        // stale times (SITE_CONFIG = 5 min, PROJECT / BLOG = 2 min, ORDER = 30 s).
        // Using Math.min across all constants was wrong — it would have made every
        // query as short-lived as the shortest constant (orders), causing excessive
        // server round-trips for slow-changing data like site config.
        staleTime: 60_000,

        // Retry once before surfacing an error — retrying twice adds up to 3 s of
        // exponential backoff delay on slow connections before the UI shows anything.
        retry: 1,

        // Do not refetch on window focus — all real-time updates come through
        // Supabase Realtime or explicit invalidations triggered by mutations.
        refetchOnWindowFocus: false,

        // Do not refetch on reconnect by default; mutations and realtime events
        // handle freshness. Individual hooks opt in where appropriate.
        refetchOnReconnect: false,
      },
      mutations: {
        // Surface mutation errors immediately without automatic retries.
        // Retry logic for mutations must be opted in per-mutation.
        retry: 0,
      },
    },
  });
}

// =============================================================================
// Props
// =============================================================================

interface QueryProviderProps {
  children: ReactNode;
}

// =============================================================================
// QueryProvider
// Must be the outermost client boundary in the root layout so that every
// client component in the tree can access the same QueryClient instance.
// =============================================================================

export default function QueryProvider({ children }: QueryProviderProps) {
  // useState with an initialiser function guarantees the QueryClient is:
  //   1. Created exactly once per component lifecycle (not on every render).
  //   2. Never shared across concurrent server requests when used in layouts
  //      that are rendered server-side — each browser session gets its own
  //      instance because this component only mounts in the browser.
  const [queryClient] = useState<QueryClient>(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}