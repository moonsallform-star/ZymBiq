// =============================================================================
// Zymbiq — src/components/providers/realtime-provider.tsx
// Global Supabase Realtime provider for unread message notifications.
// Used in dashboard and admin layouts only — never in root layout.
// =============================================================================

'use client';

import { useEffect } from 'react';
import { supabaseClient, REALTIME_CHANNELS } from '@/lib/supabase';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RealtimeProviderProps {
  children: React.ReactNode;
}

// -----------------------------------------------------------------------------
// Augment store with unread message state if not already present.
// We extend via a local selector pattern — the store already exposes
// incrementUnread / resetUnread once added to index.ts.
// To avoid coupling, we access the store's raw setState directly.
// -----------------------------------------------------------------------------

/**
 * RealtimeProvider
 *
 * Mounts a single Supabase Realtime channel that listens for:
 *   - INSERT on messages WHERE isAdmin = false  → increments unread count
 *   - UPDATE on messages                        → handles read-state sync
 *
 * Renders children only — no UI of its own.
 * All errors are swallowed silently so a broken Supabase connection
 * never affects the rest of the application.
 */
export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  const incrementUnread = useStore((s) => s.incrementUnread);
  const resetUnread = useStore((s) => s.resetUnread);

  useEffect(() => {
    // Reset count on mount so stale counts from a previous session
    // don't linger when an admin or client reopens the app.
    resetUnread();

    // Realtime disabled — message and order tables live in Neon, not Supabase.
    // Supabase postgres_changes subscriptions require the tables to exist
    // inside Supabase's own Postgres instance. Subscribing to tables that
    // only exist in Neon causes repeated WebSocket failures.
    // Unread message counts are handled by TanStack Query polling instead.
    // Re-enable this block once a Neon → Supabase CDC bridge is configured.
  }, [resetUnread]);

  return <>{children}</>;
}