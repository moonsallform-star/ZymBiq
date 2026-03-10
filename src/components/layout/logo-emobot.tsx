// =============================================================================
// Zymbiq — src/components/layout/logo-emobot.tsx
// The living Zymbiq brand mark — breathes, rotates, tilts in 3D, glows,
// reacts emotionally. Always alive, intensifies on hover.
// =============================================================================

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useSpring,
  useAnimationControls,
  AnimatePresence,
} from 'framer-motion';
import { useStore } from '@/store/index';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

// -----------------------------------------------------------------------------
// Emotion states
// -----------------------------------------------------------------------------

type EmotionState = 'idle' | 'curious' | 'excited' | 'shy' | 'thinking' | 'happy';

const EMOTION_SEQUENCE: EmotionState[] = [
  'idle', 'curious', 'thinking', 'idle', 'excited', 'idle', 'shy', 'happy', 'idle',
];

const EMOTION_DURATIONS: Record<EmotionState, number> = {
  idle:     4500,
  curious:  3000,
  excited:  2200,
  shy:      3500,
  thinking: 4000,
  happy:    2800,
};

const EMOTION_GLOW: Record<EmotionState, number> = {
  idle:     0.20,
  curious:  0.35,
  excited:  0.65,
  shy:      0.12,
  thinking: 0.25,
  happy:    0.50,
};

const EMOTION_WHISPER: Record<EmotionState, string | null> = {
  idle:     null,
  curious:  '✦ what are you building?',
  excited:  '✦ let\'s make something great',
  shy:      null,
  thinking: '✦ I\'m thinking...',
  happy:    '✦ nice to see you',
};

// -----------------------------------------------------------------------------
// Autonomous motion sequences — the logo physically moves on its own
// -----------------------------------------------------------------------------

type MotionSequence = {
  rotate:    number[];
  rotateY:   number[];
  rotateX:   number[];
  y:         number[];
  scale:     number[];
  duration:  number;
};

const IDLE_MOTION: MotionSequence = {
  rotate:   [0, 0.4, 0, -0.3, 0],
  rotateY:  [0, 2, 0, -2, 0],
  rotateX:  [0, 1, 0, -0.5, 0],
  y:        [0, -2, 0, -1, 0],
  scale:    [1, 1.008, 1, 1.005, 1],
  duration: 6,
};

const CURIOUS_MOTION: MotionSequence = {
  rotate:   [0, 3, 2, -1, 0],
  rotateY:  [0, 8, 4, -4, 0],
  rotateX:  [0, 3, 1, -2, 0],
  y:        [0, -3, -1, -2, 0],
  scale:    [1, 1.015, 1.01, 1.005, 1],
  duration: 4,
};

const EXCITED_MOTION: MotionSequence = {
  rotate:   [0, -4, 4, -3, 3, 0],
  rotateY:  [0, 12, -10, 8, -6, 0],
  rotateX:  [0, 5, -4, 3, -2, 0],
  y:        [0, -5, -2, -4, -1, 0],
  scale:    [1, 1.06, 0.97, 1.04, 0.99, 1],
  duration: 2.5,
};

const SHY_MOTION: MotionSequence = {
  rotate:   [0, -2, -1, 0],
  rotateY:  [0, -6, -3, 0],
  rotateX:  [0, 2, 1, 0],
  y:        [0, -1, 0],
  scale:    [1, 0.97, 0.98, 1],
  duration: 5,
};

const THINKING_MOTION: MotionSequence = {
  rotate:   [0, 1.5, 1.5, 0, -0.5, 0],
  rotateY:  [0, 5, 5, 2, -2, 0],
  rotateX:  [0, -3, -3, -1, 0],
  y:        [0, -1.5, -1.5, -0.5, 0],
  scale:    [1, 1.01, 1.01, 1.005, 1],
  duration: 6,
};

const HAPPY_MOTION: MotionSequence = {
  rotate:   [0, 5, -4, 6, -3, 2, 0],
  rotateY:  [0, 15, -12, 10, -8, 5, 0],
  rotateX:  [0, 4, -3, 4, -2, 2, 0],
  y:        [0, -6, -2, -5, -1, -3, 0],
  scale:    [1, 1.08, 0.96, 1.06, 0.98, 1.03, 1],
  duration: 3,
};

const EMOTION_MOTION: Record<EmotionState, MotionSequence> = {
  idle:     IDLE_MOTION,
  curious:  CURIOUS_MOTION,
  excited:  EXCITED_MOTION,
  shy:      SHY_MOTION,
  thinking: THINKING_MOTION,
  happy:    HAPPY_MOTION,
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

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Emotion + motion state ────────────────────────────────────────────────
  const [emotion, setEmotion] = React.useState<EmotionState>('curious');
  const [isHovered, setIsHovered]   = React.useState(false);
  const emotionIndexRef             = React.useRef(0);
  const controls                    = useAnimationControls();
  const glowControls                = useAnimationControls();
  const flipControls                = useAnimationControls();

  // ── Play autonomous motion sequence per emotion ──────────────────────────
  const playMotion = React.useCallback(async (em: EmotionState, hovered: boolean) => {
    const m = EMOTION_MOTION[em];
    await controls.start({
      rotate:  hovered ? m.rotate.map(v => v * 1.4) : m.rotate,
      rotateY: hovered ? m.rotateY.map(v => v * 1.5) : m.rotateY,
      rotateX: hovered ? m.rotateX.map(v => v * 1.3) : m.rotateX,
      y:       hovered ? m.y.map(v => v * 1.4) : m.y,
      scale:   hovered ? m.scale.map(v => 1 + (v - 1) * 1.6) : m.scale,
      transition: {
        duration:   m.duration,
        ease:       'easeInOut',
        repeat:     Infinity,
        repeatType: 'mirror' as const,
      },
    });
  }, [controls]);

  // ── Glow animation ────────────────────────────────────────────────────────
  const playGlow = React.useCallback((em: EmotionState, hovered: boolean) => {
    const g   = hovered ? Math.min(EMOTION_GLOW[em] * 1.6, 0.8) : EMOTION_GLOW[em];
    const dur = hovered ? 0.7 : (em === 'excited' || em === 'happy' ? 1.0 : 3.0);

    glowControls.start({
      boxShadow: [
        `0 0 ${8  + g * 20}px ${2 + g * 8}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(g * 80)}%,  transparent)`,
        `0 0 ${14 + g * 26}px ${4 + g * 12}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(g * 120)}%, transparent)`,
        `0 0 ${8  + g * 20}px ${2 + g * 8}px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(g * 80)}%,  transparent)`,
      ],
      transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [glowControls]);

  // ── Emotion cycle — always runs ───────────────────────────────────────────
  React.useEffect(() => {
    if (animationIntensity === 'off' || prefersReduced) return;
    let timer: ReturnType<typeof setTimeout>;

    function cycle() {
      if (!isHovered) {
        emotionIndexRef.current = (emotionIndexRef.current + 1) % EMOTION_SEQUENCE.length;
        const next = EMOTION_SEQUENCE[emotionIndexRef.current];
        setEmotion(next);
        timer = setTimeout(cycle, EMOTION_DURATIONS[next]);
      } else {
        timer = setTimeout(cycle, 400);
      }
    }

    timer = setTimeout(cycle, 1000);
    return () => clearTimeout(timer);
  }, [animationIntensity, prefersReduced, isHovered]);

  // ── Trigger motion + glow whenever emotion or hover changes ──────────────
  React.useEffect(() => {
    if (animationIntensity === 'off' || prefersReduced) return;
    const active = isHovered ? 'excited' : emotion;
    playMotion(active, isHovered);
    playGlow(active, isHovered);
  }, [emotion, isHovered, animationIntensity, prefersReduced, playMotion, playGlow]);

  // ── Sudden 360° flip — fires randomly every 6–14 seconds ─────────────────
  React.useEffect(() => {
    if (animationIntensity === 'off' || prefersReduced) return;
    let timer: ReturnType<typeof setTimeout>;

    async function scheduleFlip() {
      const delay = isHovered
        ? 3000 + Math.random() * 2000
        : 6000 + Math.random() * 8000;

      timer = setTimeout(async () => {
        // Whip around — fast acceleration, hard stop
        await flipControls.start({
          rotateY: [0, 360],
          transition: {
            duration: isHovered ? 0.55 : 0.75,
            ease: [0.2, 0, 0.1, 1], // fast start, snap to end
          },
        });
        // Reset to 0 instantly (same visual position as 360)
        flipControls.set({ rotateY: 0 });
        scheduleFlip();
      }, delay);
    }

    scheduleFlip();
    return () => clearTimeout(timer);
  }, [animationIntensity, prefersReduced, isHovered, flipControls]);

  // ── Mouse tilt (extra layer on top of autonomous motion) ─────────────────
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tiltX        = useMotionValue(0);
  const tiltY        = useMotionValue(0);
  const springX      = useSpring(tiltX, { stiffness: 200, damping: 18 });
  const springY      = useSpring(tiltY, { stiffness: 200, damping: 18 });

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width: w, height: h } = containerRef.current.getBoundingClientRect();
    tiltX.set(((e.clientY - top)  / h - 0.5) * -14);
    tiltY.set(((e.clientX - left) / w - 0.5) *  20);
  }, [tiltX, tiltY]);

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

  // ── Whisper logic ─────────────────────────────────────────────────────────
  const activeEmotion: EmotionState = isHovered ? 'excited' : emotion;
  const whisper = isHovered
    ? EMOTION_WHISPER[activeEmotion]
    : (['excited', 'happy', 'curious'].includes(emotion) ? EMOTION_WHISPER[emotion] : null);

  // ── Static fallback ───────────────────────────────────────────────────────
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

  // ── Living logo ───────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative shrink-0 select-none"
      style={{ display: 'inline-flex', alignItems: 'center', perspective: 600 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient glow layer — always pulsing */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none rounded-lg"
        animate={glowControls}
      />

      {/* Sudden 360° flip layer — whips around then sits still */}
      <motion.div
        style={{ transformStyle: 'preserve-3d', display: 'inline-flex' }}
        animate={flipControls}
      >
        {/* Outer tilt wrapper — mouse-driven spring */}
        <motion.div
          style={{
            rotateX:        springX,
            rotateY:        springY,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Inner autonomous motion wrapper */}
          <motion.div
            animate={controls}
            style={{ transformStyle: 'preserve-3d', display: 'inline-flex' }}
          >
          {logoUrl ? (
            <motion.div
              animate={{
                filter: isHovered
                  ? [
                      'drop-shadow(0 0 6px color-mix(in srgb, var(--zymbiq-accent) 55%, transparent))',
                      'drop-shadow(0 0 10px color-mix(in srgb, var(--zymbiq-accent) 75%, transparent))',
                      'drop-shadow(0 0 6px color-mix(in srgb, var(--zymbiq-accent) 55%, transparent))',
                    ]
                  : [
                      'drop-shadow(0 0 2px color-mix(in srgb, var(--zymbiq-accent) 18%, transparent))',
                      'drop-shadow(0 0 5px color-mix(in srgb, var(--zymbiq-accent) 32%, transparent))',
                      'drop-shadow(0 0 2px color-mix(in srgb, var(--zymbiq-accent) 18%, transparent))',
                    ],
              }}
              transition={{
                duration: isHovered ? 0.8 : 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Image
                src={logoUrl}
                alt={platformName}
                loader={cloudinaryLoader}
                width={width}
                height={height}
                className="h-8 w-auto object-contain"
                priority
              />
            </motion.div>
          ) : (
            <motion.span
              className="text-lg font-semibold tracking-tight font-heading"
              animate={{
                color: isHovered ? 'var(--zymbiq-accent)' : 'var(--zymbiq-text)',
                textShadow: isHovered
                  ? [
                      '0 0 10px color-mix(in srgb, var(--zymbiq-accent) 45%, transparent)',
                      '0 0 18px color-mix(in srgb, var(--zymbiq-accent) 65%, transparent)',
                      '0 0 10px color-mix(in srgb, var(--zymbiq-accent) 45%, transparent)',
                    ]
                  : [
                      '0 0 0px transparent',
                      `0 0 8px color-mix(in srgb, var(--zymbiq-accent) ${Math.round(EMOTION_GLOW[activeEmotion] * 70)}%, transparent)`,
                      '0 0 0px transparent',
                    ],
              }}
              transition={{
                color:      { duration: 0.25 },
                textShadow: { duration: isHovered ? 0.8 : 3.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              {platformName}
            </motion.span>
          )}
        </motion.div>
        </motion.div>
      </motion.div>

      {/* Sparkles — excited / happy / hover */}
      <AnimatePresence>
        {(isHovered || activeEmotion === 'excited' || activeEmotion === 'happy') && (
          <>
            {[
              { x: -10, y: -12, delay: 0,    size: 5 },
              { x:  14, y: -16, delay: 0.14, size: 4 },
              { x:  20, y:  -5, delay: 0.25, size: 3 },
              { x: -16, y:  -3, delay: 0.07, size: 3 },
              { x:   8, y: -20, delay: 0.35, size: 4 },
            ].map((s, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{ top: '50%', left: '40%' }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0, 1.1, 0] }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.8,
                  delay: s.delay,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 1.0,
                }}
              >
                <svg width={s.size} height={s.size} viewBox="0 0 10 10" fill="none">
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

      {/* Whisper tooltip — below logo, always in bounds */}
      <AnimatePresence>
        {whisper && (
          <motion.div
            className="absolute top-full mt-2 left-0 pointer-events-none whitespace-nowrap z-50"
            initial={{ opacity: 0, y: -4, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.88 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <span
              className="text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--zymbiq-accent) 10%, var(--zymbiq-surface))',
                color:  'var(--zymbiq-accent)',
                border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 22%, transparent)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {whisper}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}