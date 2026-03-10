// =============================================================================
// Zymbiq — src/components/3d/project-card-tilt.tsx
// Framer Motion 3D tilt wrapper for project cards with spring physics.
// Disabled on touch devices and when animation intensity is 'off'.
// =============================================================================

'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface ProjectCardTiltProps {
  children: React.ReactNode;
  className?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProjectCardTilt({ children, className }: ProjectCardTiltProps) {
  const animationIntensity = useStore((s) => s.animationIntensity);
  const ref = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device on mount — SSR-safe (starts false, confirmed after hydration)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsTouchDevice(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Motion values for rotation axes
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  // Spring physics applied to raw motion values
  const springX = useSpring(rotateX, { stiffness: 300, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 20 });

  // ---------------------------------------------------------------------------
  // Early exits — no tilt rendered
  // ---------------------------------------------------------------------------

  if (animationIntensity === 'off' || isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;

    const { left, top, width, height } = el.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const centerX = width / 2;
    const centerY = height / 2;

    // Max ±8 degrees tilt
    rotateX.set(((y - centerY) / height) * -16);
    rotateY.set(((x - centerX) / width) * 16);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}