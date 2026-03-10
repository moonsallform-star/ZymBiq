'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export default function NavigationProgress() {
  return (
    <ProgressBar
      height="2px"
      color="var(--zymbiq-accent)"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}