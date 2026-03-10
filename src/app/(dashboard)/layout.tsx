// =============================================================================
// Zymbiq — src/app/(dashboard)/layout.tsx
// Auth-guarded dashboard shell: Header + fixed sidebar + mobile drawer
// + Realtime provider. Redirects unauthenticated users to /login.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Header from "@/components/layout/header";
import RealtimeProvider from "@/components/providers/realtime-provider";
import DashboardSidebar from "./_components/dashboard-sidebar";
import DashboardMobileNav from "./_components/dashboard-mobile-nav";

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// -----------------------------------------------------------------------------
// DashboardLayout — Server Component
// -----------------------------------------------------------------------------

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  // Unauthenticated — send to login with return URL
  if (!session?.user) {
    redirect("/login?returnUrl=/dashboard");
  }

  const userName  = session.user.name  ?? null;
  const userEmail = session.user.email ?? null;
  const userImage = session.user.image ?? null;

  return (
    <RealtimeProvider>
      {/* ── Fixed top header ── */}
      <Header />

      {/* ── Mobile slide-in drawer + hamburger trigger ── */}
      <DashboardMobileNav
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
      />

      {/* ── Fixed left sidebar (md+ only) ── */}
      <DashboardSidebar
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
      />

      {/* ── Main content area ──
          pt-16    → clears the fixed 64px header
          md:pl-60 → clears the fixed 240px sidebar on desktop
          pb-16    → clears the fixed bottom mobile nav bar
      ── */}
      <main className="min-h-screen pt-16 pb-16 md:pb-0 md:pl-60 bg-[var(--zymbiq-bg)] transition-all duration-200">
        {children}
      </main>
    </RealtimeProvider>
  );
}