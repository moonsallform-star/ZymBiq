// =============================================================================
// Zymbiq — src/app/(public)/layout.tsx
// Public pages layout: Header, main content, Footer, MobileNav,
// CommunicationHub, and Toaster — wraps all routes in src/app/(public)/
// =============================================================================

import type { ReactNode } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import CommunicationHub from "@/components/layout/communication-hub";
import { Toaster } from "@/components/ui/toaster";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--zymbiq-bg)] relative">
      {/* ═══════════════════════════════════════════
          ZYMBIQ FORGE CANVAS
          Living circuit-board atmosphere — pure CSS
          Unique to this brand. No other site has this.
      ═══════════════════════════════════════════ */}
      <div className="forge-canvas" aria-hidden="true">

        {/* ── Deep base glow ── already handled by forge-canvas::before ── */}

        {/* ── Horizontal circuit lines across the full page ── */}

        {/* Line 1 — upper left region */}
        <div className="forge-line" style={{ top: '8%', left: '0', width: '45%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '5s', '--pulse-delay': '0s' } as React.CSSProperties} />
        </div>

        {/* Line 2 — upper right region */}
        <div className="forge-line" style={{ top: '12%', left: '55%', width: '45%' }}>
          <div className="forge-pulse-traveler reverse" style={{ '--pulse-duration': '6s', '--pulse-delay': '1.2s' } as React.CSSProperties} />
        </div>

        {/* Line 3 — mid-upper */}
        <div className="forge-line" style={{ top: '28%', left: '20%', width: '60%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '7s', '--pulse-delay': '0.8s' } as React.CSSProperties} />
        </div>

        {/* Line 4 — center */}
        <div className="forge-line" style={{ top: '48%', left: '5%', width: '35%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '4.5s', '--pulse-delay': '2s' } as React.CSSProperties} />
        </div>

        {/* Line 5 — center right */}
        <div className="forge-line" style={{ top: '52%', left: '60%', width: '40%' }}>
          <div className="forge-pulse-traveler reverse" style={{ '--pulse-duration': '5.5s', '--pulse-delay': '0.3s' } as React.CSSProperties} />
        </div>

        {/* Line 6 — lower */}
        <div className="forge-line" style={{ top: '72%', left: '10%', width: '55%' }}>
          <div className="forge-pulse-traveler" style={{ '--pulse-duration': '8s', '--pulse-delay': '1.5s' } as React.CSSProperties} />
        </div>

        {/* Line 7 — bottom */}
        <div className="forge-line" style={{ top: '88%', left: '40%', width: '50%' }}>
          <div className="forge-pulse-traveler reverse" style={{ '--pulse-duration': '6.5s', '--pulse-delay': '0.7s' } as React.CSSProperties} />
        </div>

        {/* ── Vertical circuit lines ── */}

        <div className="forge-line" style={{ top: '0', left: '18%', width: '1px', height: '40%', background: 'linear-gradient(180deg, transparent, var(--zymbiq-forge-line) 30%, var(--zymbiq-forge-streak) 50%, var(--zymbiq-forge-line) 80%, transparent)' }} />
        <div className="forge-line" style={{ top: '30%', left: '72%', width: '1px', height: '50%', background: 'linear-gradient(180deg, transparent, var(--zymbiq-forge-line) 30%, var(--zymbiq-forge-streak) 50%, var(--zymbiq-forge-line) 80%, transparent)' }} />
        <div className="forge-line" style={{ top: '10%', left: '88%', width: '1px', height: '35%', background: 'linear-gradient(180deg, transparent, var(--zymbiq-forge-line) 30%, var(--zymbiq-forge-streak) 50%, var(--zymbiq-forge-line) 80%, transparent)' }} />
        <div className="forge-line" style={{ top: '55%', left: '33%', width: '1px', height: '40%', background: 'linear-gradient(180deg, transparent, var(--zymbiq-forge-line) 30%, var(--zymbiq-forge-streak) 50%, var(--zymbiq-forge-line) 80%, transparent)' }} />

        {/* ── Circuit nodes (intersection points) ── */}

        <div className="forge-node forge-node-breathe" style={{ top: '8%', left: '45%', '--breathe-duration': '3s', '--breathe-delay': '0s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '12%', left: '55%', '--breathe-duration': '4s', '--breathe-delay': '0.8s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '28%', left: '20%', '--breathe-duration': '3.5s', '--breathe-delay': '1.2s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '28%', left: '80%', '--breathe-duration': '5s', '--breathe-delay': '0.4s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '48%', left: '40%', '--breathe-duration': '3.2s', '--breathe-delay': '1.8s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '52%', left: '60%', '--breathe-duration': '4.5s', '--breathe-delay': '0.6s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '72%', left: '65%', '--breathe-duration': '3.8s', '--breathe-delay': '2s' } as React.CSSProperties} />
        <div className="forge-node forge-node-breathe" style={{ top: '88%', left: '40%', '--breathe-duration': '4.2s', '--breathe-delay': '1s' } as React.CSSProperties} />

        {/* ── Floating angular fragments ── */}

        <div className="forge-fragment" style={{ top: '15%', left: '8%', width: 28, height: 28, transform: 'rotate(20deg)', '--float-duration': '9s', '--float-delay': '0s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '35%', left: '92%', width: 18, height: 18, transform: 'rotate(45deg)', '--float-duration': '7s', '--float-delay': '2s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '60%', left: '4%', width: 22, height: 22, transform: 'rotate(-15deg)', '--float-duration': '11s', '--float-delay': '1s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '78%', left: '88%', width: 14, height: 14, transform: 'rotate(30deg)', '--float-duration': '8s', '--float-delay': '3s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '20%', left: '65%', width: 10, height: 10, transform: 'rotate(60deg)', '--float-duration': '6s', '--float-delay': '0.5s' } as React.CSSProperties} />
        <div className="forge-fragment" style={{ top: '45%', left: '50%', width: 8, height: 8, transform: 'rotate(-30deg)', '--float-duration': '10s', '--float-delay': '1.5s' } as React.CSSProperties} />

        {/* ── Horizontal light streaks ── */}

        <div className="forge-h-streak" style={{ top: '22%', '--streak-duration': '8s', '--streak-delay': '0s' } as React.CSSProperties} />
        <div className="forge-h-streak" style={{ top: '55%', '--streak-duration': '11s', '--streak-delay': '3s' } as React.CSSProperties} />
        <div className="forge-h-streak" style={{ top: '80%', '--streak-duration': '9s', '--streak-delay': '1.5s' } as React.CSSProperties} />

        {/* ── Vertical light streaks ── */}

        <div className="forge-v-streak" style={{ left: '25%', '--streak-duration': '12s', '--streak-delay': '2s' } as React.CSSProperties} />
        <div className="forge-v-streak" style={{ left: '75%', '--streak-duration': '10s', '--streak-delay': '5s' } as React.CSSProperties} />
      </div>
      {/* Fixed top navigation — 64px (h-16) tall */}
      <div className="relative z-10 flex flex-col flex-1">
      <Header />

      {/*
        Main content area.
        pt-16 offsets the fixed header so content starts below it.
        flex-1 ensures the main grows to fill available vertical space,
        pushing the footer to the bottom on short pages.
        pb-16 md:pb-0 adds bottom padding on mobile so the last content
        item is not hidden behind the fixed bottom nav.
      */}
      <main className="flex-1 pt-16 pb-16 md:pb-0">
        {children}
      </main>

      {/*
        Footer.
        pb-16 md:pb-0 ensures footer content is not obscured by the
        mobile bottom nav bar (60px) on small screens.
      */}
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      {/*
        Mobile bottom navigation bar.
        Renders a fixed 60px bar; hidden on md+ via internal md:hidden class.
      */}
      <MobileNav />

      {/*
        Communication hub.
        Fixed bottom-right floating widget with chat, WhatsApp, and email
        options. Internally positions itself above the mobile nav on small
        screens (bottom-20) and closer to the corner on desktop (md:bottom-6).
        ChatWidget is rendered inside this component when chatOpen=true.
      */}
      <CommunicationHub />

      {/*
        Toast notification renderer.
        Placed once at the layout level so any page or component can
        call useToast() and have toasts appear globally.
      */}
      <Toaster />
      </div>
    </div>
  );
}