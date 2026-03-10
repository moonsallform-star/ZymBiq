// Zymbiq — src/app/(public)/faq/page.tsx
// Server Component shell: fetches all visible FAQ items, groups by category,
// delegates filtering and rendering to a co-located FaqClient component.

import { FaqItem } from "@prisma/client";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import FaqClient from "./_components/faq-client";

// =============================================================================
// ISR
// =============================================================================

export const revalidate = 300;

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: "FAQ — Zymbiq",
  description:
    "Answers to the most common questions about Zymbiq's pre-built websites, custom orders, payments, and delivery.",
};

// =============================================================================
// Helpers
// =============================================================================

function groupByCategory(items: FaqItem[]): Map<string, FaqItem[]> {
  const map = new Map<string, FaqItem[]>();
  for (const item of items) {
    const bucket = map.get(item.category) ?? [];
    bucket.push(item);
    map.set(item.category, bucket);
  }
  return map;
}

// =============================================================================
// Page
// =============================================================================

export default async function FaqPage() {
  const allFaqs = await prisma.faqItem.findMany({
    where: { isVisible: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const grouped = groupByCategory(allFaqs);

  // Convert to a plain serialisable structure for the client component.
  const groupedEntries: Array<{ category: string; items: FaqItem[] }> =
    Array.from(grouped.entries()).map(([category, items]) => ({
      category,
      items,
    }));

  return (
   <main className="min-h-screen">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Everything you need to know about pre-built projects, custom orders,
            payments, and delivery. Can&apos;t find your answer?{" "}
            <a
              href="/contact"
              className="text-accent underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              Get in touch.
            </a>
          </p>
        </div>
      </section>

      {/* ── Interactive FAQ list ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FaqClient groupedEntries={groupedEntries} />
        </div>
      </section>
    </main>
  );
}