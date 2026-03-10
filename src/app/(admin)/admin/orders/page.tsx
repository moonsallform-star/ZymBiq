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
    <div className="py-8 px-4">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Order Management
        </h1>
        <p className="text-sm text-muted mt-1">
          Drag orders between columns to update their status.
        </p>
      </div>

      {/* Kanban board — handles its own data fetching, DnD, and Realtime */}
      <OrderKanban />
    </div>
  );
}