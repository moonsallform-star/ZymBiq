// =============================================================================
// Zymbiq — src/hooks/use-devforge-project.ts
// Per-order DevForge progress hook. Polls /api/devforge/status?projectId=xxx
// Returns null silently on any failure.
// =============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import type { DevforgeStatus } from '@/lib/devforge';

export function useDevforgeProject(devforgeProjectId: string | null | undefined) {
  const { data } = useQuery<DevforgeStatus | null>({
    queryKey: ['devforge-project', devforgeProjectId],
    queryFn: async (): Promise<DevforgeStatus | null> => {
      if (!devforgeProjectId) return null;
      const res = await fetch(`/api/devforge/status?projectId=${devforgeProjectId}`);
      if (!res.ok) return null;
      const json = await res.json() as { data: DevforgeStatus | null };
      return json?.data ?? null;
    },
    enabled: Boolean(devforgeProjectId),
    staleTime: 55_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 0,
  });

  return { data: data ?? null };
}