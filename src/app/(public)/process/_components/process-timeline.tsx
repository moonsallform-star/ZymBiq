// Zymbiq — src/app/(public)/process/_components/process-timeline.tsx
// Client component: sticky left-rail timeline with scroll-driven active phase
// highlighting and animated connecting line via Framer Motion + useInView.

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface PhaseData {
  number: number;
  step: { icon: string; headline: string; description: string } | null;
  detail: { duration: string };
}

interface ProcessTimelineProps {
  phases: PhaseData[];
}

const PHASE_LABELS = ["Discovery", "Build", "Review", "Delivery"];

export default function ProcessTimeline({ phases }: ProcessTimelineProps) {
  const [activePhase, setActivePhase] = useState(1);
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(lineRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    phases.forEach(({ number }) => {
      const el = document.getElementById(`phase-${number}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActivePhase(number);
        },
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [phases]);

  return (
    <div className="sticky top-24 self-start" ref={lineRef}>
      <p className="text-xs font-medium text-muted uppercase tracking-widest mb-8">
        Process
      </p>

      <div className="relative">
        {/* Background rail */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

        {/* Animated fill — grows from top to active phase */}
        <motion.div
          className="absolute left-[15px] top-0 w-px origin-top"
          style={{ backgroundColor: "var(--zymbiq-accent)" }}
          initial={{ scaleY: 0, height: "100%" }}
          animate={
            isInView
              ? {
                  scaleY: (activePhase - 1) / Math.max(phases.length - 1, 1),
                }
              : { scaleY: 0 }
          }
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Phase nodes */}
        <div className="space-y-10">
          {phases.map(({ number, step, detail }) => {
            const isActive = number === activePhase;
            const isComplete = number < activePhase;
            const label = PHASE_LABELS[number - 1] ?? `Phase ${number}`;

            return (
              <a
                key={number}
                href={`#phase-${number}`}
                className="relative flex items-start gap-4 group"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(`phase-${number}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {/* Node circle */}
                <div className="relative z-10 flex-shrink-0">
                  <motion.div
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors duration-300"
                    animate={{
                      borderColor:
                        isActive || isComplete
                          ? "var(--zymbiq-accent)"
                          : "var(--zymbiq-border)",
                      backgroundColor:
                        isActive || isComplete
                          ? "var(--zymbiq-accent)"
                          : "var(--zymbiq-bg)",
                      color:
                        isActive || isComplete
                          ? "#ffffff"
                          : "var(--zymbiq-muted)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {number}
                  </motion.div>

                  {/* Active pulse ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: "2px solid var(--zymbiq-accent)" }}
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="pt-1 min-w-0">
                  <p
                    className="text-sm font-medium leading-none transition-colors duration-200"
                    style={{
                      color: isActive
                        ? "var(--zymbiq-text)"
                        : isComplete
                        ? "var(--zymbiq-muted)"
                        : "var(--zymbiq-muted)",
                    }}
                  >
                    {step?.headline ?? label}
                  </p>
                  <p className="text-xs text-muted mt-1 truncate">
                    {detail.duration}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}