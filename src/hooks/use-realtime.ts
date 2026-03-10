'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// useOrderRealtime
// Polls /api/orders/[id] every 30s and calls onUpdate whenever the server
// returns a newer updatedAt than what we last saw.
// =============================================================================

export function useOrderRealtime(
  orderId: string,
  onUpdate: (order: Record<string, unknown>) => void
): void {
  const lastUpdatedAt = useRef<string>('');

  const { data } = useQuery<Record<string, unknown> | null, Error>({
    queryKey: ['order-poll', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) return null;
      const json = await res.json() as { data?: Record<string, unknown> };
      return json.data ?? null;
    },
    enabled: !!orderId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 25_000,
    retry: 0,
  });

  useEffect(() => {
    if (!data) return;
    const serverUpdatedAt = String(data.updatedAt ?? '');
    if (serverUpdatedAt && serverUpdatedAt !== lastUpdatedAt.current) {
      lastUpdatedAt.current = serverUpdatedAt;
      onUpdate(data);
    }
  }, [data, onUpdate]);
}

// =============================================================================
// useMessageRealtime
// Polls /api/messages/[threadId] every 15s and calls onNew for any message
// with an id not previously seen.
// =============================================================================

export function useMessageRealtime(
  threadId: string,
  onNew: (message: Record<string, unknown>) => void
): void {
  const seenIds = useRef<Set<string>>(new Set());

  const { data } = useQuery<{ data: Record<string, unknown>[] } | null, Error>({
    queryKey: ['messages-poll', threadId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ data: Record<string, unknown>[] }>;
    },
    enabled: !!threadId,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    retry: 0,
  });

  useEffect(() => {
    if (!data?.data) return;
    for (const msg of data.data) {
      const id = String(msg.id ?? '');
      if (id && !seenIds.current.has(id)) {
        seenIds.current.add(id);
        // Only fire onNew for admin messages — client already has their own
        // messages via optimistic updates in chat-widget.
        if (msg.isAdmin) {
          onNew(msg);
        }
      }
    }
  }, [data, onNew]);
}