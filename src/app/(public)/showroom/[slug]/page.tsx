// =============================================================================
// Zymbiq — src/app/(public)/showroom/[slug]/page.tsx
// Project detail page: split iframe/panel layout, similar projects, ISR.
// =============================================================================

import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';

import { prisma } from '@/lib/prisma';
import { truncate } from '@/lib/utils';
import ProjectDetailPanel from '@/components/projects/project-detail-panel';
import SimilarProjects from '@/components/projects/similar-projects';

// -----------------------------------------------------------------------------
// ISR — revalidate every 5 minutes
// -----------------------------------------------------------------------------

export const revalidate = 300;

// -----------------------------------------------------------------------------
// Params shape
// -----------------------------------------------------------------------------

interface PageParams {
  params: { slug: string };
}

// -----------------------------------------------------------------------------
// generateStaticParams — pre-build all visible project slugs at deploy time
// -----------------------------------------------------------------------------

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const projects = await prisma.project.findMany({
    where: { isVisible: true },
    select: { slug: true },
  });

  return projects.map((p) => ({ slug: p.slug }));
}

// -----------------------------------------------------------------------------
// generateMetadata — per-project SEO + OG
// -----------------------------------------------------------------------------

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      thumbnailUrl: true,
    },
  });

  if (!project) {
    return { title: 'Project Not Found' };
  }

  const description = truncate(project.description, 160);

  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      ...(project.thumbnailUrl && {
        images: [
          {
            url: project.thumbnailUrl,
            width: 800,
            height: 600,
            alt: project.title,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description,
      ...(project.thumbnailUrl && { images: [project.thumbnailUrl] }),
    },
  };
}

// -----------------------------------------------------------------------------
// ViewTracker — tiny client component to fire analytics on mount
// -----------------------------------------------------------------------------

// Kept in this file to avoid creating a throwaway file; small enough to inline.
// 'use client' only applies to this inner component via the module boundary trick —
// since Next.js App Router requires 'use client' at the top of a *file*, we
// declare it as a separate async import below using next/dynamic.

// We use a server action pattern instead: fire analytics via a
// non-blocking fetch from the Server Component itself.

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function ProjectDetailPage({ params }: PageParams) {
  // ── Fetch project ──────────────────────────────────────────────────────────
  const project = await prisma.project.findUnique({
    where: { slug: params.slug },
    include: {
      faqs: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // 404 for unknown or hidden projects
  if (!project || !project.isVisible) {
    notFound();
  }

  // ── Non-blocking analytics event ─────────────────────────────────────────
  // Fire-and-forget: we intentionally do NOT await this so it never delays render.
  // Using void to suppress the floating promise lint warning.
  void fetch(
    `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/analytics/track`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'project_view', projectId: project.id }),
      // next fetch cache: no-store so each page visit fires a real request
      cache: 'no-store',
    },
  ).catch(() => {
    // Analytics failure is silent — never breaks the page render
  });

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      {/* ── Split panel ─────────────────────────────────────────────────── */}
      <section
        aria-label={`${project.title} — project detail`}
        className="forge-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-0 min-h-[80vh]">
          {/* Left panel: live demo iframe or thumbnail fallback */}
          <div className="relative flex items-stretch min-h-[400px] lg:min-h-[600px] overflow-hidden rounded-xl lg:rounded-r-none border border-border bg-surface">
            {project.demoUrl ? (
              <iframe
                src={project.demoUrl}
                title={`Live demo — ${project.title}`}
                className="w-full h-full min-h-[600px] border-none"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : project.thumbnailUrl ? (
              <div className="relative w-full h-full min-h-[400px]">
                <Image
                  src={project.thumbnailUrl}
                  alt={`${project.title} preview`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              /* Coloured placeholder when no media is available */
              <div
                className="flex items-center justify-center w-full h-full min-h-[400px] bg-muted/10"
                aria-hidden="true"
              >
                <span className="text-muted text-sm">No preview available</span>
              </div>
            )}
          </div>

          {/* Right panel: project detail + Buy Now (client component) */}
          <div className="lg:border-l border-t lg:border-t-0 border-border overflow-y-auto lg:max-h-[80vh]">
            <div className="p-6 lg:p-8">
              <ProjectDetailPanel project={project} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Below-fold content ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Deliverables section — shown when any features are present */}
        {project.features.length > 0 && (
          <section
            aria-labelledby="deliverables-heading"
            className="py-12 border-t border-border"
          >
            <h2
              id="deliverables-heading"
              className="text-2xl font-bold mb-6 text-foreground"
            >
              What You Receive
            </h2>
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
            >
              {project.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-foreground"
                >
                  {/* Accent bullet */}
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Similar projects — client component, self-fetching */}
        <SimilarProjects
          currentProjectId={project.id}
          category={project.category}
        />
      </div>
    </main>
  );
}