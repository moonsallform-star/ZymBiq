'use client';

import Link from 'next/link';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';

export default function HeroContent() {
  const { data: siteConfig } = useSiteConfig();
  const content = siteConfig.content;

  return (
    <div className="relative z-10 flex-1 flex items-center justify-center w-full pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <h1
          id="hero-headline"
          className="
            text-4xl sm:text-5xl md:text-6xl lg:text-7xl
            font-bold font-heading tracking-tight leading-tight
            text-foreground
          "
        >
          {content.heroHeadline}
        </h1>

        {content.heroSubheadline && (
          <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            {content.heroSubheadline}
          </p>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[var(--zymbiq-accent)] hover:bg-[var(--zymbiq-accent)]/90 text-white border-0"
          >
            <Link href="/showroom">{content.heroCta1 || 'Browse Projects'}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/order">{content.heroCta2 || 'Order Custom'}</Link>
          </Button>
        </div>

        <div className="mt-16 flex justify-center" aria-hidden="true">
          <div className="w-px h-12 bg-gradient-to-b from-border to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}