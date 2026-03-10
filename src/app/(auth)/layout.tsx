// =============================================================================
// Zymbiq — src/app/(auth)/layout.tsx
// Minimal centered auth shell with logo, brand name, and toast notifications.
// =============================================================================

import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/toaster";
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from "@/lib/constants";
import type { SiteConfigAppearance, SiteConfigPlatform } from "@/types/index";

async function getAuthLayoutConfig(): Promise<{
  logoUrl: string | undefined;
  platformName: string;
}> {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: {
        key: {
          in: [SITE_CONFIG_KEYS.APPEARANCE, SITE_CONFIG_KEYS.PLATFORM],
        },
      },
      select: { key: true, value: true },
    });

    let logoUrl: string | undefined;
    let platformName = DEFAULT_SITE_CONFIG.platform.name;

    for (const config of configs) {
      if (config.key === SITE_CONFIG_KEYS.APPEARANCE) {
        try {
          const appearance = JSON.parse(config.value) as Partial<SiteConfigAppearance>;
          logoUrl = appearance.logoUrl ?? undefined;
        } catch {
          // fall through to defaults
        }
      }
      if (config.key === SITE_CONFIG_KEYS.PLATFORM) {
        try {
          const platform = JSON.parse(config.value) as Partial<SiteConfigPlatform>;
          platformName = platform.name ?? DEFAULT_SITE_CONFIG.platform.name;
        } catch {
          // fall through to defaults
        }
      }
    }

    return { logoUrl, platformName };
  } catch {
    return {
      logoUrl: undefined,
      platformName: DEFAULT_SITE_CONFIG.platform.name,
    };
  }
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logoUrl, platformName } = await getAuthLayoutConfig();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Brand / Logo */}
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={platformName}
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          ) : (
            <span className="text-2xl font-bold text-foreground tracking-tight group-hover:text-accent transition-colors duration-200">
              {platformName}
            </span>
          )}
        </Link>
      </div>

      {/* Auth card content */}
      <main className="w-full max-w-md">{children}</main>

      {/* Back to home */}
      <div className="mt-8">
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground transition-colors duration-200"
        >
          ← Back to {platformName}
        </Link>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}