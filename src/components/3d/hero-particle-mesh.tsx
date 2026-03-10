// =============================================================================
// Zymbiq — src/components/3d/hero-particle-mesh.tsx
// Pure Canvas 2D particle constellation. Zero WebGL.
// =============================================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const PARTICLE_COUNT = 280;
const FPS_CAP        = 60;
const LERP           = 0.032;

// -----------------------------------------------------------------------------
// Particle type
// -----------------------------------------------------------------------------

interface Particle {
  theta:       number;
  phi:         number;
  shellFrac:   number;
  size:        number;
  baseAlpha:   number;
  phase:       number;
  breathSpeed: number;
  dTheta:      number;
  dPhi:        number;
}

// -----------------------------------------------------------------------------
// Build particles
// -----------------------------------------------------------------------------

function buildParticles(): Particle[] {
  const list: Particle[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y     = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const theta = golden * i;
    const phi   = Math.acos(Math.max(-1, Math.min(1, y)));

    const sr       = Math.random();
    const shellFrac =
      sr < 0.12 ? 0.20 + Math.random() * 0.15 :
      sr < 0.55 ? 0.45 + Math.random() * 0.28 :
                  0.76 + Math.random() * 0.22;

    const tier = shellFrac < 0.38 ? 0 : shellFrac < 0.72 ? 1 : 2;

    list.push({
      theta,
      phi,
      shellFrac,
      size:
        tier === 0 ? 3.5 + Math.random() * 2.0 :
        tier === 1 ? 1.8 + Math.random() * 1.2 :
                     0.7 + Math.random() * 0.9,
      baseAlpha:
        tier === 0 ? 0.90 + Math.random() * 0.10 :
        tier === 1 ? 0.60 + Math.random() * 0.25 :
                     0.35 + Math.random() * 0.20,
      phase:       Math.random() * Math.PI * 2,
      breathSpeed:
        tier === 0 ? 0.40 + Math.random() * 0.20 :
        tier === 1 ? 0.60 + Math.random() * 0.30 :
                     0.85 + Math.random() * 0.50,
      dTheta: (Math.random() - 0.5) * (tier === 0 ? 0.0003 : 0.0007),
      dPhi:   (Math.random() - 0.5) * 0.00025,
    });
  }
  return list;
}

// -----------------------------------------------------------------------------
// Colour helpers
// -----------------------------------------------------------------------------

function getCssHex(name: string): string {
  if (typeof window === 'undefined') return '#818cf8';
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    '#818cf8'
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// -----------------------------------------------------------------------------
// Guard
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  const animationIntensity = useStore((s) => s.animationIntensity);
  if (animationIntensity === 'off') return null;
  return <ParticleCanvas reduced={animationIntensity === 'reduced'} />;
}

// -----------------------------------------------------------------------------
// Canvas
// -----------------------------------------------------------------------------

function ParticleCanvas({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ nx: 0, ny: 0 });

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
    const ctx = canvas.getContext('2d')!;

    const particles = buildParticles();
    const rgb       = hexToRgb(getCssHex('--zymbiq-accent'));
    const dpr       = Math.min(window.devicePixelRatio || 1, 2);

    // ── Resize ───────────────────────────────────────────────────────────────
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

    // ── Rotation state ────────────────────────────────────────────────────────
    let rotX  = 0;
    let rotY  = 0;
    let autoT = 0;
    let rafId = 0;
    let lastTs = 0;

    // ── Project particle → screen ─────────────────────────────────────────────
    function project(
      p: Particle, R: number, cx: number, cy: number
    ): { sx: number; sy: number; depth: number } {
      const rad    = p.shellFrac * R;
      const sinPhi = Math.sin(p.phi);
      const cosPhi = Math.cos(p.phi);

      // Spherical → Cartesian
      let x = sinPhi * Math.cos(p.theta) * rad;
      let y = cosPhi * rad;
      let z = sinPhi * Math.sin(p.theta) * rad;

      // Rotate X (pitch)
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y1   = y * cosX - z * sinX;
      const z1   = y * sinX + z * cosX;
      y = y1; z = z1;

      // Rotate Y (yaw)
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x2   =  x * cosY + z * sinY;
      const z2   = -x * sinY + z * cosY;
      x = x2; z = z2;

      // Perspective — focal = 2.6 * R keeps everything on screen
      const focal = R * 2.6;
      const w     = focal / (focal + z);

      return { sx: cx + x * w, sy: cy - y * w, depth: z };
    }

    // ── Draw loop ─────────────────────────────────────────────────────────────
    function frame(ts: number) {
      rafId = requestAnimationFrame(frame);
      if (ts - lastTs < 1000 / FPS_CAP) return;
      const dt = Math.min((ts - lastTs) * 0.001, 0.05);
      lastTs = ts;
      autoT += dt;

      const W  = canvas!.width  / dpr;
      const H  = canvas!.height / dpr;
      const cx = W * 0.5;
      const cy = H * 0.5;

      // Sphere fills 48% of the shorter axis — clearly visible
      const R  = Math.min(W, H) * 0.48;

      // Smooth rotation
      const tY = mouseRef.current.nx * 0.8
               + Math.sin(autoT * 0.10) * 0.40
               + Math.cos(autoT * 0.06) * 0.18;
      const tX = mouseRef.current.ny * -0.5
               + Math.sin(autoT * 0.07) * 0.22
               + Math.cos(autoT * 0.04) * 0.10;

      rotY += (tY - rotY) * LERP;
      rotX += (tX - rotX) * LERP;

      // Drift
      for (const p of particles) {
        p.theta += p.dTheta;
        p.phi   += p.dPhi;
        if (p.phi < 0.05 || p.phi > Math.PI - 0.05) p.dPhi *= -1;
      }

      // Project + sort back→front
      type Proj = { sx: number; sy: number; depth: number; size: number; alpha: number };
      const projected: Proj[] = particles.map(p => {
        const breath    = 0.84 + 0.16 * Math.sin(autoT * p.breathSpeed + p.phase);
        const { sx, sy, depth } = project(p, R, cx, cy);

        // Keep back-hemisphere particles visible — just slightly dimmer
        // depthNorm: 0 = back, 1 = front
        const depthNorm  = (depth / R + 1) * 0.5;
        const depthAlpha = 0.30 + 0.70 * depthNorm;   // min 30% even at back

        return {
          sx, sy, depth,
          size:  p.size  * breath,
          alpha: p.baseAlpha * depthAlpha * breath,
        };
      });
      projected.sort((a, b) => a.depth - b.depth);

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Draw — normal composite so particles are always visible on any bg
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      for (const { sx, sy, size, alpha } of projected) {
        if (alpha < 0.04) continue;

        // Large soft halo
        const haloR = size * 5;
        const halo  = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR);
        halo.addColorStop(0,    `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(alpha * 0.55, 1).toFixed(3)})`);
        halo.addColorStop(0.45, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(alpha * 0.20, 1).toFixed(3)})`);
        halo.addColorStop(1,    `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Bright white-hot core
        const coreR = Math.max(size * 0.9, 0.8);
        const core  = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR);
        core.addColorStop(0,    `rgba(255,255,255,${Math.min(alpha * 1.1, 1).toFixed(3)})`);
        core.addColorStop(0.35, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(alpha, 1).toFixed(3)})`);
        core.addColorStop(1,    `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
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
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}