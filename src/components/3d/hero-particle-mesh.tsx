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
// Constants
// -----------------------------------------------------------------------------

const PARTICLE_COUNT = 800;
const SPHERE_RADIUS = 3;
const LERP_FACTOR = 0.02;
const POINT_SIZE = 0.035;
const POINT_OPACITY = 0.85;

// -----------------------------------------------------------------------------
// Helper — read a CSS custom property from :root
// -----------------------------------------------------------------------------

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '#6366f1';
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || '#6366f1';
}

// -----------------------------------------------------------------------------
// Generate particle positions in a spherical distribution
// -----------------------------------------------------------------------------

function generateSpherePositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Uniform sphere distribution via rejection sampling approach using
    // spherical coordinates with randomised radius variation.
    const theta = Math.random() * Math.PI * 2;         // azimuth [0, 2π]
    const phi = Math.acos(2 * Math.random() - 1);      // polar [0, π]
    const radiusVariation = 0.7 + Math.random() * 0.6; // [0.7, 1.3]
    const r = SPHERE_RADIUS * radiusVariation;

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta); // x
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta); // y
    positions[i * 3 + 2] = r * Math.cos(phi);                    // z
  }

  return positions;
}

// -----------------------------------------------------------------------------
// Shape geometry factories
// -----------------------------------------------------------------------------

function createStarGeometry(outerR: number, innerR: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createDiamondGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0,  r);
  shape.lineTo(r * 0.6,  0);
  shape.lineTo(0, -r);
  shape.lineTo(-r * 0.6, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createTriangleGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createDotGeometry(r: number): THREE.BufferGeometry {
  return new THREE.CircleGeometry(r, 6);
}

// Shape type enum
const SHAPE_STAR     = 0;
const SHAPE_DIAMOND  = 1;
const SHAPE_DOT      = 2;
const SHAPE_TRIANGLE = 3;

// Assign shape type by index based on desired distribution:
// 40% stars, 25% diamonds, 20% dots, 15% triangles
function assignShapeType(i: number, total: number): number {
  const ratio = i / total;
  if (ratio < 0.40) return SHAPE_STAR;
  if (ratio < 0.65) return SHAPE_DIAMOND;
  if (ratio < 0.85) return SHAPE_DOT;
  return SHAPE_TRIANGLE;
}

// -----------------------------------------------------------------------------
// Inner R3F component — mixed constellation field
// Stars 40% · Diamonds 25% · Dots 20% · Triangles 15%
// -----------------------------------------------------------------------------

interface ParticleMeshProps {
  accentColor: string;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

function ParticleMesh({ accentColor, mouseRef }: ParticleMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  const rotationSpeeds = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const rotationAxes   = useRef<Uint8Array>(new Uint8Array(PARTICLE_COUNT));

  // ── Four shared geometries ────────────────────────────────────────────────
  const geometries = useMemo(() => ({
    [SHAPE_STAR]:     createStarGeometry(POINT_SIZE * 1.9, POINT_SIZE * 0.8),
    [SHAPE_DIAMOND]:  createDiamondGeometry(POINT_SIZE * 1.4),
    [SHAPE_DOT]:      createDotGeometry(POINT_SIZE * 0.65),
    [SHAPE_TRIANGLE]: createTriangleGeometry(POINT_SIZE * 1.2),
  } as Record<number, THREE.BufferGeometry>), []);

  // ── Per-shape materials with distinct opacity levels ─────────────────────
  const materials = useMemo(() => {
    const base = new THREE.Color(accentColor);
    return {
      [SHAPE_STAR]:     new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide }),
      [SHAPE_DIAMOND]:  new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
      [SHAPE_DOT]:      new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.50, depthWrite: false, side: THREE.DoubleSide }),
      [SHAPE_TRIANGLE]: new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.60, depthWrite: false, side: THREE.DoubleSide }),
    } as Record<number, THREE.MeshBasicMaterial>;
  }, [accentColor]);

  // ── Particle data ─────────────────────────────────────────────────────────
  const particleData = useMemo(() => {
    const positions  = generateSpherePositions(PARTICLE_COUNT);
    const speeds     = rotationSpeeds.current;
    const axes       = rotationAxes.current;
    const shapeTypes = new Uint8Array(PARTICLE_COUNT);
    const initRots   = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      shapeTypes[i] = assignShapeType(i, PARTICLE_COUNT);

      // Rotation speed: magnitude varies by shape type
      // Stars spin slowest (elegant), diamonds medium, triangles fastest (edgy)
      const base =
        shapeTypes[i] === SHAPE_STAR     ? 0.0015 :
        shapeTypes[i] === SHAPE_DIAMOND  ? 0.003  :
        shapeTypes[i] === SHAPE_TRIANGLE ? 0.005  : 0.001;
      const magnitude = base + Math.random() * base * 2;
      speeds[i] = Math.random() > 0.5 ? magnitude : -magnitude;

      // Axis wobble: 0 = Z only, 1 = Z + tiny X
      axes[i] = Math.random() > 0.65 ? 1 : 0;

      // Random initial orientations — no two particles start the same
      initRots[i * 3]     = Math.random() * Math.PI * 2;
      initRots[i * 3 + 1] = Math.random() * Math.PI * 2;
      initRots[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    return { positions, shapeTypes, initRots };
  }, []);

  // ── Initial render trigger ─────────────────────────────────────────────────
  useEffect(() => {
    invalidate();
    const t1 = setTimeout(() => invalidate(), 100);
    const t2 = setTimeout(() => invalidate(), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [invalidate]);

  // ── Per-frame animation ────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const elapsed = clock.getElapsedTime();
    const speeds  = rotationSpeeds.current;
    const axes    = rotationAxes.current;
    const children = groupRef.current.children;

    // Each particle spins independently
    for (let i = 0; i < children.length; i++) {
      children[i].rotation.z += speeds[i];
      if (axes[i] === 1) {
        children[i].rotation.x += speeds[i] * 0.28;
      }
    }

    // Whole field: gentle sine-wave oscillation — never drills one direction
    const autoX = Math.sin(elapsed * 0.18) * 0.25;
    const autoY = Math.sin(elapsed * 0.11) * 0.35;

    const targetX = mouseRef.current.y * 0.5 + autoX;
    const targetY = mouseRef.current.x * 0.5 + autoY;

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      LERP_FACTOR,
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      LERP_FACTOR * 0.5,
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const type = particleData.shapeTypes[i];
        return (
          <mesh
            key={i}
            geometry={geometries[type]}
            material={materials[type]}
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
  );
}

// -----------------------------------------------------------------------------
// Exported component — guards, canvas wrapper, and mouse tracking
// -----------------------------------------------------------------------------

export default function HeroParticleMesh() {
  // ── Performance / intensity guards ────────────────────────────────────────

  const animationIntensity = useStore((s) => s.animationIntensity);

  // navigator.deviceMemory is not universally supported; treat undefined as
  // capable (>= 4 GB) so capable devices never miss out.
  const deviceMemory =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  if (deviceMemory !== undefined && deviceMemory < 4) return null;
  if (animationIntensity === 'off' || animationIntensity === 'reduced') return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return <ParticleMeshCanvas />;
}

// -----------------------------------------------------------------------------
// Separate component so hooks run after guards above
// -----------------------------------------------------------------------------

function ParticleMeshCanvas() {
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const invalidateRef = useRef<(() => void) | null>(null);

  // Read accent colour from CSS custom property once on mount
  const accentColor = useMemo(() => getCssVar('--zymbiq-accent'), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse move handler — normalise to [-1, 1] and request a render frame.
  // The delta threshold (0.004) prevents micro-movements from constantly
  // marking the canvas dirty and triggering unnecessary R3F render passes.
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newX = (e.clientX / window.innerWidth) * 2 - 1;
    const newY = -((e.clientY / window.innerHeight) * 2 - 1);
    const dx = newX - mouseRef.current.x;
    const dy = newY - mouseRef.current.y;
    if (Math.abs(dx) < 0.004 && Math.abs(dy) < 0.004) return;
    mouseRef.current = { x: newX, y: newY };
    invalidateRef.current?.();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
      gl={{ antialias: false, alpha: true }}
      frameloop="always"
      camera={{ position: [0, 0, 5], fov: 75 }}
    >
      {/* Captures the invalidate function so the mouse handler can call it */}
      <FrameInvalidator invalidateRef={invalidateRef} />
      <ParticleMesh accentColor={accentColor} mouseRef={mouseRef} />
    </Canvas>
  );
}

// -----------------------------------------------------------------------------
// Tiny helper that exposes R3F's invalidate() to the imperative mouse handler
// -----------------------------------------------------------------------------

interface FrameInvalidatorProps {
  invalidateRef: React.MutableRefObject<(() => void) | null>;
}

function FrameInvalidator({ invalidateRef }: FrameInvalidatorProps) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => {
      invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);

  return null;
}