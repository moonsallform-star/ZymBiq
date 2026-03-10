"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import type { OrderWithDetails } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderKanbanCardProps {
  order: OrderWithDetails;
}

interface BriefMessage {
  role: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeadlineClass(deadline: Date | null): string | null {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diff = dl - now;
  if (diff < 0) return "text-red-500";
  if (diff < 48 * 60 * 60 * 1000) return "text-amber-500";
  return "text-[var(--zymbiq-muted)]";
}

function getPaymentBadgeVariant(
  status: string
): "success" | "warning" | "accent" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "warning";
    case "PENDING_MANUAL_VERIFICATION":
      return "accent";
    case "FAILED":
      return "destructive";
    default:
      return "outline";
  }
}

function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PENDING_MANUAL_VERIFICATION":
      return "Verifying";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

function parseBriefMessages(raw: unknown): BriefMessage[] {
  try {
    if (Array.isArray(raw)) {
      return raw as BriefMessage[];
    }
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as BriefMessage[]) : [];
    }
  } catch {
    // fall through
  }
  return [];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--zymbiq-muted)] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-[var(--zymbiq-text)]">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--zymbiq-muted)] mb-3">
      {children}
    </h3>
  );
}

interface AiBriefProps {
  brief: unknown;
  clientInitial: string;
}

function AiBrief({ brief, clientInitial }: AiBriefProps) {
  const messages = parseBriefMessages(brief);

  if (messages.length === 0) {
    return (
      <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words bg-[var(--zymbiq-bg)] border border-[var(--zymbiq-border)] rounded-[var(--zymbiq-radius)] p-3 text-[var(--zymbiq-text)] font-mono max-h-64 overflow-y-auto">
        {JSON.stringify(brief, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
      {messages.map((msg, i) => {
        const isAssistant = msg.role === "assistant";
        return (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              isAssistant ? "justify-end" : "justify-start"
            )}
          >
            {/* Client avatar */}
            {!isAssistant && (
              <div className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-[var(--zymbiq-primary)]/10 border border-[var(--zymbiq-border)] flex items-center justify-center">
                <span className="text-[9px] font-bold text-[var(--zymbiq-text)]">
                  {clientInitial}
                </span>
              </div>
            )}

            {/* Bubble */}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                isAssistant
                  ? "rounded-tr-sm bg-[var(--zymbiq-accent)] text-white"
                  : "rounded-tl-sm bg-[var(--zymbiq-bg)] border border-[var(--zymbiq-border)] text-[var(--zymbiq-text)]"
              )}
            >
              {msg.content}
            </div>

            {/* AI avatar */}
            {isAssistant && (
              <div className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-[var(--zymbiq-accent)]/15 border border-[var(--zymbiq-border)] flex items-center justify-center">
                <span className="text-[9px] font-bold text-[var(--zymbiq-accent)]">
                  AI
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrderKanbanCard({ order }: OrderKanbanCardProps) {
  const [open, setOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [movingStatus, setMovingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [localMessages, setLocalMessages] = useState(order.messages ?? []);
  const [localDeliverables, setLocalDeliverables] = useState(order.deliverables ?? []);
  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [savingDeliverable, setSavingDeliverable] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ label: "", url: "", status: "ready" });

  // Build phase
  const BUILD_PHASES = [
    { value: 'generating_files', label: '⚙️ Generating Files', description: 'AI-assisted file generation in progress' },
    { value: 'fixing_bugs', label: '🐛 Fixing Bugs', description: 'Resolving errors and issues' },
    { value: 'testing', label: '🧪 End-to-End Testing', description: 'Manually testing all flows' },
    { value: 'ready_for_review', label: '✅ Ready for Review', description: 'Build complete, ready for client review' },
  ] as const;

  type BuildPhaseValue = typeof BUILD_PHASES[number]['value'];

  const [buildPhase, setBuildPhase] = useState<string>((order as unknown as { buildPhase?: string | null }).buildPhase ?? '');
  const [savingBuildPhase, setSavingBuildPhase] = useState(false);
  const [buildPhaseSaved, setBuildPhaseSaved] = useState(false);

  // DevForge linking
  const [devforgeProjectId, setDevforgeProjectId] = useState(order.devforgeProjectId ?? '');
  const [devforgeProjects, setDevforgeProjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loadingDevforgeProjects, setLoadingDevforgeProjects] = useState(false);
  const [savingDevforgeLink, setSavingDevforgeLink] = useState(false);
  const [devforgeLinkSaved, setDevforgeLinkSaved] = useState(false);

  const clientName =
    order.user?.name ?? order.guestName ?? "Unknown Client";
  const clientInitial = clientName.charAt(0).toUpperCase();
  const isGuest = !order.user;
  const deadlineClass = getDeadlineClass(order.deadline ?? null);

  // ── Deliverable management ───────────────────────────────────────────────

  const fetchDevforgeProjects = useCallback(async () => {
    if (devforgeProjects.length > 0) return;
    setLoadingDevforgeProjects(true);
    try {
      const res = await fetch('/api/devforge/projects');
      if (res.ok) {
        const json = await res.json() as { projects: { id: string; name: string; status: string }[] };
        setDevforgeProjects(json.projects ?? []);
      }
    } catch {
      // Silent
    } finally {
      setLoadingDevforgeProjects(false);
    }
  }, [devforgeProjects.length]);

  const handleSaveBuildPhase = useCallback(async (phase: string) => {
    setSavingBuildPhase(true);
    setBuildPhase(phase);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildPhase: phase || null }),
      });
      if (res.ok) {
        setBuildPhaseSaved(true);
        setTimeout(() => setBuildPhaseSaved(false), 3000);
      }
    } catch {
      // Silent
    } finally {
      setSavingBuildPhase(false);
    }
  }, [order.id]);

  const handleSaveDevforgeLink = useCallback(async () => {
    setSavingDevforgeLink(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devforgeProjectId: devforgeProjectId || null }),
      });
      if (res.ok) {
        setDevforgeLinkSaved(true);
        setTimeout(() => setDevforgeLinkSaved(false), 3000);
      }
    } catch {
      // Silent
    } finally {
      setSavingDevforgeLink(false);
    }
  }, [devforgeProjectId, order.id]);

  const handleAddDeliverable = useCallback(async () => {
    if (!newDeliverable.label.trim()) return;
    setSavingDeliverable(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeliverable),
      });
      if (res.ok) {
        const json = await res.json();
        setLocalDeliverables((prev) => [...prev, json.data]);
        setNewDeliverable({ label: "", url: "", status: "ready" });
        setAddingDeliverable(false);
      }
    } catch {
      // Silent
    } finally {
      setSavingDeliverable(false);
    }
  }, [newDeliverable, order.id]);

  const handleDeleteDeliverable = useCallback(async (deliverableId: string) => {
    if (!confirm("Delete this deliverable?")) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/deliverables`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId }),
      });
      if (res.ok) {
        setLocalDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));
      }
    } catch {
      // Silent
    }
  }, [order.id]);

  // ── Send reply ───────────────────────────────────────────────────────────

  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text) return;
    setSendingReply(true);
    try {
      // Reuse the existing thread's threadId so the reply appears in the
      // same conversation the user sees. Fall back to a stable
      // order-scoped threadId only if no messages exist yet.
      const threadId =
        localMessages[0]?.threadId ?? `order-${order.id}`;
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, threadId, orderId: order.id }),
      });
      if (res.ok) {
        const json = await res.json();
        setLocalMessages((prev) => [...prev, json.data]);
        setReplyText("");
      }
    } catch {
      // Silent
    } finally {
      setSendingReply(false);
    }
  }, [replyText, localMessages, order.id]);

  // ── Move order status ────────────────────────────────────────────────────

  const handleMoveStatus = useCallback(
    async (newStatus: string) => {
      if (newStatus === currentStatus) return;
      setMovingStatus(true);
      setStatusError(null);
      try {
        const res = await fetch(`/api/orders/${order.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          setCurrentStatus(newStatus as typeof currentStatus);
        } else {
          const json = await res.json().catch(() => ({}));
          setStatusError(
            (json as { error?: string }).error ?? "Failed to update status"
          );
        }
      } catch {
        setStatusError("Network error — please try again");
      } finally {
        setMovingStatus(false);
      }
    },
    [currentStatus, order.id]
  );

  // ── Admin notes auto-save on blur ────────────────────────────────────────

  const handleNotesSave = useCallback(async () => {
    if (adminNotes === (order.adminNotes ?? "")) return;
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
    } catch {
      // Silent — non-critical
    } finally {
      setSaving(false);
    }
  }, [adminNotes, order.adminNotes, order.id]);

  // ── Mark messages as read ────────────────────────────────────────────────

  const unreadMessages = localMessages.filter(
    (m) => !m.isAdmin && !m.isRead
  );

  const handleMarkRead = useCallback(async () => {
    if (unreadMessages.length === 0) return;
    setMarkingRead(true);
    try {
      await fetch(`/api/messages/${(order.messages ?? [])[0]?.threadId}`, {
        method: "PATCH",
      });
    } catch {
      // Silent
    } finally {
      setMarkingRead(false);
    }
  }, [unreadMessages, order.messages]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Kanban tile                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={cn(
          "bg-[var(--zymbiq-surface)] border border-[var(--zymbiq-border)]",
          "rounded-[var(--zymbiq-radius)] p-3",
          "cursor-pointer hover:shadow-sm transition-shadow duration-150",
          "select-none focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[var(--zymbiq-accent)]"
        )}
      >
        {/* Top row: client name + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-[var(--zymbiq-text)] leading-tight line-clamp-1">
            {clientName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {isGuest && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Guest
              </Badge>
            )}
            {unreadMessages.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-[var(--zymbiq-accent)] shrink-0" />
            )}
          </div>
        </div>

        {/* Order type */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-medium"
          >
            {order.orderType === "PREBUILT" ? "Pre-built" : "Custom"}
          </Badge>
          {order.project && (
            <span className="text-xs text-[var(--zymbiq-muted)] truncate max-w-[120px]">
              {order.project.title}
            </span>
          )}
        </div>

        {/* Deadline + payment status */}
        <div className="flex items-center justify-between gap-2">
          {order.deadline ? (
            <span className={cn("text-xs", deadlineClass)}>
              {formatDate(order.deadline, "MMM d")}
            </span>
          ) : (
            <span />
          )}
          <Badge
            variant={getPaymentBadgeVariant(order.paymentStatus)}
            className="text-[10px] px-1.5 py-0"
          >
            {getPaymentStatusLabel(order.paymentStatus)}
          </Badge>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Detail sheet                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0"
        >
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--zymbiq-border)] shrink-0">
            <div className="flex items-center gap-2 flex-wrap pr-8">
              <SheetTitle>{clientName}</SheetTitle>
              {isGuest && (
                <Badge variant="outline" className="text-xs">
                  Guest
                </Badge>
              )}
              <Badge variant="outline" className="text-xs ml-auto">
                {order.orderType === "PREBUILT" ? "Pre-built" : "Custom"}
              </Badge>
            </div>
            <SheetDescription>
              Order #{order.trackingCode}
              {order.createdAt
                ? ` · Created ${formatDate(order.createdAt)}`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

            {/* ── Client info ── */}
            <section>
              <SectionHeading>Client</SectionHeading>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Name" value={clientName} />
                <InfoRow
                  label="Email"
                  value={order.user?.email ?? order.guestEmail ?? "—"}
                />
                {order.guestPhone && (
                  <InfoRow label="Phone" value={order.guestPhone} />
                )}
                {order.user && (
                  <InfoRow
                    label="Account"
                    value={
                      <span className="text-xs font-mono text-[var(--zymbiq-muted)]">
                        {order.user.id}
                      </span>
                    }
                  />
                )}
              </div>
            </section>

            {/* ── Order Details ── */}
            <section>
              <SectionHeading>Order Details</SectionHeading>
              <div className="grid grid-cols-2 gap-3">
                {order.project && (
                  <InfoRow label="Project" value={order.project.title} />
                )}
                <InfoRow label="Payment Method" value={order.paymentMethod} />
                <InfoRow
                  label="Payment Status"
                  value={
                    <Badge
                      variant={getPaymentBadgeVariant(order.paymentStatus)}
                      className="text-xs"
                    >
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </Badge>
                  }
                />
                {order.amountUsd != null && (
                  <InfoRow
                    label="Amount (USD)"
                    value={formatCurrency(order.amountUsd, "USD")}
                  />
                )}
                {order.amountBdt != null && (
                  <InfoRow
                    label="Amount (BDT)"
                    value={formatCurrency(order.amountBdt, "BDT")}
                  />
                )}
                {order.manualTxId && (
                  <InfoRow
                    label="Transaction ID"
                    value={
                      <span className="font-mono text-xs">
                        {order.manualTxId}
                      </span>
                    }
                  />
                )}
                {order.deadline && (
                  <InfoRow
                    label="Deadline"
                    value={
                      <span className={deadlineClass ?? undefined}>
                        {formatDate(order.deadline)}
                      </span>
                    }
                  />
                )}
                {order.estimatedTimeline && (
                  <InfoRow
                    label="Est. Timeline"
                    value={order.estimatedTimeline}
                  />
                )}
                {order.estimatedPrice != null && (
                  <InfoRow
                    label="Est. Price"
                    value={formatCurrency(order.estimatedPrice, "USD")}
                  />
                )}
              </div>
            </section>

            {/* ── AI Brief ── */}
            {order.customBrief && (
              <section>
                <SectionHeading>AI Brief</SectionHeading>
                <AiBrief
                  brief={order.customBrief}
                  clientInitial={clientInitial}
                />
              </section>
            )}

{/* ── DevForge Link ── */}
            {order.orderType === 'CUSTOM' && (
              <section>
                <SectionHeading>DevForge Project</SectionHeading>
                <div className="flex flex-col gap-2">
                  <select
                    value={devforgeProjectId}
                    onFocus={() => void fetchDevforgeProjects()}
                    onChange={(e) => setDevforgeProjectId(e.target.value)}
                    className="w-full rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)] bg-[var(--zymbiq-bg)] px-3 py-2 text-sm text-[var(--zymbiq-text)] focus:outline-none focus:ring-1 focus:ring-[var(--zymbiq-accent)]"
                  >
                    <option value="">— Not linked —</option>
                    {loadingDevforgeProjects && (
                      <option disabled>Loading projects…</option>
                    )}
                    {devforgeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => void handleSaveDevforgeLink()}
                      disabled={savingDevforgeLink}
                    >
                      {savingDevforgeLink ? 'Saving…' : 'Save Link'}
                    </Button>
                    {devforgeLinkSaved && (
                      <span className="text-xs text-green-500">✓ Saved</span>
                    )}
                    {devforgeProjectId && (
                      <span className="text-xs text-[var(--zymbiq-muted)] font-mono truncate">
                        {devforgeProjectId}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ── Build Phase ── */}
            {currentStatus === 'BUILDING' && (
              <section>
                <SectionHeading>Build Phase</SectionHeading>
                <div className="flex flex-col gap-2">
                  {([
                    { value: 'generating_files', label: '⚙️ Generating Files', description: 'AI-assisted file generation in progress' },
                    { value: 'fixing_bugs', label: '🐛 Fixing Bugs', description: 'Resolving errors and issues' },
                    { value: 'testing', label: '🧪 End-to-End Testing', description: 'Manually testing all flows' },
                    { value: 'ready_for_review', label: '✅ Ready for Review', description: 'Build complete, awaiting client review' },
                  ] as const).map((phase) => {
                    const isActive = buildPhase === phase.value;
                    return (
                      <button
                        key={phase.value}
                        disabled={savingBuildPhase}
                        onClick={() => void handleSaveBuildPhase(phase.value)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-[var(--zymbiq-radius)] border text-sm transition-colors',
                          isActive
                            ? 'border-[var(--zymbiq-accent)] bg-[var(--zymbiq-accent)]/10 text-[var(--zymbiq-accent)]'
                            : 'border-[var(--zymbiq-border)] bg-transparent text-[var(--zymbiq-text)] hover:border-[var(--zymbiq-accent)]/50'
                        )}
                      >
                        <div className="font-medium">{phase.label}</div>
                        <div className="text-xs mt-0.5 opacity-70">{phase.description}</div>
                      </button>
                    );
                  })}
                  {buildPhaseSaved && (
                    <span className="text-xs text-green-500">✓ Phase updated</span>
                  )}
                </div>
              </section>
            )}

            {/* ── Deliverables ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeading>Deliverables</SectionHeading>
                <button
                  onClick={() => setAddingDeliverable((v) => !v)}
                  className="text-xs text-[var(--zymbiq-accent)] hover:underline"
                >
                  {addingDeliverable ? "Cancel" : "+ Add"}
                </button>
              </div>

              {addingDeliverable && (
                <div className="mb-3 flex flex-col gap-2 p-3 rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)] bg-[var(--zymbiq-bg)]">
                  <input
                    type="text"
                    placeholder="Label (e.g. Staging URL, Source Files)"
                    value={newDeliverable.label}
                    onChange={(e) =>
                      setNewDeliverable((p) => ({ ...p, label: e.target.value }))
                    }
                    className="w-full rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--zymbiq-text)] placeholder:text-[var(--zymbiq-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--zymbiq-accent)]"
                  />
                  <input
                    type="text"
                    placeholder="URL (optional)"
                    value={newDeliverable.url}
                    onChange={(e) =>
                      setNewDeliverable((p) => ({ ...p, url: e.target.value }))
                    }
                    className="w-full rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--zymbiq-text)] placeholder:text-[var(--zymbiq-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--zymbiq-accent)]"
                  />
                  <select
                    value={newDeliverable.status}
                    onChange={(e) =>
                      setNewDeliverable((p) => ({ ...p, status: e.target.value }))
                    }
                    className="w-full rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)] bg-[var(--zymbiq-bg)] px-3 py-1.5 text-sm text-[var(--zymbiq-text)] focus:outline-none focus:ring-1 focus:ring-[var(--zymbiq-accent)]"
                  >
                    <option value="pending">Pending</option>
                    <option value="ready">Ready for Review</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleAddDeliverable}
                    disabled={savingDeliverable || !newDeliverable.label.trim()}
                  >
                    {savingDeliverable ? "Adding…" : "Add Deliverable"}
                  </Button>
                </div>
              )}

              {localDeliverables.length === 0 && !addingDeliverable && (
                <p className="text-sm text-[var(--zymbiq-muted)]">No deliverables yet.</p>
              )}

              <ul className="space-y-2">
                {localDeliverables.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 text-sm p-2 rounded-[var(--zymbiq-radius)] border border-[var(--zymbiq-border)]"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[var(--zymbiq-text)] truncate">{d.label}</span>
                      {d.url && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--zymbiq-accent)] underline underline-offset-2 hover:no-underline truncate"
                        >
                          {d.url}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          d.status === "delivered"
                            ? "success"
                            : d.status === "ready"
                            ? "accent"
                            : "outline"
                        }
                        className="text-xs capitalize"
                      >
                        {d.status}
                      </Badge>
                      <button
                        onClick={() => handleDeleteDeliverable(d.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── Messages ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeading>Messages</SectionHeading>
                {unreadMessages.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={handleMarkRead}
                    disabled={markingRead}
                  >
                    {markingRead
                      ? "Marking…"
                      : `Mark ${unreadMessages.length} read`}
                  </Button>
                )}
              </div>

              {localMessages.length === 0 ? (
                <p className="text-sm text-[var(--zymbiq-muted)]">
                  No messages yet.
                </p>
              ) : (
                <ul className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {localMessages.map((msg) => (
                    <li
                      key={msg.id}
                      className={cn(
                        "flex flex-col gap-0.5 text-sm p-2.5 rounded-[var(--zymbiq-radius)]",
                        msg.isAdmin
                          ? "bg-[var(--zymbiq-accent)]/10 text-right items-end"
                          : "bg-[var(--zymbiq-bg)] items-start",
                        !msg.isRead && !msg.isAdmin
                          ? "border-l-2 border-[var(--zymbiq-accent)]"
                          : ""
                      )}
                    >
                      <span className="text-xs text-[var(--zymbiq-muted)]">
                        {msg.isAdmin
                          ? "You (Admin)"
                          : (msg.user?.name ?? clientName)}{" "}
                        · {formatDate(msg.createdAt, "MMM d, HH:mm")}
                      </span>
                      <span className="text-[var(--zymbiq-text)] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Reply box */}
              <div className="mt-3 flex flex-col gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleSendReply();
                    }
                  }}
                  placeholder="Type a reply… (Ctrl+Enter to send)"
                  rows={3}
                  className="resize-none text-sm"
                  disabled={sendingReply}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--zymbiq-muted)]">
                    Client will see this in their dashboard
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? "Sending…" : "Send Reply"}
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Move Order ── */}
            <section>
              <SectionHeading>Move Order</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { status: "NEW", label: "New" },
                    { status: "IN_DISCUSSION", label: "In Discussion" },
                    { status: "BUILDING", label: "Building" },
                    { status: "REVIEW", label: "Review" },
                    { status: "DELIVERED", label: "Delivered" },
                    { status: "CANCELLED", label: "Cancelled" },
                  ] as { status: string; label: string }[]
                ).map((col) => {
                  const isCurrent = currentStatus === col.status;
                  const isBlocked =
                    col.status === "DELIVERED" &&
                    order.paymentStatus !== "PAID";
                  return (
                    <button
                      key={col.status}
                      disabled={isCurrent || movingStatus || isBlocked}
                      title={
                        isBlocked
                          ? "Payment must be confirmed before marking as Delivered"
                          : undefined
                      }
                      onClick={() => handleMoveStatus(col.status)}
                      className={cn(
                        "px-3 py-1.5 rounded-[var(--zymbiq-radius)] text-xs font-medium border transition-colors duration-150",
                        isCurrent
                          ? "bg-[var(--zymbiq-accent)] text-white border-[var(--zymbiq-accent)] cursor-default"
                          : isBlocked
                          ? "bg-transparent text-[var(--zymbiq-muted)] border-[var(--zymbiq-border)] opacity-40 cursor-not-allowed"
                          : "bg-transparent text-[var(--zymbiq-text)] border-[var(--zymbiq-border)] hover:border-[var(--zymbiq-accent)] hover:text-[var(--zymbiq-accent)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      )}
                    >
                      {isCurrent ? `● ${col.label}` : col.label}
                    </button>
                  );
                })}
              </div>
              {movingStatus && (
                <p className="text-xs text-[var(--zymbiq-muted)] mt-1">
                  Updating status…
                </p>
              )}
              {statusError && (
                <p className="text-xs text-red-500 mt-1">{statusError}</p>
              )}
            </section>

            {/* ── Admin Notes ── */}
            <section>
              <SectionHeading>Admin Notes</SectionHeading>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                onBlur={handleNotesSave}
                placeholder="Private notes visible only to you…"
                rows={4}
                className="resize-y text-sm"
              />
              {saving && (
                <p className="text-xs text-[var(--zymbiq-muted)] mt-1">
                  Saving…
                </p>
              )}
            </section>

          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}