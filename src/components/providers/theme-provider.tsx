// =============================================================================
// Zymbiq — src/components/providers/theme-provider.tsx
// Minimal client-side provider that syncs the admin dark mode default with the
// DOM, while respecting a per-user localStorage override.
// Provides no React context — purely applies/removes the 'dark' class on
// document.documentElement to activate Tailwind dark: utilities.
// =============================================================================

'use client';

// ThemeProvider no longer performs async fetching.
// The server (layout.tsx) already injects the correct 'dark' class on <html>
// based on SiteConfig from DB. An inline blocking <script> in layout.tsx
// handles the localStorage user override synchronously before first paint,
// so there is zero flash of incorrect theme in any scenario.
//
// This component is kept as a thin wrapper so the import in layout.tsx
// continues to work and can be extended in future (e.g. theme toggle events).

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}