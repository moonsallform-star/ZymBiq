// =============================================================================
// Zymbiq — src/components/layout/header.tsx
// Fixed top navigation header with logo, desktop nav, auth-aware user menu,
// and mobile hamburger sheet navigation.
// =============================================================================

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Moon, Sun, LogOut, LayoutDashboard, ShieldCheck, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/use-site-config";
import { useStore } from "@/store/index";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// -----------------------------------------------------------------------------
// Nav links definition
// -----------------------------------------------------------------------------

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Showroom", href: "/showroom" },
  { label: "Order", href: "/order" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
];

// -----------------------------------------------------------------------------
// Helper — derive initials from a name string
// -----------------------------------------------------------------------------

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

// -----------------------------------------------------------------------------
// DarkModeToggle
// -----------------------------------------------------------------------------

function DarkModeToggle() {
  const darkMode = useStore((s) => s.darkMode);
  const setDarkMode = useStore((s) => s.setDarkMode);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Render placeholder until client hydration complete
  // prevents icon flash on SSR mismatch
  if (!mounted) {
    return <div className="h-10 w-10" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDarkMode(!darkMode)}
      className="h-10 w-10 shrink-0"
    >
      {darkMode ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

// -----------------------------------------------------------------------------
// UserMenu — avatar + dropdown for authenticated users
// -----------------------------------------------------------------------------

interface UserMenuProps {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  isAdmin: boolean;
}

function UserMenu({ name, email, image, isAdmin }: UserMenuProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zymbiq-accent)]",
            "h-11 min-w-[44px]"
          )}
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9">
            {image ? (
              <AvatarImage
                src={image}
                alt={name ?? "User avatar"}
              />
            ) : null}
            <AvatarFallback className="text-sm">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {name ? (
              <span className="text-sm font-medium text-[var(--zymbiq-text)] truncate">
                {name}
              </span>
            ) : null}
            {email ? (
              <span className="text-xs text-[var(--zymbiq-muted)] truncate">
                {email}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-[var(--zymbiq-error)] focus:text-[var(--zymbiq-error)]"
          onSelect={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// -----------------------------------------------------------------------------
// MobileSheetNav — slide-in sheet for mobile navigation
// -----------------------------------------------------------------------------

interface MobileSheetNavProps {
  currentPath: string;
  platformName: string;
  logoUrl?: string;
  showDarkModeToggle: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

function MobileSheetNav({
  currentPath,
  platformName,
  isAdmin,
  isAuthenticated,
}: MobileSheetNavProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  return (
    <div ref={ref} className="relative md:hidden">
      {/* Trigger button */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-150",
          open
            ? "bg-[var(--zymbiq-accent)] text-white"
            : "text-[var(--zymbiq-text)] hover:bg-[var(--zymbiq-border)]/40"
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Floating panel — AnimatePresence for smooth in/out */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0, 0, 0.2, 1] } }}
            exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.13, ease: [0.4, 0, 1, 1] } }}
            className="absolute top-14 right-0 w-64 rounded-2xl shadow-xl overflow-hidden z-50"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 85%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid color-mix(in srgb, var(--zymbiq-border) 50%, transparent)',
            }}
          >
            {/* Platform name header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }}
            >
              <div className="h-7 w-7 rounded-lg bg-[var(--zymbiq-accent)] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{platformName.charAt(0)}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--zymbiq-text)]">{platformName}</span>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-0.5 p-2">
              {NAV_LINKS.map((link, i) => {
                const isActive =
                  link.href === "/"
                    ? currentPath === "/"
                    : currentPath.startsWith(link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.15 } }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex h-10 items-center justify-between rounded-xl px-3 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-[var(--zymbiq-accent)] text-white"
                          : "text-[var(--zymbiq-text)]/80 hover:bg-[var(--zymbiq-border)]/40 hover:text-[var(--zymbiq-text)]"
                      )}
                    >
                      {link.label}
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
                    </Link>
                  </motion.div>
                );
              })}

              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-150",
                    currentPath.startsWith("/dashboard")
                      ? "bg-[var(--zymbiq-accent)] text-white"
                      : "text-[var(--zymbiq-text)]/80 hover:bg-[var(--zymbiq-border)]/40"
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-all duration-150",
                    currentPath.startsWith("/admin")
                      ? "bg-[var(--zymbiq-accent)] text-white"
                      : "text-[var(--zymbiq-text)]/80 hover:bg-[var(--zymbiq-border)]/40"
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin Panel
                </Link>
              )}
            </nav>

            {/* Bottom actions */}
            <div className="p-2 pt-0 space-y-1.5 border-t"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }}
            >
              {/* Theme row */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-border) 20%, transparent)' }}
              >
                <span className="text-xs text-[var(--zymbiq-muted)] font-medium">Theme</span>
                <DarkModeToggle />
              </div>

              <Link
                href="/order"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-10 w-full rounded-xl bg-[var(--zymbiq-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Order Custom
              </Link>

              {!isAuthenticated && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center h-10 w-full rounded-xl text-sm font-medium text-[var(--zymbiq-text)]/80 hover:bg-[var(--zymbiq-border)]/40 transition-colors"
                  style={{ border: '1px solid color-mix(in srgb, var(--zymbiq-border) 60%, transparent)' }}
                >
                  Sign In
                </Link>
              )}

              {isAuthenticated && (
                <button
                  className="flex items-center justify-center gap-2 h-10 w-full rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: 'var(--zymbiq-error)',
                    border: '1px solid color-mix(in srgb, var(--zymbiq-error) 30%, transparent)',
                  }}
                  onClick={async () => {
                    setOpen(false);
                    await signOut({ redirect: false });
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Header — main export
// -----------------------------------------------------------------------------

export const DASHBOARD_SIDEBAR_EVENT = "zymbiq:open-dashboard-sidebar";

export default function Header() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const { data: session, status } = useSession();
  const { data: siteConfig } = useSiteConfig();
  const animationIntensity = useStore((s) => s.animationIntensity);

  // Scroll shadow — use a ref + imperative class toggle instead of setState so
  // scroll events never trigger a React re-render of the entire header tree.
  const headerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    function handleScroll() {
      if (!headerRef.current) return;
      if (window.scrollY > 0) {
        headerRef.current.classList.add('shadow-sm', 'header-scrolled');
      } else {
        headerRef.current.classList.remove('shadow-sm', 'header-scrolled');
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAuthenticated = status === "authenticated";
  // Access isAdmin via session.user — NextAuth v5 stamps it on the token
  const isAdmin = Boolean(
    isAuthenticated && (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin
  );

  const platformName = siteConfig.platform.name || "Zymbiq";
  const logoUrl = siteConfig.appearance.logoUrl;
  // Admin can disable the dark mode toggle via SiteConfig appearance.darkMode flag
  // We show the toggle when darkMode config is true (meaning dark mode is supported)
  const showDarkModeToggle = siteConfig.appearance.darkMode;

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed top-0 inset-x-0 z-40",
        "h-16 flex items-center",
        "backdrop-blur-sm border-b border-[var(--zymbiq-border)]/20",
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 20%, transparent)' }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

        {/* ── Logo / Platform name ─────────────────────────────────────── */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 shrink-0",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zymbiq-accent)] rounded-md"
          )}
          aria-label={`${platformName} home`}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={platformName}
              loader={cloudinaryLoader}
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight font-heading text-[var(--zymbiq-text)]">
              {platformName}
            </span>
          )}
        </Link>

        {/* ── Dashboard sidebar trigger — mobile only, dashboard routes only ── */}
        {isDashboard && (
          <button
            type="button"
            aria-label="Open dashboard sidebar"
            onClick={() => window.dispatchEvent(new CustomEvent(DASHBOARD_SIDEBAR_EVENT))}
            className="md:hidden flex items-center justify-center h-11 w-11 rounded-full text-[var(--zymbiq-text)]/70 hover:bg-[var(--zymbiq-border)]/40 hover:text-[var(--zymbiq-accent)] transition-colors duration-150 shrink-0"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        {/* ── Desktop nav ──────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 h-10 inline-flex items-center text-sm font-medium rounded-md",
                  animationIntensity !== "off"
                    ? "transition-colors duration-150"
                    : "",
                  isActive
                    ? "text-[var(--zymbiq-accent)] font-semibold"
                    : "text-[var(--zymbiq-text)]/80 hover:text-[var(--zymbiq-text)] font-medium"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right side actions ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Dark mode toggle — desktop only (mobile in sheet) */}
          <div className="hidden md:flex">
            <DarkModeToggle />
          </div>

          {/* Order Custom CTA — hidden on mobile (available in sheet) */}
          <Button
            asChild
            variant="default"
            size="sm"
            className="hidden md:inline-flex h-10 bg-[var(--zymbiq-accent)] hover:bg-[var(--zymbiq-accent)]/90 text-white border-0"
          >
            <Link href="/order">Order Custom</Link>
          </Button>

          {/* Auth-aware section */}
          {status === "loading" ? (
            // Prevent layout shift while session loads — show same-size placeholder
            <div className="h-9 w-9 rounded-full bg-[var(--zymbiq-border)] animate-pulse" aria-hidden="true" />
          ) : isAuthenticated ? (
            <div className="hidden md:flex">
              <UserMenu
                name={session.user?.name}
                email={session.user?.email}
                image={session.user?.image}
                isAdmin={isAdmin}
              />
            </div>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-10 text-[var(--zymbiq-text)] hover:bg-[var(--zymbiq-border)]/40"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {/* Mobile hamburger — always visible on small screens */}
          <MobileSheetNav
            currentPath={pathname}
            platformName={platformName}
            logoUrl={logoUrl}
            showDarkModeToggle={showDarkModeToggle}
            isAdmin={isAdmin}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </header>
  );
}