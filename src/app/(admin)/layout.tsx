// =============================================================================
// Zymbiq — src/app/(admin)/layout.tsx
// Admin layout Server Component — auth guard, sidebar nav, realtime provider.
// =============================================================================

import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import RealtimeProvider from "@/components/providers/realtime-provider";
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingBag,
  Users,
  MessageSquare,
  Bot,
  Palette,
  Layout,
  FileText,
  BookOpen,
  BarChart2,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import AdminNavLink from "./_components/admin-nav-link";
import AdminMobileNav from "./_components/admin-mobile-nav";

// =============================================================================
// Nav item definition
// =============================================================================

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    label: "Clients",
    href: "/admin/clients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    label: "AI Config",
    href: "/admin/ai",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    label: "Appearance",
    href: "/admin/appearance",
    icon: <Palette className="h-4 w-4" />,
  },
  {
    label: "Layout",
    href: "/admin/layout-controls",
    icon: <Layout className="h-4 w-4" />,
  },
  {
    label: "Content",
    href: "/admin/content",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Blog",
    href: "/admin/blog",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: <BarChart2 className="h-4 w-4" />,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: <CreditCard className="h-4 w-4" />,
  },
];

// =============================================================================
// Sidebar — server-rendered, active highlighting delegated to AdminNavLink
// =============================================================================

function Sidebar({
  adminName,
  adminEmail,
}: {
  adminName: string | null | undefined;
  adminEmail: string | null | undefined;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-surface border-r border-border">
      {/* Logo / platform name */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-5">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Zymbiq
        </span>
        <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
          ADMIN
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <AdminNavLink
                href={item.href}
                label={item.label}
                icon={item.icon}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer with sign-out */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-xs font-medium text-foreground">
            {adminName ?? "Admin"}
          </p>
          {adminEmail && (
            <p className="truncate text-[11px] text-muted">{adminEmail}</p>
          )}
        </div>

        {/* Server action sign-out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

// =============================================================================
// AdminTopBar — fixed top bar with mobile hamburger
// =============================================================================

function AdminTopBar({
  adminName,
  adminEmail,
}: {
  adminName: string | null | undefined;
  adminEmail: string | null | undefined;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile hamburger — hidden on desktop */}
      <div className="md:hidden">
        <AdminMobileNav
          adminName={adminName}
          adminEmail={adminEmail}
        />
      </div>

      {/* Spacer — individual pages own their heading content */}
      <div className="flex-1" />

      {/* Subtle admin indicator on desktop */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-xs text-muted truncate max-w-[180px]">
          {adminEmail ?? adminName ?? "Admin"}
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-accent"
          title="Admin session active"
        />
      </div>
    </header>
  );
}

// =============================================================================
// AdminLayout — default export
// =============================================================================

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ---------------------------------------------------------------------------
  // Auth guard — double protection (middleware enforces at Edge, layout
  // enforces at render time to catch any middleware bypass scenarios)
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session || !session.user.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden below md breakpoint */}
      <div className="hidden md:block">
        <Sidebar
          adminName={session.user.name}
          adminEmail={session.user.email}
        />
      </div>

      {/* Main content offset by sidebar width on desktop */}
      <div className="flex min-h-screen flex-col md:ml-60">
        <AdminTopBar
          adminName={session.user.name}
          adminEmail={session.user.email}
        />

        <main className="flex-1 overflow-auto">
          <RealtimeProvider>{children}</RealtimeProvider>
        </main>
      </div>
    </div>
  );
}