// =============================================================================
// Zymbiq — src/app/(admin)/admin/messages/_components/admin-messages-client.tsx
// Client: thread list + message history + real-time reply.
// =============================================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
// Supabase realtime removed — using polling instead (DB is on Neon)
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDate, truncate, getInitials } from '@/lib/utils';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import type { ThreadSummary } from '../page';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Message {
  id: string;
  threadId: string;
  content: string;
  isAdmin: boolean;
  isRead: boolean;
  createdAt: string;
  userId: string | null;
  user: { name: string | null } | null;
}

interface AdminMessagesClientProps {
  threads: ThreadSummary[];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AdminMessagesClient({ threads: initialThreads }: AdminMessagesClientProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.threadId ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  // ---------------------------------------------------------------------------
  // Scroll to bottom
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // Fetch messages for selected thread
  // ---------------------------------------------------------------------------

  const fetchMessages = useCallback(async (threadId: string) => {
    setIsFetchingMessages(true);
    try {
      const res = await fetch(`/api/messages/${threadId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const json = await res.json();
      setMessages(json.data ?? []);

      // Mark as read
      await fetch(`/api/messages/${threadId}`, { method: 'PATCH' });

      // Update local thread unread count
      setThreads((prev) =>
        prev.map((t) =>
          t.threadId === threadId ? { ...t, unreadCount: 0, isRead: true } : t,
        ),
      );
    } catch {
      setMessages([]);
    } finally {
      setIsFetchingMessages(false);
    }
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (!selectedThreadId) return;
    fetchMessages(selectedThreadId);
  }, [selectedThreadId, fetchMessages]);

  // ---------------------------------------------------------------------------
  // Poll for new messages every 5s (Realtime disabled — DB is on Neon not Supabase)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedThreadId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${selectedThreadId}`);
        if (!res.ok) return;
        const json = await res.json();
        const incoming: Message[] = json.data ?? [];
        setMessages((prev) => {
          // Only update if there are genuinely new messages
          if (incoming.length === prev.length) return prev;
          return incoming;
        });
      } catch {
        // Silent — non-critical
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedThreadId]);

  // ---------------------------------------------------------------------------
  // Send reply
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !selectedThreadId || isSending) return;

    setIsSending(true);
    setInputValue('');

    // Optimistic message
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      threadId: selectedThreadId,
      content,
      isAdmin: true,
      isRead: true,
      createdAt: new Date().toISOString(),
      userId: null,
      user: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, threadId: selectedThreadId }),
      });

      if (!res.ok) throw new Error('Send failed');

      const json = await res.json();
      const saved: Message = json.data;

      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m)),
      );

      // Update thread list
      setThreads((prev) =>
        prev.map((t) =>
          t.threadId === selectedThreadId
            ? { ...t, lastMessage: content, lastMessageAt: saved.createdAt }
            : t,
        ),
      );
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInputValue(content); // restore input
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!selectedThreadId) return;
    if (!confirm('Delete this entire conversation? This cannot be undone.')) return;
    setIsDeletingThread(true);
    try {
      const res = await fetch(`/api/messages/${selectedThreadId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setThreads((prev) => prev.filter((t) => t.threadId !== selectedThreadId));
        const remaining = threads.filter((t) => t.threadId !== selectedThreadId);
        setSelectedThreadId(remaining[0]?.threadId ?? null);
        setMessages([]);
      }
    } catch {
      // Silent
    } finally {
      setIsDeletingThread(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------------------------------------------------------------------------
  // Thread select
  // ---------------------------------------------------------------------------

  const handleSelectThread = (threadId: string) => {
    if (threadId === selectedThreadId) return;
    setSelectedThreadId(threadId);
    setMessages([]);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const selectedThread = threads.find((t) => t.threadId === selectedThreadId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Thread list — left panel                                             */}
      {/* ------------------------------------------------------------------ */}
      <aside className={cn(
        "shrink-0 border-r border-border flex flex-col overflow-hidden",
        "w-full md:w-[280px]",
        selectedThreadId ? "hidden md:flex" : "flex"
      )}>
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">No conversations yet</p>
          </div>
        ) : (
          <ul className="overflow-y-auto flex-1 py-2">
            {threads.map((thread) => {
              const isSelected = thread.threadId === selectedThreadId;
              const displayName = thread.userName ?? 'Anonymous';

              return (
                <li key={thread.threadId}>
                  <button
                    onClick={() => handleSelectThread(thread.threadId)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/10',
                      isSelected && 'bg-muted/15',
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm truncate',
                            thread.unreadCount > 0
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground',
                          )}
                        >
                          {displayName}
                        </span>
                        <span className="text-xs text-muted shrink-0">
                          {formatDate(thread.lastMessageAt, 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted truncate">
                          {truncate(thread.lastMessage, 40)}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-accent text-white text-[10px] font-medium">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Message panel — right                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className={cn(
        "flex flex-col flex-1 overflow-hidden",
        !selectedThreadId ? "hidden md:flex" : "flex"
      )}>
        {!selectedThreadId ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
            <MessageSquare className="h-10 w-10 text-muted" />
            <p className="text-sm text-muted">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 md:px-6 py-3 border-b border-border shrink-0">
              <button
                className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted hover:text-foreground hover:bg-muted/10 shrink-0"
                onClick={() => setSelectedThreadId(null)}
                aria-label="Back to conversations"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(selectedThread?.userName ?? 'Anonymous')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {selectedThread?.userName ?? 'Anonymous'}
                </p>
                <p className="text-xs text-muted">
                  Thread · {selectedThread?.threadId.slice(0, 8)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteThread}
                disabled={isDeletingThread}
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                {isDeletingThread ? 'Deleting…' : 'Delete thread'}
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {isFetchingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted">No messages in this thread</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.isAdmin;
                  const name = isAdmin
                    ? 'You'
                    : (msg.user?.name ?? selectedThread?.userName ?? 'Visitor');

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-end gap-2',
                        isAdmin ? 'flex-row-reverse' : 'flex-row',
                      )}
                    >
                      {/* Avatar */}
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {isAdmin ? 'A' : getInitials(name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Bubble */}
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2.5',
                          isAdmin
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-surface border border-border text-foreground rounded-bl-sm',
                        )}
                      >
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        <p
                          className={cn(
                            'text-[10px] mt-1',
                            isAdmin ? 'text-white/60 text-right' : 'text-muted',
                          )}
                        >
                          {formatDate(msg.createdAt, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              <div className="flex items-center gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a reply…"
                  disabled={isSending}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  size="icon"
                  aria-label="Send reply"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}