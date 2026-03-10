// =============================================================================
// Zymbiq — src/app/(admin)/admin/ai/page.tsx
// Admin AI configuration page: order flow questions, chatbot KB, recommender,
// and price estimation rules — all editable without code changes.
// =============================================================================

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import AdminAiClient from './_components/admin-ai-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Configuration — Admin',
};

export default function AdminAiPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          AI Configuration
        </h1>
        <p className="mt-1 text-sm text-muted">
          Control the behaviour of every AI feature on the platform — no code
          changes required.
        </p>
      </div>

      <Suspense fallback={<AdminAiSkeleton />}>
        <AdminAiClient />
      </Suspense>
    </div>
  );
}

function AdminAiSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-10 w-28" />
    </div>
  );
}