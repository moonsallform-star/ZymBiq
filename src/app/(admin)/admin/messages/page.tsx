// =============================================================================
// Zymbiq — src/app/(admin)/admin/messages/page.tsx
// Admin messaging center: thread list + full history + real-time reply.
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminMessagesClient from './_components/admin-messages-client';

// Force dynamic — message state changes frequently
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Messages — Admin',
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ThreadSummary {
  threadId: string;
  lastMessage: string;
  lastMessageAt: string; // ISO string — safe to serialize
  isRead: boolean;
  userId: string | null;
  userName: string | null;
  unreadCount: number;
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function AdminMessagesPage() {
  // Auth guard
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect('/dashboard');
  }

  // Fetch one message per threadId (latest) plus unread counts.
  // Prisma does not support DISTINCT ON directly, so we fetch all messages
  // ordered by createdAt desc and deduplicate in JS — acceptable for
  // admin-only messaging volume (not a high-traffic public inbox).
  const allMessages = await prisma.message.findMany({
    select: {
      threadId: true,
      content: true,
      createdAt: true,
      isRead: true,
      isAdmin: true,
      userId: true,
      user: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Deduplicate: keep first occurrence of each threadId (latest message)
  // and accumulate unread count for visitor messages.
  const threadMap = new Map<string, ThreadSummary>();
  const unreadMap = new Map<string, number>();

  for (const msg of allMessages) {
    // Accumulate unread visitor messages
    if (!msg.isAdmin && !msg.isRead) {
      unreadMap.set(msg.threadId, (unreadMap.get(msg.threadId) ?? 0) + 1);
    }

    // First occurrence = latest message (already sorted desc)
    if (!threadMap.has(msg.threadId)) {
      threadMap.set(msg.threadId, {
        threadId: msg.threadId,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt.toISOString(),
        isRead: msg.isRead,
        userId: msg.userId,
        userName: msg.user?.name ?? null,
        unreadCount: 0, // filled below
      });
    }
  }

  // Populate unread counts
  for (const [threadId, count] of unreadMap.entries()) {
    const thread = threadMap.get(threadId);
    if (thread) thread.unreadCount = count;
  }

  const threads = Array.from(threadMap.values());

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted mt-0.5">
            {threads.length} conversation{threads.length !== 1 ? 's' : ''}
            {threads.filter((t) => t.unreadCount > 0).length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-accent text-white text-xs font-medium">
                {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
              </span>
            )}
          </p>
        </div>
      </div>

      <AdminMessagesClient threads={threads} />
    </div>
  );
}