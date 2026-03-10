// =============================================================================
// Zymbiq — src/app/(public)/page.tsx
// Homepage Server Component — fetches featured projects, testimonials, and
// site config, then renders all sections conditionally per admin layout config.
// =============================================================================

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from '@/lib/constants';

export const revalidate = 0;
import type { ParsedSiteConfig } from '@/types/index';
import type { ProjectWithFaqs } from '@/types/database';

import { Skeleton } from '@/components/ui/skeleton';
import TrustStrip from '@/components/sections/trust-strip';
import HeroContent from '@/components/sections/hero-content';
import StatsRow from '@/components/sections/stats-row';
import HowItWorks from '@/components/sections/how-it-works';
import DevforgeActivity from '@/components/sections/devforge-activity';
import FinalCta from '@/components/sections/final-cta';

// Testimonials accepts a prop, not a hook — server-safe
import Testimonials from '@/components/sections/testimonials';

// -----------------------------------------------------------------------------
// Dynamic imports — 3D components never shipped in initial bundle
// -----------------------------------------------------------------------------

const HeroParticleMesh = dynamic(
  () => import('@/components/3d/hero-particle-mesh'),
  { ssr: false, loading: () => null },
);

const FeaturedCarousel = dynamic(
  () => import('@/components/3d/featured-carousel'),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 w-full flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-[--zymbiq-radius]" />
      </div>
    ),
  },
);

// -----------------------------------------------------------------------------
// Helpers — parse SiteConfig DB records into typed config object
// -----------------------------------------------------------------------------

function safeParseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getSiteConfig(): Promise<ParsedSiteConfig> {
  noStore();
  try {
    const records = await prisma.siteConfig.findMany({
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of records) {
      map[r.key] = r.value;
    }

    return {
      appearance: safeParseJson(
        map[SITE_CONFIG_KEYS.APPEARANCE],
        DEFAULT_SITE_CONFIG.appearance,
      ),
      layout: safeParseJson(
        map[SITE_CONFIG_KEYS.LAYOUT],
        DEFAULT_SITE_CONFIG.layout,
      ),
      content: safeParseJson(
        map[SITE_CONFIG_KEYS.CONTENT],
        DEFAULT_SITE_CONFIG.content,
      ),
      ai: safeParseJson(map[SITE_CONFIG_KEYS.AI], DEFAULT_SITE_CONFIG.ai),
      communication: safeParseJson(
        map[SITE_CONFIG_KEYS.COMMUNICATION],
        DEFAULT_SITE_CONFIG.communication,
      ),
      payments: safeParseJson(
        map[SITE_CONFIG_KEYS.PAYMENTS],
        DEFAULT_SITE_CONFIG.payments,
      ),
      platform: safeParseJson(
        map[SITE_CONFIG_KEYS.PLATFORM],
        DEFAULT_SITE_CONFIG.platform,
      ),
      devforge: safeParseJson(
        map[SITE_CONFIG_KEYS.DEVFORGE],
        DEFAULT_SITE_CONFIG.devforge,
      ),
    };
  } catch {
    // DB unavailable — fall back to defaults so the page still renders
    return DEFAULT_SITE_CONFIG as unknown as ParsedSiteConfig;
  }
}

// -----------------------------------------------------------------------------
// generateMetadata
// -----------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();
  const platformName = siteConfig.platform.name || DEFAULT_SITE_CONFIG.platform.name;
  const description =
    siteConfig.content.heroSubheadline ||
    DEFAULT_SITE_CONFIG.content.heroSubheadline;
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";

  return {
    title: `${platformName} — Premium Production-Ready Websites`,
    description,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title: `${platformName} — Premium Production-Ready Websites`,
      description,
      type: "website",
      url: baseUrl,
      siteName: platformName,
    },
    twitter: {
      card: "summary_large_image",
      title: `${platformName} — Premium Production-Ready Websites`,
      description,
    },
  };
}

// -----------------------------------------------------------------------------
// Section renderer — maps section keys to components
// -----------------------------------------------------------------------------

interface SectionRendererProps {
  sectionKey: string;
  layout: ParsedSiteConfig['layout'];
  featuredProjects: ProjectWithFaqs[];
  testimonials: TestimonialRecord[];
}

interface TestimonialRecord {
  id: string;
  clientName: string;
  projectType: string;
  quote: string;
  avatarUrl?: string | null;
  isVisible: boolean;
  sortOrder: number;
}

function SectionRenderer({
  sectionKey,
  layout,
  featuredProjects,
  testimonials,
}: SectionRendererProps) {
  switch (sectionKey) {
    case 'trustStrip':
      // Rendered inside the hero section — skip here to avoid duplication
      return null;

    case 'carousel':
      return layout.carouselEnabled && featuredProjects.length >= 3 ? (
        <section className="py-8 md:py-16 overflow-hidden w-full">
          <FeaturedCarousel projects={featuredProjects} />
        </section>
      ) : null;

    case 'stats':
      return layout.statsEnabled ? <StatsRow /> : null;

    case 'howItWorks':
      return layout.howItWorksEnabled ? <HowItWorks /> : null;

    case 'devforge':
      return layout.devforgeEnabled ? <DevforgeActivity /> : null;

    case 'testimonials':
      return layout.testimonialsEnabled && testimonials.length > 0 ? (
        <Testimonials testimonials={testimonials} />
      ) : null;

    case 'finalCta':
      return layout.finalCtaEnabled ? <FinalCta /> : null;

    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// HomePage — default export
// -----------------------------------------------------------------------------

export default async function HomePage() {
  // ── Data fetching ──────────────────────────────────────────────────────────

  const [siteConfig, featuredProjects, testimonials] = await Promise.all([
    getSiteConfig(),

    prisma.project
      .findMany({
        where: { isFeatured: true, isVisible: true },
        orderBy: { sortOrder: 'asc' },
        take: 5,
        include: { faqs: { orderBy: { sortOrder: 'asc' } } },
      })
      .catch((): ProjectWithFaqs[] => []),

    prisma.testimonial
      .findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
        take: 3,
      })
      .catch((): TestimonialRecord[] => []),
  ]);

 const { layout, platform } = siteConfig;

  // Section rendering order from admin config, fallback to default order
  const sectionOrder: readonly string[] =
    layout.sectionOrder.length > 0
      ? layout.sectionOrder
      : DEFAULT_SITE_CONFIG.layout.sectionOrder;

  // Sections that come AFTER the hero (hero is always rendered first)
  const postHeroSections = sectionOrder.filter((s) => s !== 'hero');

  // ── Render ─────────────────────────────────────────────────────────────────

   const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.platform.name || "Zymbiq",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/showroom?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.platform.name || "Zymbiq",
    url: baseUrl,
    description:
      siteConfig.content.heroSubheadline ||
      DEFAULT_SITE_CONFIG.content.heroSubheadline,
    ...(siteConfig.platform.supportEmail && {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.platform.supportEmail,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {layout.heroEnabled && (
        <section
          className="relative flex flex-col overflow-hidden -mt-16"
          style={{ minHeight: '100svh' }}
          aria-labelledby="hero-headline"
        >
          {/* Particle mesh — absolute, behind all content */}
          <HeroParticleMesh />

          {/* Hero content — grows to fill space above pinned trust strip */}
          <HeroContent />

          {/* Trust strip — sits above mobile bottom nav */}
          {layout.trustStripEnabled && (
            <div className="absolute bottom-[60px] left-0 right-0 z-20 md:bottom-0 w-full">
              <TrustStrip />
            </div>
          )}
        </section>
      )}

      {/* ── Forge divider after hero ── */}
      <div className="forge-divider" aria-hidden="true" />

      {/* ── All other sections in admin-configured order ─────────────────── */}
      {postHeroSections.map((sectionKey, index) => (
        <div key={sectionKey} className="forge-section">
          <SectionRenderer
            sectionKey={sectionKey}
            layout={layout}
            featuredProjects={featuredProjects as ProjectWithFaqs[]}
            testimonials={testimonials as TestimonialRecord[]}
          />
          {/* Forge divider between every section */}
          <div className="forge-divider" aria-hidden="true" />
        </div>
      ))}
    </div>
    </>
  );
}