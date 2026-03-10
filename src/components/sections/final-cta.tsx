// =============================================================================
// Zymbiq — src/components/sections/final-cta.tsx
// Full-width final call-to-action section driven entirely by site configuration.
// =============================================================================

'use client';

import Link from 'next/link';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function FinalCta() {
  const { data: siteConfig } = useSiteConfig();

  const headline =
    siteConfig.content.finalCtaHeadline ||
    siteConfig.content.heroHeadline ||
    'Ready to launch something great?';

  const subheadline =
    siteConfig.content.finalCtaSubheadline ||
    siteConfig.content.heroSubheadline ||
    'Browse production-ready websites or order a custom build tailored to your needs.';

  return (
    <section className="w-full py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-foreground">
          {headline}
        </h2>

        {subheadline && (
          <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
            {subheadline}
          </p>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/showroom">Browse Projects</Link>
          </Button>

          <Button asChild size="lg" variant="outline">
            <Link href="/order">Order Custom</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}