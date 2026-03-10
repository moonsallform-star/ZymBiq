// src/components/admin/content-editor.tsx
'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Loader2, Check } from 'lucide-react';

import { useSiteConfig } from '@/hooks/use-site-config';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QUERY_KEYS } from '@/lib/constants';
import type {
  SiteConfigContent,
  TrustStripItem,
  ProcessStep,
  FooterLink,
} from '@/types/index';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface TestimonialDraft {
  id: string;
  clientName: string;
  projectType: string;
  quote: string;
  avatarUrl: string;
  isVisible: boolean;
  sortOrder: number;
}

interface FaqDraft {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function patchContent(section: string | null, data: unknown): Promise<void> {
  const res = await fetch('/api/admin/content', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, data }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? 'Failed to save');
  }
}

async function refetchSiteConfig(): Promise<void> {
  // Force a cache-busted refetch of the site config so UI updates immediately
  await fetch('/api/admin/site-config', { cache: 'no-store' });
}

// ---------------------------------------------------------------------------
// Small reusable primitives
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">
      {children}
    </label>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function SaveButton({
  isPending,
  onClick,
}: {
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={isPending} size="sm" className="gap-2">
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      {isPending ? 'Saving…' : 'Save'}
    </Button>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          checked ? 'bg-accent' : 'bg-muted/30',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Hero Tab
// ---------------------------------------------------------------------------

interface HeroState {
  heroHeadline: string;
  heroSubheadline: string;
  heroCta1: string;
  heroCta2: string;
  finalCtaHeadline: string;
  finalCtaSubheadline: string;
}

function HeroTab({ content }: { content: SiteConfigContent }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = React.useState<HeroState>({
    heroHeadline: content.heroHeadline,
    heroSubheadline: content.heroSubheadline,
    heroCta1: content.heroCta1,
    heroCta2: content.heroCta2,
    finalCtaHeadline: content.finalCtaHeadline ?? '',
    finalCtaSubheadline: content.finalCtaSubheadline ?? '',
  });

  // Track whether the user has unsaved local edits. Only sync from parent
  // when there are no pending edits (i.e. right after a successful save).
  const isDirtyRef = React.useRef(false);
  React.useEffect(() => {
    if (!isDirtyRef.current) {
      setForm({
        heroHeadline: content.heroHeadline,
        heroSubheadline: content.heroSubheadline,
        heroCta1: content.heroCta1,
        heroCta2: content.heroCta2,
        finalCtaHeadline: content.finalCtaHeadline ?? '',
        finalCtaSubheadline: content.finalCtaSubheadline ?? '',
      });
    }
  }, [content]);

  const mutation = useMutation({
    mutationFn: () =>
      patchContent(null, {
        heroHeadline: form.heroHeadline,
        heroSubheadline: form.heroSubheadline,
        heroCta1: form.heroCta1,
        heroCta2: form.heroCta2,
        finalCtaHeadline: form.finalCtaHeadline,
        finalCtaSubheadline: form.finalCtaSubheadline,
      }),
    onSuccess: () => {
      isDirtyRef.current = false;
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Hero saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  function set(key: keyof HeroState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      isDirtyRef.current = true;
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  return (
    <div className="space-y-4">
      <FieldGroup label="Headline">
        <Input value={form.heroHeadline} onChange={set('heroHeadline')} placeholder="e.g. Premium Websites, Delivered." />
      </FieldGroup>
      <FieldGroup label="Subheadline">
        <Input value={form.heroSubheadline} onChange={set('heroSubheadline')} placeholder="Short supporting line" />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Primary CTA Label">
          <Input value={form.heroCta1} onChange={set('heroCta1')} placeholder="Browse Projects" />
        </FieldGroup>
        <FieldGroup label="Secondary CTA Label">
          <Input value={form.heroCta2} onChange={set('heroCta2')} placeholder="Order Custom" />
        </FieldGroup>
      </div>
      <FieldGroup label="Final CTA Headline">
        <Input value={form.finalCtaHeadline} onChange={set('finalCtaHeadline')} placeholder="Ready to launch something great?" />
      </FieldGroup>
      <FieldGroup label="Final CTA Subheadline">
        <Input value={form.finalCtaSubheadline} onChange={set('finalCtaSubheadline')} placeholder="Supporting line for the bottom CTA section" />
      </FieldGroup>
      <div className="flex justify-end pt-2">
        <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust Strip Tab
// ---------------------------------------------------------------------------

function TrustStripTab({ content }: { content: SiteConfigContent }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [items, setItems] = React.useState<TrustStripItem[]>(
    content.trustStrip?.length ? [...content.trustStrip] : [{ label: '' }],
  );

 

  const mutation = useMutation({
    mutationFn: () => patchContent('trustStrip', items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Trust strip saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  function addItem() {
    setItems((prev) => [...prev, { label: '' }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { label: value } : item)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Items shown in the scrolling ticker beneath the hero.</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item.label}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`Item ${index + 1}`}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(index)}
              disabled={items.length <= 1}
              className="shrink-0 text-muted hover:text-destructive"
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
        <Plus className="h-4 w-4" /> Add Item
      </Button>
      <div className="flex justify-end pt-2">
        <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process Steps Tab
// ---------------------------------------------------------------------------

interface ProcessStepDraft extends ProcessStep {
  _id: string;
}

function ProcessStepsTab({ content }: { content: SiteConfigContent }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const toStepDrafts = (steps: ProcessStep[]): ProcessStepDraft[] =>
    (steps?.length ? steps : [{ icon: 'MessageCircle', headline: '', description: '' }]).map(
      (s) => ({ ...s, _id: uid() }),
    );

  const [steps, setSteps] = React.useState<ProcessStepDraft[]>(() =>
    toStepDrafts([...(content.processSteps ?? [])]),
  );

  const stepsInitRef = React.useRef(false);
  React.useEffect(() => {
    if (stepsInitRef.current) return;
    if (!content.processSteps?.length) return;
    stepsInitRef.current = true;
    setSteps(toStepDrafts([...(content.processSteps ?? [])]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.processSteps]);

  const mutation = useMutation({
    mutationFn: () => {
      const clean: ProcessStep[] = steps.map(({ _id: _, ...s }) => s);
      return patchContent('processSteps', clean);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Process steps saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { _id: uid(), icon: 'CircleDot', headline: '', description: '' },
    ]);
  }

  function removeStep(id: string) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s._id !== id));
  }

  function updateStep(id: string, field: keyof ProcessStep, value: string) {
    setSteps((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [field]: value } : s)),
    );
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = Array.from(steps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setSteps(reordered);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">Drag to reorder. Icon name must match a Lucide icon.</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="process-steps">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-3"
            >
              {steps.map((step, index) => (
                <Draggable key={step._id} draggableId={step._id} index={index}>
                  {(drag, snapshot) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className={[
                        'rounded-[--zymbiq-radius] border border-border bg-surface p-4 space-y-3',
                        snapshot.isDragging ? 'shadow-lg ring-1 ring-accent' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          {...drag.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-medium text-muted">Step {index + 1}</span>
                        <div className="flex-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeStep(step._id)}
                          disabled={steps.length <= 1}
                          className="text-muted hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Icon Name">
                          <Input
                            value={step.icon}
                            onChange={(e) => updateStep(step._id, 'icon', e.target.value)}
                            placeholder="e.g. MessageCircle"
                          />
                        </FieldGroup>
                        <FieldGroup label="Headline">
                          <Input
                            value={step.headline}
                            onChange={(e) => updateStep(step._id, 'headline', e.target.value)}
                            placeholder="Step title"
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Description">
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(step._id, 'description', e.target.value)}
                          placeholder="One sentence describing this step"
                          className="min-h-[60px]"
                        />
                      </FieldGroup>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-2">
        <Plus className="h-4 w-4" /> Add Step
      </Button>
      <div className="flex justify-end pt-2">
        <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// About Tab
// ---------------------------------------------------------------------------

function AboutTab({ content }: { content: SiteConfigContent }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [aboutText, setAboutText] = React.useState(content.aboutText ?? '');



  const mutation = useMutation({
    mutationFn: () => patchContent('aboutText', aboutText),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'About text saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <FieldGroup label="About Text">
        <Textarea
          value={aboutText}
          onChange={(e) => setAboutText(e.target.value)}
          placeholder="Tell visitors about yourself and your approach…"
          className="min-h-[180px]"
        />
      </FieldGroup>
      <div className="flex justify-end pt-2">
        <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer Tab
// ---------------------------------------------------------------------------

interface FooterLinkDraft extends FooterLink {
  _id: string;
}

function FooterTab({ content }: { content: SiteConfigContent }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [tagline, setTagline] = React.useState(content.footerTagline ?? '');
  const [links, setLinks] = React.useState<FooterLinkDraft[]>(() =>
    (content.footerLinks ?? []).map((l) => ({ ...l, _id: uid() })),
  );

 
  const mutation = useMutation({
    mutationFn: () =>
      patchContent(null, {
        footerTagline: tagline,
        footerLinks: links.map(({ _id: _, ...l }) => l),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Footer saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  function addLink() {
    setLinks((prev) => [...prev, { _id: uid(), label: '', href: '' }]);
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l._id !== id));
  }

  function updateLink(id: string, field: 'label' | 'href', value: string) {
    setLinks((prev) =>
      prev.map((l) => (l._id === id ? { ...l, [field]: value } : l)),
    );
  }

  return (
    <div className="space-y-4">
      <FieldGroup label="Footer Tagline">
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Short brand tagline for footer"
        />
      </FieldGroup>

      <div>
        <FieldLabel>Footer Links</FieldLabel>
        <div className="space-y-2 mt-1">
          {links.map((link) => (
            <div key={link._id} className="flex items-center gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(link._id, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1"
              />
              <Input
                value={link.href}
                onChange={(e) => updateLink(link._id, 'href', e.target.value)}
                placeholder="/path or https://…"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLink(link._id)}
                className="shrink-0 text-muted hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLink}
          className="mt-2 gap-2"
        >
          <Plus className="h-4 w-4" /> Add Link
        </Button>
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials Tab
// ---------------------------------------------------------------------------

function TestimonialsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [testimonials, setTestimonials] = React.useState<TestimonialDraft[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch from DB (testimonials are not in SiteConfig — they're a separate model)
  React.useEffect(() => {
    fetch('/api/testimonials')
      .then((r) => r.json())
      .then((json: { data?: TestimonialDraft[] }) => {
        setTestimonials(
          (json.data ?? []).map((t) => ({ ...t, id: t.id ?? uid() })),
        );
      })
      .catch(() => {
        toast({ title: 'Could not load testimonials', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (draft: TestimonialDraft) => {
      const { id, ...body } = draft;
      const isNew = id.startsWith('local-');
      const res = await fetch(isNew ? '/api/testimonials' : `/api/testimonials?id=${id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save testimonial');
      const json = (await res.json()) as { data?: TestimonialDraft };
      return json.data;
    },
    onSuccess: (saved, original) => {
      if (saved) {
        setTestimonials((prev) =>
          prev.map((t) => (t.id === original.id ? { ...saved, id: saved.id } : t)),
        );
      }
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.testimonials?.() ?? ['testimonials'] });
      toast({ title: 'Testimonial saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('local-')) return;
      const res = await fetch(`/api/testimonials?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete testimonial');
    },
    onSuccess: (_data, id) => {
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Testimonial deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  function addTestimonial() {
    const draft: TestimonialDraft = {
      id: `local-${uid()}`,
      clientName: '',
      projectType: '',
      quote: '',
      avatarUrl: '',
      isVisible: true,
      sortOrder: testimonials.length,
    };
    setTestimonials((prev) => [...prev, draft]);
  }

  function updateField(id: string, field: keyof TestimonialDraft, value: unknown) {
    setTestimonials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  if (loading) {
    return <div className="text-sm text-muted py-4">Loading testimonials…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {testimonials.length === 0 && (
          <p className="text-sm text-muted py-4 text-center">No testimonials yet. Add one below.</p>
        )}
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="rounded-[--zymbiq-radius] border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {t.id.startsWith('local-') ? '● Unsaved' : t.clientName || 'Testimonial'}
              </span>
              <div className="flex items-center gap-2">
                <SwitchField
                  label="Visible"
                  checked={t.isVisible}
                  onChange={(v) => updateField(t.id, 'isVisible', v)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteMutation.mutate(t.id)}
                  disabled={deleteMutation.isPending}
                  className="text-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Client Name">
                <Input
                  value={t.clientName}
                  onChange={(e) => updateField(t.id, 'clientName', e.target.value)}
                  placeholder="Jane Doe"
                />
              </FieldGroup>
              <FieldGroup label="Project Type">
                <Input
                  value={t.projectType}
                  onChange={(e) => updateField(t.id, 'projectType', e.target.value)}
                  placeholder="e.g. E-commerce"
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Quote">
              <Textarea
                value={t.quote}
                onChange={(e) => updateField(t.id, 'quote', e.target.value)}
                placeholder="Client's testimonial…"
                className="min-h-[80px]"
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Avatar URL (optional)">
                <Input
                  value={t.avatarUrl}
                  onChange={(e) => updateField(t.id, 'avatarUrl', e.target.value)}
                  placeholder="https://…"
                />
              </FieldGroup>
              <FieldGroup label="Sort Order">
                <Input
                  type="number"
                  value={t.sortOrder}
                  onChange={(e) =>
                    updateField(t.id, 'sortOrder', parseInt(e.target.value, 10) || 0)
                  }
                />
              </FieldGroup>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => saveMutation.mutate(t)}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addTestimonial} className="gap-2">
        <Plus className="h-4 w-4" /> Add Testimonial
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ Tab
// ---------------------------------------------------------------------------

function FaqTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [items, setItems] = React.useState<FaqDraft[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/faq')
      .then((r) => r.json())
      .then((json: { data?: FaqDraft[] }) => {
        setItems((json.data ?? []).map((f) => ({ ...f, id: f.id ?? `local-${uid()}` })));
      })
      .catch(() => {
        toast({ title: 'Could not load FAQ items', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (draft: FaqDraft) => {
      const { id, ...body } = draft;
      const isNew = id.startsWith('local-');
      const res = await fetch(isNew ? '/api/faq' : `/api/faq?id=${id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save FAQ item');
      const json = (await res.json()) as { data?: FaqDraft };
      return { saved: json.data, original: draft };
    },
    onSuccess: ({ saved, original }) => {
      if (saved) {
        setItems((prev) => prev.map((f) => (f.id === original.id ? { ...saved } : f)));
      }
      void qc.invalidateQueries({ queryKey: ['faq'] });
      toast({ title: 'FAQ item saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('local-')) return;
      const res = await fetch(`/api/faq?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete FAQ item');
    },
    onSuccess: (_data, id) => {
      setItems((prev) => prev.filter((f) => f.id !== id));
      toast({ title: 'FAQ item deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  function addFaq() {
    const draft: FaqDraft = {
      id: `local-${uid()}`,
      category: '',
      question: '',
      answer: '',
      sortOrder: items.length,
      isVisible: true,
    };
    setItems((prev) => [...prev, draft]);
  }

  function updateField(id: string, field: keyof FaqDraft, value: unknown) {
    setItems((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  }

  if (loading) {
    return <div className="text-sm text-muted py-4">Loading FAQ items…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-muted py-4 text-center">No FAQ items yet. Add one below.</p>
        )}
        {items.map((faq) => (
          <div
            key={faq.id}
            className="rounded-[--zymbiq-radius] border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                {faq.id.startsWith('local-') ? '● Unsaved' : faq.category || 'FAQ Item'}
              </span>
              <div className="flex items-center gap-2">
                <SwitchField
                  label="Visible"
                  checked={faq.isVisible}
                  onChange={(v) => updateField(faq.id, 'isVisible', v)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteMutation.mutate(faq.id)}
                  disabled={deleteMutation.isPending}
                  className="text-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Category">
                <Input
                  value={faq.category}
                  onChange={(e) => updateField(faq.id, 'category', e.target.value)}
                  placeholder="e.g. Pricing"
                />
              </FieldGroup>
              <FieldGroup label="Sort Order">
                <Input
                  type="number"
                  value={faq.sortOrder}
                  onChange={(e) =>
                    updateField(faq.id, 'sortOrder', parseInt(e.target.value, 10) || 0)
                  }
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Question">
              <Input
                value={faq.question}
                onChange={(e) => updateField(faq.id, 'question', e.target.value)}
                placeholder="What is…?"
              />
            </FieldGroup>
            <FieldGroup label="Answer">
              <Textarea
                value={faq.answer}
                onChange={(e) => updateField(faq.id, 'answer', e.target.value)}
                placeholder="Detailed answer…"
                className="min-h-[100px]"
              />
            </FieldGroup>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => saveMutation.mutate(faq)}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addFaq} className="gap-2">
        <Plus className="h-4 w-4" /> Add FAQ Item
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

const TABS = [
  { value: 'hero', label: 'Hero' },
  { value: 'trust', label: 'Trust Strip' },
  { value: 'steps', label: 'Process Steps' },
  { value: 'about', label: 'About' },
  { value: 'footer', label: 'Footer' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'faq', label: 'FAQ' },
] as const;

export default function ContentEditor() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const [activeTab, setActiveTab] = React.useState<string>('hero');

  // frozenContent seeds the child tab forms on first load.
  // After that, each tab owns its own local state via isDirtyRef pattern,
  // so we only push a new frozen snapshot when siteConfig actually changes
  // (i.e. after a successful save + query invalidation refetch).
  const [frozenContent, setFrozenContent] = React.useState<SiteConfigContent | null>(null);
  const prevContentRef = React.useRef<SiteConfigContent | null>(null);
  React.useEffect(() => {
    const incoming = siteConfig?.content ?? null;
    if (!incoming) return;
    // Always update on first load. After that, only update if the content
    // object reference changed (TanStack Query returns a new object after refetch).
    if (prevContentRef.current !== incoming) {
      prevContentRef.current = incoming;
      setFrozenContent(incoming);
    }
  }, [siteConfig?.content]);

  if (isLoading || frozenContent === null) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading content…
      </div>
    );
  }

  const content = frozenContent;

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Scrollable tab list for narrow screens */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-0.5">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="hero">
            <HeroTab content={content} />
          </TabsContent>

          <TabsContent value="trust">
            <TrustStripTab content={content} />
          </TabsContent>

          <TabsContent value="steps">
            <ProcessStepsTab content={content} />
          </TabsContent>

          <TabsContent value="about">
            <AboutTab content={content} />
          </TabsContent>

          <TabsContent value="footer">
            <FooterTab content={content} />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsTab />
          </TabsContent>

          <TabsContent value="faq">
            <FaqTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}