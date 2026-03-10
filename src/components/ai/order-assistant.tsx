"use client"
// src/components/ai/order-assistant.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Send, Loader2, RefreshCw, Bot, User, Sparkles, Clock, DollarSign, Zap } from 'lucide-react';

import { ContactSchema, type ContactInput } from '@/lib/validations';
import { useStore } from '@/store/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AiAssistantResponse, AiEstimateResponse, CreateOrderResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Framer Motion variants (defined at module level per coding standards)
// ---------------------------------------------------------------------------

const MESSAGE_ENTER = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: 'USD' | 'BDT' = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 border border-border">
        <Bot className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-surface border border-border px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 border border-border">
          <Bot className="h-3.5 w-3.5 text-accent" />
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-accent text-white'
            : 'rounded-bl-sm bg-surface border border-border text-foreground'
        }`}
      >
        {message.content}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-border">
          <User className="h-3.5 w-3.5 text-foreground" />
        </div>
      )}
    </div>
  );
}

interface EstimatePanelProps {
  estimate: AiEstimateResponse;
  isLoading?: boolean;
}

function EstimatePanel({ estimate, isLoading }: EstimatePanelProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Generating Estimate…
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-accent/20 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Project Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price range */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
            <DollarSign className="h-3 w-3" />
            Estimated Budget
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(estimate.estimatedMinPrice)}
            <span className="text-muted font-normal text-lg"> – </span>
            {formatCurrency(estimate.estimatedMaxPrice)}
          </p>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
            <Clock className="h-3 w-3" />
            Timeline
          </div>
          <p className="text-sm font-medium text-foreground">{estimate.timeline}</p>
        </div>

        {/* Complexity */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
            <Zap className="h-3 w-3" />
            Complexity
          </div>
          <Badge
            variant={
              estimate.complexity === 'simple'
                ? 'success'
                : estimate.complexity === 'enterprise'
                ? 'destructive'
                : 'accent'
            }
            className="capitalize"
          >
            {estimate.complexity}
          </Badge>
        </div>

        {/* Breakdown */}
        {estimate.breakdown && (
          <div>
            <p className="text-xs text-muted mb-1.5">Breakdown</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{estimate.breakdown}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ContactFormProps {
  onSubmit: (data: ContactInput) => void;
  isPending: boolean;
}

function ContactForm({ onSubmit, isPending }: ContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
  });

  return (
    <div className="border-t border-border pt-6 mt-2">
      <h3 className="text-base font-semibold text-foreground mb-1">Almost there</h3>
      <p className="text-sm text-muted mb-4">
        Where should I send your project brief and get in touch?
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <Input
            placeholder="Your name"
            {...register('name')}
            aria-label="Your name"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Input
            type="email"
            placeholder="Email address"
            {...register('email')}
            aria-label="Email address"
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Input
            type="tel"
            placeholder="Phone (optional)"
            {...register('phone')}
            aria-label="Phone number (optional)"
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit Order Brief'
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted">or reach me directly</span>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground hover:bg-accent/5 hover:border-accent/30 transition-colors"
          >
            <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
          <a
            href="/contact"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground hover:bg-accent/5 hover:border-accent/30 transition-colors"
          >
            <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Contact Page
          </a>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session storage keys
// ---------------------------------------------------------------------------

const SESSION_KEY_MESSAGES = 'zymbiq:assistant:messages';
const SESSION_KEY_STEP = 'zymbiq:assistant:step';
const SESSION_KEY_ESTIMATE = 'zymbiq:assistant:estimate';
const SESSION_KEY_COMPLETE = 'zymbiq:assistant:complete';

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded — ignore
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrderAssistant() {
  const router = useRouter();
  const animationIntensity = useStore((s) => s.animationIntensity);

  // ── Conversation state (sessionStorage-persisted) ────────────────────────

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    readSession<ChatMessage[]>(SESSION_KEY_MESSAGES, [])
  );
  const [currentStep, setCurrentStep] = useState<number>(() =>
    readSession<number>(SESSION_KEY_STEP, 0)
  );
  const [estimateResult, setEstimateResult] = useState<AiEstimateResponse | null>(() =>
    readSession<AiEstimateResponse | null>(SESSION_KEY_ESTIMATE, null)
  );
  const [isComplete, setIsComplete] = useState<boolean>(() =>
    readSession<boolean>(SESSION_KEY_COMPLETE, false)
  );

  // ── UI state ─────────────────────────────────────────────────────────────

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scroll to bottom on new message ─────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ── Sync state to sessionStorage ────────────────────────────────────────

  useEffect(() => { writeSession(SESSION_KEY_MESSAGES, messages); }, [messages]);
  useEffect(() => { writeSession(SESSION_KEY_STEP, currentStep); }, [currentStep]);
  useEffect(() => { writeSession(SESSION_KEY_ESTIMATE, estimateResult); }, [estimateResult]);
  useEffect(() => { writeSession(SESSION_KEY_COMPLETE, isComplete); }, [isComplete]);

  // ── Boot: send first message if conversation is fresh ───────────────────

  const hasSentFirstMessage = useRef(false);

  const sendToAssistant = useCallback(
    async (outgoingMessages: ChatMessage[], step: number) => {
      setIsTyping(true);
      setRetryMessage(null);

      try {
        const res = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: outgoingMessages, currentStep: step ?? 0 }),
        });

        if (!res.ok) throw new Error('Assistant request failed');

        const json = (await res.json()) as { data: AiAssistantResponse };

        const aiMessage: ChatMessage = { role: 'assistant', content: json.data.message };
        const updatedMessages = [...outgoingMessages, aiMessage];
        setMessages(updatedMessages);

        const nextStep = step + 1;
        setCurrentStep(nextStep);

        if (json.data.isComplete) {
          setIsComplete(true);
          if (json.data.estimate) {
            setEstimateResult(json.data.estimate);
          } else {
            // Estimate not yet in response — show loading state
            setEstimateLoading(true);
          }
        }
      } catch {
        setRetryMessage(
          outgoingMessages[outgoingMessages.length - 1]?.content ?? null
        );
      } finally {
        setIsTyping(false);
        setEstimateLoading(false);
        inputRef.current?.focus();
      }
    },
    []
  );

  useEffect(() => {
    if (messages.length === 0 && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      sendToAssistant([], 0);
    }
  }, [messages.length, sendToAssistant]);

  // ── Send user message ────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping || isComplete) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputValue('');

    await sendToAssistant(updatedMessages, currentStep);
  }, [inputValue, isTyping, isComplete, messages, currentStep, sendToAssistant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Retry on network error ────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (!retryMessage) return;
    sendToAssistant(messages, currentStep);
  }, [retryMessage, messages, currentStep, sendToAssistant]);

  // ── Order submission ──────────────────────────────────────────────────────

  const submitOrderMutation = useMutation <
    { data: CreateOrderResponse },
    Error,
    ContactInput
  >({
    mutationFn: async (contactData) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
          orderType: 'CUSTOM',
          guestName: contactData.name,
          guestEmail: contactData.email,
          guestPhone: contactData.phone ?? undefined,
          customBrief: messages,
          estimatedPrice: estimateResult?.estimatedMinPrice,
          estimatedTimeline: estimateResult?.timeline,
          paymentMethod: 'STRIPE',
          amountUsd: estimateResult?.estimatedMinPrice,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Order submission failed');
      }

      return res.json() as Promise<{ data: CreateOrderResponse }>;
    },
    onSuccess: (data) => {
      // Clear session storage after successful order
      sessionStorage.removeItem(SESSION_KEY_MESSAGES);
      sessionStorage.removeItem(SESSION_KEY_STEP);
      sessionStorage.removeItem(SESSION_KEY_ESTIMATE);
      sessionStorage.removeItem(SESSION_KEY_COMPLETE);

      router.push(`/checkout/order/${data.data.orderId}`);
    },
  });

  const handleContactSubmit = (data: ContactInput) => {
    submitOrderMutation.mutate(data);
  };

  // ── Animation guard ───────────────────────────────────────────────────────

  const motionProps =
    animationIntensity === 'off'
      ? {}
      : MESSAGE_ENTER;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

        {/* ── Left column: conversation ── */}
        <div className="flex flex-col">

          {/* Chat history */}
          <div
            ref={scrollRef}
            className="overflow-y-auto space-y-4 pr-1 min-h-[200px] max-h-[480px]"
            aria-live="polite"
            aria-label="Order assistant conversation"
          >
            {/* Empty state while loading first message */}
            {messages.length === 0 && !isTyping && (
              <div className="flex items-end gap-2 justify-start">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-14 w-64 rounded-2xl rounded-bl-sm" />
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={
                  animationIntensity !== 'off'
                    ? {
                        animationDelay: `${Math.min(i * 30, 150)}ms`,
                      }
                    : {}
                }
              >
                <MessageBubble message={msg} />
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && <TypingIndicator />}

            {/* Network error + retry */}
            {retryMessage && !isTyping && (
              <div className="flex justify-center">
                <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <span>Connection issue. Your message was not sent.</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Input row */}
          {!isComplete && (
            <div className="mt-4 flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  messages.length === 0
                    ? 'Waiting for assistant…'
                    : 'Type your reply…'
                }
                disabled={isTyping || messages.length === 0}
                className="flex-1"
                aria-label="Your reply to the assistant"
                maxLength={2000}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping || messages.length === 0}
                size="icon"
                aria-label="Send message"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Conversation complete — show contact form + restart */}
          {isComplete && (
            <>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY_MESSAGES);
                    sessionStorage.removeItem(SESSION_KEY_STEP);
                    sessionStorage.removeItem(SESSION_KEY_ESTIMATE);
                    sessionStorage.removeItem(SESSION_KEY_COMPLETE);
                    setMessages([]);
                    setCurrentStep(0);
                    setEstimateResult(null);
                    setIsComplete(false);
                    setInputValue('');
                    hasSentFirstMessage.current = false;
                  }}
                  className="text-xs text-muted hover:text-foreground gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Start over
                </Button>
              </div>
              <ContactForm
                onSubmit={handleContactSubmit}
                isPending={submitOrderMutation.isPending}
              />
            </>
          )}

          {/* Submit error */}
          {submitOrderMutation.isError && (
            <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-center">
              <p className="text-xs text-destructive mb-2">
                {submitOrderMutation.error?.message ?? 'Something went wrong. Please try again.'}
              </p>
              <a
                href="/contact"
                className="text-xs text-accent underline underline-offset-2"
              >
                Contact me directly instead →
              </a>
            </div>
          )}
        </div>

        {/* ── Right column: estimate panel (desktop sticky, mobile inline) ── */}
        <div className="lg:sticky lg:top-24">
          {estimateResult ? (
            <EstimatePanel estimate={estimateResult} />
          ) : estimateLoading ? (
            <EstimatePanel estimate={{} as AiEstimateResponse} isLoading />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Sparkles className="h-8 w-8 text-muted mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted leading-relaxed">
                  Your project estimate will appear here as we discuss your requirements.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
