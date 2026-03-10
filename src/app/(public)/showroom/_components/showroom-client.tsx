// =============================================================================
// Zymbiq — src/app/(public)/showroom/_components/showroom-client.tsx
// Client wrapper managing AI search result state bridging AiSearch → ProjectGrid
// =============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AiSearch from '@/components/ai/ai-search';
import ProjectFilters from '@/components/projects/project-filters';
import ProjectGrid from '@/components/projects/project-grid';
import { PROJECT_CATEGORIES } from '@/lib/constants';
import type { ProjectWithFaqs } from '@/types/database';

function CategoryChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get('category') ?? '';
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  const toggle = (cat: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (active === cat) {
      p.delete('category');
    } else {
      p.set('category', cat);
    }
    const qs = p.toString();
    router.replace(pathname + (qs ? `?${qs}` : ''), { scroll: false });
  };

  return (
    <div className="relative flex items-center w-full">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 flex items-center justify-center h-7 w-7 rounded-full transition-all duration-150 shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--zymbiq-bg) 90%, transparent)',
            border: '1px solid color-mix(in srgb, var(--zymbiq-border) 60%, transparent)',
            backdropFilter: 'blur(8px)',
            color: 'var(--zymbiq-text)',
            boxShadow: '2px 0 8px color-mix(in srgb, var(--zymbiq-bg) 80%, transparent)',
          }}
          aria-label="Scroll categories left"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 flex-nowrap overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingLeft: canScrollLeft ? '2rem' : '0',
          paddingRight: canScrollRight ? '2rem' : '0',
          transition: 'padding 0.15s',
        }}
      >
        {PROJECT_CATEGORIES.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className="inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 border whitespace-nowrap shrink-0"
              style={isActive ? {
                background: 'var(--zymbiq-accent)',
                borderColor: 'var(--zymbiq-accent)',
                color: '#fff',
                boxShadow: '0 0 10px color-mix(in srgb, var(--zymbiq-accent) 30%, transparent)',
              } : {
                background: 'transparent',
                borderColor: 'color-mix(in srgb, var(--zymbiq-border) 60%, transparent)',
                color: 'var(--zymbiq-muted)',
              }}
              aria-pressed={isActive}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 flex items-center justify-center h-7 w-7 rounded-full transition-all duration-150 shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--zymbiq-bg) 90%, transparent)',
            border: '1px solid color-mix(in srgb, var(--zymbiq-border) 60%, transparent)',
            backdropFilter: 'blur(8px)',
            color: 'var(--zymbiq-text)',
            boxShadow: '-2px 0 8px color-mix(in srgb, var(--zymbiq-bg) 80%, transparent)',
          }}
          aria-label="Scroll categories right"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

interface ShowroomClientProps {
  initialProjects?: ProjectWithFaqs[];
}

export default function ShowroomClient({ initialProjects }: ShowroomClientProps) {
  // AI search results — null means "not in AI mode", use paginated API instead
  const [aiResults, setAiResults] = useState<ProjectWithFaqs[] | null>(null);

  const handleResults = useCallback(
    (projects: ProjectWithFaqs[], _query: string) => {
      setAiResults(projects);
    },
    [],
  );

  const handleClear = useCallback(() => {
    setAiResults(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* AI-powered search bar */}
      <AiSearch
        onResults={handleResults}
        onClear={handleClear}
        className="max-w-2xl"
      />

      {/* Filters trigger + inline category chips */}
      {aiResults === null && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="shrink-0">
              <ProjectFilters />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <CategoryChips />
            </div>
          </div>
        </div>
      )}

      {/* AI results notice */}
      {aiResults !== null && (
        <div
          className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--zymbiq-accent) 30%, var(--zymbiq-border))',
            background: 'color-mix(in srgb, var(--zymbiq-accent) 6%, transparent)',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--zymbiq-accent)' }} />
          <span className="text-muted">
            <span className="font-semibold" style={{ color: 'var(--zymbiq-accent)' }}>
              {aiResults.length}
            </span>
            {' '}AI-matched result{aiResults.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleClear}
            className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1 ml-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* Project grid — receives AI results or fetches paginated data */}
      <React.Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-[--zymbiq-radius] border border-border overflow-hidden bg-surface animate-pulse">
              <div className="w-full aspect-video bg-muted/20" />
              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="h-5 w-2/3 bg-muted/20 rounded" />
                <div className="h-6 w-1/3 bg-muted/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      }>
        <ProjectGrid onAiResults={aiResults} initialProjects={initialProjects} />
      </React.Suspense>
    </div>
  );
}