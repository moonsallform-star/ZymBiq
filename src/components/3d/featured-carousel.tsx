// =============================================================================
// Zymbiq — src/components/3d/featured-carousel.tsx
// CSS perspective fan carousel. Cards fill viewport. Buttons inside card.
// No canvas. No broken world-unit sizing. Pure DOM + CSS transforms.
// =============================================================================

'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/index';
import type { ProjectWithFaqs } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Slot config — pure data, no magic
// slot 0 = center, ±1 = adjacent, ±2 = far sides
// -----------------------------------------------------------------------------
interface SlotCfg {
  x: number;     // % of cardWidth offset from center
  z: number;     // px translateZ (negative = behind)
  ry: number;    // rotateY in deg
  scale: number;
  opacity: number;
  zIdx: number;
}

const SLOT_CONFIGS: Record<number, SlotCfg> = {
  [-3]: { x: -2.20, z: -320, ry:  38, scale: 0.46, opacity: 0.28, zIdx: 0 },
  [-2]: { x: -1.55, z: -180, ry:  28, scale: 0.62, opacity: 0.55, zIdx: 1 },
  [-1]: { x: -0.82, z: -80,  ry:  18, scale: 0.80, opacity: 0.80, zIdx: 2 },
  [0]:  { x:  0,    z:  0,   ry:  0,  scale: 1.00, opacity: 1.00, zIdx: 4 },
  [1]:  { x:  0.82, z: -80,  ry: -18, scale: 0.80, opacity: 0.80, zIdx: 2 },
  [2]:  { x:  1.55, z: -180, ry: -28, scale: 0.62, opacity: 0.55, zIdx: 1 },
  [3]:  { x:  2.20, z: -320, ry: -38, scale: 0.46, opacity: 0.28, zIdx: 0 },
};

// Interpolate between slot configs for smooth mid-drag feel
function interpSlotCfg(offset: number): SlotCfg {
  const lo  = Math.floor(offset);
  const hi  = Math.ceil(offset);
  const t   = offset - lo;
  const a   = SLOT_CONFIGS[Math.max(-3, Math.min(3, lo))] ?? SLOT_CONFIGS[lo > 0 ? 3 : -3];
  const b   = SLOT_CONFIGS[Math.max(-3, Math.min(3, hi))] ?? SLOT_CONFIGS[hi > 0 ? 3 : -3];
  return {
    x:       a.x       + (b.x       - a.x)       * t,
    z:       a.z       + (b.z       - a.z)       * t,
    ry:      a.ry      + (b.ry      - a.ry)      * t,
    scale:   a.scale   + (b.scale   - a.scale)   * t,
    opacity: a.opacity + (b.opacity - a.opacity) * t,
    zIdx:    Math.round(a.zIdx + (b.zIdx - a.zIdx) * t),
  };
}

// -----------------------------------------------------------------------------
// useSpring — simple RAF spring for a single number
// -----------------------------------------------------------------------------
function useSpring(target: number, isDragging: boolean, k = 0.07, d = 0.82) {
  const [val, setVal]   = useState(target);
  const state           = useRef({ v: target, vel: 0 });
  const raf             = useRef<number>();

  useEffect(() => {
    // During drag: follow instantly, no spring lag
    if (isDragging) {
      state.current.v   = target;
      state.current.vel = 0;
      setVal(target);
      return;
    }
    const tick = () => {
      const s   = state.current;
      const acc = (target - s.v) * k;
      s.vel     = s.vel * d + acc;
      s.v      += s.vel;
      if (Math.abs(target - s.v) < 0.002 && Math.abs(s.vel) < 0.002) {
        s.v     = target;
        s.vel   = 0;
        setVal(target);
        return;
      }
      setVal(s.v);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [target, isDragging, k, d]);

  return val;
}

// -----------------------------------------------------------------------------
// CardItem — one card with spring-animated CSS transform
// -----------------------------------------------------------------------------
interface CardItemProps {
  project:     ProjectWithFaqs;
  slotOffset:  number;          // integer slot: -2..+2
  liveOffset:  number;          // fractional during drag
  cardW:       number;          // px
  cardH:       number;          // px
  isCenter:    boolean;
  isDragging:  boolean;
  onClick:     () => void;
}

function CardItem({
  project, slotOffset, liveOffset,
  cardW, cardH, isCenter, isDragging, onClick,
}: CardItemProps) {
  const springOffset = useSpring(liveOffset, isDragging);
  const cfg          = interpSlotCfg(springOffset);

  const transform = [
    `translateX(calc(-50% + ${cfg.x * cardW}px))`,
    `translateZ(${cfg.z}px)`,
    `rotateY(${cfg.ry}deg)`,
    `scale(${cfg.scale})`,
  ].join(' ');

  return (
    <div
      onClick={onClick}
      style={{
        position:    'absolute',
        left:        '50%',
        top:         '50%',
        marginTop:   `-${cardH / 2}px`,
        width:       `${cardW}px`,
        height:      `${cardH}px`,
        transform,
        opacity:     cfg.opacity,
        zIndex:      cfg.zIdx,
        borderRadius: '14px',
        overflow:    'hidden',
        cursor:      isCenter ? 'pointer' : 'pointer',
        willChange:  'transform, opacity',
        boxShadow:   isCenter
          ? '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(129,140,248,0.40), 0 0 60px rgba(99,102,241,0.18)'
          : '0 8px 32px rgba(0,0,0,0.40)',
        transition:  'box-shadow 0.3s ease',
        userSelect:  'none',
        flexShrink:  0,
      }}
    >
      {/* ── Image ── */}
      {project.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.thumbnailUrl}
          alt={project.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
          draggable={false}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg,#1e1b4b,#312e81,#1e1b4b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 64, opacity: 0.2, color: '#818cf8' }}>⬡</div>
        </div>
      )}

      {/* ── Center card: full gradient overlay + info + buttons ── */}
      {isCenter && (
        <div style={{
          position:   'absolute',
          inset:       0,
          background: 'linear-gradient(to top, rgba(3,3,14,0.97) 0%, rgba(3,3,14,0.72) 38%, rgba(3,3,14,0.18) 65%, transparent 100%)',
          display:    'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding:    'clamp(14px,2vw,24px)',
          gap:        '0px',
        }}>
          {/* Tags */}
          {((project.techStack?.length ?? 0) > 0 || project.category) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {project.techStack?.slice(0, 3).map((t: string) => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 700,
                  color: '#a5b4fc',
                  background: 'rgba(99,102,241,0.18)',
                  border: '1px solid rgba(129,140,248,0.28)',
                  borderRadius: 4, padding: '2px 8px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{t}</span>
              ))}
              {project.category && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'rgba(203,213,225,0.55)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 4, padding: '2px 8px',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{project.category}</span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 style={{
            margin: '0 0 6px',
            fontSize: 'clamp(15px,1.8vw,22px)',
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-0.035em',
            lineHeight: 1.2,
          }}>
            {project.title}
          </h3>

          {/* Short description */}
          {project.description && (
            <p style={{
              margin: '0 0 14px',
              fontSize: 'clamp(11px,0.9vw,13px)',
              color: 'rgba(203,213,225,0.68)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {project.description}
            </p>
          )}

          {/* Price + Buttons — same row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {/* Price */}
            <div>
              <div style={{
                fontSize: 'clamp(20px,2vw,28px)',
                fontWeight: 900,
                color: '#818cf8',
                letterSpacing: '-0.05em',
                lineHeight: 1,
              }}>
                {formatCurrency(project.price, 'USD')}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: 'rgba(148,163,184,0.5)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
              }}>one-time</div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link
                href={`/showroom/${project.slug}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: 'clamp(8px,0.8vw,10px) clamp(12px,1.2vw,18px)',
                  background: '#6366f1',
                  color: '#fff',
                  fontSize: 'clamp(11px,0.9vw,13px)',
                  fontWeight: 700,
                  borderRadius: 8,
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.50)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform  = 'translateY(-2px)';
                  el.style.boxShadow  = '0 8px 28px rgba(99,102,241,0.65)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform  = '';
                  el.style.boxShadow  = '0 4px 20px rgba(99,102,241,0.50)';
                }}
              >
                View Details
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: 'clamp(8px,0.8vw,10px) clamp(12px,1.2vw,16px)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e2e8f0',
                    fontSize: 'clamp(11px,0.9vw,13px)',
                    fontWeight: 600,
                    borderRadius: 8,
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.15)',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  Live Demo
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1.5 1.5h8v8M1.5 9.5l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Side card: small bottom label ── */}
      {!isCenter && Math.abs(slotOffset) === 1 && (
        <div style={{
          position:   'absolute',
          inset:       0,
          background: 'linear-gradient(to top, rgba(3,3,14,0.88) 0%, transparent 50%)',
          display:    'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding:    '14px 14px 14px',
          pointerEvents: 'none',
        }}>
          <p style={{
            margin: 0,
            fontSize: 'clamp(10px,0.85vw,13px)',
            fontWeight: 700,
            color: 'rgba(248,250,252,0.85)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{project.title}</p>
          <p style={{
            margin: '3px 0 0',
            fontSize: 11,
            fontWeight: 700,
            color: '#818cf8',
          }}>{formatCurrency(project.price, 'USD')}</p>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// StaticFallback
// -----------------------------------------------------------------------------
function StaticFallback({ projects }: { projects: ProjectWithFaqs[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/showroom/${p.slug}`}
          className="group block rounded-[--zymbiq-radius] border border-border overflow-hidden hover:border-accent transition-colors"
        >
          {p.thumbnailUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.thumbnailUrl} alt={p.title} className="w-full aspect-video object-cover" />
            : <div className="w-full aspect-video bg-muted/20" />}
          <div className="p-4">
            <p className="font-semibold text-sm text-foreground truncate">{p.title}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: 'var(--zymbiq-accent)' }}>
              {formatCurrency(p.price, 'USD')}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// FeaturedCarousel — main export
// -----------------------------------------------------------------------------
export default function FeaturedCarousel({ projects }: { projects: ProjectWithFaqs[] }) {
  const animationIntensity = useStore((s) => s.animationIntensity);
  const router             = useRouter();

  // Measure container to set card size responsively
  const wrapRef             = useRef<HTMLDivElement>(null);
  const [cardW, setCardW]   = useState(600);
  const cardH               = Math.round(cardW * 0.60); // 5:3 ratio

  useLayoutEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.offsetWidth;
      // center card = 58% of container, clamp 300–700
      setCardW(Math.min(700, Math.max(300, Math.round(w * 0.58))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const count                         = projects.length;
  const [center, setCenter]           = useState(0);
  // dragOffset: fractional offset applied on top of integer center
  // +1 = dragged one full card to the right
  const [dragOffset, setDragOffset]   = useState(0);

  const dragging      = useRef(false);
  const didDrag       = useRef(false);
  const startX        = useRef(0);
  const lastX         = useRef(0);
  const vel           = useRef(0);

  const goTo = useCallback((i: number) => {
    setCenter(((i % count) + count) % count);
    setDragOffset(0);
  }, [count]);

  const onDown = useCallback((e: React.PointerEvent) => {
    dragging.current  = true;
    didDrag.current   = false;
    startX.current    = e.clientX;
    lastX.current     = e.clientX;
    vel.current       = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx  = e.clientX - startX.current;
    vel.current = e.clientX - lastX.current;
    lastX.current = e.clientX;
    if (Math.abs(dx) > 4) didDrag.current = true;
    // px → card units: full card width = 1 slot
    setDragOffset(dx / (cardW * 0.6));
  }, [cardW]);

  const onUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const total   = dragOffset + (vel.current / cardW) * 4;
    const thresh  = 0.33;

    if (total > thresh)       goTo(center + 1);   // dragged right → next
    else if (total < -thresh) goTo(center - 1);   // dragged left  → prev
    else                      goTo(center);        // snap back
  }, [dragOffset, vel, cardW, center, goTo]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  goTo(center - 1);
      if (e.key === 'ArrowRight') goTo(center + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [center, goTo]);

  if (!projects || projects.length < 3) return null;
  if (animationIntensity === 'off') return <StaticFallback projects={projects} />;

  // Slots to render: -2 to +2 relative to center
  const slots = [-3, -2, -1, 0, 1, 2, 3] as const;

  return (
    <section
      className="w-full flex flex-col items-center"
      style={{ gap: 0 }}
      aria-label="Featured projects"
    >
      {/* ── Heading ── */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '0 16px' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--zymbiq-accent)', marginBottom: 10,
        }}>✦ Featured Work</p>
        <h2 style={{
          fontSize: 'clamp(22px,2.8vw,36px)',
          fontWeight: 800, color: 'var(--zymbiq-text)',
          letterSpacing: '-0.04em', lineHeight: 1.15, margin: 0,
        }}>
          Production-ready websites,{' '}
          <span style={{ color: 'var(--zymbiq-accent)' }}>delivered fast</span>
        </h2>
      </div>

      {/* ── Track ── */}
      <div
        ref={wrapRef}
        style={{
          position:    'relative',
          width:       '100%',
          // height = center card height + breathing room for scaled-up shadows
          height:      `${cardH + 48}px`,
          perspective: '1100px',
          perspectiveOrigin: '50% 50%',
          cursor:      dragging.current ? 'grabbing' : 'grab',
          overflow:    'visible',
          touchAction: 'pan-y',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured projects"
        tabIndex={0}
      >
        {/* Glow behind center */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: `${cardW * 1.3}px`, height: `${cardH * 1.3}px`,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 68%)',
          pointerEvents: 'none', zIndex: 0, borderRadius: '50%',
        }} />

        {slots.map((slot) => {
          const projIdx = ((center - slot) % count + count) % count;
          const proj    = projects[projIdx];
          const isCenter = slot === 0;
          // live offset = integer slot position adjusted by real-time drag
          const liveOff  = slot + dragOffset;

          return (
            <CardItem
              key={`${slot}-${proj.id}`}
              project={proj}
              slotOffset={slot}
              liveOffset={liveOff}
              cardW={cardW}
              cardH={cardH}
              isCenter={isCenter}
              isDragging={dragging.current}
              onClick={() => {
                if (didDrag.current) return;
                if (!isCenter) goTo(center + slot);
                else router.push(`/showroom/${proj.slug}`);
              }}
            />
          );
        })}
      </div>

      {/* ── Dot indicators ── */}
      <div
        style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}
        role="tablist"
        aria-label="Select project"
      >
        {projects.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === center}
            onClick={() => goTo(i)}
            style={{
              width:        i === center ? '28px' : '8px',
              height:       '6px',
              borderRadius: '3px',
              border:       'none',
              padding:      0,
              cursor:       'pointer',
              background:   i === center ? 'var(--zymbiq-accent)' : 'rgba(129,140,248,0.25)',
              transition:   'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow:    i === center ? '0 0 10px rgba(99,102,241,0.55)' : 'none',
            }}
            aria-label={`Go to project ${i + 1}: ${projects[i].title}`}
          />
        ))}
      </div>

      {/* ── Browse all ── */}
      <Link
        href="/showroom"
        style={{
          marginTop: 20, fontSize: 13, fontWeight: 600,
          color: 'var(--zymbiq-muted)', textDecoration: 'none',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--zymbiq-accent)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--zymbiq-muted)')}
      >
        Browse all projects →
      </Link>

      <p className="sr-only">
        Use arrow keys or drag to navigate. Click the center card to open project.
      </p>
    </section>
  );
}