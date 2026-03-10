// Zymbiq — src/app/(public)/process/page.tsx
// Process page: Server Component rendering detailed phase sections from
// siteConfig.content.processSteps with a client-side animated timeline.

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS, DEFAULT_SITE_CONFIG } from "@/lib/constants";
import type { SiteConfigContent, ProcessStep } from "@/types/index";
import ProcessTimeline from "./_components/process-timeline";

// ---------------------------------------------------------------------------
// ISR — revalidate every 5 minutes
// ---------------------------------------------------------------------------

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Our Process — Zymbiq",
  description:
    "From first conversation to live deployment — a transparent look at how every Zymbiq project is built.",
};

// ---------------------------------------------------------------------------
// Phase detail — static extended content per phase
// Each maps to a processStep by index (0–3)
// ---------------------------------------------------------------------------

interface PhaseDetail {
  duration: string;
  whatHappens: string;
  clientResponsibilities: string[];
  deliverables: string[];
}

const PHASE_DETAILS: PhaseDetail[] = [
  {
    duration: "Day 1",
    whatHappens:
      "We start with a structured AI-guided conversation where you describe your goals, industry, and feature requirements. I extract a full project brief — scope, tech stack, complexity level, and a transparent price estimate — before any commitment is made.",
    clientResponsibilities: [
      "Share your vision, goals, and any reference sites you like",
      "Clarify must-have features versus nice-to-haves",
      "Confirm budget range and target launch date",
    ],
    deliverables: [
      "Structured project brief document",
      "Itemised price estimate (min–max range)",
      "Suggested timeline with milestones",
    ],
  },
  {
    duration: "2–10 days depending on scope",
    whatHappens:
      "I build your project using the agreed tech stack — Next.js, TypeScript, Tailwind CSS, and any integrations specified in the brief. Every component is written clean, documented inline, and tested on mobile and desktop before handoff.",
    clientResponsibilities: [
      "Provide brand assets: logo, colors, fonts, imagery",
      "Supply content (text, images) or approve placeholder content",
      "Respond promptly to any clarifying questions during the build",
    ],
    deliverables: [
      "Fully functional web application",
      "Private GitHub repository with clean commit history",
      "README with setup and deployment instructions",
    ],
  },
  {
    duration: "1–2 days",
    whatHappens:
      "You receive a live preview link to the staging deployment. Review every page, test every interaction, and submit a single consolidated round of revisions. I address all requested changes before final delivery.",
    clientResponsibilities: [
      "Test the site thoroughly on your preferred devices and browsers",
      "Compile all change requests into a single feedback document",
      "Approve the final build once revisions are complete",
    ],
    deliverables: [
      "Staging deployment link for review",
      "One revision round addressing all feedback",
      "Written approval confirmation before production deploy",
    ],
  },
  {
    duration: "Same day as approval",
    whatHappens:
      "Your repository is transferred or access is granted. I assist with production deployment — whether that's Vercel, Netlify, a VPS, or your existing host. You go live with a site that's production-hardened, SEO-ready, and fully yours.",
    clientResponsibilities: [
      "Provide domain and hosting credentials if self-hosting",
      "Point your domain DNS to the deployment once live",
      "Confirm everything is working correctly on the live URL",
    ],
    deliverables: [
      "GitHub repository access or transfer",
      "Production deployment assistance",
      "Full project documentation and handoff notes",
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchProcessSteps(): Promise<ProcessStep[]> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.CONTENT },
      select: { value: true },
    });

    if (!record?.value) return DEFAULT_SITE_CONFIG.content.processSteps as unknown as ProcessStep[];

    const parsed = JSON.parse(record.value) as Partial<SiteConfigContent>;
    const steps = parsed.processSteps;

    if (Array.isArray(steps) && steps.length > 0) return steps;
    return DEFAULT_SITE_CONFIG.content.processSteps as unknown as ProcessStep[];
  } catch {
    return DEFAULT_SITE_CONFIG.content.processSteps as unknown as ProcessStep[];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProcessPage() {
  const processSteps = await fetchProcessSteps();

  // Merge step data with static phase details — up to 4 phases
  const phases = PHASE_DETAILS.map((detail, index) => ({
    number: index + 1,
    step: processSteps[index] ?? null,
    detail,
  }));

  return (
   <main className="min-h-screen">
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent uppercase tracking-widest mb-4">
              How We Work
            </p>
            <h1 className="text-5xl font-heading font-bold text-foreground tracking-tight leading-tight mb-6">
              From idea to live site — no surprises.
            </h1>
            <p className="text-lg text-muted leading-relaxed">
              Every project follows the same transparent four-phase process.
              You know exactly what happens at each stage, what I need from you,
              and what you receive at the end.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Timeline + phases                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-16">

            {/* Left: sticky animated timeline (client component) */}
            <div className="hidden lg:block">
              <ProcessTimeline phases={phases} />
            </div>

            {/* Right: phase detail content */}
            <div className="space-y-0">
              {phases.map(({ number, step, detail }, index) => (
                <PhaseSection
                  key={number}
                  number={number}
                  headline={step?.headline ?? `Phase ${number}`}
                  description={step?.description ?? ""}
                  detail={detail}
                  isLast={index === phases.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Mobile timeline indicator (horizontal steps) */}
          <div className="lg:hidden mt-0 -order-1 mb-16">
            <MobilePhaseIndicator count={phases.length} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom CTA                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
            Ready to start?
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Describe your project idea and receive a price estimate in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/order"
              className="inline-flex items-center justify-center h-11 px-8 rounded-[--zymbiq-radius] bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Order Custom Site
            </a>
            <a
              href="/showroom"
              className="inline-flex items-center justify-center h-11 px-8 rounded-[--zymbiq-radius] border border-border text-foreground font-medium text-sm hover:bg-surface transition-colors"
            >
              Browse Pre-built
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// PhaseSection — server-rendered phase content block
// ---------------------------------------------------------------------------

interface PhaseSectionProps {
  number: number;
  headline: string;
  description: string;
  detail: PhaseDetail;
  isLast: boolean;
}

function PhaseSection({
  number,
  headline,
  description,
  detail,
  isLast,
}: PhaseSectionProps) {
  return (
    <div
      id={`phase-${number}`}
      className={`relative py-16 ${!isLast ? "border-b border-border" : ""}`}
    >
      {/* Phase number + headline */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white lg:hidden"
          style={{ backgroundColor: "var(--zymbiq-accent)" }}
        >
          {number}
        </div>
        <div>
          <p className="text-xs font-medium text-accent uppercase tracking-widest mb-1">
            Phase {number} — {detail.duration}
          </p>
          <h2 className="text-2xl font-heading font-bold text-foreground leading-snug">
            {headline}
          </h2>
        </div>
      </div>

      {/* Description from siteConfig */}
      {description && (
        <p className="text-muted leading-relaxed mb-8 max-w-prose">
          {description}
        </p>
      )}

      {/* What happens */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          What happens
        </h3>
        <p className="text-foreground leading-relaxed max-w-prose">
          {detail.whatHappens}
        </p>
      </div>

      {/* Two-column: responsibilities + deliverables */}
      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            What I need from you
          </h3>
          <ul className="space-y-2">
            {detail.clientResponsibilities.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <span
                  className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--zymbiq-accent)" }}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            What you receive
          </h3>
          <ul className="space-y-2">
            {detail.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <span
                  className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobilePhaseIndicator — simple numbered stepper for mobile viewports
// ---------------------------------------------------------------------------

function MobilePhaseIndicator({ count }: { count: number }) {
  const labels = ["Discovery", "Build", "Review", "Delivery"];
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center flex-shrink-0">
          <a
            href={`#phase-${index + 1}`}
            className="flex flex-col items-center gap-1 px-3"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "var(--zymbiq-accent)" }}
            >
              {index + 1}
            </div>
            <span className="text-xs text-muted whitespace-nowrap">
              {labels[index] ?? `Phase ${index + 1}`}
            </span>
          </a>
          {index < count - 1 && (
            <div className="w-8 h-px bg-border flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}