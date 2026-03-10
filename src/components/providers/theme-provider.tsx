// =============================================================================
// Zymbiq — src/components/providers/theme-provider.tsx
// Minimal client-side provider that syncs the admin dark mode default with the
// DOM, while respecting a per-user localStorage override.
// Provides no React context — purely applies/removes the 'dark' class on
// document.documentElement to activate Tailwind dark: utilities.
// =============================================================================

'use client';

import { useEffect } from 'react';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from '@/lib/constants';
import type { SiteConfigAppearance } from '@/types/index';

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cancelled = false;

    async function applyTheme() {
      // Check localStorage user override first
      const localOverride = localStorage.getItem('zymbiq-dark-mode');
      if (localOverride !== null) {
        const isDark = localOverride === 'true';
        if (!cancelled) {
          document.documentElement.classList.toggle('dark', isDark);
        }
        return;
      }

      // Fall back to admin-configured default from siteConfig API
      try {
        const res = await fetch('/api/admin/site-config', { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json() as { data: Record<string, unknown> };
        const raw = json.data?.[SITE_CONFIG_KEYS.APPEARANCE];
        const appearance = (typeof raw === 'object' && raw !== null
          ? raw
          : DEFAULT_SITE_CONFIG.appearance) as SiteConfigAppearance;
        if (!cancelled) {
          document.documentElement.classList.toggle('dark', !!appearance.darkMode);
        }
      } catch {
        // DB unavailable — use DEFAULT_SITE_CONFIG
        if (!cancelled) {
          document.documentElement.classList.toggle(
            'dark',
            DEFAULT_SITE_CONFIG.appearance.darkMode,
          );
        }
      }
    }

    void applyTheme();
    return () => { cancelled = true; };
  }, []);

  return <>{children}</>;
}