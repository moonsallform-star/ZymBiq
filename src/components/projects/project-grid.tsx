// =============================================================================
// Zymbiq — src/components/projects/project-grid.tsx
// Infinite-scroll project grid with filter integration, skeleton loading,
// empty state, and floating comparison bar.
// =============================================================================

'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { X, GitCompareArrows } from 'lucide-react';

import ProjectCard from '@/components/projects/project-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/index';
import type { ProjectWithFaqs } from '@/types/database';
import type { PaginatedResponse } from '@/types/api';

// Lazy-load the comparison dialog to avoid loading it on initial paint
const ProjectComparison = React.lazy(
  () => import('@/components/projects/project-comparison'),
);

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

// -----------------------------------------------------------------------------
// Skeleton card
// -----------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-[--zymbiq-radius] border border-border overflow-hidden bg-surface">
      <Skeleton className="w-full aspect-video" />
      <div className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex items-center gap-2 px-4 pb-4 pt-1">
        <Skeleton className="h-[44px] flex-1" />
        <Skeleton className="h-[44px] flex-1" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Build query string from URL search params
// -----------------------------------------------------------------------------

function buildApiParams(
  searchParams: URLSearchParams,
  cursor?: string,
): string {
  const p = new URLSearchParams(searchParams);
  p.set('limit', String(PAGE_SIZE));
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface ProjectGridProps {
  /** Replaces paginated results with AI search results when provided */
  onAiResults?: ProjectWithFaqs[] | null;
  /** Server-prefetched first page — eliminates the initial client fetch waterfall */
  initialProjects?: ProjectWithFaqs[];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// ComparisonBar — reads Zustand independently so the main grid never re-renders
// when the user ticks/unticks a comparison checkbox.
// -----------------------------------------------------------------------------

const ComparisonBar = React.memo(function ComparisonBar() {
  const comparisonProjects   = useStore((s) => s.comparisonProjects);
  const removeFromComparison = useStore((s) => s.removeFromComparison);
  const clearComparison      = useStore((s) => s.clearComparison);
  const [compareOpen, setCompareOpen] = React.useState(false);

  if (comparisonProjects.length === 0) return null;

  return (
    <>
      <div
        className={[
          'fixed bottom-0 left-0 right-0 z-40',
          'bg-surface/95 backdrop-blur-md',
          'border-t border-border',
          'px-4 py-3',
          'flex items-center gap-3',
          'pb-[calc(0.75rem+60px)] md:pb-3',
        ].join(' ')}
        role="region"
        aria-label="Project comparison"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {comparisonProjects.map((p) => (
            <div key={p.id} className="relative flex-shrink-0 group">
              <div className="h-10 w-16 rounded border border-border bg-muted/10 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs font-medium text-muted truncate px-1 text-center leading-tight">
                    {p.title.length > 10 ? p.title.slice(0, 10) + '…' : p.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeFromComparison(p.id)}
                className={[
                  'absolute -top-1.5 -right-1.5',
                  'h-4 w-4 rounded-full',
                  'bg-foreground text-background',
                  'flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-150',
                  'focus-visible:opacity-100',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                ].join(' ')}
                aria-label={`Remove ${p.title} from comparison`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: 3 - comparisonProjects.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-10 w-16 rounded border border-dashed border-border bg-transparent flex-shrink-0"
              aria-hidden="true"
            />
          ))}
          <span className="hidden sm:block text-sm text-muted ml-1 truncate">
            {comparisonProjects.length} of 3 selected
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-muted hover:text-foreground" onClick={clearComparison}>
            Clear
          </Button>
          <Button
            variant="default" size="sm" className="gap-1.5"
            onClick={() => setCompareOpen(true)}
            disabled={comparisonProjects.length < 2}
            aria-label="Open comparison view"
          >
            <GitCompareArrows className="h-4 w-4" />
            Compare
          </Button>
        </div>
      </div>
      {compareOpen && (
        <React.Suspense fallback={null}>
          <ProjectComparison open={compareOpen} onClose={() => setCompareOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
});

// -----------------------------------------------------------------------------
// ProjectGrid
// -----------------------------------------------------------------------------

export default function ProjectGrid({ onAiResults, initialProjects }: ProjectGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Infinite query ─────────────────────────────────────────────────────────
  // Build a stable filter key from the URL params for cache busting
  const filterKey = searchParams.toString();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery<PaginatedResponse<ProjectWithFaqs>>({
    queryKey: ['projects', filterKey],
    queryFn: async ({ pageParam }) => {
      const qs = buildApiParams(searchParams, pageParam as string | undefined);
      const res = await fetch(`/api/projects?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = await res.json();
      return json as PaginatedResponse<ProjectWithFaqs>;
    },
     initialPageParam: undefined,
    initialData: initialProjects && initialProjects.length > 0
      ? {
          pages: [{ data: initialProjects, hasMore: initialProjects.length === 12, nextCursor: undefined, total: initialProjects.length }],
          pageParams: [undefined],
        }
      : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    staleTime: 60 * 1000,
    enabled: onAiResults == null, // disable when AI results are active
  });

  // ── Intersection Observer for infinite scroll ──────────────────────────────
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── Derived project list ───────────────────────────────────────────────────
  const allProjects: ProjectWithFaqs[] =
    onAiResults != null
      ? onAiResults
      : (data?.pages.flatMap((p) => p.data) ?? []);

  const showEmpty =
    !isLoading && !isError && allProjects.length === 0;

  const allLoaded =
    onAiResults == null &&
    !isLoading &&
    !hasNextPage &&
    allProjects.length > 0;

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Grid                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Initial loading skeletons */}
        {isLoading &&
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={`sk-init-${i}`} />
          ))}

        {/* Project cards */}
        {allProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            showCompareCheckbox
          />
        ))}

        {/* "Fetching more" skeleton append */}
        {isFetchingNextPage &&
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={`sk-more-${i}`} />
          ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sentinel element — triggers next page fetch when visible           */}
      {/* ------------------------------------------------------------------ */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {showEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/20">
            <span className="text-3xl" aria-hidden="true">🔍</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              No projects found
            </h3>
            <p className="text-sm text-muted max-w-xs">
              Try adjusting your filters or search query to find what you're
              looking for.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Error state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm text-muted">
            Something went wrong while loading projects.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Try Again
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* "You've seen everything" end-of-list message                       */}
      {/* ------------------------------------------------------------------ */}
      {allLoaded && (
        <p className="py-8 text-center text-xs text-muted select-none">
          You've seen everything
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Floating comparison bar + dialog — isolated component so grid      */}
      {/* never re-renders when comparison state changes                     */}
      {/* ------------------------------------------------------------------ */}
      <ComparisonBar />
    </>
  );
}