// =============================================================================
// Zymbiq — src/app/(admin)/_components/admin-nav-link.tsx
// Client component: active-aware nav link for the admin sidebar.
// Isolated here so layout.tsx stays a Server Component.
// =============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function AdminNavLink({ href, label, icon }: AdminNavLinkProps) {
  const pathname = usePathname();

  // Exact match for dashboard root, prefix match for everything else
  const isActive =
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent/10 text-accent font-medium"
          : "text-muted hover:bg-accent/5 hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}