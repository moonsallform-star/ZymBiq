// =============================================================================
// Zymbiq — src/components/3d/hero-particle-mesh.tsx
// Three.js/R3F hero particle mesh with mouse-responsive rotation.
// Loaded via next/dynamic with ssr: false. Never imported directly.
// =============================================================================

'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Constants — tuned for premium emotional depth
// -----------------------------------------------------------------------------

const PARTICLE_COUNT = 1200;
const SPHERE_RADIUS  = 3.8;
const LERP_FACTOR    = 0.018;

// Three size tiers for depth perception
const SIZE_LARGE  = 0.055;  // foreground — crisp, bright
const SIZE_MEDIUM = 0.034;  // mid-field  — moderate
const SIZE_SMALL  = 0.018;  // background — dim, adds depth

// -----------------------------------------------------------------------------
// CSS variable reader
// -----------------------------------------------------------------------------

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '#6366f1';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#6366f1';
}

// -----------------------------------------------------------------------------
// Geometry factories — each shape has emotional character
// -----------------------------------------------------------------------------

/** 5-pointed star — the hero shape, 30% of field */
function createStarGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const pts = 5;
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else         shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Elongated diamond — elegant, 25% of field */
function createDiamondGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0,      r * 1.4);
  shape.lineTo(r * 0.55,  0);
  shape.lineTo(0,     -r * 1.4);
  shape.lineTo(-r * 0.55, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Hexagon — structural, 20% of field */
function createHexGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
    if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else         shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Thin cross / plus — technical feel, 15% of field */
function createCrossGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const t = r * 0.28; // arm thickness
  shape.moveTo(-t, -r); shape.lineTo(t, -r);
  shape.lineTo(t, -t);  shape.lineTo(r, -t);
  shape.lineTo(r,  t);  shape.lineTo(t,  t);
  shape.lineTo(t,  r);  shape.lineTo(-t, r);
  shape.lineTo(-t, t);  shape.lineTo(-r, t);
  shape.lineTo(-r, -t); shape.lineTo(-t, -t);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** Tiny circle — soft filler, 10% of field */
function createDotGeometry(r: number): THREE.BufferGeometry {
  return new THREE.CircleGeometry(r, 8);
}

// Shape IDs
const SH_STAR    = 0;
const SH_DIAMOND = 1;
const SH_HEX     = 2;
const SH_CROSS   = 3;
const SH_DOT     = 4;

// Distribution by index ratio
function shapeFor(i: number, total: number): number {
  const r = i / total;
  if (r < 0.30) return SH_STAR;
  if (r < 0.55) return SH_DIAMOND;
  if (r < 0.75) return SH_HEX;
  if (r < 0.90) return SH_CROSS;
  return SH_DOT;
}

// Size tier — creates sense of depth (closer = larger)
function sizeFor(i: number, total: number): number {
  const r = i / total;
  if (r < 0.20) return SIZE_LARGE;
  if (r < 0.65) return SIZE_MEDIUM;
  return SIZE_SMALL;
}

// -----------------------------------------------------------------------------
// Sphere position generator — with layered shell distribution for 3D depth
// -----------------------------------------------------------------------------

function generatePositions(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);
    // Three shells: inner (intimate), mid, outer (atmospheric)
    const shell  = Math.random();
    const radius = shell < 0.15
      ? SPHERE_RADIUS * (0.3 + Math.random() * 0.3)   // inner — few, close
      : shell < 0.6
      ? SPHERE_RADIUS * (0.65 + Math.random() * 0.35) // mid
      : SPHERE_RADIUS * (0.95 + Math.random() * 0.35);// outer halo

    pos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = radius * Math.cos(phi);
  }
  return pos;
}

// -----------------------------------------------------------------------------
// Inner R3F scene component
// -----------------------------------------------------------------------------

interface ParticleMeshProps {
  accentColor: string;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

function ParticleMesh({ accentColor, mouseRef }: ParticleMeshProps) {
  const groupRef    = useRef<THREE.Group>(null);
  const innerRef    = useRef<THREE.Group>(null); // counter-rotates for depth
  const { invalidate } = useThree();

  const rotSpeedRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const rotAxisRef  = useRef<Uint8Array>(new Uint8Array(PARTICLE_COUNT));
  const pulseRef    = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT)); // phase offsets

  // ── Shared geometries — one per shape type × size tier ───────────────────
  const geometries = useMemo(() => {
    const map: Record<string, THREE.BufferGeometry> = {};
    const sizes = [SIZE_LARGE, SIZE_MEDIUM, SIZE_SMALL];
    const factories: Record<number, (r: number) => THREE.BufferGeometry> = {
      [SH_STAR]:    createStarGeometry,
      [SH_DIAMOND]: createDiamondGeometry,
      [SH_HEX]:     createHexGeometry,
      [SH_CROSS]:   createCrossGeometry,
      [SH_DOT]:     createDotGeometry,
    };
    for (const sh of [SH_STAR, SH_DIAMOND, SH_HEX, SH_CROSS, SH_DOT]) {
      for (const sz of sizes) {
        map[`${sh}_${sz}`] = factories[sh](sz);
      }
    }
    return map;
  }, []);

  // ── Per-shape, per-depth materials with distinct opacity/brightness ───────
  const materials = useMemo(() => {
    const base = new THREE.Color(accentColor);
    const map: Record<string, THREE.MeshBasicMaterial> = {};

    const opacityMap: Record<number, Record<number, number>> = {
      [SH_STAR]:    { [SIZE_LARGE]: 0.95, [SIZE_MEDIUM]: 0.70, [SIZE_SMALL]: 0.35 },
      [SH_DIAMOND]: { [SIZE_LARGE]: 0.85, [SIZE_MEDIUM]: 0.60, [SIZE_SMALL]: 0.28 },
      [SH_HEX]:     { [SIZE_LARGE]: 0.75, [SIZE_MEDIUM]: 0.50, [SIZE_SMALL]: 0.22 },
      [SH_CROSS]:   { [SIZE_LARGE]: 0.80, [SIZE_MEDIUM]: 0.55, [SIZE_SMALL]: 0.25 },
      [SH_DOT]:     { [SIZE_LARGE]: 0.65, [SIZE_MEDIUM]: 0.42, [SIZE_SMALL]: 0.18 },
    };

    const sizes = [SIZE_LARGE, SIZE_MEDIUM, SIZE_SMALL];
    for (const sh of [SH_STAR, SH_DIAMOND, SH_HEX, SH_CROSS, SH_DOT]) {
      for (const sz of sizes) {
        map[`${sh}_${sz}`] = new THREE.MeshBasicMaterial({
          color: base,
          transparent: true,
          opacity: opacityMap[sh][sz],
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      }
    }
    return map;
  }, [accentColor]);

  // ── Particle data — computed once ─────────────────────────────────────────
  const particleData = useMemo(() => {
    const positions  = generatePositions(PARTICLE_COUNT);
    const shapeTypes = new Uint8Array(PARTICLE_COUNT);
    const sizeTiers  = new Float32Array(PARTICLE_COUNT);
    const initRots   = new Float32Array(PARTICLE_COUNT * 3);
    const speeds     = rotSpeedRef.current;
    const axes       = rotAxisRef.current;
    const pulses     = pulseRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      shapeTypes[i] = shapeFor(i, PARTICLE_COUNT);
      sizeTiers[i]  = sizeFor(i, PARTICLE_COUNT);
      pulses[i]     = Math.random() * Math.PI * 2; // stagger breathing

      // Spin speed — larger particles spin slower (premium feel)
      const baseSpeed =
        sizeTiers[i] === SIZE_LARGE  ? 0.0008 :
        sizeTiers[i] === SIZE_MEDIUM ? 0.0018 : 0.003;
      const magnitude = baseSpeed + Math.random() * baseSpeed * 1.5;
      speeds[i] = Math.random() > 0.5 ? magnitude : -magnitude;

      // Axis type — 0: Z only, 1: Z+X wobble, 2: Z+Y wobble
      axes[i] = Math.floor(Math.random() * 3) as 0 | 1 | 2;

      initRots[i * 3]     = Math.random() * Math.PI * 2;
      initRots[i * 3 + 1] = Math.random() * Math.PI * 2;
      initRots[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    return { positions, shapeTypes, sizeTiers, initRots };
  }, []);

  // Force initial renders
  useEffect(() => {
    invalidate();
    const t1 = setTimeout(() => invalidate(), 80);
    const t2 = setTimeout(() => invalidate(), 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [invalidate]);

  // ── Per-frame animation ────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    if (!groupRef.current || !innerRef.current) return;
    const elapsed = clock.getElapsedTime();
    const speeds  = rotSpeedRef.current;
    const axes    = rotAxisRef.current;
    const children = innerRef.current.children;

    // Individual particle spins + subtle breathing scale
    for (let i = 0; i < children.length; i++) {
      children[i].rotation.z += speeds[i];
      if (axes[i] === 1) children[i].rotation.x += speeds[i] * 0.22;
      if (axes[i] === 2) children[i].rotation.y += speeds[i] * 0.18;

      // Breathing — large particles breathe slowly, small ones flicker
      const breatheSpeed =
        particleData.sizeTiers[i] === SIZE_LARGE  ? 0.6 :
        particleData.sizeTiers[i] === SIZE_MEDIUM ? 0.9 : 1.4;
      const breathe = 0.92 + 0.08 * Math.sin(elapsed * breatheSpeed + pulseRef.current[i]);
      children[i].scale.setScalar(breathe);
    }

    // Outer group: responds to mouse + gentle autonomous oscillation
    const autoX = Math.sin(elapsed * 0.14) * 0.28 + Math.cos(elapsed * 0.09) * 0.12;
    const autoY = Math.sin(elapsed * 0.09) * 0.38 + Math.cos(elapsed * 0.06) * 0.16;

    const targetX = mouseRef.current.y * 0.55 + autoX;
    const targetY = mouseRef.current.x * 0.55 + autoY;

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, LERP_FACTOR);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, LERP_FACTOR * 0.6);

    // Inner group: slow counter-rotation — creates parallax depth between shells
    innerRef.current.rotation.y += 0.0006;
    innerRef.current.rotation.x  = Math.sin(elapsed * 0.07) * 0.08;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef}>
      <group ref={innerRef}>
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
          const sh  = particleData.shapeTypes[i];
          const sz  = particleData.sizeTiers[i];
          return (
            <mesh
              key={i}
              geometry={geometries[`${sh}_${sz}`]}
              material={materials[`${sh}_${sz}`]}
              position={[
                particleData.positions[i * 3],
                particleData.positions[i * 3 + 1],
                particleData.positions[i * 3 + 2],
              ]}
              rotation={[
                particleData.initRots[i * 3],
                particleData.initRots[i * 3 + 1],
                particleData.initRots[i * 3 + 2],
              ]}
            />
          );
        })}
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Exported component — guards + canvas
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  const animationIntensity = useStore((s) => s.animationIntensity);
  const deviceMemory =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  if (deviceMemory !== undefined && deviceMemory < 4) return null;
  if (animationIntensity === 'off' || animationIntensity === 'reduced') return null;

  return <ParticleMeshCanvas />;
}

// -----------------------------------------------------------------------------
// Canvas wrapper
// -----------------------------------------------------------------------------

function ParticleMeshCanvas() {
  const mouseRef     = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const invalidateRef = useRef<(() => void) | null>(null);
  const accentColor  = useMemo(() => getCssVar('--zymbiq-accent'), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newX = (e.clientX / window.innerWidth)  *  2 - 1;
    const newY = -((e.clientY / window.innerHeight) * 2 - 1);
    const dx = newX - mouseRef.current.x;
    const dy = newY - mouseRef.current.y;
    if (Math.abs(dx) < 0.003 && Math.abs(dy) < 0.003) return;
    mouseRef.current = { x: newX, y: newY };
    invalidateRef.current?.();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
      gl={{ antialias: false, alpha: true }}
      frameloop="always"
      camera={{ position: [0, 0, 6.5], fov: 65 }}
    >
      <FrameInvalidator invalidateRef={invalidateRef} />
      <ParticleMesh accentColor={accentColor} mouseRef={mouseRef} />
    </Canvas>
  );
}

// -----------------------------------------------------------------------------
// Invalidator helper
// -----------------------------------------------------------------------------

interface FrameInvalidatorProps {
  invalidateRef: React.MutableRefObject<(() => void) | null>;
}

function FrameInvalidator({ invalidateRef }: FrameInvalidatorProps) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => { invalidateRef.current = null; };
  }, [invalidate, invalidateRef]);
  return null;
}