"use client"
// =============================================================================
// Zymbiq — src/components/layout/footer.tsx
// Three-column footer with logo/tagline, nav links, and social links.
// =============================================================================

import Link from 'next/link';
import { Github, Twitter, Linkedin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_SITE_CONFIG } from '@/lib/constants';
import { useSiteConfig } from '@/hooks/use-site-config';
import type { ParsedSiteConfig } from '@/types/index';

// -----------------------------------------------------------------------------
// Social icon map — maps known platform keys to Lucide icons
// -----------------------------------------------------------------------------

const SOCIAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  x: Twitter,
  github: Github,
  linkedin: Linkedin,
};

function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = SOCIAL_ICON_MAP[platform.toLowerCase()] ?? Globe;
  return <Icon className={className} />;
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface FooterProps {
  siteConfig?: ParsedSiteConfig;
}

// -----------------------------------------------------------------------------
// Inner footer — receives resolved config
// -----------------------------------------------------------------------------

function FooterInner({ config }: { config: ParsedSiteConfig }) {
  const { content, platform } = config;
  const footerLinks = content.footerLinks ?? [];
  const socialLinks = platform.socialLinks ?? {};
  const socialEntries = Object.entries(socialLinks).filter(([, url]) => Boolean(url));
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">

        {/* Three-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-8">

          {/* Col 1 — Logo + tagline */}
          <div className="flex flex-col gap-3">
            {platform.name ? (
              <Link
                href="/"
                className="text-xl font-heading font-semibold text-foreground hover:text-accent transition-colors"
                aria-label={`${platform.name} — home`}
              >
                {platform.name}
              </Link>
            ) : null}
            {content.footerTagline ? (
              <p className="text-sm text-muted leading-relaxed max-w-[220px]">
                {content.footerTagline}
              </p>
            ) : null}
          </div>

          {/* Col 2 — Navigation links */}
          <div>
            {footerLinks.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
                  Navigation
                </p>
                <ul className="flex flex-col gap-2">
                  {footerLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {/* Col 3 — Social links */}
          <div>
            {socialEntries.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
                  Elsewhere
                </p>
                <ul className="flex flex-col gap-3">
                  {socialEntries.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={platform}
                        className={cn(
                          'inline-flex items-center gap-2 text-sm text-muted',
                          'hover:text-foreground transition-colors group',
                        )}
                      >
                        <SocialIcon
                          platform={platform}
                          className="h-4 w-4 shrink-0 group-hover:text-accent transition-colors"
                        />
                        <span className="capitalize">{platform}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={cn(
            'mt-8 pt-8 border-t border-border',
            'flex flex-col sm:flex-row items-center justify-between gap-2',
          )}
        >
          <p className="text-xs text-muted text-center sm:text-left">
            © {currentYear}{' '}
            {platform.name ? (
              <span className="font-medium text-foreground">{platform.name}</span>
            ) : null}
            . All rights reserved.
          </p>
          {platform.supportEmail ? (
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {platform.supportEmail}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

// -----------------------------------------------------------------------------
// Exported component — accepts optional siteConfig prop or fetches via hook
// -----------------------------------------------------------------------------

function FooterWithHook() {
  const { data } = useSiteConfig();
  return <FooterInner config={data} />;
}

export default function Footer({ siteConfig }: FooterProps) {
  if (siteConfig) {
    return <FooterInner config={siteConfig} />;
  }
  return <FooterWithHook />;
}
