// src/hooks/use-devforge.ts
// =============================================================================
// Zymbiq — DevForge build status polling hook
// Polls /api/devforge/status every 60 seconds with silent error handling.
// Returns null data on any failure — consumers must render nothing when null.
// =============================================================================

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, DevforgeStatusResponse } from "@/types/api";

export function useDevforge() {
  const { data, isLoading, isError } = useQuery <
    DevforgeStatusResponse | null,
    Error
  >({
    queryKey: ["devforge"],
    queryFn: async (): Promise<DevforgeStatusResponse | null> => {
      const response = await fetch("/api/devforge/status");
      if (!response.ok) return null;
      const json: ApiResponse<DevforgeStatusResponse | null> =
        await response.json();
      return json?.data ?? null;
    },
    select: (result) => result ?? null,
    staleTime: 55_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 0,
  });

  return {
    data: data ?? null,
    isLoading,
    isError,
  };
}