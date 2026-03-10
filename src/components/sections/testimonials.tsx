"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface Testimonial {
  id: string;
  clientName: string;
  projectType: string;
  quote: string;
  avatarUrl?: string | null;
  isVisible: boolean;
  sortOrder: number;
}

interface TestimonialsProps {
  testimonials: Testimonial[];
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="flex h-full flex-col justify-between border border-border p-6 shadow-none">
        {/* Quote mark */}
        <div
          aria-hidden="true"
          className="mb-3 font-serif text-5xl leading-none text-accent/30 select-none"
        >
          &ldquo;
        </div>

        {/* Quote text */}
        <p
          className="mb-6 line-clamp-4 flex-1 text-sm text-muted leading-relaxed"
          title={testimonial.quote}
        >
          {testimonial.quote}
        </p>

        {/* Client info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            {testimonial.avatarUrl ? (
              <AvatarImage
                src={testimonial.avatarUrl}
                alt={testimonial.clientName}
              />
            ) : null}
            <AvatarFallback>
              {getInitials(testimonial.clientName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {testimonial.clientName}
            </p>
          </div>

          <Badge variant="outline" className="shrink-0 text-xs">
            {testimonial.projectType}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Testimonials({ testimonials }: TestimonialsProps) {
  const visible = testimonials
    .filter((t) => t.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  if (visible.length === 0) return null;

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {visible.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}