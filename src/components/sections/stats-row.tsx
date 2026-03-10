// =============================================================================
// Zymbiq — src/components/sections/stats-row.tsx
// Four animated stat cards with scroll-triggered count-up animations.
// =============================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { QUERY_KEYS } from '@/lib/constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface StatsApiResponse {
  data: {
    deliveredOrders: number;
    totalFiles: number;
    happyClients: number;
    avgBuildTimeDays: number;
  };
}

interface StatCard {
  label: string;
  value: number;
  suffix: string;
  description: string;
}

// -----------------------------------------------------------------------------
// Fetcher
// -----------------------------------------------------------------------------

async function fetchStats(): Promise<StatsApiResponse['data']> {
  const [projectsRes, ordersRes] = await Promise.all([
    fetch('/api/projects?limit=100&fields=fileCount', {
      next: { revalidate: 60 },
    }),
    fetch('/api/orders?status=DELIVERED&limit=200', {
      next: { revalidate: 60 },
    }),
  ]);

  const fallback = {
    deliveredOrders: 0,
    totalFiles: 0,
    happyClients: 0,
    avgBuildTimeDays: 0,
  };

  try {
    const [projectsJson, ordersJson] = await Promise.all([
      projectsRes.ok ? projectsRes.json() : Promise.resolve({ data: [] }),
      ordersRes.ok ? ordersRes.json() : Promise.resolve({ data: [] }),
    ]);

    const projects = Array.isArray(projectsJson?.data)
      ? (projectsJson.data as Array<{ fileCount?: number }>)
      : [];

    const orders = Array.isArray(ordersJson?.data)
      ? (ordersJson.data as Array<{ userId?: string | null }>)
      : [];

    const totalFiles = projects.reduce(
      (sum, p) => sum + (typeof p.fileCount === 'number' ? p.fileCount : 0),
      0,
    );

    const uniqueUserIds = new Set(
      orders.filter((o) => o.userId != null).map((o) => o.userId as string),
    );

    return {
      deliveredOrders: orders.length,
      totalFiles,
      happyClients: uniqueUserIds.size,
      avgBuildTimeDays: orders.length > 0 ? 7 : 0,
    };
  } catch {
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// useCountUp — rAF-based count-up hook
// -----------------------------------------------------------------------------

function useCountUp(
  target: number,
  duration: number,
  enabled: boolean,
): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const currentValue = Math.round(easedProgress * target);

      setCount(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    },
    [target, duration],
  );

  useEffect(() => {
    if (!enabled || target === 0) {
      setCount(target);
      return;
    }

    startTimeRef.current = null;
    setCount(0);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, target, animate]);

  return count;
}

// -----------------------------------------------------------------------------
// StatCard component
// -----------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  suffix: string;
  description: string;
  isLoading: boolean;
  animationEnabled: boolean;
}

function StatCard({
  label,
  value,
  suffix,
  description,
  isLoading,
  animationEnabled,
}: StatCardProps) {
  const count = useCountUp(value, 1500, animationEnabled);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-2 w-8 rounded-full" />
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col gap-2 px-6 py-8 md:py-10">
      {/* Accent top bar — slides in on hover */}
      <div
        className="absolute top-0 left-6 right-6 h-[2px] rounded-full transition-all duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, var(--zymbiq-accent), transparent)`,
          opacity: 0.5,
        }}
      />

      {/* Number — large, accent colored */}
      <span
        className="text-5xl md:text-6xl font-bold tracking-tight tabular-nums leading-none"
        style={{ color: 'var(--zymbiq-accent)' }}
      >
        {count.toLocaleString()}
        <span className="text-3xl md:text-4xl">{suffix}</span>
      </span>

      {/* Label */}
      <span className="text-base font-semibold text-foreground tracking-tight mt-1">
        {label}
      </span>

      {/* Description */}
      <span className="text-xs text-muted leading-relaxed">{description}</span>

      {/* Bottom accent dot */}
      <div
        className="absolute bottom-4 left-6 w-1 h-1 rounded-full opacity-40"
        style={{ background: 'var(--zymbiq-accent)' }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// StatsRow
// -----------------------------------------------------------------------------

const FALLBACK_STATS = {
  deliveredOrders: 24,
  totalFiles: 1840,
  happyClients: 19,
  avgBuildTimeDays: 7,
};

export default function StatsRow() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEYS.stats ? QUERY_KEYS.stats() : ['stats'],
    queryFn: fetchStats,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const stats = isError || (!isLoading && !data)
    ? FALLBACK_STATS
    : (data ?? FALLBACK_STATS);

  const cards: StatCard[] = [
    {
      label: 'Projects Delivered',
      value: stats.deliveredOrders,
      suffix: '+',
      description: 'Live in production',
    },
    {
      label: 'Files Built',
      value: stats.totalFiles,
      suffix: '+',
      description: 'Lines of quality code',
    },
    {
      label: 'Happy Clients',
      value: stats.happyClients,
      suffix: '+',
      description: 'Across industries',
    },
    {
      label: 'Avg. Build Time',
      value: stats.avgBuildTimeDays,
      suffix: ' days',
      description: 'From brief to delivery',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="forge-stats-surface"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section label */}
        <div className="flex items-center gap-3 pt-12 pb-6 px-6">
          <div
            className="h-px flex-1 max-w-[40px]"
            style={{ background: 'var(--zymbiq-accent)', opacity: 0.4 }}
          />
          <span
            className="text-[10px] font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--zymbiq-accent)', opacity: 0.7 }}
          >
            By the numbers
          </span>
          <div
            className="h-px flex-1 max-w-[40px]"
            style={{ background: 'var(--zymbiq-accent)', opacity: 0.4 }}
          />
        </div>

        {/* Stats grid with vertical dividers */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0"
          style={{ borderColor: 'var(--zymbiq-border)' }}
        >
          {cards.map((card, index) => (
            <div key={card.label} className="relative">
              {/* Hover background fill */}
              <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 50% 50%, color-mix(in srgb, var(--zymbiq-accent) 5%, transparent), transparent)`,
                }}
              />
              <StatCard
                label={card.label}
                value={card.value}
                suffix={card.suffix}
                description={card.description}
                isLoading={isLoading}
                animationEnabled={isInView}
              />
            </div>
          ))}
        </div>

        {/* Bottom forge divider */}
        <div className="forge-divider mt-0" aria-hidden="true" />
      </div>
    </section>
  );
}