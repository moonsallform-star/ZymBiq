// src/lib/seo.ts
// Shared SEO helpers: base URL resolver, canonical builder, JSON-LD factories.
// Server-only — never import in client components.

import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS, DEFAULT_SITE_CONFIG } from "@/lib/constants";
import type { SiteConfigPlatform } from "@/types/index";

// ─────────────────────────────────────────────────────────────────────────────
// Base URL
// ─────────────────────────────────────────────────────────────────────────────

export async function getBaseUrl(): Promise<string> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.PLATFORM },
      select: { value: true },
    });
    if (row?.value) {
      const platform = JSON.parse(row.value) as SiteConfigPlatform;
      if (platform.domain) {
        const d = platform.domain.startsWith("http")
          ? platform.domain
          : `https://${platform.domain}`;
        return d.replace(/\/$/, "");
      }
    }
  } catch {
    // fall through
  }
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com";
}

export async function getPlatformConfig(): Promise<SiteConfigPlatform> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.PLATFORM },
      select: { value: true },
    });
    if (row?.value) return JSON.parse(row.value) as SiteConfigPlatform;
  } catch {
    // fall through
  }
  return DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD factories
// ─────────────────────────────────────────────────────────────────────────────

export function buildOrganizationJsonLd(
  platform: SiteConfigPlatform,
  baseUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platform.name || "Zymbiq",
    url: baseUrl,
    ...(platform.domain && { sameAs: [`https://${platform.domain}`] }),
    ...(platform.socialLinks?.twitter && {
      sameAs: [
        `https://twitter.com/${platform.socialLinks.twitter.replace("@", "")}`,
      ],
    }),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      ...(platform.supportEmail && { email: platform.supportEmail }),
      availableLanguage: ["English"],
    },
  };
}

export function buildWebsiteJsonLd(
  platform: SiteConfigPlatform,
  baseUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: platform.name || "Zymbiq",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/showroom?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildProductJsonLd(
  project: {
    title: string;
    description: string;
    price: number;
    thumbnailUrl: string | null;
    slug: string;
    qualityScore: number;
    category: string;
  },
  baseUrl: string,
  platformName: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: project.title,
    description: project.description,
    url: `${baseUrl}/showroom/${project.slug}`,
    category: project.category,
    ...(project.thumbnailUrl && {
      image: [project.thumbnailUrl],
    }),
    brand: {
      "@type": "Brand",
      name: platformName,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: project.price.toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/showroom/${project.slug}`,
      seller: {
        "@type": "Organization",
        name: platformName,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (project.qualityScore / 20).toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: "1",
    },
  };
}

export function buildBlogPostingJsonLd(
  post: {
    title: string;
    excerpt: string;
    content: string;
    coverImageUrl: string | null;
    slug: string;
    publishedAt: Date | null;
    updatedAt: Date;
    readTime: number;
  },
  baseUrl: string,
  platformName: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${baseUrl}/blog/${post.slug}`,
    ...(post.coverImageUrl && { image: [post.coverImageUrl] }),
    ...(post.publishedAt && {
      datePublished: post.publishedAt.toISOString(),
    }),
    dateModified: post.updatedAt.toISOString(),
    timeRequired: `PT${post.readTime}M`,
    author: {
      "@type": "Organization",
      name: platformName,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: platformName,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`,
    },
  };
}

export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}