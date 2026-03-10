// =============================================================================
// Zymbiq — src/app/(admin)/admin/clients/page.tsx
// Admin client manager: server shell + co-located client table with detail sheet.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminClientsClient from "./_components/admin-clients-client";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const clients = await prisma.user.findMany({
    where: { isAdmin: false },
    include: {
      orders: {
        select: {
          id: true,
          status: true,
          orderType: true,
          paymentStatus: true,
          createdAt: true,
          trackingCode: true,
          amountUsd: true,
          project: {
            select: { title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        select: {
          id: true,
          content: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client component
  const serialized = clients.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    emailVerified: c.emailVerified?.toISOString() ?? null,
    orders: c.orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
    messages: c.messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-heading font-semibold tracking-tight"
          style={{ color: "var(--zymbiq-text)" }}
        >
          Clients
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--zymbiq-muted)" }}>
          All registered clients and their order history.
        </p>
      </div>

      <AdminClientsClient clients={serialized} />
    </div>
  );
}