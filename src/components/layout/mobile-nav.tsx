// =============================================================================
// Zymbiq — src/components/layout/mobile-nav.tsx
// Fixed bottom navigation bar for mobile viewports with five nav items and a
// tracking-code dialog for the Track item. Hidden on md+ screens.
// =============================================================================

'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Grid, PlusCircle, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// -----------------------------------------------------------------------------
// Nav item definition
// -----------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string | null; // null = custom click behaviour (Track)
  Icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',     href: '/',          Icon: Home       },
  { label: 'Showroom', href: '/showroom',  Icon: Grid       },
  { label: 'Order',    href: '/order',     Icon: PlusCircle },
  { label: 'Track',    href: null,         Icon: MapPin     },
  { label: 'Account',  href: '/dashboard', Icon: User       },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function MobileNav() {
  const pathname  = usePathname();
  const router    = useRouter();

  // Track dialog state
  const [trackOpen,     setTrackOpen]     = useState(false);
  const [trackingCode,  setTrackingCode]  = useState('');
  const [trackError,    setTrackError]    = useState('');

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /** Returns true when the nav item should be highlighted. */
  function isActive(href: string | null): boolean {
    if (href === null) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  /** Handle tap on a nav item. */
  function handleNavTap(item: NavItem) {
    if (item.href === null) {
      // Track item — open the dialog instead of navigating
      setTrackingCode('');
      setTrackError('');
      setTrackOpen(true);
      return;
    }
    router.push(item.href);
  }

  /** Submit the tracking code and navigate. */
  function handleTrackSubmit() {
    const code = trackingCode.trim();
    if (!code) {
      setTrackError('Please enter a tracking code.');
      return;
    }
    setTrackOpen(false);
    router.push(`/track/${encodeURIComponent(code)}`);
  }

  /** Allow submitting with Enter key. */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleTrackSubmit();
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <>
      {/* ── Bottom bar — hidden on md+ ──────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'h-[60px]',
          'border-t border-[var(--zymbiq-border)]/30 backdrop-blur-md',
          'flex items-center justify-around',
          'md:hidden',
        )}
        style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 80%, transparent)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);

          return (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleNavTap(item)}
              className={cn(
                // Touch target: full 60px height, minimum 60px wide
                'flex flex-col items-center justify-center gap-[3px]',
                'min-w-[60px] h-[60px] px-2',
                'text-xs font-medium',
                'transition-colors duration-150',
                // Colour
                active
                  ? 'text-[var(--zymbiq-accent)]'
                  : 'text-[var(--zymbiq-muted)] hover:text-[var(--zymbiq-text)]',
                // Focus ring
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[var(--zymbiq-accent)] focus-visible:ring-inset',
              )}
            >
              <item.Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  active && 'text-[var(--zymbiq-accent)]',
                )}
                aria-hidden="true"
              />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Track Order dialog ──────────────────────────────────────── */}
      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Track your order</DialogTitle>
            <DialogDescription>
              Enter the tracking code from your confirmation email.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Input
              id="tracking-code-input"
              placeholder="e.g. ABC12345"
              value={trackingCode}
              onChange={(e) => {
                setTrackingCode(e.target.value);
                if (trackError) setTrackError('');
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={trackError ? 'track-error' : undefined}
            />
            {trackError && (
              <p
                id="track-error"
                role="alert"
                className="text-xs text-[var(--zymbiq-error,#EF4444)]"
              >
                {trackError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setTrackOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleTrackSubmit} disabled={!trackingCode.trim()}>
              Track Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}