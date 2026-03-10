'use client';

// =============================================================================
// Zymbiq — src/components/projects/project-card.tsx
// Premium project card — full-bleed image with gradient overlay, tech tags,
// animated price, glowing CTA buttons. Matches featured carousel aesthetic.
// =============================================================================

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/store/index';
import { formatCurrency } from '@/lib/utils';
import type { ProjectWithFaqs } from '@/types/database';

// -----------------------------------------------------------------------------
// Lazy-load 3D tilt — no SSR
// -----------------------------------------------------------------------------
const ProjectCardTilt = dynamic(
  () => import('@/components/3d/project-card-tilt'),
  { ssr: false, loading: () => <div /> },
);

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------
interface ProjectCardProps {
  project: ProjectWithFaqs;
  showCompareCheckbox?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function ProjectCard({
  project,
  showCompareCheckbox = false,
}: ProjectCardProps) {
  const comparisonProjects   = useStore((s) => s.comparisonProjects);
  const addToComparison      = useStore((s) => s.addToComparison);
  const removeFromComparison = useStore((s) => s.removeFromComparison);

  const {
    id, slug, title, description,
    category, techStack, features,
    price, thumbnailUrl, demoUrl,
  } = project;

  // ── Comparison state ───────────────────────────────────────────────────────
  const isInComparison  = comparisonProjects.some((p) => p.id === id);
  const atMaxComparison = comparisonProjects.length >= 3 && !isInComparison;

  const handleCompareChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      addToComparison({ id, slug, title, price, features, techStack, thumbnailUrl });
    } else {
      removeFromComparison(id);
    }
  };

  // ── Tags to show (cap at 3 tech + category) ───────────────────────────────
  const visibleTech = (techStack ?? []).slice(0, 3);

  // ── Card ──────────────────────────────────────────────────────────────────
  const cardInner = (
    <div
      className="group relative overflow-hidden rounded-[--zymbiq-radius] transition-all duration-500"
      style={{
        aspectRatio: '16 / 10',
        background: 'linear-gradient(160deg, #0b0b14 0%, #10101c 100%)',
        border: '1px solid rgba(129,140,248,0.10)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        willChange: 'transform, box-shadow',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow =
          '0 0 0 1px rgba(129,140,248,0.50), 0 20px 60px rgba(0,0,0,0.70), 0 0 48px rgba(99,102,241,0.14)';
        el.style.borderColor = 'rgba(129,140,248,0.40)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.45)';
        el.style.borderColor = 'rgba(129,140,248,0.10)';
      }}
    >

      {/* ── Full-bleed thumbnail ─────────────────────────────────────────── */}
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1a1740 0%, #2d2a6e 50%, #1a1740 100%)' }}
          aria-hidden="true"
        >
          {/* Subtle hex pattern for empty state */}
          <span style={{ fontSize: 72, opacity: 0.10, color: '#818cf8', letterSpacing: '-4px' }}>
            ⬡⬡⬡
          </span>
        </div>
      )}

      {/* ── Permanent dark vignette so content is always readable ─────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            'linear-gradient(to top,  rgba(3,3,14,0.98) 0%,  rgba(3,3,14,0.80) 30%, rgba(3,3,14,0.28) 58%, transparent 100%)',
            'linear-gradient(to right, rgba(3,3,14,0.22) 0%, transparent 40%)',
          ].join(', '),
        }}
      />

      {/* ── Hover shimmer sweep ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            'linear-gradient(120deg, transparent 30%, rgba(129,140,248,0.055) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
        }}
      />

      {/* ── Compare checkbox — top-right, fades in on hover ─────────────── */}
      {showCompareCheckbox && (
        <div
          className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-[-4px] group-hover:translate-y-0"
        >
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{
              background: 'rgba(8,8,20,0.82)',
              border: '1px solid rgba(129,140,248,0.28)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Checkbox
              id={`compare-${id}`}
              checked={isInComparison}
              onCheckedChange={handleCompareChange}
              disabled={atMaxComparison}
              aria-label={`Compare ${title}`}
              className="w-3.5 h-3.5"
            />
            <label
              htmlFor={`compare-${id}`}
              className="text-[11px] font-semibold cursor-pointer select-none tracking-wide"
              style={{ color: 'rgba(203,213,225,0.75)' }}
            >
              Compare
            </label>
          </div>
        </div>
      )}

      {/* ── Accent corner glow (top-left) ────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          width: 120, height: 120,
          background: 'radial-gradient(circle at top left, rgba(99,102,241,0.18) 0%, transparent 70%)',
          borderRadius: '0 0 100% 0',
        }}
      />

      {/* ── All content overlay ──────────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end">
        <div className="px-4 pb-4 flex flex-col gap-0">

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {visibleTech.map((t: string) => (
              <span
                key={t}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#a5b4fc',
                  background: 'rgba(99,102,241,0.18)',
                  border: '1px solid rgba(129,140,248,0.30)',
                  borderRadius: 5,
                  padding: '2px 7px',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase' as const,
                  lineHeight: 1.6,
                }}
              >
                {t}
              </span>
            ))}
            {category && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'rgba(203,213,225,0.50)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 5,
                  padding: '2px 7px',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase' as const,
                  lineHeight: 1.6,
                }}
              >
                {category}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="font-bold leading-snug mb-1.5 truncate"
            style={{
              fontSize: 'clamp(14px, 1.4vw, 17px)',
              color: '#f1f5f9',
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </h3>

          {/* Description */}
          <p
            className="leading-relaxed mb-3 line-clamp-2"
            style={{
              fontSize: 'clamp(10px, 0.85vw, 12px)',
              color: 'rgba(203,213,225,0.52)',
            }}
          >
            {description}
          </p>

          {/* Price + Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">

            {/* Price block */}
            <div className="flex flex-col">
              <span
                className="font-black tabular-nums"
                style={{
                  fontSize: 'clamp(18px, 1.8vw, 24px)',
                  color: '#818cf8',
                  letterSpacing: '-0.055em',
                  lineHeight: 1,
                  textShadow: '0 0 24px rgba(129,140,248,0.45)',
                }}
              >
                {formatCurrency(price, 'USD')}
              </span>
              <span
                className="font-bold tracking-[0.12em] uppercase mt-0.5"
                style={{ fontSize: 8, color: 'rgba(148,163,184,0.38)' }}
              >
                one-time
              </span>
            </div>

            {/* Button group */}
            <div className="flex items-center gap-2">

              {/* Primary — View Details */}
              <Link
                href={`/showroom/${slug}`}
                aria-label={`View details for ${title}`}
                className="inline-flex items-center gap-1.5 font-bold rounded-lg transition-all duration-200"
                style={{
                  fontSize: 11,
                  padding: '9px 14px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#fff',
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 4px 18px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
                  whiteSpace: 'nowrap' as const,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-2px)';
                  el.style.boxShadow = '0 8px 28px rgba(99,102,241,0.65), inset 0 1px 0 rgba(255,255,255,0.18)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '0 4px 18px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)';
                }}
              >
                View Details
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* Secondary — Live Demo */}
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Live demo for ${title}`}
                  className="inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all duration-200"
                  style={{
                    fontSize: 11,
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.13)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap' as const,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(255,255,255,0.13)';
                    el.style.borderColor = 'rgba(255,255,255,0.22)';
                    el.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(255,255,255,0.07)';
                    el.style.borderColor = 'rgba(255,255,255,0.13)';
                    el.style.transform = '';
                  }}
                >
                  Demo
                  <svg width="9" height="9" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <path d="M1.5 1.5h8v8M1.5 9.5l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom edge accent line ───────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(to right, transparent 0%, rgba(99,102,241,0.60) 30%, rgba(129,140,248,0.90) 50%, rgba(99,102,241,0.60) 70%, transparent 100%)',
          boxShadow: '0 0 8px 1px rgba(99,102,241,0.35)',
        }}
      />

    </div>
  );

  return (
    <ProjectCardTilt className="h-full">
      {cardInner}
    </ProjectCardTilt>
  );
}