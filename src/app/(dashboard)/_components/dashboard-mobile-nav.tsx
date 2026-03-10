// =============================================================================
// Zymbiq — src/app/(dashboard)/_components/dashboard-mobile-nav.tsx
// Mobile sidebar drawer for dashboard.
//
// TRIGGER STRATEGY:
// This component cannot safely render inside the header without modifying it.
// The trigger is therefore a slim left-edge tab that starts exactly at top-16
// (below the 64px header) — it never touches the header band at all.
// It's a 32×32 rounded-r-lg pill flush to the left edge, subtle and
// unobtrusive, which is a well-established pattern for "peek" sidebars.
// Hidden on md+ (sidebar takes over).
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  MessageSquare,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// -----------------------------------------------------------------------------
// Nav items
// -----------------------------------------------------------------------------

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard",          icon: LayoutDashboard },
  { label: "Orders",    href: "/dashboard/orders",   icon: ShoppingBag     },
  { label: "Messages",  href: "/dashboard/messages", icon: MessageSquare   },
];

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface DashboardMobileNavProps {
  userName:  string | null;
  userEmail: string | null;
  userImage: string | null;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DashboardMobileNav({
  userName,
  userEmail,
  userImage,
}: DashboardMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  useEffect(() => {
    function handleOpen() { setOpen(true); }
    window.addEventListener("zymbiq:open-dashboard-sidebar", handleOpen);
    return () => window.removeEventListener("zymbiq:open-dashboard-sidebar", handleOpen);
  }, []);

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dash-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Slide-in drawer ── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="dash-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className={cn(
              "md:hidden fixed top-0 left-0 bottom-0 z-50",
              "w-72 flex flex-col",
              "bg-[var(--zymbiq-surface)] border-r border-[var(--zymbiq-border)]",
              "shadow-2xl"
            )}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--zymbiq-border)] shrink-0">
              <span className="text-base font-semibold font-heading text-[var(--zymbiq-text)]">
                My Dashboard
              </span>
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--zymbiq-border)] transition-colors"
              >
                <X className="h-4 w-4 text-[var(--zymbiq-muted)]" />
              </button>
            </div>

            {/* User identity */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--zymbiq-border)] shrink-0">
              <Avatar className="h-10 w-10 shrink-0">
                {userImage ? (
                  <AvatarImage src={userImage} alt={userName ?? "User"} />
                ) : null}
                <AvatarFallback className="text-sm font-medium bg-[var(--zymbiq-accent)]/10 text-[var(--zymbiq-accent)]">
                  {getInitials(userName ?? "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                {userName && (
                  <span className="text-sm font-semibold text-[var(--zymbiq-text)] truncate">
                    {userName}
                  </span>
                )}
                {userEmail && (
                  <span className="text-xs text-[var(--zymbiq-muted)] truncate">
                    {userEmail}
                  </span>
                )}
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
              {NAV_ITEMS.map(({ label, href, icon: Icon }, i) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);

                return (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.2 }}
                  >
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 h-12 px-4 rounded-xl text-sm font-medium",
                        "transition-colors duration-150",
                        isActive
                          ? "bg-[var(--zymbiq-accent)]/10 text-[var(--zymbiq-accent)]"
                          : "text-[var(--zymbiq-muted)] hover:bg-[var(--zymbiq-border)] hover:text-[var(--zymbiq-text)]"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-[var(--zymbiq-border)] shrink-0">
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(
                  "flex items-center gap-3 h-12 w-full px-4 rounded-xl",
                  "text-sm font-medium text-[var(--zymbiq-muted)]",
                  "hover:text-red-500 hover:bg-red-500/5",
                  "transition-colors duration-150"
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}