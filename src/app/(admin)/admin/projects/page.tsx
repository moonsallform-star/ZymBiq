// =============================================================================
// Zymbiq — src/app/(admin)/admin/projects/page.tsx
// Admin project manager: server shell + client table with DnD, toggles, CRUD.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminProjectsClient from "./_components/admin-projects-client";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const projects = await prisma.project.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      faqs: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { orders: true },
      },
    },
  });

  // Serialize for client component — attach order count
  const projectsWithCount = projects.map((p) => ({
    ...p,
    orderCount: p._count.orders,
    _count: undefined,
  }));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold font-heading text-foreground">
          Projects
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your showroom projects — reorder, toggle visibility, and edit
          details.
        </p>
      </div>

      <AdminProjectsClient projects={projectsWithCount} />
    </div>
  );
}