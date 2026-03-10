// Zymbiq — src/app/(public)/pricing/page.tsx
// Server Component: fetches pricing tiers and FAQ items, renders feature
// comparison cards with recommended highlight and pricing FAQ accordion.

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ISR
// ---------------------------------------------------------------------------

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";
  return {
    title: "Pricing — One-Time Website Pricing | Zymbiq",
    description:
      "Transparent, one-time pricing for production-ready websites. No subscriptions, no surprises. Starter, Professional, and Enterprise tiers.",
    alternates: { canonical: `${baseUrl}/pricing` },
    openGraph: {
      title: "Pricing — One-Time Website Pricing | Zymbiq",
      description:
        "Transparent, one-time pricing for production-ready websites. No subscriptions, no surprises.",
      url: `${baseUrl}/pricing`,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PricingPage() {
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";

  const [pricingTiers, pricingFaqs] = await Promise.all([
    prisma.pricingTier.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.faqItem.findMany({
      where: { category: "pricing", isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Zymbiq Pricing Tiers",
    url: `${baseUrl}/pricing`,
    itemListElement: pricingTiers.map((tier, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Offer",
        name: tier.name,
        price: tier.price.toFixed(2),
        priceCurrency: "USD",
        description: tier.features.join(", "),
        url: `${baseUrl}/pricing`,
      },
    })),
  };

  const faqJsonLd =
    pricingFaqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pricingFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    <main className="min-h-screen bg-background">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">
            Pricing
          </p>
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Simple, one-time pricing.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Every project is a single payment. No recurring fees, no hidden
            costs — just production-ready websites delivered.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Tier Cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {pricingTiers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface py-24 text-center">
              <p className="text-muted">
                Configure pricing in admin panel to display tiers here.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                pricingTiers.length === 1 && "max-w-sm mx-auto",
                pricingTiers.length === 2 && "md:grid-cols-2 max-w-3xl mx-auto",
                pricingTiers.length >= 3 && "md:grid-cols-3"
              )}
            >
              {pricingTiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Custom Order CTA                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            Need something different?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Describe your idea and get an instant AI-powered estimate tailored
            to your project scope and timeline.
          </p>
          <Button asChild size="lg" variant="accent" className="mt-8">
            <Link href="/order">
              Start Custom Order
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing FAQ                                                         */}
      {/* ------------------------------------------------------------------ */}
      {pricingFaqs.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading mb-10 text-center text-3xl font-bold text-foreground">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {pricingFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-base text-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}
    </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// TierCard — individual pricing tier
// ---------------------------------------------------------------------------

type PricingTier = Awaited <
  ReturnType<typeof prisma.pricingTier.findMany>
>[number];

function TierCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface p-8 transition-shadow",
        tier.isRecommended
          ? "border-accent shadow-lg shadow-accent/10 ring-2 ring-accent"
          : "border-border hover:shadow-md"
      )}
    >
      {/* Recommended badge */}
      {tier.isRecommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge variant="accent" className="px-4 py-1 text-xs font-semibold">
            Most Popular
          </Badge>
        </div>
      )}

      {/* Tier name */}
      <h3 className="font-heading text-xl font-bold text-foreground">
        {tier.name}
      </h3>

      {/* Price */}
      <div className="mt-4 flex items-end gap-1">
        <span className="font-heading text-4xl font-bold text-foreground">
          ${tier.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
        <span className="mb-1 text-sm text-muted">{tier.billingLabel}</span>
      </div>

      {/* Divider */}
      <div className="my-6 h-px w-full bg-border" />

      {/* Features */}
      <ul className="flex flex-1 flex-col gap-3">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span className="text-sm text-foreground leading-snug">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        asChild
        size="lg"
        variant={tier.isRecommended ? "accent" : "outline"}
        className="mt-8 w-full"
      >
        <Link href="/order">{tier.ctaLabel}</Link>
      </Button>
    </div>
  );
}