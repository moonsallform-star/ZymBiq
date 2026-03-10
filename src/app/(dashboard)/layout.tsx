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
import MobileNav from "@/components/layout/mobile-nav";
import CommunicationHub from "@/components/layout/communication-hub";
import { Toaster } from "@/components/ui/toaster";

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
      {/* Forge canvas atmosphere — matches public layout */}
      <div className="forge-canvas pointer-events-none" aria-hidden="true">
        <div className="forge-line" style={{ top: '8%', left: '0', width: '45%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '5s', '--pulse-delay': '0s' } as React.CSSProperties} />
        </div>
        <div className="forge-line" style={{ top: '28%', left: '20%', width: '60%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '7s', '--pulse-delay': '0.8s' } as React.CSSProperties} />
        </div>
        <div className="forge-line" style={{ top: '55%', left: '60%', width: '40%' }}>
          <div className="forge-pulse-traveler reverse" style={{ '--pulse-duration': '5.5s', '--pulse-delay': '0.3s' } as React.CSSProperties} />
        </div>
        <div className="forge-line" style={{ top: '80%', left: '10%', width: '55%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '8s', '--pulse-delay': '1.5s' } as React.CSSProperties} />
        </div>
        <div className="forge-node forge-node-breathe" style={{ top: '8%', left: '45%', '--breathe-duration': '3s', '--breathe-delay': '0s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '28%', left: '80%', '--breathe-duration': '5s', '--breathe-delay': '0.4s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '55%', left: '60%', '--breathe-duration': '4.5s', '--breathe-delay': '0.6s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '15%', left: '8%', width: 28, height: 28, transform: 'rotate(20deg)', '--float-duration': '9s', '--float-delay': '0s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '60%', left: '92%', width: 18, height: 18, transform: 'rotate(45deg)', '--float-duration': '7s', '--float-delay': '2s' } as React.CSSProperties} />
        <div className="forge-h-streak" style={{ top: '35%', '--streak-duration': '9s', '--streak-delay': '0s' } as React.CSSProperties} />
        <div className="forge-h-streak" style={{ top: '70%', '--streak-duration': '11s', '--streak-delay': '3s' } as React.CSSProperties} />
        <div className="forge-v-streak" style={{ left: '50%', '--streak-duration': '12s', '--streak-delay': '2s' } as React.CSSProperties} />
      </div>

      <main className="relative z-10 min-h-screen pt-16 pb-20 md:pb-6 md:pl-60 bg-transparent transition-all duration-200">
        {children}
      </main>

      <MobileNav />
      <CommunicationHub />
      <Toaster />
    </RealtimeProvider>
  );
}