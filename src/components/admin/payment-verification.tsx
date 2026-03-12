// src/components/admin/payment-verification.tsx
"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Copy, Check, Clock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { QUERY_KEYS, PAYMENT_POLL_INTERVAL_MS } from "@/lib/constants";
import type { OrderWithDetails } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerifyPayload {
  action: "confirm" | "reject";
  note?: string;
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard helper
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently fail
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy transaction ID"
      className={cn(
        "ml-1.5 inline-flex h-6 w-6 items-center justify-center rounded",
        "text-[var(--zymbiq-muted)] transition-colors",
        "hover:text-[var(--zymbiq-text)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zymbiq-accent)]"
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--zymbiq-success,#10B981)]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Payment method badge
// ---------------------------------------------------------------------------

function PaymentMethodBadge({ method }: { method: string }) {
  if (method === "BKASH") {
    return (
      <Badge
        className="border-transparent bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
      >
        bKash
      </Badge>
    );
  }
  if (method === "NAGAD") {
    return (
      <Badge
        className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      >
        Nagad
      </Badge>
    );
  }
  return <Badge variant="outline">{method}</Badge>;
}

// ---------------------------------------------------------------------------
// Reject dialog
// ---------------------------------------------------------------------------

interface RejectDialogProps {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isPending: boolean;
}

function RejectDialog({ open, onClose, onConfirm, isPending }: RejectDialogProps) {
  const [note, setNote] = React.useState("");

  function handleSubmit() {
    onConfirm(note.trim());
  }

  // Reset note when dialog closes
  React.useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Payment</DialogTitle>
          <DialogDescription>
            Optionally provide a reason. The client will receive an email notification.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for rejection (optional)…"
          className="min-h-[64px]"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Rejecting…" : "Reject Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Single order card
// ---------------------------------------------------------------------------

interface OrderCardProps {
  order: OrderWithDetails;
}

function OrderCard({ order }: OrderCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);

  const isConfirmed = order.paymentStatus === "PAID";
  const isFailed = order.paymentStatus === "FAILED";
  const clientName = order.user?.name ?? order.guestName ?? "Unknown Client";

  // ---- Verify mutation ----
  const { mutate: verify, isPending } = useMutation({
    mutationFn: async (payload: VerifyPayload) => {
      const res = await fetch(`/api/payments/manual/${order.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Verification failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders() });
      toast({
        title: variables.action === "confirm" ? "Payment confirmed" : "Payment rejected",
        description:
          variables.action === "confirm"
            ? `Order for ${clientName} has been confirmed and moved to In Discussion.`
            : `Order for ${clientName} has been rejected.`,
        variant: variables.action === "confirm" ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function handleConfirm() {
    verify({ action: "confirm" });
  }

  function handleReject(note: string) {
    verify({ action: "reject", note: note || undefined });
    setRejectDialogOpen(false);
  }

  return (
    <>
      <Card
        className={cn(
          "transition-shadow",
          isConfirmed && "opacity-70",
          isFailed && "opacity-60"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Client info + method */}
            <div className="flex flex-col gap-1 min-w-0">
              <CardTitle className="text-base truncate">{clientName}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <PaymentMethodBadge method={order.paymentMethod} />
                {isConfirmed && (
                  <Badge
                    className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Confirmed
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Rejected
                  </Badge>
                )}
                {!isConfirmed && !isFailed && (
                  <Badge
                    className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-[var(--zymbiq-text)]">
                {formatCurrency(order.amountBdt ?? null, "BDT")}
              </p>
              {order.amountUsd !== null && order.amountUsd !== undefined && (
                <p className="text-xs text-[var(--zymbiq-muted)]">
                  ≈ {formatCurrency(order.amountUsd, "USD")}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Transaction ID */}
          {order.manualTxId && (
            <div>
              <p className="text-xs font-medium text-[var(--zymbiq-muted)] mb-1 uppercase tracking-wide">
                Transaction ID
              </p>
              <div className="flex items-center gap-1">
                <code className="rounded bg-[var(--zymbiq-border)]/40 px-2 py-1 text-sm font-mono text-[var(--zymbiq-text)] select-all">
                  {order.manualTxId}
                </code>
                <CopyButton text={order.manualTxId} />
              </div>
            </div>
          )}

          {/* Submission timestamp */}
          <div className="flex items-center justify-between text-xs text-[var(--zymbiq-muted)]">
            <span>Submitted {formatDate(order.updatedAt, "MMM d, yyyy 'at' h:mm a")}</span>
            {order.user?.email && (
              <span className="truncate max-w-[200px] text-right">{order.user.email}</span>
            )}
            {!order.user?.email && order.guestEmail && (
              <span className="truncate max-w-[200px] text-right">{order.guestEmail}</span>
            )}
          </div>

          {/* Actions */}
          {!isConfirmed && !isFailed && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 sm:flex-none gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                {isPending ? "Processing…" : "Confirm"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isPending}
                className="flex-1 sm:flex-none gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RejectDialog
        open={rejectDialogOpen}
        orderId={order.id}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleReject}
        isPending={isPending}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PaymentVerification() {
  const { data, isLoading, isError } = useQuery<{ data: OrderWithDetails[] }>({
    queryKey: QUERY_KEYS.payments("PENDING_MANUAL_VERIFICATION"),
    queryFn: async () => {
      const res = await fetch(
        "/api/orders?paymentStatus=PENDING_MANUAL_VERIFICATION",
        { cache: "no-store" }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to load pending payments");
      }
      return res.json() as Promise<{ data: OrderWithDetails[] }>;
    },
    refetchInterval: PAYMENT_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const orders = data?.data ?? [];
  const pendingOrders = orders.filter(
    (o) => o.paymentStatus === "PENDING_MANUAL_VERIFICATION"
  );
  const otherOrders = orders.filter(
    (o) => o.paymentStatus !== "PENDING_MANUAL_VERIFICATION"
  );

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 rounded-[var(--zymbiq-radius)] bg-[var(--zymbiq-border)]/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ---- Error state ----
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-[var(--zymbiq-muted)]" />
        <p className="text-sm text-[var(--zymbiq-muted)]">
          Could not load pending payments. Please refresh.
        </p>
      </div>
    );
  }

  // ---- Empty state ----
  if (pendingOrders.length === 0 && otherOrders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle className="h-8 w-8 text-[var(--zymbiq-muted)]" />
        <p className="font-medium text-[var(--zymbiq-text)]">All clear</p>
        <p className="text-sm text-[var(--zymbiq-muted)]">
          No manual payments pending verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending section */}
      {pendingOrders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-[var(--zymbiq-text)]">
              Awaiting Verification
            </h2>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {pendingOrders.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {/* Recently processed section */}
      {otherOrders.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[var(--zymbiq-muted)] mb-4">
            Recently Processed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}