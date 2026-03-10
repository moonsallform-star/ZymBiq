// Zymbiq — src/app/(public)/order/page.tsx
// Server Component shell for the custom order page

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// OrderAssistant is a heavy client component — lazy load to keep server bundle lean
const OrderAssistant = dynamic(
  () => import('@/components/ai/order-assistant'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Conversation skeleton */}
          <div className="flex flex-col min-h-[calc(100vh-22rem)]">
            <div className="flex-1 space-y-4 min-h-[300px]">
              {/* Assistant opening message skeleton */}
              <div className="flex items-end gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-muted/20 animate-pulse shrink-0" />
                <div className="h-16 w-72 rounded-2xl rounded-bl-sm bg-muted/20 animate-pulse" />
              </div>
            </div>
            {/* Input skeleton */}
            <div className="mt-4 flex gap-2">
              <div className="flex-1 h-10 rounded-md bg-muted/20 animate-pulse" />
              <div className="h-10 w-10 rounded-md bg-muted/20 animate-pulse" />
            </div>
          </div>
          {/* Estimate panel skeleton */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/20 animate-pulse" />
              <div className="h-4 w-56 rounded bg-muted/20 animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Custom Order — Zymbiq',
  description:
    'Describe your project and get an instant estimate. Our AI assistant will guide you through the process.',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrderPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col py-16">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Page header ── */}
        <div className="max-w-2xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Tell me what you need.{' '}
            <span className="text-accent">I will build it.</span>
          </h1>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Describe your project in plain language. The assistant will ask a few
            clarifying questions and generate an instant estimate — no forms, no back-and-forth email.
          </p>
        </div>

        {/* ── AI Order Assistant ── */}
        <div className="flex-1">
          <OrderAssistant />
        </div>
      </div>
    </main>
  );
}