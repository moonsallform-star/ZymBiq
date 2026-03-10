// =============================================================================
// Zymbiq — src/components/sections/trust-strip.tsx
// Horizontally scrolling ticker of trust items from SiteConfig.
// =============================================================================

'use client';

import { useSiteConfig } from '@/hooks/use-site-config';
import { useStore } from '@/store/index';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function TrustStrip() {
  const { data: siteConfig } = useSiteConfig();
  const animationIntensity = useStore((s) => s.animationIntensity);

  const items = siteConfig?.content?.trustStrip ?? [];

  // Hide section entirely when no items configured
  if (items.length === 0) return null;

  // ── Animation-off fallback — static horizontal list ──────────────────────
  if (animationIntensity === 'off') {
    return (
      <div
        className="w-full border-y border-border/40 py-3 overflow-x-auto"
        style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 70%, transparent)' }}
      >
        <div className="flex items-center justify-center gap-3 px-4 flex-wrap">
          {items.map((item, index) => (
            <span key={index} className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider whitespace-nowrap font-medium" style={{ color: 'var(--zymbiq-text)' }}>
                {item.label}
              </span>
              {index < items.length - 1 && (
                <span className="text-muted/50 select-none" aria-hidden>·</span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Animated ticker — duplicate 3× for seamless loop ─────────────────────
  const tripled = [...items, ...items, ...items];

  return (
    <div
      className="relative z-10 w-full border-y border-border/40 py-3 overflow-hidden"
      style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 70%, transparent)' }}
      aria-label="Trust highlights"
    >
      <div
        className="flex items-center w-max animate-ticker hover:[animation-play-state:paused]"
        style={{ animationDuration: '30s' }}
      >
        {tripled.map((item, index) => (
          <span key={index} className="flex items-center">
            <span className="text-xs uppercase tracking-wider whitespace-nowrap px-4 font-medium" style={{ color: 'var(--zymbiq-text)' }}>
              {item.label}
            </span>
            <span className="text-muted/40 select-none" aria-hidden>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}