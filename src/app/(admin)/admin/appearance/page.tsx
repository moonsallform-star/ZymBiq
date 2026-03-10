// =============================================================================
// Zymbiq — src/app/(admin)/admin/appearance/page.tsx
// Admin appearance page shell — renders AppearanceEditor with full-height layout.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppearanceEditor from "@/components/admin/appearance-editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Appearance — Admin",
  description: "Customize colors, fonts, spacing, and branding.",
};

export default async function AdminAppearancePage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <AppearanceEditor />
    </div>
  );
}