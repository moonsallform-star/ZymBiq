// =============================================================================
// Zymbiq — src/components/layout/logo-emobot.tsx
// The living Zymbiq brand mark — no robot face, just the logo itself breathing,
// tilting, glowing, and reacting emotionally to cursor and site state.
// Works with either an image logo (logoUrl) or the text fallback.
// =============================================================================

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from 'framer-motion';
import { useStore } from '@/store/index';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

// -----------------------------------------------------------------------------
// Emotion states — drive the visual feel, not a face
// -----------------------------------------------------------------------------

type EmotionState = 'idle' | 'curious' | 'excited' | 'shy' | 'thinking' | 'happy';

const EMOTION_SEQUENCE: EmotionState[] = [
  'idle', 'curious', 'thinking', 'idle', 'shy', 'idle', 'excited', 'happy',
];

const EMOTION_DURATIONS: Record<EmotionState, number> = {
  idle:     5000,
  curious:  3500,
  excited:  2500,
  shy:      4000,
  thinking: 5000,
  happy:    3000,
};

// Glow intensity per emotion — drives the CSS shadow
const EMOTION_GLOW: Record<EmotionState, number> = {
  idle:     0.18,
  curious:  0.32,
  excited:  0.55,
  shy:      0.10,
  thinking: 0.22,
  happy:    0.45,
};

// Subtle scale pulse per emotion
const EMOTION_SCALE: Record<EmotionState, [number, number]> = {
  idle:     [1,    1.01 ],
  curious:  [1,    1.02 ],
  excited:  [0.98, 1.04 ],
  shy:      [0.99, 1.00 ],
  thinking: [1,    1.015],
  happy:    [0.99, 1.035],
};

// Tooltip whispers — brief emotional message near the logo
const EMOTION_WHISPER: Record<EmotionState, string | null> = {
  idle:     null,
  curious:  '✦ what are you building?',
  excited:  '✦ let\'s make something great',
  shy:      null,
  thinking: '✦ I\'m thinking...',
  happy:    '✦ nice to see you',
};

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export interface LogoEmobotProps {
  logoUrl?: string;
  platformName?: string;
  width?: number;
  height?: number;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function LogoEmobot({
  logoUrl,
  platformName = 'Zymbiq',
  width = 120,
  height = 32,
}: LogoEmobotProps) {
  const animationIntensity = useStore((s) => s.animationIntensity);

  // Reduced motion — bail to plain static render
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Emotion cycle ────────────────────────────────────────────────────────
  const [emotion, setEmotion] = React.useState<EmotionState>('idle');
  const [isHovered, setIsHovered] = React.useState(false);
  const emotionIndexRef = React.useRef(0);

  React.useEffect(() => {
    if (animationIntensity === 'off' || prefersReduced) return;
    let timer: ReturnType<typeof setTimeout>;

    function cycle() {
      emotionIndexRef.current = (emotionIndexRef.current + 1) % EMOTION_SEQUENCE.length;
      const next = EMOTION_SEQUENCE[emotionIndexRef.current];
      setEmotion(next);
      timer = setTimeout(cycle, EMOTION_DURATIONS[next]);
    }

    timer = setTimeout(cycle, EMOTION_DURATIONS['idle']);
    return () => clearTimeout(timer);
  }, [animationIntensity, prefersReduced]);

  // ── 3D tilt on mouse proximity ──────────────────────────────────────────
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 180, damping: 20 });
  const springY = useSpring(tiltY, { stiffness: 180, damping: 20 });

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || animationIntensity === 'off') return;
    const { left, top, width: w, height: h } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / w - 0.5) * 2;
    const y = ((e.clientY - top) / h - 0.5) * 2;
    tiltX.set(y * -7);
    tiltY.set(x * 12);
  }, [animationIntensity, tiltX, tiltY]);

  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
    setEmotion('excited');
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    setEmotion('idle');
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  // ── Derived animation values ─────────────────────────────────────────────
  const activeEmotion: EmotionState = isHovered ? 'excited' : emotion;
  const glowAlpha     = isHovered ? 0.6 : EMOTION_GLOW[activeEmotion];
  const [scaleMin, scaleMax] = EMOTION_SCALE[activeEmotion];
  const whisper = EMOTION_WHISPER[activeEmotion];

  // ── Static fallback ──────────────────────────────────────────────────────
  if (animationIntensity === 'off' || prefersReduced) {
    return logoUrl ? (
      <Image
        src={logoUrl}
        alt={platformName}
        loader={cloudinaryLoader}
        width={width}
        height={height}
        className="h-8 w-auto object-contain"
        priority
      />
    ) : (
      <span className="text-lg font-semibold tracking-tight font-heading text-[var(--zymbiq-text)]">
        {platformName}
      </span>
    );
  }

  // ── Living logo ──────────────────────────────────────────────────────────
  return (
    <motion.div
      ref={containerRef}
      className="relative shrink-0 select-none"
      style={{
        rotateX: springX,
        rotateY: springY,
        transformStyle: 'preserve-3d',
        perspective: 500,
        display: 'inline-flex',
        alignItems: 'center',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Ambient glow behind the logo — breathes with emotion ── */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-md"
        animate={{
          boxShadow: [
            `0 0 ${12 + glowAlpha * 20}px ${4 + glowAlpha * 8}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(glowAlpha * 100)}%, transparent)`,
            `0 0 ${18 + glowAlpha * 24}px ${6 + glowAlpha * 10}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(glowAlpha * 140)}%, transparent)`,
            `0 0 ${12 + glowAlpha * 20}px ${4 + glowAlpha * 8}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(glowAlpha * 100)}%, transparent)`,
          ],
          opacity: isHovered ? 1 : 0.7,
        }}
        transition={{
          duration: isHovered ? 0.9 : 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ── The actual logo — scale breathes, slight translateZ for depth ── */}
      <motion.div
        style={{ translateZ: isHovered ? 6 : 0, transformStyle: 'preserve-3d' }}
        animate={{
          scale: [scaleMin, scaleMax, scaleMin],
          translateZ: isHovered ? 8 : 0,
        }}
        transition={{
          scale: {
            duration: isHovered ? 0.7 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          translateZ: { type: 'spring', stiffness: 200, damping: 22 },
        }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={platformName}
            loader={cloudinaryLoader}
            width={width}
            height={height}
            className="h-8 w-auto object-contain"
            priority
            style={{
              filter: isHovered
                ? `drop-shadow(0 0 6px color-mix(in srgb, var(--zymbiq-accent) 60%, transparent))`
                : `drop-shadow(0 0 3px color-mix(in srgb, var(--zymbiq-accent) 20%, transparent))`,
              transition: 'filter 0.4s ease',
            }}
          />
        ) : (
          <motion.span
            className="text-lg font-semibold tracking-tight font-heading"
            animate={{
              color: isHovered
                ? 'var(--zymbiq-accent)'
                : ['var(--zymbiq-text)', 'var(--zymbiq-text)', 'var(--zymbiq-text)'],
              textShadow: isHovered
                ? `0 0 16px color-mix(in srgb, var(--zymbiq-accent) 50%, transparent)`
                : [
                    `0 0 0px transparent`,
                    `0 0 8px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(glowAlpha * 80)}%, transparent)`,
                    `0 0 0px transparent`,
                  ],
            }}
            transition={{
              color: { duration: 0.3 },
              textShadow: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {platformName}
          </motion.span>
        )}
      </motion.div>

      {/* ── Sparkle particles on hover/excited ── */}
      <AnimatePresence>
        {isHovered && (
          <>
            {[
              { x: -8,  y: -10, delay: 0,    size: 5 },
              { x:  12, y: -14, delay: 0.12, size: 4 },
              { x:  18, y: -6,  delay: 0.22, size: 3 },
              { x: -14, y: -4,  delay: 0.08, size: 3 },
            ].map((s, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{ top: '50%', left: '50%' }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: s.x,
                  y: s.y,
                  scale: [0, 1, 0],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.7,
                  delay: s.delay,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
              >
                <svg
                  width={s.size}
                  height={s.size}
                  viewBox="0 0 10 10"
                  fill="none"
                >
                  <path
                    d="M5 0L5.9 3.6L9.5 5L5.9 6.4L5 10L4.1 6.4L0.5 5L4.1 3.6Z"
                    fill="var(--zymbiq-accent)"
                  />
                </svg>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* ── Emotional whisper tooltip ── */}
      <AnimatePresence>
        {isHovered && whisper && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-50"
            initial={{ opacity: 0, y: 4, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.88 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <span
              className="text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--zymbiq-accent) 10%, var(--zymbiq-surface))',
                color: 'var(--zymbiq-accent)',
                border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 25%, transparent)',
              }}
            >
              {whisper}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}