// =============================================================================
// Zymbiq — src/components/sections/how-it-works.tsx
// Process steps section with icon lookup, animated SVG line, stagger animation.
// =============================================================================

'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Icon map — extend as needed to cover all icons admins may enter
// -----------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle: LucideIcons.MessageCircle,
  Code: LucideIcons.Code,
  Code2: LucideIcons.Code2,
  CheckCircle: LucideIcons.CheckCircle,
  CheckCircle2: LucideIcons.CheckCircle2,
  Rocket: LucideIcons.Rocket,
  Lightbulb: LucideIcons.Lightbulb,
  Search: LucideIcons.Search,
  FileText: LucideIcons.FileText,
  Send: LucideIcons.Send,
  Zap: LucideIcons.Zap,
  Star: LucideIcons.Star,
  Globe: LucideIcons.Globe,
  Layers: LucideIcons.Layers,
  Package: LucideIcons.Package,
  Settings: LucideIcons.Settings,
  Users: LucideIcons.Users,
  ArrowRight: LucideIcons.ArrowRight,
  Clock: LucideIcons.Clock,
  Cpu: LucideIcons.Cpu,
  Layout: LucideIcons.Layout,
  Monitor: LucideIcons.Monitor,
  PenTool: LucideIcons.PenTool,
  Briefcase: LucideIcons.Briefcase,
  Award: LucideIcons.Award,
  Heart: LucideIcons.Heart,
  ThumbsUp: LucideIcons.ThumbsUp,
  Download: LucideIcons.Download,
  Upload: LucideIcons.Upload,
  Handshake: LucideIcons.Handshake,
};

function resolveIcon(name: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[name] ?? LucideIcons.Circle;
}

// -----------------------------------------------------------------------------
// Framer Motion variants
// -----------------------------------------------------------------------------

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const lineVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: 'easeInOut', delay: 0.2 },
  },
};

// -----------------------------------------------------------------------------
// Step component
// -----------------------------------------------------------------------------

interface StepProps {
  step: { icon: string; headline: string; description: string };
  index: number;
  total: number;
}

function Step({ step, index }: StepProps) {
  const Icon = resolveIcon(step.icon);

  return (
    <motion.div
      variants={fadeInUp}
      className="flex flex-col items-center text-center px-4 flex-1 min-w-0"
    >
      {/* Icon circle */}
      <div className="relative mb-4">
        {/* Numbered badge */}
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white
                     flex items-center justify-center text-[10px] font-bold z-10
                     leading-none"
          aria-hidden="true"
        >
          {index + 1}
        </div>

        <div
          className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20
                     flex items-center justify-center"
        >
          <Icon className="w-7 h-7 text-accent" />
        </div>
      </div>

      {/* Text */}
      <h3 className="font-semibold text-foreground text-base mb-1 leading-snug">
        {step.headline}
      </h3>
      <p className="text-muted text-sm leading-relaxed max-w-[180px]">
        {step.description}
      </p>
    </motion.div>
  );
}

// Mobile vertical step
function StepVertical({ step, index, total }: StepProps) {
  const Icon = resolveIcon(step.icon);
  const isLast = index === total - 1;

  return (
    <motion.div variants={fadeInUp} className="flex gap-5">
      {/* Left: icon + connector */}
      <div className="flex flex-col items-center">
        <div
          className="relative w-12 h-12 rounded-full bg-accent/10 border border-accent/20
                     flex items-center justify-center shrink-0"
        >
          {/* Number badge */}
          <span
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent
                       text-white text-[9px] font-bold flex items-center justify-center
                       leading-none"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <Icon className="w-5 h-5 text-accent" />
        </div>

        {/* Connector line */}
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-2 mb-0 min-h-[2rem]" aria-hidden="true" />
        )}
      </div>

      {/* Right: text */}
      <div className={cn('pb-8', isLast && 'pb-0')}>
        <h3 className="font-semibold text-foreground text-base mb-1 leading-snug">
          {step.headline}
        </h3>
        <p className="text-muted text-sm leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Animated SVG connecting line (desktop)
// -----------------------------------------------------------------------------

function ConnectingLine({ stepCount }: { stepCount: number }) {
  // Line spans from left-center of first step icon to right-center of last.
  // We use a simple horizontal line across the full width at icon midpoint.
  // Width is 100% of the container minus first/last icon half-widths (approx).
  const segments = stepCount - 1;
  if (segments <= 0) return null;

  return (
    <div
      className="absolute top-8 left-0 right-0 hidden md:block pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <svg
        className="w-full"
        height="2"
        viewBox={`0 0 ${segments * 100} 2`}
        preserveAspectRatio="none"
        fill="none"
      >
        <motion.line
          x1="0"
          y1="1"
          x2={`${segments * 100}`}
          y2="1"
          stroke="var(--zymbiq-border)"
          strokeWidth="1.5"
          strokeDasharray="1"
          variants={lineVariant}
        />
        <motion.line
          x1="0"
          y1="1"
          x2={`${segments * 100}`}
          y2="1"
          stroke="var(--zymbiq-accent)"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          variants={lineVariant}
        />
      </svg>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function HowItWorks() {
  const { data: siteConfig } = useSiteConfig();
  const processSteps = siteConfig.content.processSteps ?? [];

  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  if (processSteps.length === 0) return null;

  const sectionTitle = 'How It Works';

  return (
    <section
      ref={sectionRef}
      className="forge-section py-24 md:py-32"
      aria-labelledby="how-it-works-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2
            id="how-it-works-title"
            className="text-3xl md:text-4xl font-heading font-semibold text-foreground
                       tracking-tight mb-3"
          >
            {sectionTitle}
          </h2>
          <p className="text-muted text-base max-w-md mx-auto">
            From idea to delivered product — a clear, structured process with no surprises.
          </p>
        </motion.div>

        {/* Desktop: horizontal row */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="hidden md:flex items-start relative"
        >
          <ConnectingLine stepCount={processSteps.length} />

          {processSteps.map((step, i) => (
            <Step
              key={i}
              step={step}
              index={i}
              total={processSteps.length}
            />
          ))}
        </motion.div>

        {/* Mobile: vertical list */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="flex md:hidden flex-col"
        >
          {processSteps.map((step, i) => (
            <StepVertical
              key={i}
              step={step}
              index={i}
              total={processSteps.length}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}