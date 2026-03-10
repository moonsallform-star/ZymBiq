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
        initial={{ opacity: 0, x: 10 }}
        animate={{
          opacity: 1,
          x: 0,
          transition: {
            duration: 0.15,
            ease: [0, 0, 0.2, 1],
          },
        }}
        exit={{
          opacity: 0,
          transition: {
            duration: 0.08,
            ease: 'easeIn',
          },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}