// =============================================================================
// Zymbiq — src/components/3d/hero-particle-mesh.tsx
// Pure Canvas 2D particle constellation — zero WebGL, zero context loss.
// Additive glow via globalCompositeOperation. Mouse-reactive. Breathing.
// Loaded via next/dynamic with ssr: false. Never import directly.
// =============================================================================

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Tuning
// -----------------------------------------------------------------------------

const PARTICLE_COUNT = 180;
const BASE_RADIUS    = 0.38;  // fraction of min(width, height)
const LERP           = 0.055;
const FPS_CAP        = 55;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Particle {
  // Spherical coords — projected to 2D each frame
  theta: number;   // azimuth
  phi:   number;   // polar
  shell: number;   // 0 = inner, 1 = mid, 2 = outer
  // Visual
  size:     number;
  baseAlpha: number;
  phase:    number;  // breathing phase offset
  breathSpeed: number;
  // Drift — slow autonomous movement on sphere surface
  dTheta: number;
  dPhi:   number;
}

// -----------------------------------------------------------------------------
// Build particle data once
// -----------------------------------------------------------------------------

function buildParticles(): Particle[] {
  const particles: Particle[] = [];

  // Fibonacci sphere for even angular distribution
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y     = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const theta = golden * i;
    const phi   = Math.acos(Math.max(-1, Math.min(1, y)));

    // Shell: 10% inner · 55% mid · 35% outer
    const sr    = Math.random();
    const shell = sr < 0.10 ? 0 : sr < 0.65 ? 1 : 2;

    const shellScale = shell === 0 ? 0.38 + Math.random() * 0.12
                     : shell === 1 ? 0.62 + Math.random() * 0.22
                     :               0.88 + Math.random() * 0.18;

    // Inner = large + bright, outer = small + dim
    const size =
      shell === 0 ? 2.2 + Math.random() * 1.2 :
      shell === 1 ? 1.2 + Math.random() * 0.8 :
                    0.5 + Math.random() * 0.6;

    const baseAlpha =
      shell === 0 ? 0.75 + Math.random() * 0.25 :
      shell === 1 ? 0.40 + Math.random() * 0.30 :
                    0.15 + Math.random() * 0.20;

    particles.push({
      theta,
      phi,
      shell,
      size,
      baseAlpha,
      phase:       Math.random() * Math.PI * 2,
      breathSpeed: shell === 0 ? 0.5 + Math.random() * 0.3
                 : shell === 1 ? 0.7 + Math.random() * 0.4
                 :               1.0 + Math.random() * 0.6,
      dTheta: (Math.random() - 0.5) * 0.0006 * (shell === 0 ? 0.4 : 1),
      dPhi:   (Math.random() - 0.5) * 0.0003,
      // store shellScale in dPhi slot — extend type:
      ...(({ shellScale }) => ({ shellScale })  )({ shellScale }),
    } as Particle & { shellScale: number });
  }

  return particles;
}

// -----------------------------------------------------------------------------
// CSS hex reader
// -----------------------------------------------------------------------------

function getCssHex(name: string): string {
  if (typeof window === 'undefined') return '#6366f1';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#6366f1';
}

// Parse hex → {r,g,b}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  const animationIntensity = useStore((s) => s.animationIntensity);
  if (animationIntensity === 'off') return null;

  return <ParticleCanvas reduced={animationIntensity === 'reduced'} />;
}

// -----------------------------------------------------------------------------
// Canvas component
// -----------------------------------------------------------------------------

function ParticleCanvas({ reduced }: { reduced: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const mouseRef   = useRef({ x: 0, y: 0 });
  const targetRef  = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef     = useRef<number>(0);
  const lastRef    = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (reduced) return;
    const nx =  (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    mouseRef.current = { x: nx, y: ny };
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    // ── Build particles once ─────────────────────────────────────────────
    const particles = buildParticles() as (Particle & { shellScale: number })[];

    // ── Color ────────────────────────────────────────────────────────────
    const hex = getCssHex('--zymbiq-accent');
    const rgb = hexToRgb(hex);

    // ── Resize handler ───────────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Rotation state ───────────────────────────────────────────────────
    let rotX = 0; // pitch (mouse Y)
    let rotY = 0; // yaw   (mouse X)
    // Autonomous drift accumulators
    let autoT = 0;

    // ── Project 3D sphere point to 2D ────────────────────────────────────
    function project(
      theta: number,
      phi: number,
      shellRadius: number,
      cx: number,
      cy: number,
      R: number,
    ): { x: number; y: number; z: number } {
      // Spherical → Cartesian
      const x0 = Math.sin(phi) * Math.cos(theta) * shellRadius;
      const y0 = Math.cos(phi) * shellRadius;
      const z0 = Math.sin(phi) * Math.sin(theta) * shellRadius;

      // Rotate around X (pitch)
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y1   =  y0 * cosX - z0 * sinX;
      const z1   =  y0 * sinX + z0 * cosX;

      // Rotate around Y (yaw)
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x2   =  x0 * cosY + z1 * sinY;
      const z2   = -x0 * sinY + z1 * cosY;

      // Simple perspective divide
      const fov  = 2.8;
      const persp = fov / (fov + z2 / R);

      return {
        x: cx + x2 * R * persp,
        y: cy - y1 * R * persp,
        z: z2,
      };
    }

    // ── Draw frame ────────────────────────────────────────────────────────
    function draw(ts: number) {
      if (!canvas) return;
      rafRef.current = requestAnimationFrame(draw);

      // FPS cap
      const elapsed = ts - lastRef.current;
      if (elapsed < 1000 / FPS_CAP) return;
      lastRef.current = ts;

      const dt = Math.min(elapsed * 0.001, 0.05); // seconds, capped
      autoT += dt;

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const R = Math.min(W, H) * BASE_RADIUS;
      const cx = W * 0.5;
      const cy = H * 0.5;

      // Smooth mouse lerp
      targetRef.current.x = mouseRef.current.x * 0.55 +
        Math.sin(autoT * 0.13) * 0.22 + Math.cos(autoT * 0.07) * 0.10;
      targetRef.current.y = mouseRef.current.y * 0.55 +
        Math.sin(autoT * 0.09) * 0.28 + Math.cos(autoT * 0.05) * 0.12;

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP;

      rotY = currentRef.current.x;
      rotX = currentRef.current.y * -1;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Update + collect projected particles
      const projected: {
        px: number; py: number; pz: number;
        size: number; alpha: number;
      }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift on sphere surface
        p.theta += p.dTheta;
        p.phi   += p.dPhi;
        // Bounce phi
        if (p.phi < 0.05)      { p.phi = 0.05;      p.dPhi *= -1; }
        if (p.phi > Math.PI - 0.05) { p.phi = Math.PI - 0.05; p.dPhi *= -1; }

        // Breathing
        const breath = 0.88 + 0.12 * Math.sin(autoT * p.breathSpeed + p.phase);

        const { x: px, y: py, z: pz } = project(
          p.theta, p.phi, p.shellScale * R, cx, cy, R
        );

        // Depth alpha: particles behind sphere centre are dimmer
        const depthFade = 0.4 + 0.6 * ((pz / R + 1) * 0.5);

        projected.push({
          px, py, pz,
          size:  p.size * breath,
          alpha: p.baseAlpha * depthFade * breath,
        });
      }

      // Sort back-to-front so foreground particles draw on top
      projected.sort((a, b) => a.pz - b.pz);

      // Draw with additive-style glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const { px, py, size, alpha } of projected) {
        if (alpha < 0.02) continue;

        // Outer soft halo
        const haloR = size * 3.5;
        const halo  = ctx.createRadialGradient(px, py, 0, px, py, haloR);
        halo.addColorStop(0,   `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha * 0.35).toFixed(3)})`);
        halo.addColorStop(1,   `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(px, py, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Bright core
        const coreR = size * 0.9;
        const core  = ctx.createRadialGradient(px, py, 0, px, py, coreR);
        core.addColorStop(0,   `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`);
        core.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha * 0.8).toFixed(3)})`);
        core.addColorStop(1,   `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(px, py, coreR, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      }

      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [reduced, handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}