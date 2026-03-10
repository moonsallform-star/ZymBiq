// src/components/payments/manual-payment-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Copy, Check, Clock, CheckCircle2, Loader2 } from 'lucide-react';

import { ManualPaymentSchema, type ManualPaymentInput } from '@/lib/validations';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManualPaymentFormProps {
  orderId: string;
  amountUsd: number;
  onSuccess?: (trackingCode: string) => void;
}

type PaymentMethod = 'BKASH' | 'NAGAD';

interface SubmitPayload {
  orderId: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  amountBdt: number;
}

interface SubmitResponse {
  data: {
    status: string;
    trackingCode: string;
  };
}

// ---------------------------------------------------------------------------
// CopyButton — click-to-copy with feedback
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
        copied
          ? 'bg-success/10 text-success'
          : 'bg-muted/10 text-muted hover:bg-muted/20 hover:text-foreground'
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PaymentMethodPanel — per-method instructions + form
// ---------------------------------------------------------------------------

interface PaymentMethodPanelProps {
  method: PaymentMethod;
  number: string;
  amountBdt: number;
  orderId: string;
  onSuccess?: (trackingCode: string) => void;
}

function PaymentMethodPanel({
  method,
  number,
  amountBdt,
  orderId,
  onSuccess,
}: PaymentMethodPanelProps) {
  const label = method === 'BKASH' ? 'bKash' : 'Nagad';
  const accentClass =
    method === 'BKASH'
      ? 'text-pink-600 dark:text-pink-400'
      : 'text-orange-500 dark:text-orange-400';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Pick<ManualPaymentInput, 'transactionId'>>({
    resolver: zodResolver(
      ManualPaymentSchema.pick({ transactionId: true })
    ),
  });

  const mutation = useMutation<SubmitResponse, Error, SubmitPayload>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Payment submission failed');
      }
      return res.json() as Promise<SubmitResponse>;
    },
    onSuccess: (data) => {
      reset();
      onSuccess?.(data.data.trackingCode);
    },
  });

  function onSubmit(values: Pick<ManualPaymentInput, 'transactionId'>) {
    mutation.mutate({
      orderId,
      paymentMethod: method,
      transactionId: values.transactionId,
      amountBdt,
    });
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — Payment number */}
      <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Step 1 — Send payment to
        </p>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-bold tabular-nums', accentClass)}>
            {number}
          </span>
          <CopyButton value={number} />
        </div>
        <p className="text-xs text-muted">
          Select &ldquo;Send Money&rdquo; in your {label} app and send to the
          number above.
        </p>
      </div>

      {/* Step 2 — Amount */}
      <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Step 2 — Send exactly this amount
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {amountBdt.toLocaleString('en-BD')}
          </span>
          <Badge variant="outline" className="text-xs">
            BDT
          </Badge>
          <CopyButton value={String(amountBdt)} />
        </div>
        <p className="text-xs text-muted">
          Send this exact amount — incorrect amounts may delay verification.
        </p>
      </div>

      {/* Step 3 — Transaction ID */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Step 3 — Enter your transaction ID
          </p>
          <Label htmlFor={`txid-${method}`}>
            {label} Transaction ID
          </Label>
          <Input
            id={`txid-${method}`}
            placeholder="e.g. 8N7A3B2X1Q"
            autoComplete="off"
            disabled={mutation.isPending}
            {...register('transactionId')}
            aria-describedby={
              errors.transactionId ? `txid-error-${method}` : undefined
            }
          />
          {errors.transactionId && (
            <p
              id={`txid-error-${method}`}
              className="text-xs text-error"
              role="alert"
            >
              {errors.transactionId.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-error" role="alert">
            {mutation.error.message}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit Payment'
          )}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WaitingScreen — shown after successful submission
// ---------------------------------------------------------------------------

function WaitingScreen({ trackingCode }: { trackingCode: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Payment Submitted
        </h3>
        <p className="text-sm text-muted max-w-xs">
          Your payment is being verified. This typically takes 1–2 hours during
          business hours.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-[--zymbiq-radius] border border-border bg-surface px-4 py-3">
        <Clock className="h-4 w-4 text-muted shrink-0" />
        <span className="text-sm text-muted">
          Expected verification: <span className="font-medium text-foreground">1–2 hours</span>
        </span>
      </div>

      <p className="text-xs text-muted">
        You will receive an email once your payment is confirmed.
      </p>

      <Button asChild variant="outline" className="w-full max-w-xs">
        <Link href={`/track/${trackingCode}`}>
          Track Your Order
        </Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ManualPaymentForm — root export
// ---------------------------------------------------------------------------

export default function ManualPaymentForm({
  orderId,
  amountUsd,
  onSuccess,
}: ManualPaymentFormProps) {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const payments = siteConfig.payments;
  const amountBdt = Math.round(amountUsd * (payments.usdToBdtRate ?? 110));

  const enabledMethods: PaymentMethod[] = [];
  if (payments.bkashEnabled) enabledMethods.push('BKASH');
  if (payments.nagadEnabled) enabledMethods.push('NAGAD');

  function handleSuccess(code: string) {
    setTrackingCode(code);
    onSuccess?.(code);
  }

  // Nothing enabled — should not be rendered, but handle gracefully
  if (!isLoading && enabledMethods.length === 0) {
    return (
      <p className="text-sm text-muted py-4 text-center">
        Manual payment options are currently unavailable. Please use a different
        payment method or contact support.
      </p>
    );
  }

  // Waiting screen after submission
  if (trackingCode) {
    return <WaitingScreen trackingCode={trackingCode} />;
  }

  // Single method — no tabs
  if (enabledMethods.length === 1) {
    const method = enabledMethods[0]!;
    const number =
      method === 'BKASH'
        ? (payments.bkashNumber ?? '')
        : (payments.nagadNumber ?? '');

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            {method === 'BKASH' ? 'bKash' : 'Nagad'}
          </Badge>
          <span className="text-xs text-muted">Mobile Banking</span>
        </div>
        <PaymentMethodPanel
          method={method}
          number={number}
          amountBdt={amountBdt}
          orderId={orderId}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  // Both methods — tabs
  return (
    <Tabs defaultValue="BKASH" className="w-full">
      <TabsList className="w-full mb-4">
        {enabledMethods.map((method) => (
          <TabsTrigger key={method} value={method} className="flex-1">
            {method === 'BKASH' ? 'bKash' : 'Nagad'}
          </TabsTrigger>
        ))}
      </TabsList>

      {enabledMethods.map((method) => {
        const number =
          method === 'BKASH'
            ? (payments.bkashNumber ?? '')
            : (payments.nagadNumber ?? '');

        return (
          <TabsContent key={method} value={method}>
            <PaymentMethodPanel
              method={method}
              number={number}
              amountBdt={amountBdt}
              orderId={orderId}
              onSuccess={handleSuccess}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}