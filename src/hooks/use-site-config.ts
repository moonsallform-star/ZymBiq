// =============================================================================
// Zymbiq — src/hooks/use-site-config.ts
// Client-side hook for fetching, parsing, and caching all SiteConfig values.
// =============================================================================

'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  QUERY_KEYS,
  DEFAULT_SITE_CONFIG,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_STALE_TIME_MS,
} from '@/lib/constants';
import type {
  ParsedSiteConfig,
  SiteConfigAppearance,
  SiteConfigLayout,
  SiteConfigContent,
  SiteConfigAI,
  SiteConfigCommunication,
  SiteConfigPayments,
  SiteConfigPlatform,
  SiteConfigDevforge,
} from '@/types/index';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// API response shape from GET /api/admin/site-config
// -----------------------------------------------------------------------------

type SiteConfigApiResponse = {
  data: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// Safe JSON parser — returns the fallback value on any failure
// -----------------------------------------------------------------------------

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (raw === undefined || raw === null) return fallback;
  try {
    // The API already returns parsed objects (JSON.parse done server-side).
    // Accept objects directly; only attempt string parse if a raw string arrives.
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Fallback fills only keys missing from DB value — DB value always wins.
      return {
        ...(fallback as Record<string, unknown>),
        ...(parsed as Partial<T>),
      } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// Fetcher
// -----------------------------------------------------------------------------

async function fetchSiteConfig(): Promise<ParsedSiteConfig> {
    const response = await fetch('/api/admin/site-config', { cache: 'no-store' });

  if (!response.ok) {
    // Return defaults silently for non-admin users (403) or any other failure
    return {
      appearance: DEFAULT_SITE_CONFIG.appearance as SiteConfigAppearance,
      layout: DEFAULT_SITE_CONFIG.layout as unknown as SiteConfigLayout,
      content: DEFAULT_SITE_CONFIG.content as unknown as SiteConfigContent,
      ai: DEFAULT_SITE_CONFIG.ai as unknown as SiteConfigAI,
      communication: DEFAULT_SITE_CONFIG.communication as SiteConfigCommunication,
      payments: DEFAULT_SITE_CONFIG.payments as SiteConfigPayments,
      platform: DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform,
      devforge: DEFAULT_SITE_CONFIG.devforge as SiteConfigDevforge,
    };
  }

  const json = (await response.json()) as SiteConfigApiResponse;
  const raw = json.data ?? {};

  const appearance = safeParseJson<SiteConfigAppearance>(
    raw[SITE_CONFIG_KEYS.APPEARANCE],
    DEFAULT_SITE_CONFIG.appearance as SiteConfigAppearance,
  );

  const layout = safeParseJson<SiteConfigLayout>(
    raw[SITE_CONFIG_KEYS.LAYOUT],
    DEFAULT_SITE_CONFIG.layout as unknown as SiteConfigLayout,
  );

  const content = safeParseJson<SiteConfigContent>(
    raw[SITE_CONFIG_KEYS.CONTENT],
    DEFAULT_SITE_CONFIG.content as unknown as SiteConfigContent,
  );

  const ai = safeParseJson<SiteConfigAI>(
    raw[SITE_CONFIG_KEYS.AI],
    DEFAULT_SITE_CONFIG.ai as unknown as SiteConfigAI,
  );

  const communication = safeParseJson<SiteConfigCommunication>(
    raw[SITE_CONFIG_KEYS.COMMUNICATION],
    DEFAULT_SITE_CONFIG.communication as SiteConfigCommunication,
  );

  const payments = safeParseJson<SiteConfigPayments>(
    raw[SITE_CONFIG_KEYS.PAYMENTS],
    DEFAULT_SITE_CONFIG.payments as SiteConfigPayments,
  );

  const platform = safeParseJson<SiteConfigPlatform>(
    raw[SITE_CONFIG_KEYS.PLATFORM],
    DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform,
  );

  const devforge = safeParseJson<SiteConfigDevforge>(
    raw[SITE_CONFIG_KEYS.DEVFORGE] ?? {},
    DEFAULT_SITE_CONFIG.devforge as SiteConfigDevforge,
  );

  return {
    appearance,
    layout,
    content,
    ai,
    communication,
    payments,
    platform,
    devforge,
  };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useSiteConfig(): {
  data: ParsedSiteConfig;
  isLoading: boolean;
  error: Error | null;
} {
  const setAnimationIntensity = useStore((s) => s.setAnimationIntensity);
  const setSiteConfigLoaded = useStore((s) => s.setSiteConfigLoaded);

  const { data, isLoading, error } = useQuery<ParsedSiteConfig, Error>({
    queryKey: QUERY_KEYS.siteConfig(),
    queryFn: fetchSiteConfig,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Sync animation intensity and loaded flag into Zustand whenever data arrives
  useEffect(() => {
    if (data) {
      setAnimationIntensity(data.layout.animationIntensity);
      setSiteConfigLoaded(true);
    }
  }, [data, setAnimationIntensity, setSiteConfigLoaded]);

  // Memoize the resolved config — prevents consumers from re-rendering when
  // parent components re-render but the site config data hasn't changed.
  // The fallback object is also memoized so it's referentially stable.
  const resolved = useMemo<ParsedSiteConfig>(
    () =>
      data ?? {
        appearance: DEFAULT_SITE_CONFIG.appearance as SiteConfigAppearance,
        layout: DEFAULT_SITE_CONFIG.layout as unknown as SiteConfigLayout,
        content: DEFAULT_SITE_CONFIG.content as unknown as SiteConfigContent,
        ai: DEFAULT_SITE_CONFIG.ai as unknown as SiteConfigAI,
        communication: DEFAULT_SITE_CONFIG.communication as SiteConfigCommunication,
        payments: DEFAULT_SITE_CONFIG.payments as SiteConfigPayments,
        platform: DEFAULT_SITE_CONFIG.platform as unknown as SiteConfigPlatform,
        devforge: DEFAULT_SITE_CONFIG.devforge as SiteConfigDevforge,
      },
    [data],
  );

  return {
    data: resolved,
    isLoading,
    error: error ?? null,
  };
}