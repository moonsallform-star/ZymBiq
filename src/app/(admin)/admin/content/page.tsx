// =============================================================================
// Zymbiq — src/app/(admin)/admin/content/page.tsx
// Admin content management page shell — renders ContentEditor client component.
// =============================================================================

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContentEditor from "@/components/admin/content-editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content Management — Zymbiq Admin",
};

export default async function AdminContentPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Content Management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Edit all site text — hero, trust strip, process steps, about, footer,
          testimonials, and FAQ.
        </p>
      </div>

      <ContentEditor />
    </div>
  );
}