"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X, SlidersHorizontal, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PROJECT_CATEGORIES,
  TECH_STACK_OPTIONS,
  COMPLEXITY_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  category: string;
  techStack: string[];
  minPrice: number;
  maxPrice: number;
  complexity: string;
  sort: string;
}

const PRICE_MIN = 0;
const PRICE_MAX = 10000;
const PRICE_STEP = 50;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "featured", label: "Featured First" },
] as const;

const COMPLEXITY_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "simple", label: COMPLEXITY_LABELS.simple },
  { value: "medium", label: COMPLEXITY_LABELS.medium },
  { value: "complex", label: COMPLEXITY_LABELS.complex },
  { value: "enterprise", label: COMPLEXITY_LABELS.enterprise },
] as const;

// ---------------------------------------------------------------------------
// Helpers — read / write URL search params
// ---------------------------------------------------------------------------

function readFilters(params: URLSearchParams): FilterState {
  const techStack = params.get("tech");
  return {
    category: params.get("category") ?? "",
    techStack: techStack ? techStack.split(",").filter(Boolean) : [],
    minPrice: Number(params.get("minPrice") ?? PRICE_MIN),
    maxPrice: Number(params.get("maxPrice") ?? PRICE_MAX),
    complexity: params.get("complexity") ?? "all",
    sort: params.get("sort") ?? "newest",
  };
}

function buildParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.category) p.set("category", filters.category);
  if (filters.techStack.length) p.set("tech", filters.techStack.join(","));
  if (filters.minPrice > PRICE_MIN) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice < PRICE_MAX) p.set("maxPrice", String(filters.maxPrice));
  if (filters.complexity && filters.complexity !== "all")
    p.set("complexity", filters.complexity);
  if (filters.sort && filters.sort !== "newest") p.set("sort", filters.sort);
  return p;
}

function isActive(filters: FilterState): boolean {
  return (
    filters.category !== "" ||
    filters.techStack.length > 0 ||
    filters.minPrice > PRICE_MIN ||
    filters.maxPrice < PRICE_MAX ||
    (filters.complexity !== "" && filters.complexity !== "all") ||
    (filters.sort !== "" && filters.sort !== "newest")
  );
}

// ---------------------------------------------------------------------------
// Active pill label helpers
// ---------------------------------------------------------------------------

interface ActivePill {
  key: string;
  label: string;
  onRemove: (prev: FilterState) => FilterState;
}

function buildActivePills(filters: FilterState): ActivePill[] {
  const pills: ActivePill[] = [];

  if (filters.category) {
    pills.push({
      key: "category",
      label: `Category: ${filters.category}`,
      onRemove: (f) => ({ ...f, category: "" }),
    });
  }

  filters.techStack.forEach((tech) => {
    pills.push({
      key: `tech-${tech}`,
      label: tech,
      onRemove: (f) => ({
        ...f,
        techStack: f.techStack.filter((t) => t !== tech),
      }),
    });
  });

  if (filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) {
    pills.push({
      key: "price",
      label: `$${filters.minPrice} – $${filters.maxPrice}`,
      onRemove: (f) => ({ ...f, minPrice: PRICE_MIN, maxPrice: PRICE_MAX }),
    });
  }

  if (filters.complexity && filters.complexity !== "all") {
    pills.push({
      key: "complexity",
      label: `Level: ${COMPLEXITY_LABELS[filters.complexity] ?? filters.complexity}`,
      onRemove: (f) => ({ ...f, complexity: "all" }),
    });
  }

  return pills;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = readFilters(searchParams);

  // Push new filter state into the URL
  const update = React.useCallback(
    (next: FilterState) => {
      const params = buildParams(next);
      const qs = params.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    },
    [router, pathname]
  );

  const setFilter = React.useCallback(
    (partial: Partial<FilterState>) => {
      update({ ...filters, ...partial });
    },
    [filters, update]
  );

  const clearAll = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Category chip toggle
  const toggleCategory = (cat: string) => {
    setFilter({ category: filters.category === cat ? "" : cat });
  };

  // Tech stack chip toggle
  const toggleTech = (tech: string) => {
    const next = filters.techStack.includes(tech)
      ? filters.techStack.filter((t) => t !== tech)
      : [...filters.techStack, tech];
    setFilter({ techStack: next });
  };

  const activePills = buildActivePills(filters);
  const anyActive = isActive(filters);
  const activeCount = activePills.length;

  const [open, setOpen] = React.useState(false);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll when drawer open
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* ── Filter trigger button — matches hamburger style exactly ── */}
      <button
        type="button"
        aria-label={open ? "Close filters" : "Open filters"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2.5 h-11 px-4 rounded-xl font-medium text-sm transition-all duration-150"
        style={open ? {
          background: 'var(--zymbiq-accent)',
          color: '#fff',
          border: '1px solid var(--zymbiq-accent)',
          boxShadow: '0 0 16px color-mix(in srgb, var(--zymbiq-accent) 35%, transparent)',
        } : {
          background: 'color-mix(in srgb, var(--zymbiq-bg) 85%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'var(--zymbiq-text)',
          border: '1px solid color-mix(in srgb, var(--zymbiq-border) 60%, transparent)',
        }}
      >
        {open
          ? <X className="h-4 w-4" />
          : <SlidersHorizontal className="h-4 w-4" />
        }
        <span>Filters</span>
        {anyActive && !open && (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'var(--zymbiq-accent)' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Drawer panel — identical glass treatment as hamburger ────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] } }}
            exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
            className="fixed top-20 right-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 88%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid color-mix(in srgb, var(--zymbiq-border) 50%, transparent)',
              maxHeight: 'calc(100vh - 6rem)',
              overflowY: 'auto',
            }}
          >
            {/* ── Drawer header — same pattern as hamburger header ── */}
            <div
              className="flex items-center justify-between px-4 py-3.5 border-b sticky top-0 z-10"
              style={{
                borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 88%, transparent)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--zymbiq-accent)' }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--zymbiq-text)' }}>
                  Filter Projects
                </span>
                {anyActive && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'var(--zymbiq-accent)' }}
                  >
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {anyActive && (
                  <button
                    onClick={clearAll}
                    className="text-xs transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg"
                    style={{ color: 'var(--zymbiq-muted)' }}
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--zymbiq-muted)' }}
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Category section ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.04, duration: 0.15 } }}
              className="px-4 py-4 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 40%, transparent)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: 'var(--zymbiq-muted)' }}>
                  Category
                </span>
                <div className="h-px flex-1"
                  style={{ background: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_CATEGORIES.map((cat) => {
                  const active = filters.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 border",
                        active ? "text-white" : "hover:text-foreground"
                      )}
                      style={active ? {
                        background: 'var(--zymbiq-accent)',
                        borderColor: 'var(--zymbiq-accent)',
                        boxShadow: '0 0 10px color-mix(in srgb, var(--zymbiq-accent) 30%, transparent)',
                        color: '#fff',
                      } : {
                        background: 'transparent',
                        borderColor: 'color-mix(in srgb, var(--zymbiq-border) 60%, transparent)',
                        color: 'var(--zymbiq-text)',
                      }}
                      aria-pressed={active}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Tech stack section ───────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.15 } }}
              className="px-4 py-4 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 40%, transparent)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: 'var(--zymbiq-muted)' }}>
                  Tech Stack
                </span>
                <div className="h-px flex-1"
                  style={{ background: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TECH_STACK_OPTIONS.map((tech) => {
                  const active = filters.techStack.includes(tech);
                  return (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className={cn(
                        "inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-medium transition-all duration-150 border font-mono",
                        active ? "text-white" : ""
                      )}
                      style={active ? {
                        background: 'var(--zymbiq-accent)',
                        borderColor: 'var(--zymbiq-accent)',
                        boxShadow: '0 0 10px color-mix(in srgb, var(--zymbiq-accent) 30%, transparent)',
                      } : {
                        background: 'color-mix(in srgb, var(--zymbiq-accent) 4%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--zymbiq-accent) 15%, var(--zymbiq-border))',
                        color: 'var(--zymbiq-text)',
                      }}
                      aria-pressed={active}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Price range ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.12, duration: 0.15 } }}
              className="px-4 py-4 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 40%, transparent)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: 'var(--zymbiq-muted)' }}>
                  Price Range
                </span>
                <span
                  className="text-xs font-medium tabular-nums px-2 py-0.5 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--zymbiq-accent) 10%, transparent)',
                    color: 'var(--zymbiq-accent)',
                  }}
                >
                  ${filters.minPrice.toLocaleString()} –{' '}
                  {filters.maxPrice >= PRICE_MAX
                    ? `$${PRICE_MAX.toLocaleString()}+`
                    : `$${filters.maxPrice.toLocaleString()}`}
                </span>
              </div>
              <Slider
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]: number[]) =>
                  setFilter({ minPrice: min, maxPrice: max })
                }
                className="w-full"
                aria-label="Price range"
              />
            </motion.div>

            {/* ── Complexity + Sort ────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.16, duration: 0.15 } }}
              className="grid grid-cols-2 divide-x"
              style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 40%, transparent)' }}
            >
              <div className="px-4 py-4">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase block mb-3"
                  style={{ color: 'var(--zymbiq-muted)' }}>
                  Complexity
                </span>
                <Select
                  value={filters.complexity || "all"}
                  onValueChange={(val) => setFilter({ complexity: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl"
                    style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }}
                  >
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLEXITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="px-4 py-4">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase block mb-3"
                  style={{ color: 'var(--zymbiq-muted)' }}>
                  Sort By
                </span>
                <Select
                  value={filters.sort || "newest"}
                  onValueChange={(val) => setFilter({ sort: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl"
                    style={{ borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)' }}
                  >
                    <SelectValue placeholder="Newest" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* ── Active pills + Apply button ───────────────────────── */}
            {anyActive && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.20, duration: 0.15 } }}
                className="px-4 py-3 border-t"
                style={{
                  borderColor: 'color-mix(in srgb, var(--zymbiq-border) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--zymbiq-accent) 4%, transparent)',
                }}
              >
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {activePills.map((pill) => (
                    <span
                      key={pill.key}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--zymbiq-accent) 30%, var(--zymbiq-border))',
                        background: 'color-mix(in srgb, var(--zymbiq-accent) 8%, transparent)',
                        color: 'var(--zymbiq-accent)',
                      }}
                    >
                      {pill.label}
                      <button
                        onClick={() => update(pill.onRemove(filters))}
                        className="rounded-sm p-0.5 hover:opacity-70 transition-opacity"
                        aria-label={`Remove filter: ${pill.label}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Apply button — sticky footer ─────────────────────── */}
            <div
              className="px-4 py-3 sticky bottom-0 border-t"
              style={{
                borderColor: 'color-mix(in srgb, var(--zymbiq-border) 50%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 88%, transparent)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 h-10 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--zymbiq-accent)' }}
              >
                Show Results
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}