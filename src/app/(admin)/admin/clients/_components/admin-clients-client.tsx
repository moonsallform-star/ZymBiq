// =============================================================================
// Zymbiq — src/app/(admin)/admin/clients/_components/admin-clients-client.tsx
// Client: sortable table of clients, detail sheet with orders, messages, notes.
// =============================================================================

"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import {
  User,
  Mail,
  ShoppingBag,
  MessageSquare,
  StickyNote,
  ExternalLink,
  Loader2,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientOrder {
  id: string;
  status: string;
  orderType: string;
  paymentStatus: string;
  createdAt: string;
  trackingCode: string;
  amountUsd: number | null;
  project: { title: string } | null;
}

interface ClientMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
}

interface ClientRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  orders: ClientOrder[];
  messages: ClientMessage[];
}

interface AdminClientsClientProps {
  clients: ClientRow[];
}

// ---------------------------------------------------------------------------
// Status pill helpers
// ---------------------------------------------------------------------------

const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  IN_DISCUSSION: "bg-purple-100 text-purple-800",
  BUILDING: "bg-amber-100 text-amber-800",
  REVIEW: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  PENDING_MANUAL_VERIFICATION: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
};

function StatusPill({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Notes auto-save field
// ---------------------------------------------------------------------------

function NotesField({ clientId }: { clientId: string }) {
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Fetch existing notes on mount
  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/clients/${clientId}/notes`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.notes !== undefined) {
          setNotes(data.notes ?? "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleBlur = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await fetch(`/api/admin/clients/${clientId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent — notes are best-effort
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="h-24 rounded-md animate-pulse"
        style={{ background: "var(--zymbiq-border)" }}
      />
    );
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Private notes about this client…"
        className="min-h-[96px] text-sm resize-y"
      />
      <p className="text-xs h-4" style={{ color: "var(--zymbiq-muted)" }}>
        {saving && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {saved && "Saved."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

function ClientDetailSheet({
  client,
  open,
  onOpenChange,
}: {
  client: ClientRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!client) return null;

  const initials = getInitials(client.name ?? client.email);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <div className="flex items-center gap-3 pr-8">
            {/* Avatar */}
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{
                background: "var(--zymbiq-accent)",
                color: "#fff",
              }}
            >
              {initials || <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">
                {client.name ?? "Unnamed Client"}
              </SheetTitle>
              <SheetDescription className="truncate">
                {client.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6 pt-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span style={{ color: "var(--zymbiq-muted)" }}>
              Registered{" "}
              <span style={{ color: "var(--zymbiq-text)" }}>
                {formatDate(client.createdAt)}
              </span>
            </span>
            <span style={{ color: "var(--zymbiq-muted)" }}>
              Orders{" "}
              <span style={{ color: "var(--zymbiq-text)" }}>
                {client.orders.length}
              </span>
            </span>
          </div>

          <hr style={{ borderColor: "var(--zymbiq-border)" }} />

          {/* Orders */}
          <section>
            <h3
              className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: "var(--zymbiq-muted)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Order History
            </h3>

            {client.orders.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--zymbiq-muted)" }}>
                No orders yet.
              </p>
            ) : (
              <div className="space-y-2">
                {client.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start justify-between gap-3 rounded-md p-3 text-sm"
                    style={{
                      background: "var(--zymbiq-bg)",
                      border: "1px solid var(--zymbiq-border)",
                    }}
                  >
                    <div className="min-w-0 space-y-1">
                      <p
                        className="font-medium truncate"
                        style={{ color: "var(--zymbiq-text)" }}
                      >
                        {order.project?.title ??
                          (order.orderType === "CUSTOM"
                            ? "Custom Order"
                            : "Pre-built Order")}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          label={order.status}
                          colorClass={
                            ORDER_STATUS_COLORS[order.status] ??
                            "bg-gray-100 text-gray-700"
                          }
                        />
                        <StatusPill
                          label={order.paymentStatus}
                          colorClass={
                            PAYMENT_STATUS_COLORS[order.paymentStatus] ??
                            "bg-gray-100 text-gray-700"
                          }
                        />
                        {order.amountUsd !== null && (
                          <span style={{ color: "var(--zymbiq-muted)" }}>
                            {formatCurrency(order.amountUsd)}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs"
                        style={{ color: "var(--zymbiq-muted)" }}
                      >
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <a
                      href={`/track/${order.trackingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded transition-colors hover:opacity-70"
                      style={{ color: "var(--zymbiq-accent)" }}
                      title="View order tracker"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          <hr style={{ borderColor: "var(--zymbiq-border)" }} />

          {/* Recent messages */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--zymbiq-muted)" }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Recent Messages
              </h3>
              <a
                href="/admin/messages"
                className="text-xs flex items-center gap-0.5 hover:underline"
                style={{ color: "var(--zymbiq-accent)" }}
              >
                All messages
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>

            {client.messages.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--zymbiq-muted)" }}>
                No messages yet.
              </p>
            ) : (
              <div className="space-y-2">
                {client.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm max-w-[90%]",
                      msg.isAdmin ? "ml-auto text-right" : "mr-auto"
                    )}
                    style={{
                      background: msg.isAdmin
                        ? "var(--zymbiq-accent)"
                        : "var(--zymbiq-bg)",
                      color: msg.isAdmin ? "#fff" : "var(--zymbiq-text)",
                      border: msg.isAdmin
                        ? "none"
                        : "1px solid var(--zymbiq-border)",
                    }}
                  >
                    <p className="leading-snug">{msg.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        msg.isAdmin ? "opacity-70" : ""
                      )}
                      style={
                        msg.isAdmin
                          ? {}
                          : { color: "var(--zymbiq-muted)" }
                      }
                    >
                      {formatDate(msg.createdAt, "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <hr style={{ borderColor: "var(--zymbiq-border)" }} />

          {/* Notes */}
          <section>
            <h3
              className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: "var(--zymbiq-muted)" }}
            >
              <StickyNote className="h-3.5 w-3.5" />
              Private Notes
            </h3>
            <NotesField clientId={client.id} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminClientsClient({
  clients,
}: AdminClientsClientProps) {
  const [selectedClient, setSelectedClient] =
    React.useState<ClientRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  function openClient(client: ClientRow) {
    setSelectedClient(client);
    setSheetOpen(true);
  }

  function handleSheetChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      // Small delay so the sheet closes before clearing content
      setTimeout(() => setSelectedClient(null), 300);
    }
  }

  if (clients.length === 0) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{
          borderColor: "var(--zymbiq-border)",
          background: "var(--zymbiq-surface)",
        }}
      >
        <User
          className="mx-auto h-10 w-10 mb-3 opacity-30"
          style={{ color: "var(--zymbiq-muted)" }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--zymbiq-text)" }}
        >
          No clients yet.
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--zymbiq-muted)" }}>
          Clients will appear here once they register.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--zymbiq-border)",
          background: "var(--zymbiq-surface)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left"
                style={{
                  borderColor: "var(--zymbiq-border)",
                  background: "var(--zymbiq-bg)",
                }}
              >
                {["Client", "Email", "Orders", "Last Order", "Registered", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-medium text-xs uppercase tracking-wide"
                      style={{ color: "var(--zymbiq-muted)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--zymbiq-border)" }}>
              {clients.map((client) => {
                const lastOrder = client.orders[0];

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-[var(--zymbiq-bg)] transition-colors cursor-pointer"
                    onClick={() => openClient(client)}
                  >
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{
                            background: "var(--zymbiq-accent)",
                            color: "#fff",
                          }}
                        >
                          {getInitials(client.name ?? client.email) || (
                            <User className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <span
                          className="font-medium truncate max-w-[140px]"
                          style={{ color: "var(--zymbiq-text)" }}
                        >
                          {client.name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td
                      className="px-4 py-3 truncate max-w-[200px]"
                      style={{ color: "var(--zymbiq-muted)" }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {client.email}
                      </span>
                    </td>

                    {/* Order count */}
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--zymbiq-text)" }}
                    >
                      {client.orders.length}
                    </td>

                    {/* Last order */}
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--zymbiq-muted)" }}
                    >
                      {lastOrder ? (
                        <div className="space-y-0.5">
                          <p>{formatDate(lastOrder.createdAt)}</p>
                          <StatusPill
                            label={lastOrder.status}
                            colorClass={
                              ORDER_STATUS_COLORS[lastOrder.status] ??
                              "bg-gray-100 text-gray-700"
                            }
                          />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Registered */}
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--zymbiq-muted)" }}
                    >
                      {formatDate(client.createdAt)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openClient(client);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail sheet */}
      <ClientDetailSheet
        client={selectedClient}
        open={sheetOpen}
        onOpenChange={handleSheetChange}
      />
    </>
  );
}