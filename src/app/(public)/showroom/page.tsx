// =============================================================================
// Zymbiq — src/app/(public)/showroom/page.tsx
// Showroom page: Server Component shell + ShowroomClient for AI search state.
// =============================================================================

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SITE_CONFIG } from '@/lib/constants';
import ShowroomClient from './_components/showroom-client';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";
  return {
    title: "Showroom — Production-Ready Websites for Sale | Zymbiq",
    description:
      "Browse pre-built, production-ready websites. Restaurant, e-commerce, portfolio, SaaS and more — instant GitHub access and deployment assistance included.",
    alternates: { canonical: `${baseUrl}/showroom` },
    keywords: [
      "buy website",
      "pre-built website",
      "production ready website",
      "website for sale",
      "Next.js website",
      "React website template",
      "SaaS website",
      "restaurant website",
      "e-commerce website template",
    ],
    openGraph: {
      title: "Showroom — Production-Ready Websites for Sale | Zymbiq",
      description:
        "Browse pre-built, production-ready websites. Instant GitHub access and deployment assistance included.",
      url: `${baseUrl}/showroom`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Showroom — Production-Ready Websites for Sale | Zymbiq",
      description:
        "Browse pre-built, production-ready websites. Instant GitHub access and deployment assistance included.",
    },
  };
}

// -----------------------------------------------------------------------------
// ISR — revalidate every 5 minutes
// -----------------------------------------------------------------------------

export const revalidate = 300;

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function ShowroomPage() {
  // Fetch count + first page of projects in parallel.
  // The first page is passed as initialData to ShowroomClient so the grid
  // renders immediately on hydration without a client-side fetch waterfall.
  let totalCount = 0;
  let initialProjects: import('@/types/database').ProjectWithFaqs[] = [];

  try {
    const [count, firstPage] = await Promise.all([
      prisma.project.count({ where: { isVisible: true } }),
      prisma.project.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
        take: 12,
        include: { faqs: true },
      }),
    ]);
    totalCount = count;
    initialProjects = firstPage;
  } catch {
    totalCount = 0;
    initialProjects = [];
  }

  // Fetch page heading from SiteConfig (optional customisation).
  let pageHeading = 'Showroom';
  let pageSubheading = `Browse ${totalCount} production-ready website${totalCount === 1 ? '' : 's'}`;

  try {
    const configRecord = await prisma.siteConfig.findUnique({
      where: { key: 'content' },
      select: { value: true },
    });

    if (configRecord?.value) {
      const parsed = JSON.parse(configRecord.value) as Partial <
        typeof DEFAULT_SITE_CONFIG.content
      >;
      // Allow admin to override via a "showroomHeadline" content key if present,
      // otherwise fall back to the static default.
      if ('showroomHeadline' in parsed && typeof (parsed as Record<string, unknown>).showroomHeadline === 'string') {
        pageHeading = (parsed as Record<string, unknown>).showroomHeadline as string;
      }
    }
  } catch {
    // Use defaults — no action needed.
  }

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Showroom — Production-Ready Websites",
    description:
      "Pre-built, production-ready websites available for instant purchase.",
    url: `${baseUrl}/showroom`,
    numberOfItems: totalCount,
    publisher: {
      "@type": "Organization",
      name: "Zymbiq",
      url: baseUrl,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Showroom", item: `${baseUrl}/showroom` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <main className="min-h-screen bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="forge-section">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: 'var(--zymbiq-accent)', opacity: 0.5 }} />
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--zymbiq-accent)', opacity: 0.7 }}>
                Browse
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold tracking-tight text-foreground">
              {pageHeading}
            </h1>
            <p className="text-base text-muted mt-1">{pageSubheading}</p>
          </div>
        </div>
        <div className="forge-divider" aria-hidden="true" />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Client shell — AI search state + filters + grid                    */}
      {/* Suspense boundary required because ProjectFilters uses              */}
      {/* useSearchParams() which needs a Suspense wrapper in Next.js 14.    */}
      {/* ------------------------------------------------------------------ */}
      <section className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <Suspense fallback={<ShowroomSkeleton />}>
          <ShowroomClient initialProjects={initialProjects} />
        </Suspense>
      </section>
</main>
    </>
  );
}

// -----------------------------------------------------------------------------
// Fallback skeleton rendered by Suspense while ShowroomClient hydrates
// -----------------------------------------------------------------------------

function ShowroomSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Search bar skeleton */}
      <div className="h-11 w-full rounded-[--zymbiq-radius] bg-muted/20" />

      {/* Filter row skeleton */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 rounded-full bg-muted/20"
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-16 rounded-full bg-muted/20"
            />
          ))}
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[--zymbiq-radius] border border-border overflow-hidden bg-surface"
          >
            <div className="aspect-video bg-muted/20" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-2/3 bg-muted/20 rounded" />
              <div className="h-6 w-1/3 bg-muted/20 rounded" />
              <div className="h-4 w-full bg-muted/20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}