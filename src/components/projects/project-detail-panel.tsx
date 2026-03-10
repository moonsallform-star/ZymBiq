// =============================================================================
// Zymbiq — src/components/projects/project-detail-panel.tsx
// Right-side sticky panel on the project detail page.
// Shows price, features, tech stack, quality score, Buy Now CTA, and FAQs.
// =============================================================================

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  FileCode2,
  ShoppingCart,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatCurrency, cn } from '@/lib/utils';
import type { ProjectWithFaqs } from '@/types/database';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface ProjectDetailPanelProps {
  project: ProjectWithFaqs;
}

// -----------------------------------------------------------------------------
// Quality Score SVG
// -----------------------------------------------------------------------------

interface QualityScoreProps {
  score: number; // 0–100
}

function QualityScoreCircle({ score }: QualityScoreProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // Clamp score to [0, 100] to prevent visual glitches
  const clamped = Math.min(100, Math.max(0, score));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width="88"
          height="88"
          viewBox="0 0 88 88"
          aria-label={`Quality score: ${clamped}%`}
          role="img"
        >
          {/* Track circle */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-muted/20"
          />
          {/* Progress arc — starts at top (−90 deg rotation) */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="stroke-accent transition-all duration-700 ease-out"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        {/* Centre label */}
        <span
          className="absolute text-sm font-bold tabular-nums text-foreground"
          aria-hidden="true"
        >
          {clamped}%
        </span>
      </div>
      <span className="text-xs text-muted">Quality Score</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function ProjectDetailPanel({ project }: ProjectDetailPanelProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [isPending, setIsPending] = React.useState(false);

  function handleBuyNow() {
    setIsPending(true);
    if (!session) {
      router.push(`/login?returnUrl=/checkout/${project.id}`);
      return;
    }
    router.push(`/checkout/${project.id}`);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Sticky purchase block ─────────────────────────────────────────── */}
      <div className="sticky top-6 flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 shadow-sm">
        {/* Title + description */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground">
            {project.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            {project.description}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-accent tabular-nums">
            {formatCurrency(project.price, 'USD')}
          </span>
          <span className="text-sm text-muted">one-time</span>
        </div>

        {/* Buy Now CTA */}
        <Button
          size="lg"
          className={cn(
            'w-full gap-2 bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
            'focus-visible:ring-accent',
          )}
          onClick={handleBuyNow}
          disabled={isPending}
          aria-label={`Buy ${project.title} for ${formatCurrency(project.price)}`}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {isPending ? 'Redirecting…' : 'Buy Now'}
        </Button>

        {/* Meta badges row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Build time */}
          {project.buildTime && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span>{project.buildTime} build time</span>
            </div>
          )}

          {/* File count */}
          {project.fileCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span>{project.fileCount} files</span>
            </div>
          )}

          {/* Complexity badge */}
          {project.complexity && (
            <Badge variant="outline" className="capitalize text-xs">
              {project.complexity}
            </Badge>
          )}
        </div>

        {/* Quality Score */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
          <QualityScoreCircle score={project.qualityScore} />
          <div className="flex flex-1 flex-col gap-1 text-right">
            <span className="text-sm font-medium text-foreground">
              Production Ready
            </span>
            <span className="text-xs text-muted">
              Tested, documented, and deployment-ready
            </span>
          </div>
        </div>

        {/* Tech stack */}
        {project.techStack.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Tech Stack
            </span>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Feature checklist */}
        {project.features.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              What&apos;s Included
            </span>
            <ul className="flex flex-col gap-2" role="list">
              {project.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Project-specific FAQs (non-sticky, below the sticky block) ───── */}
      {project.faqs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Project FAQ
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {project.faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}