// src/app/layout.tsx
// =============================================================================
// Root Next.js App Router layout — Server Component.
// Fetches SiteConfig from DB, builds CSS custom properties, loads Google Fonts,
// and wraps the tree in SessionProvider, QueryProvider, and ThemeProvider.
// Falls back to DEFAULT_SITE_CONFIG on any DB or parse failure.
// =============================================================================

import type { Metadata } from "next";
import { Inter, Roboto, Poppins, Lato, Montserrat, Raleway, Nunito, Playfair_Display, Merriweather, Source_Code_Pro } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from "@/lib/constants";
import type { SiteConfigAppearance, SiteConfigPlatform } from "@/types/index";
import QueryProvider from "@/components/providers/query-provider";
import ThemeProvider from "@/components/providers/theme-provider";

import "@/app/globals.css";
import "@/styles/themes.css";

// =============================================================================
// Font registry — maps admin-configurable font names to next/font instances.
// Only fonts declared here are available for selection in the appearance editor.
// Each font exposes a CSS variable consumed by Tailwind via tailwind.config.ts.
// =============================================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  display: "swap",
});

// All font variables loaded unconditionally so they are available in the CSS
// cascade regardless of which font the admin has currently selected.
const ALL_FONT_VARIABLES = [
  inter.variable,
  roboto.variable,
  poppins.variable,
  lato.variable,
  montserrat.variable,
  raleway.variable,
  nunito.variable,
  playfairDisplay.variable,
  merriweather.variable,
  sourceCodePro.variable,
];

// Maps the font name string stored in SiteConfig to the corresponding CSS
// variable name so it can be applied to --font-heading / --font-body.
const FONT_NAME_TO_VAR: Record<string, string> = {
  Inter: "var(--font-inter)",
  Roboto: "var(--font-roboto)",
  Poppins: "var(--font-poppins)",
  Lato: "var(--font-lato)",
  Montserrat: "var(--font-montserrat)",
  Raleway: "var(--font-raleway)",
  Nunito: "var(--font-nunito)",
  "Playfair Display": "var(--font-playfair-display)",
  Merriweather: "var(--font-merriweather)",
  "Source Code Pro": "var(--font-source-code-pro)",
};

// =============================================================================
// Border radius map — translates admin option string to a CSS value.
// =============================================================================

const BORDER_RADIUS_MAP: Record<string, string> = {
  sharp: "0px",
  soft: "4px",
  rounded: "8px",
  pill: "999px",
};

// =============================================================================
// Module-level CSS cache — keyed by a hash of the appearance values that
// affect the output. Avoids rebuilding identical CSS strings on every request
// when SiteConfig hasn't changed (common during ISR warm cache hits).
// =============================================================================

const _cssCache = new Map<string, { lightVars: string; darkVars: string; headingFont: string; bodyFont: string }>();

function buildCssVars(appearance: SiteConfigAppearance) {
  const cacheKey = [
    appearance.primaryColor, appearance.secondaryColor, appearance.accentColor,
    appearance.backgroundColor, appearance.textColor, appearance.mutedColor,
    appearance.borderRadius, appearance.headingFont, appearance.bodyFont,
  ].join('|');

  if (_cssCache.has(cacheKey)) return _cssCache.get(cacheKey)!;

  const headingFontFamily = FONT_NAME_TO_VAR[appearance.headingFont] ?? FONT_NAME_TO_VAR["Inter"];
  const bodyFontFamily    = FONT_NAME_TO_VAR[appearance.bodyFont]    ?? FONT_NAME_TO_VAR["Inter"];
  const borderRadiusValue = BORDER_RADIUS_MAP[appearance.borderRadius] ?? BORDER_RADIUS_MAP["soft"];

  const lightVars = `
    --zymbiq-primary: ${appearance.primaryColor};
    --zymbiq-secondary: ${appearance.secondaryColor};
    --zymbiq-accent: ${appearance.accentColor};
    --zymbiq-bg: ${appearance.backgroundColor};
    --zymbiq-surface: #FFFFFF;
    --zymbiq-border: #E5E7EB;
    --zymbiq-text: ${appearance.textColor};
    --zymbiq-muted: ${appearance.mutedColor};
    --zymbiq-text-inverse: #FFFFFF;
    --zymbiq-radius: ${borderRadiusValue};
    --font-heading: ${headingFontFamily};
    --font-body: ${bodyFontFamily};
    --background: ${appearance.backgroundColor};
    --foreground: ${appearance.textColor};
    --card: #FFFFFF;
    --card-foreground: ${appearance.textColor};
    --popover: #FFFFFF;
    --popover-foreground: ${appearance.textColor};
    --border: #E5E7EB;
    --input: #E5E7EB;
    --ring: ${appearance.accentColor};
    --muted: #F3F4F6;
    --muted-foreground: ${appearance.mutedColor};
  `;

  const darkVars = `
    --zymbiq-primary: #F9FAFB;
    --zymbiq-secondary: #D1D5DB;
    --zymbiq-accent: #818CF8;
    --zymbiq-bg: #0A0A0A;
    --zymbiq-surface: #111827;
    --zymbiq-border: #374151;
    --zymbiq-text: #F9FAFB;
    --zymbiq-muted: #9CA3AF;
    --zymbiq-text-inverse: #111827;
    --font-heading: ${headingFontFamily};
    --font-body: ${bodyFontFamily};
    --zymbiq-radius: ${borderRadiusValue};
    --background: #0A0A0A;
    --foreground: #F9FAFB;
    --card: #111827;
    --card-foreground: #F9FAFB;
    --popover: #111827;
    --popover-foreground: #F9FAFB;
    --border: #374151;
    --input: #374151;
    --ring: #818CF8;
    --muted: #1F2937;
    --muted-foreground: #9CA3AF;
  `;

  const result = { lightVars, darkVars, headingFont: headingFontFamily, bodyFont: bodyFontFamily };
  _cssCache.set(cacheKey, result);
  return result;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Safely JSON-parses a string. Returns null on failure.
 */
function safeParse<T>(raw: string | undefined | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Fetches appearance and platform SiteConfig rows from the DB.
 * Returns null for either value if the row is missing or the DB is
 * unreachable — callers fall back to DEFAULT_SITE_CONFIG.
 */
async function fetchSiteConfig(): Promise<{
  appearance: SiteConfigAppearance;
  platform: SiteConfigPlatform;
}> {
  try {
    const rows = await prisma.siteConfig.findMany({
      where: {
        key: {
          in: [SITE_CONFIG_KEYS.APPEARANCE, SITE_CONFIG_KEYS.PLATFORM],
        },
      },
      select: { key: true, value: true },
    });

    const appearanceRow = rows.find((r) => r.key === SITE_CONFIG_KEYS.APPEARANCE);
    const platformRow = rows.find((r) => r.key === SITE_CONFIG_KEYS.PLATFORM);

    const appearance =
      safeParse<SiteConfigAppearance>(appearanceRow?.value) ??
      DEFAULT_SITE_CONFIG.appearance;

    const platform =
      safeParse<SiteConfigPlatform>(platformRow?.value) ??
      DEFAULT_SITE_CONFIG.platform;

    return { appearance, platform };
  } catch {
    // DB unavailable — use defaults silently
    return {
      appearance: DEFAULT_SITE_CONFIG.appearance,
      platform: DEFAULT_SITE_CONFIG.platform,
    };
  }
}

// =============================================================================
// Metadata — generateMetadata is not used here because layout metadata is
// static at the root level. Page-level generateMetadata overrides per route.
// =============================================================================

export const metadata: Metadata = {
  title: {
    default: "Zymbiq — Premium Websites",
    template: "%s — Zymbiq",
  },
  description:
    "Production-ready websites built by a solo developer. Browse pre-built projects or order a custom site.",
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ),
};

// =============================================================================
// Root Layout
// =============================================================================

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appearance, platform } = await fetchSiteConfig();

  // ---------------------------------------------------------------------------
  // Build CSS custom property object injected as inline style on <html>.
  // This is server-rendered so there is zero flash of unstyled theme — the
  // browser receives the correct color tokens on the first byte.
  // themes.css defines the same properties as fallback defaults.
  // ---------------------------------------------------------------------------

  const { lightVars, darkVars } = buildCssVars(appearance);

  const themeStyleTag = `:root { ${lightVars} } .dark { ${darkVars} }`;

  // ---------------------------------------------------------------------------
  // Compose html className: all font variables + optional 'dark' class.
  // ---------------------------------------------------------------------------

  const htmlClassName = cn(
    ...ALL_FONT_VARIABLES,
    appearance.darkMode ? "dark" : "",
  );

  // ---------------------------------------------------------------------------
  // Derive page title and favicon from platform config.
  // These are applied here rather than via generateMetadata so every page
  // inherits them automatically without a layout-level generateMetadata export
  // that would force dynamic rendering.
  // ---------------------------------------------------------------------------

  const pageTitle = platform.name
    ? `${platform.name} — Premium Websites`
    : "Zymbiq — Premium Websites";

  const faviconUrl = appearance.faviconUrl || undefined;

  return (
    <html
      lang="en"
      className={htmlClassName}
      suppressHydrationWarning
    >
      <head>
        <title>{pageTitle}</title>
        {faviconUrl && (
          <link rel="icon" href={faviconUrl} />
        )}
        <style dangerouslySetInnerHTML={{ __html: themeStyleTag }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('zymbiq-dark-mode');if(m==='true'){document.documentElement.classList.add('dark');}else if(m==='false'){document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground font-body antialiased">
        {/*
          SessionProvider must be a client boundary — it is a 'use client'
          component from next-auth/react. Wrapping at root ensures useSession()
          is available anywhere in the tree without prop drilling.
        */}
        <SessionProvider>
          {/*
            QueryProvider creates the QueryClient once per session.
            It is the outermost data-fetching boundary for all TanStack Query
            hooks used in client components.
          */}
          <QueryProvider>
            {/*
              ThemeProvider applies the dark/light class to document.html on
              mount to handle any user-level override stored in localStorage.
              It reads the admin-configured default from the site config API.
              Full implementation lives in FILE 032.
            */}
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}