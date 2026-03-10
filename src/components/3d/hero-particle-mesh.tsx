// =============================================================================
// Zymbiq — src/components/3d/hero-particle-mesh.tsx
// Premium GPU-instanced particle constellation. Single draw call via
// THREE.Points. Mouse-reactive. Breathing. Depth layers. Zero React overhead
// inside the render loop.
// Loaded via next/dynamic with ssr: false. Never import directly.
// =============================================================================

'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Tuning constants
// -----------------------------------------------------------------------------

const PARTICLE_COUNT  = 2200;   // total points — single draw call, cheap
const SPHERE_RADIUS   = 4.2;
const LERP_SPEED      = 0.022;
const BASE_POINT_SIZE = 0.038;  // world-space; shader multiplies per-particle

// -----------------------------------------------------------------------------
// CSS var reader
// -----------------------------------------------------------------------------

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '#6366f1';
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    '#6366f1'
  );
}

// -----------------------------------------------------------------------------
// Layered sphere positions
// Three concentric shells create real perceived depth
// -----------------------------------------------------------------------------

function buildGeometry(count: number): {
  positions: Float32Array;
  sizes:     Float32Array;
  phases:    Float32Array;   // per-particle phase offset for breathing
  speeds:    Float32Array;   // per-particle rotation speed around Y
} {
  const positions = new Float32Array(count * 3);
  const sizes     = new Float32Array(count);
  const phases    = new Float32Array(count);
  const speeds    = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Fibonacci sphere for even distribution — avoids polar clumping
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const y     = 1 - (i / (count - 1)) * 2;           // [-1, 1]
    const theta = goldenAngle * i;
    const r     = Math.sqrt(1 - y * y);

    // Shell assignment: 12% inner · 52% mid · 36% outer halo
    const shellRand = Math.random();
    const shell =
      shellRand < 0.12 ? SPHERE_RADIUS * (0.25 + Math.random() * 0.25) :
      shellRand < 0.64 ? SPHERE_RADIUS * (0.60 + Math.random() * 0.30) :
                         SPHERE_RADIUS * (0.92 + Math.random() * 0.40);

    positions[i * 3]     = r * Math.cos(theta) * shell;
    positions[i * 3 + 1] = y * shell;
    positions[i * 3 + 2] = r * Math.sin(theta) * shell;

    // Size: inner = largest, outer = smallest → depth cue
    sizes[i] =
      shell < SPHERE_RADIUS * 0.5  ? BASE_POINT_SIZE * (1.8 + Math.random() * 0.6) :
      shell < SPHERE_RADIUS * 0.85 ? BASE_POINT_SIZE * (1.0 + Math.random() * 0.5) :
                                     BASE_POINT_SIZE * (0.4 + Math.random() * 0.3);

    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = (0.0003 + Math.random() * 0.0006) * (Math.random() > 0.5 ? 1 : -1);
  }

  return { positions, sizes, phases, speeds };
}

// -----------------------------------------------------------------------------
// Custom shader material — handles per-particle size + round sprite + glow
// -----------------------------------------------------------------------------

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    // Breathing: each particle scales with its own phase offset
    float breath = 0.88 + 0.12 * sin(uTime * 0.9 + aPhase);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * breath * uPixelRatio * (380.0 / -mvPosition.z);

    // Depth-based alpha: closer = brighter
    float depth = clamp((-mvPosition.z - 1.0) / 10.0, 0.0, 1.0);
    vAlpha = mix(0.95, 0.18, depth) * breath;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Circular soft sprite — discard corners for round points
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Soft glow falloff: bright core, soft halo
    float core  = smoothstep(0.5, 0.0, dist);
    float halo  = smoothstep(0.5, 0.15, dist) * 0.4;
    float alpha = (core + halo) * vAlpha;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// -----------------------------------------------------------------------------
// Inner R3F component — owns the Points object and per-frame updates
// -----------------------------------------------------------------------------

interface ConstellationProps {
  accentHex: string;
  mouseRef:  React.MutableRefObject<{ x: number; y: number }>;
}

function Constellation({ accentHex, mouseRef }: ConstellationProps) {
  const outerRef = useRef<THREE.Points>(null);
  const innerRef = useRef<THREE.Points>(null); // inner shell counter-rotates
  const { gl, invalidate } = useThree();

  // ── Build geometry once ───────────────────────────────────────────────────
  const { geo, innerGeo, mat, speeds } = useMemo(() => {
    const { positions, sizes, phases, speeds: sp } = buildGeometry(PARTICLE_COUNT);

    // Split into two geometries: inner shell (first 12%) and rest
    const splitAt = Math.floor(PARTICLE_COUNT * 0.12);

    function makeGeo(start: number, end: number) {
      const count = end - start;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(positions.slice(start * 3, end * 3), 3));
      g.setAttribute('aSize',    new THREE.BufferAttribute(sizes.slice(start, end), 1));
      g.setAttribute('aPhase',   new THREE.BufferAttribute(phases.slice(start, end), 1));
      return g;
    }

    const color = new THREE.Color(accentHex);

    const shaderMat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:       { value: 0 },
        uColor:      { value: color },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return {
      geo:      makeGeo(splitAt, PARTICLE_COUNT),
      innerGeo: makeGeo(0, splitAt),
      mat:      shaderMat,
      speeds:   sp,
    };
  }, [accentHex, gl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geo.dispose();
      innerGeo.dispose();
      mat.dispose();
    };
  }, [geo, innerGeo, mat]);

  // Force first render
  useEffect(() => {
    invalidate();
    const t = setTimeout(() => invalidate(), 100);
    return () => clearTimeout(t);
  }, [invalidate]);

  // ── Per-frame loop ─────────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    if (!outerRef.current || !innerRef.current) return;

    // Smooth mouse tracking with gentle autonomous drift
    const driftX = Math.sin(t * 0.13) * 0.22 + Math.cos(t * 0.08) * 0.10;
    const driftY = Math.sin(t * 0.09) * 0.30 + Math.cos(t * 0.05) * 0.12;

    const targetX = mouseRef.current.y * 0.50 + driftX;
    const targetY = mouseRef.current.x * 0.50 + driftY;

    outerRef.current.rotation.x = THREE.MathUtils.lerp(
      outerRef.current.rotation.x, targetX, LERP_SPEED
    );
    outerRef.current.rotation.y = THREE.MathUtils.lerp(
      outerRef.current.rotation.y, targetY, LERP_SPEED * 0.65
    );

    // Inner shell: slow independent counter-rotation → parallax depth feel
    innerRef.current.rotation.y += 0.0007;
    innerRef.current.rotation.x  = Math.sin(t * 0.06) * 0.09;
    innerRef.current.rotation.z += 0.0003;
  });

  // ── Render — two Points objects share the same ShaderMaterial ─────────────
  return (
    <>
      {/* Outer + mid shells */}
      <points ref={outerRef} geometry={geo} material={mat} />
      {/* Inner shell — independently animated for depth */}
      <points ref={innerRef} geometry={innerGeo} material={mat} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Guard wrapper — performance + intensity checks
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  const animationIntensity = useStore((s) => s.animationIntensity);

  const deviceMemory =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  if (deviceMemory !== undefined && deviceMemory < 2) return null;
  if (animationIntensity === 'off') return null;

  return <ParticleMeshCanvas reduced={animationIntensity === 'reduced'} />;
}

// -----------------------------------------------------------------------------
// Canvas wrapper — mouse tracking lives here, outside R3F tree
// -----------------------------------------------------------------------------

interface CanvasProps { reduced: boolean; }

function ParticleMeshCanvas({ reduced }: CanvasProps) {
  const mouseRef      = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const invalidateRef = useRef<(() => void) | null>(null);

  // Read accent colour once on mount — CSS vars are synchronous after hydration
  const accentHex = useMemo(() => getCssVar('--zymbiq-accent'), []); // eslint-disable-line

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (reduced) return; // no mouse tracking in reduced mode
    const nx = (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    const dx = nx - mouseRef.current.x;
    const dy = ny - mouseRef.current.y;
    if (Math.abs(dx) < 0.004 && Math.abs(dy) < 0.004) return;
    mouseRef.current = { x: nx, y: ny };
    invalidateRef.current?.();
  }, [reduced]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <Canvas
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
      }}
      gl={{
        antialias:        false,
        alpha:            true,
        powerPreference:  'high-performance',
        stencil:          false,
        depth:            false,        // no depth buffer needed — additive blend
      }}
      frameloop="always"
      dpr={[1, 1.5]}                    // cap pixel ratio for perf
      camera={{ position: [0, 0, 7], fov: 60 }}
    >
      <InvalidatorBridge invalidateRef={invalidateRef} />
      <Constellation accentHex={accentHex} mouseRef={mouseRef} />
    </Canvas>
  );
}

// -----------------------------------------------------------------------------
// Tiny bridge — exposes R3F invalidate() to the imperative mouse handler
// -----------------------------------------------------------------------------

function InvalidatorBridge({
  invalidateRef,
}: {
  invalidateRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => { invalidateRef.current = null; };
  }, [invalidate, invalidateRef]);
  return null;
}