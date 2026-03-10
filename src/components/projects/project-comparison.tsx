'use client';

// =============================================================================
// Zymbiq — src/components/projects/project-comparison.tsx
// Premium comparison modal — fully respects --zymbiq-* CSS custom properties.
// Works in light, dark, or any admin-configured theme automatically.
// =============================================================================

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useStore } from '@/store/index';
import { formatCurrency } from '@/lib/utils';
import { X, Check, Minus, ArrowUpRight, Zap, Code2, Layers } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProjectComparisonProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProjectComparison({ open, onClose }: ProjectComparisonProps) {
  const comparisonProjects = useStore((s) => s.comparisonProjects);
  const clearComparison    = useStore((s) => s.clearComparison);

  const allFeatures = Array.from(
    new Set(comparisonProjects.flatMap((p) => p.features))
  ).sort();

  function handleClose() {
    clearComparison();
    onClose();
  }

  const colCount = comparisonProjects.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="max-w-[92vw] w-full overflow-hidden p-0 border-0 shadow-none bg-transparent"
        style={{ maxHeight: '90vh', maxWidth: 1100 }}
      >
        {/* ── Root shell: all colours from platform CSS tokens ── */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            background: 'var(--zymbiq-surface)',
            border: '1px solid var(--zymbiq-border)',
            borderRadius: 'var(--zymbiq-radius, 16px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px var(--zymbiq-border)',
            maxHeight: '90vh',
          }}
        >

          {/* ── Subtle accent atmosphere (inherits --zymbiq-accent) ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <div style={{
              position: 'absolute', top: -80, left: -80, width: 480, height: 360,
              background: 'radial-gradient(ellipse at top left, color-mix(in srgb, var(--zymbiq-accent) 8%, transparent) 0%, transparent 65%)',
            }} />
            <div style={{
              position: 'absolute', bottom: -60, right: -60, width: 380, height: 280,
              background: 'radial-gradient(ellipse at bottom right, color-mix(in srgb, var(--zymbiq-accent) 5%, transparent) 0%, transparent 65%)',
            }} />
          </div>

          {/* ── Header ── */}
          <header
            className="relative flex items-center justify-between px-6 py-4 flex-shrink-0 z-10"
            style={{ borderBottom: '1px solid var(--zymbiq-border)' }}
          >
            {/* Top accent glow line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(to right, transparent 0%, var(--zymbiq-accent) 40%, var(--zymbiq-accent) 60%, transparent 100%)',
                opacity: 0.40,
              }}
            />

            {/* Left: pill + title */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--zymbiq-accent) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 28%, transparent)',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--zymbiq-accent)',
                    boxShadow: '0 0 5px 2px color-mix(in srgb, var(--zymbiq-accent) 45%, transparent)',
                  }}
                />
                <span
                  className="text-[9px] font-black tracking-[0.20em] uppercase"
                  style={{ color: 'var(--zymbiq-accent)' }}
                >
                  Compare
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <h2
                  className="text-base font-bold"
                  style={{ color: 'var(--zymbiq-text)', letterSpacing: '-0.02em' }}
                >
                  Project Comparison
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    color: 'var(--zymbiq-muted)',
                    background: 'color-mix(in srgb, var(--zymbiq-text) 6%, transparent)',
                    border: '1px solid var(--zymbiq-border)',
                  }}
                >
                  {colCount} selected
                </span>
              </div>
            </div>

            {/* Right: close */}
            <CloseButton onClick={handleClose} label="Close" />
          </header>

          {/* ── Scrollable body ── */}
          <div
            className="overflow-x-auto overflow-y-auto flex-1 relative z-10"
            style={{ maxHeight: 'calc(90vh - 64px - 48px)' }}
          >
            {comparisonProjects.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ minWidth: colCount >= 3 ? 760 : 520 }}>

                {/* ── Column header row: thumbnails + titles ── */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `176px repeat(${colCount}, 1fr)`,
                    background: 'color-mix(in srgb, var(--zymbiq-accent) 3%, var(--zymbiq-surface))',
                    borderBottom: '1px solid var(--zymbiq-border)',
                  }}
                >
                  <div className="p-6" />
                  {comparisonProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-5"
                      style={{ borderLeft: '1px solid var(--zymbiq-border)' }}
                    >
                      <ProjectColumnHeader project={project} />
                    </div>
                  ))}
                </div>

                {/* ── Price row ── */}
                <CompRow label="Investment" icon={Zap} colCount={colCount} accent>
                  {comparisonProjects.map((p) => (
                    <DataCell key={p.id}>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-2xl font-black tabular-nums"
                          style={{ color: 'var(--zymbiq-accent)', letterSpacing: '-0.04em' }}
                        >
                          {formatCurrency(p.price, 'USD')}
                        </span>
                        <span
                          className="text-[10px] font-bold tracking-[0.12em] uppercase"
                          style={{ color: 'var(--zymbiq-muted)', opacity: 0.65 }}
                        >
                          one-time · no subscription
                        </span>
                      </div>
                    </DataCell>
                  ))}
                </CompRow>

                {/* ── Tech Stack row ── */}
                <CompRow label="Tech Stack" icon={Code2} colCount={colCount}>
                  {comparisonProjects.map((p) => (
                    <DataCell key={p.id}>
                      <div className="flex flex-wrap gap-1.5">
                        {p.techStack.length > 0 ? (
                          p.techStack.map((tech) => (
                            <TechChip key={tech}>{tech}</TechChip>
                          ))
                        ) : (
                          <span style={{ color: 'var(--zymbiq-muted)', opacity: 0.4, fontSize: 13 }}>—</span>
                        )}
                      </div>
                    </DataCell>
                  ))}
                </CompRow>

                {/* ── Features section ── */}
                {allFeatures.length > 0 && (
                  <>
                    {/* Section divider */}
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `176px repeat(${colCount}, 1fr)`,
                        background: 'color-mix(in srgb, var(--zymbiq-accent) 4%, var(--zymbiq-surface))',
                        borderTop: '1px solid var(--zymbiq-border)',
                        borderBottom: '1px solid var(--zymbiq-border)',
                      }}
                    >
                      <div className="px-6 py-2.5 flex items-center gap-2">
                        <div
                          className="h-px w-3 flex-shrink-0"
                          style={{ background: 'var(--zymbiq-accent)', opacity: 0.5 }}
                        />
                        <span
                          className="text-[9px] font-black tracking-[0.20em] uppercase"
                          style={{ color: 'var(--zymbiq-accent)', opacity: 0.7 }}
                        >
                          Included Features
                        </span>
                      </div>
                      {comparisonProjects.map((p) => (
                        <div key={p.id} style={{ borderLeft: '1px solid var(--zymbiq-border)' }} />
                      ))}
                    </div>

                    {/* Feature rows */}
                    {allFeatures.map((feature, fi) => (
                      <FeatureRow
                        key={feature}
                        feature={feature}
                        fi={fi}
                        colCount={colCount}
                        projects={comparisonProjects}
                      />
                    ))}
                  </>
                )}

                {/* ── CTA row ── */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `176px repeat(${colCount}, 1fr)`,
                    background: 'color-mix(in srgb, var(--zymbiq-accent) 3%, var(--zymbiq-surface))',
                    borderTop: '1px solid var(--zymbiq-border)',
                  }}
                >
                  <div className="px-6 py-5" />
                  {comparisonProjects.map((p) => (
                    <div
                      key={p.id}
                      className="px-5 py-5"
                      style={{ borderLeft: '1px solid var(--zymbiq-border)' }}
                    >
                      <CtaButton href={`/showroom/${p.slug}`} />
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <footer
            className="relative flex items-center justify-between px-6 py-3 flex-shrink-0 z-10"
            style={{ borderTop: '1px solid var(--zymbiq-border)' }}
          >
            <CloseButton onClick={handleClose} label="Clear & close" small />
            <span
              className="text-[9px] font-black tracking-[0.20em] uppercase"
              style={{ color: 'var(--zymbiq-accent)', opacity: 0.30 }}
            >
              Zymbiq
            </span>
          </footer>

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// FeatureRow
// ---------------------------------------------------------------------------
function FeatureRow({
  feature, fi, colCount, projects,
}: {
  feature: string;
  fi: number;
  colCount: number;
  projects: Array<{ id: string; features: string[] }>;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `176px repeat(${colCount}, 1fr)`,
        background: hovered
          ? 'color-mix(in srgb, var(--zymbiq-accent) 5%, var(--zymbiq-surface))'
          : fi % 2 === 0
          ? 'transparent'
          : 'color-mix(in srgb, var(--zymbiq-text) 2%, transparent)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Feature label */}
      <div
        className="px-6 py-3 flex items-center"
        style={{ borderBottom: '1px solid var(--zymbiq-border)' }}
      >
        <span
          className="text-xs leading-snug"
          style={{ color: 'var(--zymbiq-text)', opacity: 0.70 }}
        >
          {feature}
        </span>
      </div>

      {/* Check / minus per project */}
      {projects.map((p) => {
        const has = p.features.includes(feature);
        return (
          <div
            key={p.id}
            className="px-5 py-3 flex items-center"
            style={{
              borderBottom: '1px solid var(--zymbiq-border)',
              borderLeft: '1px solid var(--zymbiq-border)',
            }}
          >
            {has ? (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--zymbiq-accent) 15%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 35%, transparent)',
                }}
              >
                <Check
                  className="w-3 h-3"
                  style={{ color: 'var(--zymbiq-accent)' }}
                  aria-hidden
                />
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--zymbiq-text) 4%, transparent)',
                  border: '1px solid var(--zymbiq-border)',
                }}
              >
                <Minus
                  className="w-3 h-3"
                  style={{ color: 'var(--zymbiq-muted)', opacity: 0.35 }}
                  aria-hidden
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompRow
// ---------------------------------------------------------------------------
function CompRow({
  label, icon: Icon, colCount, accent, children,
}: {
  label: string;
  icon: React.ElementType;
  colCount: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `176px repeat(${colCount}, 1fr)`,
        borderBottom: '1px solid var(--zymbiq-border)',
        background: accent
          ? 'color-mix(in srgb, var(--zymbiq-accent) 4%, var(--zymbiq-surface))'
          : 'transparent',
      }}
    >
      {/* Row label */}
      <div className="px-6 py-4 flex items-start gap-2.5 pt-5">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 mt-0.5"
          style={{
            background: 'color-mix(in srgb, var(--zymbiq-accent) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 24%, transparent)',
          }}
        >
          <Icon className="w-3 h-3" style={{ color: 'var(--zymbiq-accent)' }} />
        </div>
        <span
          className="text-xs font-bold uppercase tracking-[0.10em] pt-1 leading-tight"
          style={{ color: 'var(--zymbiq-muted)' }}
        >
          {label}
        </span>
      </div>

      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataCell
// ---------------------------------------------------------------------------
function DataCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-5 py-4"
      style={{ borderLeft: '1px solid var(--zymbiq-border)' }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TechChip
// ---------------------------------------------------------------------------
function TechChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--zymbiq-accent)',
        background: 'color-mix(in srgb, var(--zymbiq-accent) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 24%, transparent)',
        borderRadius: 5,
        padding: '2px 8px',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        display: 'inline-block',
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CtaButton
// ---------------------------------------------------------------------------
function CtaButton({ href }: { href: string }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl font-bold"
      style={{
        fontSize: 12,
        padding: '10px 16px',
        background: hovered
          ? 'var(--zymbiq-accent)'
          : 'color-mix(in srgb, var(--zymbiq-accent) 12%, transparent)',
        color: hovered ? '#fff' : 'var(--zymbiq-accent)',
        textDecoration: 'none',
        letterSpacing: '-0.01em',
        border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 38%, transparent)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered
          ? '0 8px 24px color-mix(in srgb, var(--zymbiq-accent) 28%, transparent)'
          : 'none',
        transition: 'all 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      View Details
      <ArrowUpRight
        className="w-3.5 h-3.5"
        style={{
          transform: hovered ? 'translate(1px, -1px)' : 'none',
          transition: 'transform 0.18s ease',
        }}
        aria-hidden
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// CloseButton
// ---------------------------------------------------------------------------
function CloseButton({
  onClick, label, small,
}: {
  onClick: () => void;
  label: string;
  small?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 font-semibold"
      style={{
        fontSize: small ? 11 : 12,
        padding: small ? '4px 0' : '6px 12px',
        borderRadius: small ? 0 : 8,
        color: hovered ? 'var(--zymbiq-text)' : 'var(--zymbiq-muted)',
        background: !small && hovered
          ? 'color-mix(in srgb, var(--zymbiq-text) 6%, transparent)'
          : 'transparent',
        border: !small
          ? `1px solid ${hovered ? 'var(--zymbiq-border)' : 'transparent'}`
          : 'none',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <X className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ProjectColumnHeader
// ---------------------------------------------------------------------------
function ProjectColumnHeader({
  project,
}: {
  project: { id: string; slug: string; title: string; thumbnailUrl?: string | null };
}) {
  const initials = project.title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3" style={{ maxWidth: 200 }}>
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '16/9',
          borderRadius: 'calc(var(--zymbiq-radius, 8px) * 0.7)',
          border: '1px solid var(--zymbiq-border)',
          background: 'var(--zymbiq-bg)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover"
            sizes="220px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-black text-2xl select-none"
              style={{
                color: 'var(--zymbiq-accent)',
                opacity: 0.20,
                letterSpacing: '-0.05em',
              }}
            >
              {initials}
            </span>
          </div>
        )}
        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-6 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, color-mix(in srgb, var(--zymbiq-surface) 65%, transparent) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Title */}
      <span
        className="font-bold leading-snug line-clamp-2 text-sm"
        style={{ color: 'var(--zymbiq-text)', letterSpacing: '-0.02em' }}
      >
        {project.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-3"
    >
      <Layers className="w-8 h-8" style={{ color: 'var(--zymbiq-muted)', opacity: 0.35 }} />
      <span className="text-sm font-medium" style={{ color: 'var(--zymbiq-muted)', opacity: 0.65 }}>
        No projects selected for comparison.
      </span>
      <span className="text-xs" style={{ color: 'var(--zymbiq-muted)', opacity: 0.40 }}>
        Browse the showroom and select up to 3 projects.
      </span>
    </div>
  );
}