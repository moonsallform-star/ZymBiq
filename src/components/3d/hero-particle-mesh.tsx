// =============================================================================
// Zymbiq — src/components/3d/hero-particle-mesh.tsx
// Pure Canvas 2D particle constellation — zero WebGL, zero context loss.
// =============================================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Tuning
// -----------------------------------------------------------------------------

const PARTICLE_COUNT = 160;
const FPS_CAP        = 60;
const LERP           = 0.04;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Particle {
  // Position on unit sphere
  theta:       number;
  phi:         number;
  shellFrac:   number; // 0..1 — fraction of max radius
  // Visual
  size:        number;
  baseAlpha:   number;
  phase:       number;
  breathSpeed: number;
  // Autonomous drift
  dTheta:      number;
  dPhi:        number;
}

// -----------------------------------------------------------------------------
// Build particles — Fibonacci sphere distribution
// -----------------------------------------------------------------------------

function buildParticles(): Particle[] {
  const list: Particle[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y     = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const theta = golden * i;
    const phi   = Math.acos(Math.max(-1, Math.min(1, y)));

    // Shell bands
    const sr       = Math.random();
    const shellFrac =
      sr < 0.10 ? 0.28 + Math.random() * 0.12 :   // inner  — 10%
      sr < 0.60 ? 0.52 + Math.random() * 0.26 :   // mid    — 50%
                  0.82 + Math.random() * 0.18;     // outer  — 40%

    const isInner = shellFrac < 0.42;
    const isMid   = shellFrac < 0.80;

    list.push({
      theta,
      phi,
      shellFrac,
      size:        isInner ? 2.8 + Math.random() * 1.4
                 : isMid   ? 1.4 + Math.random() * 0.9
                 :            0.5 + Math.random() * 0.7,
      baseAlpha:   isInner ? 0.80 + Math.random() * 0.20
                 : isMid   ? 0.42 + Math.random() * 0.28
                 :            0.14 + Math.random() * 0.18,
      phase:       Math.random() * Math.PI * 2,
      breathSpeed: isInner ? 0.45 + Math.random() * 0.25
                 : isMid   ? 0.65 + Math.random() * 0.35
                 :            0.90 + Math.random() * 0.55,
      dTheta: (Math.random() - 0.5) * (isInner ? 0.0004 : 0.0008),
      dPhi:   (Math.random() - 0.5) * 0.0003,
    });
  }
  return list;
}

// -----------------------------------------------------------------------------
// Hex colour → {r,g,b}
// -----------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function getCssHex(name: string): string {
  if (typeof window === 'undefined') return '#818cf8';
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    '#818cf8'
  );
}

// -----------------------------------------------------------------------------
// Exported guard component
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  const animationIntensity = useStore((s) => s.animationIntensity);
  if (animationIntensity === 'off') return null;
  return <ParticleCanvas reduced={animationIntensity === 'reduced'} />;
}

// -----------------------------------------------------------------------------
// Canvas component — all logic lives in one useEffect, zero re-renders
// -----------------------------------------------------------------------------

function ParticleCanvas({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ nx: 0, ny: 0 }); // normalised -1..1

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (reduced) return;
    mouseRef.current = {
      nx:  (e.clientX / window.innerWidth)  * 2 - 1,
      ny: -((e.clientY / window.innerHeight) * 2 - 1),
    };
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Context ────────────────────────────────────────────────────────────
    const ctx = canvas.getContext('2d')!;

    // ── Particles ──────────────────────────────────────────────────────────
    const particles = buildParticles();

    // ── Colour ─────────────────────────────────────────────────────────────
    const rgb = hexToRgb(getCssHex('--zymbiq-accent'));

    // ── Resize — sets canvas pixel dimensions to match CSS size ────────────
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const parent = canvas!.parentElement;
      const w = parent ? parent.clientWidth  : window.innerWidth;
      const h = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    // ── Smooth rotation accumulators ───────────────────────────────────────
    let curRotX = 0;  // current pitch  (responds to mouse Y)
    let curRotY = 0;  // current yaw    (responds to mouse X)
    let autoT   = 0;  // autonomous time accumulator

    // ── RAF state ──────────────────────────────────────────────────────────
    let rafId   = 0;
    let lastTs  = 0;

    // ── Project ONE particle to screen XY ──────────────────────────────────
    // Uses simple perspective projection — no matrix library needed.
    function project(
      p: Particle,
      R: number,   // max sphere radius in CSS px
      cx: number,
      cy: number,
    ): { sx: number; sy: number; depth: number } {
      const rad = p.shellFrac * R;

      // Spherical → Cartesian
      const sinPhi = Math.sin(p.phi);
      const cosPhi = Math.cos(p.phi);
      const x0 =  sinPhi * Math.cos(p.theta) * rad;
      const y0 =  cosPhi * rad;
      const z0 =  sinPhi * Math.sin(p.theta) * rad;

      // Rotate around X axis (pitch — driven by mouse Y)
      const cosRX = Math.cos(curRotX), sinRX = Math.sin(curRotX);
      const y1    =  y0 * cosRX - z0 * sinRX;
      const z1    =  y0 * sinRX + z0 * cosRX;

      // Rotate around Y axis (yaw — driven by mouse X)
      const cosRY = Math.cos(curRotY), sinRY = Math.sin(curRotY);
      const x2    =  x0 * cosRY + z1 * sinRY;
      const z2    = -x0 * sinRY + z1 * cosRY;

      // Perspective divide — focal length = 2.2 * R
      const focal = R * 2.2;
      const w     = focal / (focal + z2);

      return {
        sx:    cx + x2 * w,
        sy:    cy - y1 * w,
        depth: z2,           // positive = closer to viewer
      };
    }

    // ── Main draw loop ─────────────────────────────────────────────────────
    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);

      // FPS cap
      if (ts - lastTs < 1000 / FPS_CAP) return;
      const dt = Math.min((ts - lastTs) * 0.001, 0.05);
      lastTs = ts;
      autoT += dt;

      // Canvas logical size (CSS pixels, already scaled by dpr via transform)
      const W  = canvas!.width  / dpr;
      const H  = canvas!.height / dpr;
      const cx = W * 0.5;
      const cy = H * 0.5;

      // Sphere radius = 42% of the shorter dimension
      const R  = Math.min(W, H) * 0.42;

      // ── Smooth rotation towards target ──────────────────────────────────
      const targetRotY =
        mouseRef.current.nx * 0.7 +
        Math.sin(autoT * 0.11) * 0.35 +
        Math.cos(autoT * 0.07) * 0.15;

      const targetRotX =
        mouseRef.current.ny * -0.5 +
        Math.sin(autoT * 0.08) * 0.20 +
        Math.cos(autoT * 0.05) * 0.10;

      curRotY += (targetRotY - curRotY) * LERP;
      curRotX += (targetRotX - curRotX) * LERP;

      // ── Drift particles on sphere surface ───────────────────────────────
      for (const p of particles) {
        p.theta += p.dTheta;
        p.phi   += p.dPhi;
        if (p.phi < 0.05 || p.phi > Math.PI - 0.05) p.dPhi *= -1;
      }

      // ── Project all particles ────────────────────────────────────────────
      const projected = particles.map((p, i) => {
        const breath = 0.86 + 0.14 * Math.sin(autoT * p.breathSpeed + p.phase);
        const { sx, sy, depth } = project(p, R, cx, cy);

        // Depth-based alpha — back hemisphere fades out
        const depthNorm  = (depth / R + 1) * 0.5;          // 0=back, 1=front
        const depthAlpha = 0.15 + 0.85 * depthNorm;

        return {
          sx, sy,
          depth,
          size:  p.size  * breath,
          alpha: p.baseAlpha * depthAlpha * breath,
          i,
        };
      });

      // Back-to-front sort so front particles overdraw back ones
      projected.sort((a, b) => a.depth - b.depth);

      // ── Clear ────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // ── Draw particles with additive glow ────────────────────────────────
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const { sx, sy, size, alpha } of projected) {
        if (alpha < 0.015) continue;

        // Outer soft halo
        const haloR = size * 4;
        const halo  = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR);
        halo.addColorStop(0,   `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha * 0.3).toFixed(3)})`);
        halo.addColorStop(1,   `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Bright core
        const coreR = Math.max(size, 0.5);
        const core  = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR);
        core.addColorStop(0,   `rgba(255,255,255,${(alpha).toFixed(3)})`);
        core.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha * 0.85).toFixed(3)})`);
        core.addColorStop(1,   `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      }

      ctx.restore();
    }

    rafId = requestAnimationFrame(frame);
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [reduced, onMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width:  '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}