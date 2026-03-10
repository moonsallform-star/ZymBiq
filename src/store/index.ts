// =============================================================================
// Zymbiq — src/store/index.ts
// Zustand global store for cart, comparison, chat, hub, and animation state.
// Client-only — never import in Server Components.
// =============================================================================

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface CartItem {
  projectId: string;
  title: string;
  price: number;
  thumbnailUrl?: string;
}

export interface ComparisonProject {
  id: string;
  slug: string;
  title: string;
  price: number;
  features: string[];
  techStack: string[];
  thumbnailUrl?: string | null;
}

// -----------------------------------------------------------------------------
// Animation intensity type (mirrors SiteConfigLayout)
// -----------------------------------------------------------------------------

export type AnimationIntensity = 'subtle' | 'reduced' | 'off';

// -----------------------------------------------------------------------------
// Chat tab type
// -----------------------------------------------------------------------------

export type ChatTab = 'platform' | 'whatsapp' | 'email';

// -----------------------------------------------------------------------------
// Full store state + actions shape
// -----------------------------------------------------------------------------

interface StoreState {
  // ── Persisted ──────────────────────────────────────────────────────────────
  cart: CartItem[];
  comparisonProjects: ComparisonProject[];

  // ── Transient ──────────────────────────────────────────────────────────────
  chatOpen: boolean;
  chatTab: ChatTab;
  hubExpanded: boolean;
  animationIntensity: AnimationIntensity;
  siteConfigLoaded: boolean;

  // ── Dark mode ──────────────────────────────────────────────────────────────
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // ── Unread message count (for RealtimeProvider badge) ──────────────────────
  unreadMessageCount: number;

  // ── Cart actions ───────────────────────────────────────────────────────────
  addToCart: (item: CartItem) => void;
  removeFromCart: (projectId: string) => void;
  clearCart: () => void;

  // ── Comparison actions ─────────────────────────────────────────────────────
  addToComparison: (project: ComparisonProject) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;

  // ── Chat / hub actions ─────────────────────────────────────────────────────
  openChat: () => void;
  closeChat: () => void;
  setChatTab: (tab: ChatTab) => void;
  setHubExpanded: (expanded: boolean) => void;

  // ── Config sync actions ────────────────────────────────────────────────────
  setAnimationIntensity: (intensity: AnimationIntensity) => void;
  setSiteConfigLoaded: (loaded: boolean) => void;

  // ── Unread message actions ─────────────────────────────────────────────────
  incrementUnread: () => void;
  resetUnread: () => void;
}

// -----------------------------------------------------------------------------
// Maximum comparison projects (mirrors MAX_COMPARISON_PROJECTS constant)
// -----------------------------------------------------------------------------

const MAX_COMPARISON = 3;

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────────

      cart: [],
      comparisonProjects: [],

      chatOpen: false,
      chatTab: 'platform',
      hubExpanded: false,
      animationIntensity: 'subtle',
      siteConfigLoaded: false,
      unreadMessageCount: 0,
      darkMode: false,

      // ── Cart ───────────────────────────────────────────────────────────────

      addToCart: (item) => {
        const { cart } = get();
        const alreadyInCart = cart.some((c) => c.projectId === item.projectId);
        if (alreadyInCart) return;
        set({ cart: [...cart, item] });
      },

      removeFromCart: (projectId) => {
        set((state) => ({
          cart: state.cart.filter((c) => c.projectId !== projectId),
        }));
      },

      clearCart: () => set({ cart: [] }),

      // ── Comparison ─────────────────────────────────────────────────────────

      addToComparison: (project) => {
        const { comparisonProjects } = get();

        // Silently ignore if already at max capacity
        if (comparisonProjects.length >= MAX_COMPARISON) return;

        // Silently ignore if project already in the list
        const alreadyPresent = comparisonProjects.some((p) => p.id === project.id);
        if (alreadyPresent) return;

        set({ comparisonProjects: [...comparisonProjects, project] });
      },

      removeFromComparison: (id) => {
        set((state) => ({
          comparisonProjects: state.comparisonProjects.filter((p) => p.id !== id),
        }));
      },

      clearComparison: () => set({ comparisonProjects: [] }),

      // ── Chat / Hub ─────────────────────────────────────────────────────────

      openChat: () => set({ chatOpen: true }),
      closeChat: () => set({ chatOpen: false }),

      setChatTab: (tab) => set({ chatTab: tab }),

      setHubExpanded: (expanded) => set({ hubExpanded: expanded }),

      // ── Config sync ────────────────────────────────────────────────────────

      setAnimationIntensity: (intensity) => set({ animationIntensity: intensity }),

      setSiteConfigLoaded: (loaded) => set({ siteConfigLoaded: loaded }),

      setDarkMode: (dark) => {
        // Apply to DOM immediately — before React re-render cycle
        if (typeof document !== 'undefined') {
          if (dark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        // Then update store (triggers ThemeProvider useEffect as backup sync)
        set({ darkMode: dark });
      },

      // ── Unread messages ────────────────────────────────────────────────────

      incrementUnread: () =>
        set((state) => ({ unreadMessageCount: state.unreadMessageCount + 1 })),

      resetUnread: () => set({ unreadMessageCount: 0 }),
    }),

    {
      name: 'zymbiq-store',
      storage: createJSONStorage(() => localStorage),

      // Only persist cart and comparisonProjects — all transient UI state
      // (chat, hub, animation intensity, siteConfigLoaded) resets on each
      // session and is populated from the server-side SiteConfig on mount.
      partialize: (state) => ({
        cart: state.cart,
        comparisonProjects: state.comparisonProjects,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    },
  ),
);