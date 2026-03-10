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
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: 0.18, ease: 'easeOut' },
        }}
        exit={{
          opacity: 0,
          transition: { duration: 0.12, ease: 'easeIn' },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}