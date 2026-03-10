// =============================================================================
// Zymbiq — src/app/(dashboard)/_components/dashboard-sidebar.tsx
// Fixed left sidebar for the dashboard layout.
// Visible on md+ screens; mobile navigation handled by the header sheet.
// =============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  MessageSquare,
  LogOut,
} from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// -----------------------------------------------------------------------------
// Nav items
// -----------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders",    href: "/dashboard/orders",   icon: ShoppingBag  },
  { label: "Messages",  href: "/dashboard/messages", icon: MessageSquare },
];

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface DashboardSidebarProps {
  userName:  string | null;
  userEmail: string | null;
  userImage: string | null;
}

// -----------------------------------------------------------------------------
// DashboardSidebar
// -----------------------------------------------------------------------------

export default function DashboardSidebar({
  userName,
  userEmail,
  userImage,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <aside
      className={cn(
        // Hidden on mobile — header sheet nav handles mobile
        "hidden md:flex",
        // Fixed below the 64px header
        "fixed top-16 left-0 bottom-0 z-30",
        "w-60 flex-col",
        "bg-[var(--zymbiq-surface)] border-r border-[var(--zymbiq-border)]"
      )}
      aria-label="Dashboard navigation"
    >
      {/* ── Navigation links ── */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-md text-sm font-medium",
                "transition-colors duration-150",
                isActive
                  ? "bg-[var(--zymbiq-accent)]/10 text-[var(--zymbiq-accent)]"
                  : "text-[var(--zymbiq-muted)] hover:bg-[var(--zymbiq-border)] hover:text-[var(--zymbiq-text)]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── User info + sign-out ── */}
      <div className="flex flex-col gap-3 px-3 py-4 border-t border-[var(--zymbiq-border)]">
        {/* User identity */}
        <div className="flex items-center gap-3 px-1 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            {userImage ? (
              <AvatarImage src={userImage} alt={userName ?? "User"} />
            ) : null}
            <AvatarFallback className="text-xs">
              {getInitials(userName ?? "")}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0">
            {userName ? (
              <span className="text-sm font-medium text-[var(--zymbiq-text)] truncate leading-tight">
                {userName}
              </span>
            ) : null}
            {userEmail ? (
              <span className="text-xs text-[var(--zymbiq-muted)] truncate leading-tight">
                {userEmail}
              </span>
            ) : null}
          </div>
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-3 h-10 px-3",
            "text-[var(--zymbiq-muted)] hover:text-[var(--zymbiq-error)]",
            "hover:bg-[var(--zymbiq-error)]/5"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}