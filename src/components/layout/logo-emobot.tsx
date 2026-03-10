// =============================================================================
// Zymbiq — src/components/layout/logo-emobot.tsx
// The living Zymbiq logo — an emotional emobot that breathes, blinks, reacts
// to hover, and gathers sympathy through micro-expressions and 3D depth.
// =============================================================================

'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Emotion states the bot cycles through
// -----------------------------------------------------------------------------
type EmotionState = 'idle' | 'curious' | 'excited' | 'shy' | 'thinking' | 'happy';

// -----------------------------------------------------------------------------
// Pupil target positions per emotion
// -----------------------------------------------------------------------------
const EMOTION_PUPILS: Record<EmotionState, { x: number; y: number }> = {
  idle:     { x: 0,    y: 0    },
  curious:  { x: 1.2,  y: -1   },
  excited:  { x: 0,    y: -1.5 },
  shy:      { x: -1.5, y: 1    },
  thinking: { x: -1,   y: -1.5 },
  happy:    { x: 0,    y: -0.5 },
};

// How long each emotion persists (ms)
const EMOTION_DURATIONS: Record<EmotionState, number> = {
  idle:     4000,
  curious:  3000,
  excited:  2000,
  shy:      3500,
  thinking: 4500,
  happy:    2500,
};

const EMOTION_SEQUENCE: EmotionState[] = ['idle', 'curious', 'thinking', 'idle', 'shy', 'idle', 'excited', 'happy'];

export interface LogoEmobotProps {
  /** Width in pixels — height scales proportionally (aspect ~3:1) */
  width?: number;
  /** Platform name shown as text when logoUrl is absent (used for aria-label) */
  platformName?: string;
}

export default function LogoEmobot({ width = 110, platformName = 'Zymbiq' }: LogoEmobotProps) {
  const animationIntensity = useStore((s) => s.animationIntensity);

  // ── Emotion cycle ──────────────────────────────────────────────────────────
  const [emotion, setEmotion] = React.useState<EmotionState>('idle');
  const [isHovered, setIsHovered] = React.useState(false);
  const [isBlinking, setIsBlinking] = React.useState(false);
  const [showParticle, setShowParticle] = React.useState(false);
  const emotionIndexRef = React.useRef(0);

  // Autonomous emotion cycling
  React.useEffect(() => {
    if (animationIntensity === 'off') return;
    let timer: ReturnType<typeof setTimeout>;

    function nextEmotion() {
      emotionIndexRef.current = (emotionIndexRef.current + 1) % EMOTION_SEQUENCE.length;
      const next = EMOTION_SEQUENCE[emotionIndexRef.current];
      setEmotion(next);
      timer = setTimeout(nextEmotion, EMOTION_DURATIONS[next]);
    }

    timer = setTimeout(nextEmotion, EMOTION_DURATIONS['idle']);
    return () => clearTimeout(timer);
  }, [animationIntensity]);

  // Blink cycle — random interval 2–6 seconds
  React.useEffect(() => {
    if (animationIntensity === 'off') return;
    let blinkTimer: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = 2000 + Math.random() * 4000;
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // Sometimes double-blink
          if (Math.random() > 0.7) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 100);
            }, 160);
          }
          scheduleBlink();
        }, 120);
      }, delay);
    }

    scheduleBlink();
    return () => clearTimeout(blinkTimer);
  }, [animationIntensity]);

  // ── Mouse tilt (3D depth feel) ─────────────────────────────────────────────
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 200, damping: 18 });
  const springY = useSpring(tiltY, { stiffness: 200, damping: 18 });

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || animationIntensity === 'off') return;
    const { left, top, width: w, height: h } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / w - 0.5) * 2;
    const y = ((e.clientY - top) / h - 0.5) * 2;
    tiltX.set(y * -6);
    tiltY.set(x * 10);
  }, [animationIntensity, tiltX, tiltY]);

  const handleMouseEnter = React.useCallback(() => {
    setIsHovered(true);
    setEmotion('excited');
    setShowParticle(true);
    setTimeout(() => setShowParticle(false), 800);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovered(false);
    setEmotion('idle');
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  // ── Derived pupil position ─────────────────────────────────────────────────
  const activeEmotion = isHovered ? 'excited' : emotion;
  const targetPupil = EMOTION_PUPILS[activeEmotion];

  // ── Dimensions ────────────────────────────────────────────────────────────
  const h = Math.round(width * 0.32);
  const scale = width / 110;

  // If animations off, render static text logo
  if (animationIntensity === 'off') {
    return (
      <span className="text-lg font-semibold tracking-tight font-heading text-[var(--zymbiq-text)]">
        {platformName}
      </span>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      role="img"
      aria-label={platformName}
      className="relative select-none cursor-pointer shrink-0"
      style={{
        width,
        height: h,
        rotateX: springX,
        rotateY: springY,
        transformStyle: 'preserve-3d',
        perspective: 400,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // Gentle float animation
      animate={{
        y: [0, -2, 0, -1, 0],
        rotate: [0, 0.4, 0, -0.3, 0],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <svg
        width={width}
        height={h}
        viewBox="0 0 110 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
      >
        <defs>
          {/* Accent gradient for the Z mark */}
          <linearGradient id="zgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--zymbiq-accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--zymbiq-accent)" stopOpacity="0.7" />
          </linearGradient>

          {/* Inner glow filter */}
          <filter id="face-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Eye glow filter */}
          <filter id="eye-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Soft shadow for depth */}
          <filter id="depth-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--zymbiq-accent)" floodOpacity="0.25" />
          </filter>

          {/* Clip for eye area */}
          <clipPath id="left-eye-clip">
            <ellipse cx="16" cy="18" rx="6" ry="5.5" />
          </clipPath>
          <clipPath id="right-eye-clip">
            <ellipse cx="32" cy="18" rx="6" ry="5.5" />
          </clipPath>
        </defs>

        {/* ── Face body ── */}
        {/* Outer glow ring — breathes on hover */}
        <motion.ellipse
          cx="24"
          cy="18"
          rx="21"
          ry="17"
          fill="none"
          stroke="var(--zymbiq-accent)"
          strokeWidth="0.5"
          strokeOpacity="0.15"
          animate={{
            rx: isHovered ? [21, 23, 21] : [21, 21.5, 21],
            ry: isHovered ? [17, 19, 17] : [17, 17.5, 17],
            strokeOpacity: isHovered ? [0.15, 0.35, 0.15] : [0.1, 0.2, 0.1],
          }}
          transition={{ duration: isHovered ? 0.8 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Main face shape — rounded rect */}
        <motion.rect
          x="4"
          y="4"
          width="40"
          height="28"
          rx="9"
          fill="var(--zymbiq-surface)"
          stroke="var(--zymbiq-accent)"
          strokeWidth="1.2"
          strokeOpacity="0.6"
          filter="url(#depth-shadow)"
          animate={{
            strokeOpacity: isHovered ? 0.9 : [0.5, 0.7, 0.5],
            scaleY: isHovered ? 1.04 : 1,
          }}
          transition={{
            strokeOpacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            scaleY: { type: 'spring', stiffness: 300, damping: 20 },
          }}
          style={{ transformOrigin: '24px 18px' }}
        />

        {/* Subtle inner face gradient */}
        <motion.rect
          x="4.5"
          y="4.5"
          width="39"
          height="27"
          rx="8.5"
          fill="var(--zymbiq-accent)"
          fillOpacity="0.04"
          animate={{ fillOpacity: isHovered ? 0.09 : [0.03, 0.06, 0.03] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── Left eye socket ── */}
        <ellipse
          cx="16"
          cy="18"
          rx="6"
          ry="5.5"
          fill="var(--zymbiq-bg)"
          fillOpacity="0.6"
        />
        <motion.ellipse
          cx="16"
          cy="18"
          rx="5.5"
          ry={isBlinking ? 0.4 : 4.8}
          fill="var(--zymbiq-accent)"
          fillOpacity="0.12"
          filter="url(#eye-glow)"
          animate={{ fillOpacity: isHovered ? 0.2 : [0.08, 0.15, 0.08] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Left pupil */}
        <motion.g clipPath="url(#left-eye-clip)">
          <motion.ellipse
            cx="16"
            cy="18"
            rx="2.8"
            ry={isBlinking ? 0.3 : 2.8}
            fill="var(--zymbiq-accent)"
            filter="url(#eye-glow)"
            animate={{
              cx: 16 + targetPupil.x,
              cy: 18 + targetPupil.y,
              ry: isBlinking ? 0.3 : (isHovered ? 3.2 : 2.8),
              fillOpacity: isHovered ? 1 : [0.85, 1, 0.85],
            }}
            transition={{
              cx: { type: 'spring', stiffness: 120, damping: 14 },
              cy: { type: 'spring', stiffness: 120, damping: 14 },
              ry: { type: 'spring', stiffness: 300, damping: 20 },
              fillOpacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
          {/* Pupil shine */}
          <motion.ellipse
            cx={16 + targetPupil.x + 1}
            cy={18 + targetPupil.y - 1}
            rx="0.9"
            ry="0.7"
            fill="white"
            fillOpacity={isBlinking ? 0 : 0.9}
            animate={{ cx: 16 + targetPupil.x + 1, cy: 18 + targetPupil.y - 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          />
        </motion.g>

        {/* Left eye blink lid */}
        <motion.ellipse
          cx="16"
          cy="18"
          rx="5.8"
          ry={isBlinking ? 5.5 : 0}
          fill="var(--zymbiq-surface)"
          animate={{ ry: isBlinking ? 5.5 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        {/* ── Right eye socket ── */}
        <ellipse
          cx="32"
          cy="18"
          rx="6"
          ry="5.5"
          fill="var(--zymbiq-bg)"
          fillOpacity="0.6"
        />
        <motion.ellipse
          cx="32"
          cy="18"
          rx="5.5"
          ry={isBlinking ? 0.4 : 4.8}
          fill="var(--zymbiq-accent)"
          fillOpacity="0.12"
          filter="url(#eye-glow)"
          animate={{ fillOpacity: isHovered ? 0.2 : [0.08, 0.15, 0.08] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />

        {/* Right pupil */}
        <motion.g clipPath="url(#right-eye-clip)">
          <motion.ellipse
            cx="32"
            cy="18"
            rx="2.8"
            ry={isBlinking ? 0.3 : 2.8}
            fill="var(--zymbiq-accent)"
            filter="url(#eye-glow)"
            animate={{
              cx: 32 + targetPupil.x,
              cy: 18 + targetPupil.y,
              ry: isBlinking ? 0.3 : (isHovered ? 3.2 : 2.8),
              fillOpacity: isHovered ? 1 : [0.85, 1, 0.85],
            }}
            transition={{
              cx: { type: 'spring', stiffness: 120, damping: 14 },
              cy: { type: 'spring', stiffness: 120, damping: 14 },
              ry: { type: 'spring', stiffness: 300, damping: 20 },
              fillOpacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
            }}
          />
          {/* Pupil shine */}
          <motion.ellipse
            cx={32 + targetPupil.x + 1}
            cy={18 + targetPupil.y - 1}
            rx="0.9"
            ry="0.7"
            fill="white"
            fillOpacity={isBlinking ? 0 : 0.9}
            animate={{ cx: 32 + targetPupil.x + 1, cy: 18 + targetPupil.y - 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          />
        </motion.g>

        {/* Right eye blink lid */}
        <motion.ellipse
          cx="32"
          cy="18"
          rx="5.8"
          ry={isBlinking ? 5.5 : 0}
          fill="var(--zymbiq-surface)"
          animate={{ ry: isBlinking ? 5.5 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        {/* ── Mouth — changes per emotion ── */}
        <motion.path
          d={
            activeEmotion === 'excited' || activeEmotion === 'happy'
              ? 'M 13 24.5 Q 24 28.5 35 24.5'   // big smile
              : activeEmotion === 'shy'
              ? 'M 16 25.5 Q 24 23.5 32 25.5'   // slight frown/shy
              : activeEmotion === 'thinking'
              ? 'M 16 25 Q 24 25 32 25'          // flat
              : activeEmotion === 'curious'
              ? 'M 14 25 Q 24 27.5 34 25'        // medium smile
              : 'M 15 25.5 Q 24 27.5 33 25.5'    // idle gentle smile
          }
          stroke="var(--zymbiq-accent)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          strokeOpacity="0.8"
          animate={{
            strokeOpacity: isHovered ? 1 : [0.7, 0.9, 0.7],
            strokeWidth: isHovered ? 1.7 : 1.4,
          }}
          transition={{
            d: { type: 'spring', stiffness: 80, damping: 16 },
            strokeOpacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            strokeWidth: { type: 'spring', stiffness: 200, damping: 20 },
          }}
        />

        {/* ── Antenna — little detail on top ── */}
        <motion.line
          x1="24"
          y1="4"
          x2="24"
          y2="0"
          stroke="var(--zymbiq-accent)"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
        <motion.circle
          cx="24"
          cy="-0.5"
          r="1.2"
          fill="var(--zymbiq-accent)"
          animate={{
            r: isHovered ? [1.2, 2, 1.2] : [1.2, 1.5, 1.2],
            fillOpacity: isHovered ? [0.9, 1, 0.9] : [0.6, 0.9, 0.6],
          }}
          transition={{ duration: isHovered ? 0.6 : 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ── "ZYMBIQ" text label — right of face ── */}
        <motion.text
          x="50"
          y="21"
          fontFamily="var(--font-heading), sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="0.5"
          fill="var(--zymbiq-text)"
          animate={{
            fillOpacity: isHovered ? 1 : [0.85, 1, 0.85],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ZYMBIQ
        </motion.text>

        {/* Accent underline under ZYMBIQ — grows on hover */}
        <motion.line
          x1="50"
          y1="24"
          x2={isHovered ? 104 : 80}
          y2="24"
          stroke="var(--zymbiq-accent)"
          strokeWidth="1"
          strokeLinecap="round"
          animate={{ x2: isHovered ? 104 : 80, strokeOpacity: isHovered ? 0.8 : 0.3 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>

      {/* ── Hover sparkle particle ── */}
      <AnimatePresence>
        {showParticle && (
          <motion.div
            className="absolute pointer-events-none"
            style={{ top: -4, right: '30%' }}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: -16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 0L5.8 3.8L9.5 5L5.8 6.2L5 10L4.2 6.2L0.5 5L4.2 3.8Z"
                fill="var(--zymbiq-accent)"
                fillOpacity="0.9"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emotion tooltip — appears briefly on emotion change ── */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
            initial={{ opacity: 0, y: 4, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.85 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className="text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--zymbiq-accent) 12%, var(--zymbiq-surface))',
                color: 'var(--zymbiq-accent)',
                border: '1px solid color-mix(in srgb, var(--zymbiq-accent) 25%, transparent)',
              }}
            >
              {activeEmotion === 'excited' ? '✦ hey there!' :
               activeEmotion === 'happy'   ? '✦ nice to see you' :
               activeEmotion === 'curious' ? '✦ what are you building?' :
               activeEmotion === 'thinking'? '✦ I\'m thinking...' :
               activeEmotion === 'shy'     ? '✦ um, hi' :
               '✦ zymbiq'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}