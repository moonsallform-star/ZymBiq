// =============================================================================
// Zymbiq — src/app/(admin)/admin/payments/page.tsx
// Admin manual payment verification shell — server-side pending count badge
// + PaymentVerification client component for all interactive actions.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentVerification from "@/components/admin/payment-verification";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manual Payment Verification — Admin",
};

export default async function AdminPaymentsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const pendingCount = await prisma.order.count({
    where: { paymentStatus: "PENDING_MANUAL_VERIFICATION" },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--zymbiq-text)]">
          Manual Payment Verification
        </h1>
        {pendingCount > 0 && (
          <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 tabular-nums">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Client component owns data fetching, polling, and actions */}
      <PaymentVerification />
    </div>
  );
}