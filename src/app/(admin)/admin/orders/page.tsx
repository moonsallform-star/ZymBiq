// =============================================================================
// Zymbiq — src/app/(admin)/admin/orders/page.tsx
// Admin orders page shell — renders the drag-and-drop Kanban board.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OrderKanban from "@/components/orders/order-kanban";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Page heading */}
      <div className="px-6 py-6 shrink-0">
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Order Management
        </h1>
        <p className="text-sm text-muted mt-1">
          Drag orders between columns to update their status.
        </p>
      </div>

      {/* Kanban board — horizontally scrollable on mobile */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6 min-h-0">
        <OrderKanban />
      </div>
    </div>
  );
}