// =============================================================================
// Zymbiq — src/components/ai/chat-widget.tsx
// Slide-up floating chat overlay with real-time messages and thread persistence.
// =============================================================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/store/index';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useMessageRealtime } from '@/hooks/use-realtime';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Message {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
  threadId: string;
  userId?: string | null;
}

interface MessagesApiResponse {
  data: Message[];
}

interface SendMessageApiResponse {
  data: Message & { threadId: string };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const THREAD_STORAGE_KEY = 'zymbiq-chat-thread';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getStoredThreadId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(THREAD_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeThreadId(threadId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  } catch {
    // localStorage unavailable — continue without persistence
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// -----------------------------------------------------------------------------
// Animation variants
// -----------------------------------------------------------------------------

const widgetVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.97,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0, 0, 0.2, 1] },
  },
};

const messageBubbleVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  },
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ChatWidget() {
  const { data: session } = useSession();
  const closeChat = useStore((s) => s.closeChat);
  const { data: siteConfig } = useSiteConfig();
  const comm = siteConfig.communication;
  const platform = siteConfig.platform;

  // Guard — if chat is disabled in config, render nothing
  if (!comm.chatEnabled) return null;

  // --------------------------------------------------------------------------
  // Thread ID resolution
  // --------------------------------------------------------------------------

  const [threadId, setThreadId] = useState<string>(() => {
    // Try to restore from localStorage first
    const stored = getStoredThreadId();
    if (stored) return stored;

    // If logged in, use a user-prefixed thread
    if (session?.user?.id) {
      const prefixed = `user-${session.user.id}`;
      storeThreadId(prefixed);
      return prefixed;
    }

    // Generate a new anonymous thread ID
    const fresh = generateUUID();
    storeThreadId(fresh);
    return fresh;
  });

  // When session arrives (async), upgrade anonymous thread to user-prefixed
  useEffect(() => {
    if (session?.user?.id) {
      const prefixed = `user-${session.user.id}`;
      if (threadId !== prefixed) {
        setThreadId(prefixed);
        storeThreadId(prefixed);
      }
    }
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // Fetch existing messages on mount / threadId change
  // --------------------------------------------------------------------------

  const { isLoading: isLoadingMessages, data: queryData } = useQuery<MessagesApiResponse, Error>({
    queryKey: ['messages', threadId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`);
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json() as Promise<MessagesApiResponse>;
    },
    enabled: !!threadId,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (queryData) setMessages(queryData.data ?? []);
  }, [queryData]);

  // --------------------------------------------------------------------------
  // Real-time subscription
  // --------------------------------------------------------------------------

  const handleNewMessage = useCallback(
    (raw: Record<string, unknown>) => {
      const msg: Message = {
        id: String(raw.id ?? generateUUID()),
        content: String(raw.content ?? ''),
        isAdmin: Boolean(raw.isAdmin),
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
        threadId: String(raw.threadId ?? threadId),
        userId: raw.userId != null ? String(raw.userId) : null,
      };

      setMessages((prev) => {
        // Deduplicate by id
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
    },
    [threadId],
  );

  useMessageRealtime(threadId, handleNewMessage);

  // --------------------------------------------------------------------------
  // Auto-scroll to bottom when messages change
  // --------------------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --------------------------------------------------------------------------
  // Focus input on open
  // --------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  // --------------------------------------------------------------------------
  // Send message mutation
  // --------------------------------------------------------------------------

  const { mutate: sendMessage, isPending: isSending } = useMutation <
    SendMessageApiResponse,
    Error,
    string
  >({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, threadId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to send');
      }

      return res.json() as Promise<SendMessageApiResponse>;
    },

    onMutate: (content) => {
      // Optimistic append
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        content,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        threadId,
        userId: session?.user?.id ?? null,
      };
      setMessages((prev) => [...prev, optimistic]);
      setSendError(null);
    },

    onSuccess: (data) => {
      // If the server returns a new threadId (first message), adopt it
      const serverThread = data.data?.threadId;
      if (serverThread && serverThread !== threadId) {
        setThreadId(serverThread);
        storeThreadId(serverThread);
      }

      // Replace the optimistic message with the real one
      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) => !m.id.startsWith('optimistic-'),
        );
        return [...withoutOptimistic, data.data];
      });
    },

    onError: (err) => {
      // Remove optimistic message and surface error
      setMessages((prev) =>
        prev.filter((m) => !m.id.startsWith('optimistic-')),
      );
      setSendError(err.message ?? 'Something went wrong. Please try again.');
    },
  });

  // --------------------------------------------------------------------------
  // Submit handler
  // --------------------------------------------------------------------------

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;
    setInputValue('');
    sendMessage(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const platformName = platform?.name ?? 'Zymbiq';
  const statusMessage = comm.statusMessage ?? 'We reply promptly';

  return (
    <motion.div
      key="chat-widget"
      variants={widgetVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className={[
        'fixed z-50 flex flex-col',
        // Position — above mobile nav, to the right
        'bottom-[88px] right-4 md:bottom-[80px] md:right-6',
        // Size
        'w-[calc(100vw-2rem)] max-w-[360px] h-[480px] max-h-[calc(100dvh-120px)]',
        // Surface
        'bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden',
      ].join(' ')}
      role="dialog"
      aria-label="Chat with us"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Admin avatar placeholder */}
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={undefined} alt={platformName} />
            <AvatarFallback className="text-xs">
              {platformName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {platformName}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--zymbiq-success)] shrink-0" />
              <p className="text-xs text-muted truncate leading-tight">
                {statusMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={closeChat}
          aria-label="Close chat"
          className="shrink-0 text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Messages list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
        {isLoadingMessages ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center px-4">
            <p className="text-sm text-muted">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}

        {/* Error inline */}
        {sendError && (
          <div className="text-xs text-destructive text-center px-2 py-1 rounded bg-destructive/10">
            {sendError}
            <button
              type="button"
              className="ml-2 underline focus-visible:outline-none"
              onClick={() => setSendError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border px-3 py-3 flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={isSending}
          className="flex-1 h-9 text-sm"
          maxLength={5000}
          aria-label="Message input"
        />
        <Button
          size="icon-sm"
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          aria-label="Send message"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// MessageBubble sub-component
// -----------------------------------------------------------------------------

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAdmin = message.isAdmin;

  return (
    <motion.div
      variants={messageBubbleVariants}
      initial="hidden"
      animate="visible"
      className={[
        'flex items-end gap-2 max-w-[85%]',
        isAdmin ? 'self-start flex-row' : 'self-end flex-row-reverse',
      ].join(' ')}
    >
      {/* Admin avatar */}
      {isAdmin && (
        <Avatar className="h-6 w-6 shrink-0 mb-0.5">
          <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
            AD
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble */}
      <div
        className={[
          'rounded-2xl px-3 py-2 text-sm leading-relaxed break-words',
          isAdmin
            ? 'bg-muted/10 text-foreground rounded-bl-sm'
            : 'bg-accent text-white rounded-br-sm',
        ].join(' ')}
      >
        <p>{message.content}</p>
        <p
          className={[
            'text-[10px] mt-0.5 select-none',
            isAdmin ? 'text-muted' : 'text-white/70',
            'text-right',
          ].join(' ')}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}