// =============================================================================
// Zymbiq — src/app/(dashboard)/dashboard/messages/page.tsx
// Full-page messages view for authenticated clients.
// =============================================================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import FullPageChat from './_components/full-page-chat';

// Force dynamic rendering — message state must never be cached
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Messages — Dashboard',
};

export default async function DashboardMessagesPage() {
  // --------------------------------------------------------------------------
  // Auth guard
  // --------------------------------------------------------------------------
const session = await getSession();
  if (!session?.user?.id) {
    redirect('/login?returnUrl=/dashboard/messages');
  }

  const userId = session.user.id;

  // --------------------------------------------------------------------------
  // Fetch distinct thread IDs for this user, most recent first
  // --------------------------------------------------------------------------
  // Find threads either directly linked to the user OR linked via their orders
  const userOrders = await prisma.order.findMany({
    where: { userId },
    select: { id: true },
  });
  const userOrderIds = userOrders.map((o) => o.id);

  const userThreads = await prisma.message.findMany({
    where: {
      OR: [
        { userId },
        { orderId: { in: userOrderIds } },
      ],
    },
    distinct: ['threadId'],
    orderBy: { createdAt: 'desc' },
    select: {
      threadId: true,
      content: true,
      createdAt: true,
      isRead: true,
    },
  });

  // Derive the primary thread: use the most recent one, or fall back to a
  // deterministic user-prefixed ID so the client can create the first message.
  const primaryThreadId =
    userThreads[0]?.threadId ?? `user-${userId}`;

  const hasMessages = userThreads.length > 0;

  return (
    <div className="flex flex-col h-full min-h-[calc(100dvh-8rem)]">
      {/* Page heading */}
      <div className="shrink-0 pb-6 border-b border-border">
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your conversation with the developer.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 pt-6">
        <FullPageChat
          threadId={primaryThreadId}
          hasMessages={hasMessages}
          userId={userId}
        />
      </div>
    </div>
  );
}