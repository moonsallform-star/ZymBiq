// =============================================================================
// Zymbiq — src/app/(admin)/_components/admin-mobile-nav.tsx
// Client component: mobile hamburger button + Sheet slide-out nav.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LogOut,
  LayoutDashboard, FolderOpen, ShoppingBag, Users,
  MessageSquare, Bot, Palette, Layout, FileText,
  BookOpen, BarChart2, Settings, CreditCard,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface AdminMobileNavProps {
  adminName: string | null | undefined;
  adminEmail: string | null | undefined;
}

const MOBILE_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Projects", href: "/admin/projects", icon: <FolderOpen className="h-4 w-4" /> },
  { label: "Orders", href: "/admin/orders", icon: <ShoppingBag className="h-4 w-4" /> },
  { label: "Clients", href: "/admin/clients", icon: <Users className="h-4 w-4" /> },
  { label: "Messages", href: "/admin/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "AI Config", href: "/admin/ai", icon: <Bot className="h-4 w-4" /> },
  { label: "Appearance", href: "/admin/appearance", icon: <Palette className="h-4 w-4" /> },
  { label: "Layout", href: "/admin/layout-controls", icon: <Layout className="h-4 w-4" /> },
  { label: "Content", href: "/admin/content", icon: <FileText className="h-4 w-4" /> },
  { label: "Blog", href: "/admin/blog", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Analytics", href: "/admin/analytics", icon: <BarChart2 className="h-4 w-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
  { label: "Payments", href: "/admin/payments", icon: <CreditCard className="h-4 w-4" /> },
];

export default function AdminMobileNav({
  adminName,
  adminEmail,
}: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <>
      {/* Overlay backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-[9999] flex w-[280px] flex-col bg-surface border-r border-border shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Zymbiq
            </span>
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              ADMIN
            </span>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {MOBILE_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted hover:bg-accent/5 hover:text-foreground",
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-xs font-medium text-foreground">
              {adminName ?? "Admin"}
            </p>
            {adminEmail && (
              <p className="truncate text-[11px] text-muted">{adminEmail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}