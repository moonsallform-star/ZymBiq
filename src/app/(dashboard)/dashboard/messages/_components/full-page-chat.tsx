// =============================================================================
// Zymbiq — src/app/(dashboard)/dashboard/messages/_components/full-page-chat.tsx
// Inline full-height chat — same core logic as ChatWidget but rendered in-page.
// =============================================================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useMessageRealtime } from '@/hooks/use-realtime';
import { useStore } from '@/store/index';
import { cn } from '@/lib/utils';

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

interface FullPageChatProps {
  threadId: string;
  hasMessages: boolean;
  userId: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

const bubbleVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0, 0, 0.2, 1] },
  },
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function FullPageChat({
  threadId: initialThreadId,
  hasMessages,
  userId,
}: FullPageChatProps) {
  const { data: siteConfig } = useSiteConfig();
  const comm = siteConfig.communication;
  const platform = siteConfig.platform;
  const openChat = useStore((s) => s.openChat);
  const setHubExpanded = useStore((s) => s.setHubExpanded);

  // --------------------------------------------------------------------------
  // Thread state — may be updated by server response on first send
  // --------------------------------------------------------------------------

  const [threadId, setThreadId] = useState<string>(initialThreadId);

  // --------------------------------------------------------------------------
  // Message state
  // --------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // Fetch existing messages
  // --------------------------------------------------------------------------

  const { isLoading: isLoadingMessages, data: queryData } = useQuery<MessagesApiResponse, Error>({
    queryKey: ['messages', threadId],
    queryFn: async () => {
      const res = await fetch(
        `/api/messages/${encodeURIComponent(threadId)}`,
      );
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json() as Promise<MessagesApiResponse>;
    },
    enabled: !!threadId,
    staleTime: 30_000,
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
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
    },
    [threadId],
  );

  useMessageRealtime(threadId, handleNewMessage);

  // --------------------------------------------------------------------------
  // Auto-scroll
  // --------------------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --------------------------------------------------------------------------
  // Focus input on mount
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (hasMessages || messages.length > 0) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [hasMessages, messages.length]);

  // --------------------------------------------------------------------------
  // Send mutation
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
        throw new Error(
          (err as { error?: string }).error ?? 'Failed to send message',
        );
      }

      return res.json() as Promise<SendMessageApiResponse>;
    },

    onMutate: (content) => {
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        content,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        threadId,
        userId,
      };
      setMessages((prev) => [...prev, optimistic]);
      setSendError(null);
    },

    onSuccess: (data) => {
      const serverThread = data.data?.threadId; 
      if (serverThread && serverThread !== threadId) {
        setThreadId(serverThread);
      }

      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) => !m.id.startsWith('optimistic-'),
        );
        return [...withoutOptimistic, data.data];
      });
    },

    onError: (err) => {
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
  // Empty state — no messages and chat not yet started
  // --------------------------------------------------------------------------

  if (!hasMessages && messages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[360px] text-center px-6 gap-5">
        <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <MessageSquare className="h-7 w-7 text-accent" />
        </div>

        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">
            No messages yet
          </p>
          <p className="text-sm text-muted max-w-xs">
            Start a conversation via the chat icon below, or send your first
            message here.
          </p>
        </div>

        <Button
          variant="default"
          onClick={() => {
            setHubExpanded(true);
            openChat();
          }}
          className="min-h-11"
        >
          Open Chat
        </Button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main chat UI
  // --------------------------------------------------------------------------

  const platformName = platform?.name ?? 'Zymbiq';
  const statusMessage = comm?.statusMessage ?? 'We reply promptly';

  return (
    <div className="flex flex-col h-full border border-border rounded-2xl overflow-hidden bg-surface">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border bg-surface">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-xs bg-accent/10 text-accent font-semibold">
            {platformName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {platformName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--zymbiq-success)] shrink-0" />
            <p className="text-xs text-muted leading-tight truncate">
              {statusMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 scroll-smooth">
        {isLoadingMessages ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}

        {/* Send error */}
        {sendError && (
          <div className="text-xs text-destructive text-center px-3 py-1.5 rounded-lg bg-destructive/10">
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-2 bg-surface">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={isSending}
          className="flex-1 h-10 text-sm"
          maxLength={5000}
          aria-label="Message input"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          aria-label="Send message"
          className="shrink-0 h-10 w-10"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ChatBubble sub-component
// -----------------------------------------------------------------------------

function ChatBubble({ message }: { message: Message }) {
  const isAdmin = message.isAdmin;

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-end gap-2 max-w-[80%]',
        isAdmin ? 'self-start flex-row' : 'self-end flex-row-reverse',
      )}
    >
      {isAdmin && (
        <Avatar className="h-6 w-6 shrink-0 mb-0.5">
          <AvatarFallback className="text-[10px] bg-accent/10 text-accent">
            AD
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words',
          isAdmin
            ? 'bg-muted/10 text-foreground rounded-bl-sm'
            : 'bg-accent text-white rounded-br-sm',
        )}
      >
        <p>{message.content}</p>
        <p
          className={cn(
            'text-[10px] mt-1 select-none text-right',
            isAdmin ? 'text-muted' : 'text-white/70',
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}