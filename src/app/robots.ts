// src/app/robots.ts
// Robots.txt generation — blocks admin/dashboard/api from crawlers.

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG_KEYS } from "@/lib/constants";
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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/register",
          "/checkout/",
          "/track/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/register",
          "/checkout/",
          "/track/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}