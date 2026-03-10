// =============================================================================
// Zymbiq — src/components/providers/page-transition.tsx
// Smooth page transition wrapper using Framer Motion.
// Wraps every page in a subtle fade + upward slide on enter.
// The animation plays during the Next.js navigation delay so the user
// never perceives the route as "slow" — the motion fills the gap.
// =============================================================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  hidden: {
    opacity: 0,
    scale: 0.995,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 1.005,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}