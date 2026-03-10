// Zymbiq — src/app/(public)/about/page.tsx
// About page Server Component — philosophy, DB-driven stats, personal note.

import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS, DEFAULT_SITE_CONFIG } from "@/lib/constants";
import type { SiteConfigContent, SiteConfigPlatform } from "@/types/index";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About — Zymbiq",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSiteConfig(): Promise<{
  content: SiteConfigContent;
  platform: SiteConfigPlatform;
}> {
  try {
    const records = await prisma.siteConfig.findMany({
      where: {
        key: {
          in: [SITE_CONFIG_KEYS.CONTENT, SITE_CONFIG_KEYS.PLATFORM],
        },
      },
      select: { key: true, value: true },
    });

    const map = Object.fromEntries(records.map((r) => [r.key, r.value]));

    const content: SiteConfigContent = map[SITE_CONFIG_KEYS.CONTENT]
      ? (JSON.parse(map[SITE_CONFIG_KEYS.CONTENT]) as SiteConfigContent)
      : (DEFAULT_SITE_CONFIG.content as unknown as SiteConfigContent);

    const platform: SiteConfigPlatform = map[SITE_CONFIG_KEYS.PLATFORM]
      ? (JSON.parse(map[SITE_CONFIG_KEYS.PLATFORM]) as SiteConfigPlatform)
      : (DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform);

    return { content, platform };
  } catch {
    return {
      content: DEFAULT_SITE_CONFIG.content as unknown as SiteConfigContent,
      platform: DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform,
    };
  }
}

async function getStats(): Promise<{
  completedOrders: number;
  totalProjects: number;
  totalFiles: number;
}> {
  try {
    const [completedOrders, totalProjects, filesAggregate] = await Promise.all([
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.project.count({ where: { isVisible: true } }),
      prisma.project.aggregate({ _sum: { fileCount: true } }),
    ]);

    return {
      completedOrders,
      totalProjects,
      totalFiles: filesAggregate._sum.fileCount ?? 0,
    };
  } catch {
    return { completedOrders: 0, totalProjects: 0, totalFiles: 0 };
  }
}

// ---------------------------------------------------------------------------
// Stat card sub-component (pure, no client overhead)
// ---------------------------------------------------------------------------

function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl font-bold text-foreground tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-sm text-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AboutPage() {
  const [{ content, platform }, stats] = await Promise.all([
    getSiteConfig(),
    getStats(),
  ]);

  // Split aboutText on newlines so multi-paragraph text renders correctly.
  const aboutParagraphs = content.aboutText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="py-24">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ---------------------------------------------------------------- */}
        {/* Philosophy headline                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-16">
          <p className="text-sm uppercase tracking-widest text-muted mb-4">
            About
          </p>
          <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight mb-8">
            Built different.<br />
            On purpose.
          </h1>

          <div className="space-y-5">
            {aboutParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className="text-lg text-muted leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Stats row                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="mb-16 py-12 border-y border-border grid grid-cols-1 sm:grid-cols-3 gap-8"
          aria-label="Platform statistics"
        >
          <StatCard
            value={stats.completedOrders}
            label="Orders Delivered"
          />
          <StatCard
            value={stats.totalProjects}
            label="Projects Built"
          />
          <StatCard
            value={stats.totalFiles}
            label="Files Shipped"
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Personal note                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-16 space-y-5">
          <h2 className="text-2xl font-bold text-foreground">
            Who's behind {platform.name}?
          </h2>
          <p className="text-lg text-muted leading-relaxed">
            A solo developer who believes the best websites are built with
            obsessive attention to detail — not by teams padding scope. Every
            project that leaves{" "}
            <span className="text-foreground font-medium">{platform.name}</span>{" "}
            has been designed, coded, tested, and shipped by one person who
            cares deeply about the craft.
          </p>
          <p className="text-lg text-muted leading-relaxed">
            That means faster decisions, cleaner code, and a direct line to the
            person actually building your site — not a project manager relaying
            messages down a chain.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CTA                                                               */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <Button asChild size="lg">
            <Link href="/showroom">Browse the Showroom</Link>
          </Button>
        </section>

      </div>
    </main>
  );
}