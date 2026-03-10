// Zymbiq — src/app/(public)/faq/_components/faq-client.tsx
// Client component: search input + client-side filtered accordion by category.

"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { FaqItem } from "@prisma/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface GroupedEntry {
  category: string;
  items: FaqItem[];
}

interface FaqClientProps {
  groupedEntries: GroupedEntry[];
}

// =============================================================================
// Component
// =============================================================================

export default function FaqClient({ groupedEntries }: FaqClientProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const trimmed = searchQuery.trim().toLowerCase();

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered: GroupedEntry[] = React.useMemo(() => {
    if (!trimmed) return groupedEntries;

    return groupedEntries
      .map(({ category, items }) => ({
        category,
        items: items.filter(
          (item) =>
            item.question.toLowerCase().includes(trimmed) ||
            item.answer.toLowerCase().includes(trimmed)
        ),
      }))
      .filter(({ items }) => items.length > 0);
  }, [groupedEntries, trimmed]);

  const totalFaqs = groupedEntries.reduce(
    (acc, g) => acc + g.items.length,
    0
  );

  // ── Empty DB state ────────────────────────────────────────────────────────
  if (totalFaqs === 0) {
    return (
      <p className="text-center text-muted">
        No FAQs yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {/* Search input */}
      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search FAQ…"
          aria-label="Search frequently asked questions"
          className={cn(
            "h-11 w-full rounded-[--zymbiq-radius] border border-border bg-surface",
            "pl-10 pr-10 text-sm text-foreground placeholder:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            "transition-colors"
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* No search results */}
      {filtered.length === 0 && trimmed ? (
        <p className="text-muted">
          No matching questions for{" "}
          <span className="font-medium text-foreground">
            &ldquo;{searchQuery.trim()}&rdquo;
          </span>
          .{" "}
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-accent underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            Clear search
          </button>
        </p>
      ) : (
        /* Category groups */
        filtered.map(({ category, items }) => (
          <div key={category} className="space-y-4">
            <h2 className="font-heading text-xl font-semibold capitalize text-foreground md:text-2xl">
              {category}
            </h2>

            <Accordion type="multiple" className="w-full">
              {items.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="leading-relaxed">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))
      )}
    </div>
  );
}