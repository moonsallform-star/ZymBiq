import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-safe Supabase client.
 * Uses the public anon key — safe to include in the client bundle.
 * Row-Level Security (RLS) on the Supabase project must be configured
 * appropriately if this client is used for direct table access.
 * Primary use: Realtime subscriptions in client components.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      // Disable Supabase Auth — NextAuth handles authentication.
      // This prevents Supabase from writing its own auth cookies.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

/**
 * Server-only Supabase admin client.
 * Uses the service role key — bypasses RLS entirely.
 * NEVER import this in any client component or any file that is
 * imported by a client component. Server-side use only:
 * API routes, Server Components, server actions.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

/**
 * Channel name constants — centralised to avoid typos across subscribers.
 */
export const REALTIME_CHANNELS = {
  order: (orderId: string) => `order:${orderId}`,
  messages: (threadId: string) => `messages:${threadId}`,
  orderDeliverables: (orderId: string) => `order_deliverables:${orderId}`,
  adminOrders: () => 'admin:orders',
  adminMessages: () => 'admin:messages',
} as const

/**
 * Postgres CDC event types surfaced by Supabase Realtime.
 */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

/**
 * Generic helper type for a Supabase Realtime postgres_changes payload.
 */
export interface RealtimePayload<T extends Record<string, unknown>> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: RealtimeEvent
  new: T
  old: Partial<T>
  errors: string[] | null
}