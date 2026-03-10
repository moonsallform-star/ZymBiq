// src/app/sitemap.ts
// Dynamic XML sitemap — covers all public routes + ISR project/blog slugs.

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS, DEFAULT_SITE_CONFIG } from "@/lib/constants";
import type { SiteConfigPlatform } from "@/types/index";

async function getBaseUrl(): Promise<string> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.PLATFORM },
      select: { value: true },
    });
    if (row?.value) {
      const platform = JSON.parse(row.value) as SiteConfigPlatform;
      if (platform.domain) {
        const domain = platform.domain.startsWith("http")
          ? platform.domain
          : `https://${platform.domain}`;
        return domain.replace(/\/$/, "");
      }
    }
  } catch {
    // fall through
  }
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://zymbiq.com"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getBaseUrl();
  const now = new Date();

  // ── Static routes ──────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/showroom`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/order`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/process`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // ── Project slugs ──────────────────────────────────────────────────────────
  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    const projects = await prisma.project.findMany({
      where: { isVisible: true },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    });
    projectRoutes = projects.map((p) => ({
      url: `${baseUrl}/showroom/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    // DB unavailable — skip dynamic routes
  }

  // ── Blog slugs ─────────────────────────────────────────────────────────────
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    blogRoutes = posts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  } catch {
    // DB unavailable — skip dynamic routes
  }

  return [...staticRoutes, ...projectRoutes, ...blogRoutes];
}