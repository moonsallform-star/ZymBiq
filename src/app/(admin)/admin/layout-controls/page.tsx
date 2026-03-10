// =============================================================================
// Zymbiq — src/app/(admin)/admin/layout-controls/page.tsx
// Admin layout controls: section visibility, drag-to-reorder, animation
// intensity, grid style, and card style — all persisted to SiteConfig.
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, LayoutGrid, Layers, Zap, Save, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useSiteConfig } from '@/hooks/use-site-config';
import { QUERY_KEYS, SITE_CONFIG_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { SiteConfigLayout } from '@/types/index';

// =============================================================================
// Constants
// =============================================================================

const SECTIONS = [
  { key: 'hero',         label: 'Hero',              enabledKey: 'heroEnabled'         },
  { key: 'trustStrip',   label: 'Trust Strip',        enabledKey: 'trustStripEnabled'   },
  { key: 'carousel',     label: 'Featured Carousel',  enabledKey: 'carouselEnabled'     },
  { key: 'stats',        label: 'Stats Row',          enabledKey: 'statsEnabled'        },
  { key: 'howItWorks',   label: 'How It Works',       enabledKey: 'howItWorksEnabled'   },
  { key: 'devforge',     label: 'DevForge Activity',  enabledKey: 'devforgeEnabled'     },
  { key: 'testimonials', label: 'Testimonials',       enabledKey: 'testimonialsEnabled' },
  { key: 'finalCta',     label: 'Final CTA',          enabledKey: 'finalCtaEnabled'     },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type SectionEnabledKey = (typeof SECTIONS)[number]['enabledKey'];

const ANIMATION_OPTIONS: Array<{
  value: SiteConfigLayout['animationIntensity'];
  label: string;
  description: string;
}> = [
  { value: 'subtle',  label: 'Subtle',  description: 'Full animations, smooth 60fps' },
  { value: 'reduced', label: 'Reduced', description: 'Essential only, shorter durations' },
  { value: 'off',     label: 'Off',     description: 'No motion, instant renders' },
];

const GRID_STYLE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'default',  label: 'Default',  description: '2-column grid' },
  { value: 'magazine', label: 'Magazine', description: 'Editorial layout' },
  { value: 'masonry',  label: 'Masonry',  description: 'Pinterest-style' },
];

const CARD_STYLE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'default',  label: 'Default',  description: 'Elevated with shadow' },
  { value: 'minimal',  label: 'Minimal',  description: 'Flat, no shadow' },
  { value: 'bordered', label: 'Bordered', description: 'Distinct border ring' },
];

// =============================================================================
// Local state shape
// =============================================================================

interface LocalLayoutState {
  sectionOrder: SectionKey[];
  visibility: Record<SectionEnabledKey, boolean>;
  animationIntensity: SiteConfigLayout['animationIntensity'];
  gridStyle: string;
  cardStyle: string;
}

// =============================================================================
// Save mutation
// =============================================================================

async function saveLayoutConfig(value: SiteConfigLayout): Promise<void> {
  const res = await fetch('/api/admin/site-config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: SITE_CONFIG_KEYS.LAYOUT, value }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? 'Failed to save layout config');
  }
}

// =============================================================================
// RadioCard — reusable option selector card
// =============================================================================

interface RadioCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
}

function RadioCard({ selected, onClick, label, description }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        selected
          ? 'border-accent bg-accent/5 text-foreground'
          : 'border-border bg-surface text-foreground hover:border-accent/50 hover:bg-muted/5',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-accent bg-accent' : 'border-muted bg-transparent',
          )}
        >
          {selected && (
            <span className="block h-1.5 w-1.5 rounded-full bg-white" />
          )}
        </span>
        {label}
      </span>
      <span className="pl-6 text-xs text-muted">{description}</span>
    </button>
  );
}

// =============================================================================
// Section heading
// =============================================================================

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Main page
// =============================================================================

export default function AdminLayoutControlsPage() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Local state — initialised from siteConfig on first load
  // ---------------------------------------------------------------------------

  const [localState, setLocalState] = useState<LocalLayoutState | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (siteConfig && !localState) {
      const layout = siteConfig.layout;

      // Build the ordered section list from siteConfig.sectionOrder,
      // then append any sections missing from the saved order (safety net).
      const savedOrder = layout.sectionOrder as SectionKey[];
      const allKeys = SECTIONS.map((s) => s.key);
      const missingKeys = allKeys.filter((k) => !savedOrder.includes(k));
      const orderedKeys: SectionKey[] = [...savedOrder, ...missingKeys].filter(
        (k): k is SectionKey => allKeys.includes(k as SectionKey),
      );

      setLocalState({
        sectionOrder: orderedKeys,
        visibility: {
          heroEnabled:         layout.heroEnabled,
          trustStripEnabled:   layout.trustStripEnabled,
          carouselEnabled:     layout.carouselEnabled,
          statsEnabled:        layout.statsEnabled,
          howItWorksEnabled:   layout.howItWorksEnabled,
          devforgeEnabled:     layout.devforgeEnabled,
          testimonialsEnabled: layout.testimonialsEnabled,
          finalCtaEnabled:     layout.finalCtaEnabled,
        },
        animationIntensity: layout.animationIntensity,
        gridStyle:          layout.gridStyle,
        cardStyle:          layout.cardStyle,
      });
    }
  }, [siteConfig, localState]);

  // ---------------------------------------------------------------------------
  // Helpers to mutate local state and mark dirty
  // ---------------------------------------------------------------------------

  const update = useCallback((patch: Partial<LocalLayoutState>) => {
    setLocalState((prev) => (prev ? { ...prev, ...patch } : prev));
    setIsDirty(true);
  }, []);

  const toggleVisibility = useCallback(
    (enabledKey: SectionEnabledKey, value: boolean) => {
      setLocalState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          visibility: { ...prev.visibility, [enabledKey]: value },
        };
      });
      setIsDirty(true);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Drag end handler
  // ---------------------------------------------------------------------------

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    setLocalState((prev) => {
      if (!prev) return prev;
      const next = [...prev.sectionOrder];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return { ...prev, sectionOrder: next };
    });
    setIsDirty(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Save mutation
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: async () => {
      if (!localState || !siteConfig) return;

      const payload: SiteConfigLayout = {
        sectionOrder:        localState.sectionOrder,
        heroEnabled:         localState.visibility.heroEnabled,
        trustStripEnabled:   localState.visibility.trustStripEnabled,
        carouselEnabled:     localState.visibility.carouselEnabled,
        statsEnabled:        localState.visibility.statsEnabled,
        howItWorksEnabled:   localState.visibility.howItWorksEnabled,
        devforgeEnabled:     localState.visibility.devforgeEnabled,
        testimonialsEnabled: localState.visibility.testimonialsEnabled,
        finalCtaEnabled:     localState.visibility.finalCtaEnabled,
        animationIntensity:  localState.animationIntensity,
        gridStyle:           localState.gridStyle,
        cardStyle:           localState.cardStyle,
      };

      await saveLayoutConfig(payload);
    },
    onSuccess: () => {
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({
        title: 'Layout saved',
        description: 'Your layout settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (isLoading || !localState) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 md:px-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Layout Controls</h1>
          <p className="mt-1 text-sm text-muted">
            Manage homepage sections, display styles, and animation settings.
          </p>
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={!isDirty || mutation.isPending}
          size="sm"
          className="shrink-0"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* ── Section visibility + order ───────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeading
          icon={Layers}
          title="Section Visibility & Order"
          description="Toggle sections on or off, and drag to rearrange the homepage."
        />

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {localState.sectionOrder.map((key, index) => {
                  const sectionDef = SECTIONS.find((s) => s.key === key);
                  if (!sectionDef) return null;
                  const { label, enabledKey } = sectionDef;
                  const enabled = localState.visibility[enabledKey];

                  return (
                    <Draggable key={key} draggableId={key} index={index}>
                      {(drag, snapshot) => (
                        <li
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border bg-surface p-4 transition-shadow',
                            snapshot.isDragging
                              ? 'border-accent shadow-lg ring-1 ring-accent/30'
                              : 'border-border shadow-sm',
                          )}
                        >
                          {/* Drag handle */}
                          <span
                            {...drag.dragHandleProps}
                            className="cursor-grab touch-none text-muted active:cursor-grabbing"
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="h-5 w-5" />
                          </span>

                          {/* Order index badge */}
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/10 text-xs font-medium text-muted">
                            {index + 1}
                          </span>

                          {/* Label */}
                          <span
                            className={cn(
                              'flex-1 text-sm font-medium',
                              enabled ? 'text-foreground' : 'text-muted line-through',
                            )}
                          >
                            {label}
                          </span>

                          {/* Visibility toggle */}
                          <Switch
                            checked={enabled}
                            onCheckedChange={(val) => toggleVisibility(enabledKey, val)}
                            aria-label={`Toggle ${label}`}
                          />
                        </li>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </section>

      {/* ── Animation intensity ──────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeading
          icon={Zap}
          title="Animation Intensity"
          description="Controls the motion level across the entire platform. Always respects prefers-reduced-motion."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ANIMATION_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={localState.animationIntensity === opt.value}
              onClick={() => update({ animationIntensity: opt.value })}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </div>
      </section>

      {/* ── Grid style ───────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeading
          icon={LayoutGrid}
          title="Showroom Grid Style"
          description="Controls how projects are laid out in the showroom grid."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GRID_STYLE_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={localState.gridStyle === opt.value}
              onClick={() => update({ gridStyle: opt.value })}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </div>
      </section>

      {/* ── Card style ───────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeading
          icon={LayoutGrid}
          title="Card Style"
          description="Visual treatment applied to project cards across the platform."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CARD_STYLE_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={localState.cardStyle === opt.value}
              onClick={() => update({ cardStyle: opt.value })}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </div>
      </section>

      {/* ── Sticky save bar (mobile) ─────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-end md:hidden">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            size="lg"
            className="shadow-xl"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}