// src/hooks/use-media-query.ts
"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe hook that tracks whether a CSS media query matches.
 * Returns false during server render and before hydration to prevent
 * hydration mismatches, then reflects the real value after mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);

    // Set the initial real value after mount
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent): void => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

/**
 * Returns true when the viewport is below the md breakpoint (< 768px).
 * Mirrors Tailwind's `max-md` breakpoint used for mobile-only layout logic.
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Returns true when the viewport is at or above the lg breakpoint (≥ 1024px).
 * Mirrors Tailwind's `lg` breakpoint used for desktop-only layout logic.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}