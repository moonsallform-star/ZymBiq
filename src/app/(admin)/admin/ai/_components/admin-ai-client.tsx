// =============================================================================
// Zymbiq — src/app/(admin)/admin/ai/_components/admin-ai-client.tsx
// Client: tabbed AI config editor — order flow, chatbot, recommender, pricing.
// =============================================================================

'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Loader2, Save } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useSiteConfig } from '@/hooks/use-site-config';
import { QUERY_KEYS } from '@/lib/constants';
import type { SiteConfigAI, OrderFlowQuestion } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType = 'text' | 'choice' | 'number';

interface LocalQuestion {
  id: string; // client-only stable key
  text: string;
  type: QuestionType;
  sortOrder: number;
}

interface PricingRules {
  rules: string;
  basePrice: {
    simple: number;
    medium: number;
    complex: number;
    enterprise: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toLocalQuestions(questions: readonly OrderFlowQuestion[]): LocalQuestion[] {
  return questions.map((q, i) => ({
    id: genId(),
    text: q.text ?? '',
    type: (q.type as QuestionType) ?? 'text',
    sortOrder: q.sortOrder ?? i,
  }));
}

function fromLocalQuestions(questions: LocalQuestion[]): OrderFlowQuestion[] {
  return questions.map((q, i) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    sortOrder: i,
  }));
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

async function patchAiConfig(value: SiteConfigAI): Promise<void> {
  const response = await fetch('/api/admin/ai-config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'ai', value }),
  });
  if (!response.ok) {
    const err = (await response.json()) as { error?: string };
    throw new Error(err.error ?? 'Failed to save AI configuration');
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SaveButtonProps {
  isPending: boolean;
  onClick: () => void;
  label?: string;
}

function SaveButton({ isPending, onClick, label = 'Save' }: SaveButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      size="sm"
      className="min-w-[100px]"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Order Flow Tab
// ---------------------------------------------------------------------------

interface OrderFlowTabProps {
  questions: LocalQuestion[];
  onChange: (questions: LocalQuestion[]) => void;
  onSave: () => void;
  isPending: boolean;
}

function OrderFlowTab({
  questions,
  onChange,
  onSave,
  isPending,
}: OrderFlowTabProps) {
  const dragItem = React.useRef<number | null>(null);
  const dragOver = React.useRef<number | null>(null);

  function addQuestion() {
    const next: LocalQuestion = {
      id: genId(),
      text: '',
      type: 'text',
      sortOrder: questions.length,
    };
    onChange([...questions, next]);
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<LocalQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOver.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const reordered = [...questions];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, removed);
    dragItem.current = null;
    dragOver.current = null;
    onChange(reordered);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Define the questions the AI order assistant asks clients one at a time.
        Drag rows to reorder.
      </p>

      <div className="space-y-2">
        {questions.length === 0 && (
          <p className="text-sm text-muted italic py-4 text-center border border-dashed border-border rounded-[--zymbiq-radius]">
            No questions yet. Add one below.
          </p>
        )}

        {questions.map((q, index) => (
          <div
            key={q.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-2 rounded-[--zymbiq-radius] border border-border bg-surface p-3 cursor-default"
          >
            {/* Drag handle */}
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground transition-colors shrink-0"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Question index */}
            <span className="text-xs text-muted font-mono w-5 shrink-0 text-center">
              {index + 1}
            </span>

            {/* Question text */}
            <Input
              value={q.text}
              onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
              placeholder="e.g. What industry is your business in?"
              className="flex-1 text-sm"
              aria-label={`Question ${index + 1} text`}
            />

            {/* Type selector */}
            <select
              value={q.type}
              onChange={(e) =>
                updateQuestion(q.id, { type: e.target.value as QuestionType })
              }
              className="h-10 rounded-[--zymbiq-radius] border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Question ${index + 1} type`}
            >
              <option value="text">Text</option>
              <option value="choice">Choice</option>
              <option value="number">Number</option>
            </select>

            {/* Delete */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeQuestion(q.id)}
              disabled={questions.length === 1}
              aria-label="Remove question"
              className="shrink-0 text-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>

        <SaveButton isPending={isPending} onClick={onSave} label="Save Questions" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chatbot Tab
// ---------------------------------------------------------------------------

interface ChatbotTabProps {
  systemPrompt: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

function ChatbotTab({
  systemPrompt,
  onChange,
  onSave,
  isPending,
}: ChatbotTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted">
          This is the system prompt for the 24/7 chat widget. Include information
          about your services, turnaround times, process, pricing ranges, and
          common Q&amp;A so the AI can answer visitors accurately.
        </p>
      </div>

      <Textarea
        value={systemPrompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`You are a helpful assistant for [Platform Name], a premium web development studio.\n\nServices offered:\n- Pre-built websites ready to deploy\n- Custom website development\n\nTypical turnaround: 3–7 days for pre-built, 2–4 weeks for custom.\n\nCommon Q&A:\nQ: How do I get started?\nA: Browse the showroom or start a custom order conversation.`}
        className="min-h-[320px] font-mono text-xs leading-relaxed"
        aria-label="Chatbot system prompt / knowledge base"
      />

      <div className="flex justify-end pt-2">
        <SaveButton
          isPending={isPending}
          onClick={onSave}
          label="Save Chatbot Config"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommender Tab
// ---------------------------------------------------------------------------

interface RecommenderTabProps {
  prompt: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

function RecommenderTab({
  prompt,
  onChange,
  onSave,
  isPending,
}: RecommenderTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Define the logic the AI uses when recommending projects to clients. This
        prompt is injected alongside the client's query and available project
        metadata.
      </p>

      <Textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`When recommending projects, prioritise:\n1. Industry match (restaurant → restaurant templates)\n2. Feature overlap (needs booking → templates with booking)\n3. Budget fit (prefer projects priced within stated budget)\n4. Tech stack preference if mentioned\n\nAlways explain why you are recommending each project in 1 sentence.`}
        className="min-h-[240px] font-mono text-xs leading-relaxed"
        aria-label="Recommender system prompt"
      />

      <div className="flex justify-end pt-2">
        <SaveButton
          isPending={isPending}
          onClick={onSave}
          label="Save Recommender"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price Estimation Tab
// ---------------------------------------------------------------------------

interface PriceEstimationTabProps {
  pricing: PricingRules;
  onChange: (value: PricingRules) => void;
  onSave: () => void;
  isPending: boolean;
}

function PriceEstimationTab({
  pricing,
  onChange,
  onSave,
  isPending,
}: PriceEstimationTabProps) {
  function updateBasePrice(
    key: keyof PricingRules['basePrice'],
    raw: string
  ) {
    const num = parseFloat(raw);
    onChange({
      ...pricing,
      basePrice: {
        ...pricing.basePrice,
        [key]: isNaN(num) ? 0 : num,
      },
    });
  }

  const complexityLevels: Array<{
    key: keyof PricingRules['basePrice'];
    label: string;
    description: string;
  }> = [
    {
      key: 'simple',
      label: 'Simple',
      description: 'Landing page, brochure site, 1–3 pages',
    },
    {
      key: 'medium',
      label: 'Medium',
      description: 'Business site, blog, 4–10 pages, basic forms',
    },
    {
      key: 'complex',
      label: 'Complex',
      description: 'E-commerce, booking system, member portal',
    },
    {
      key: 'enterprise',
      label: 'Enterprise',
      description: 'SaaS, multi-role apps, custom integrations',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Base prices */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Base Prices (USD)
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Starting prices per complexity tier. The AI generates a range
            around these values based on features requested.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {complexityLevels.map(({ key, label, description }) => (
            <div
              key={key}
              className="rounded-[--zymbiq-radius] border border-border bg-surface p-3 space-y-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">$</span>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={pricing.basePrice[key]}
                  onChange={(e) => updateBasePrice(key, e.target.value)}
                  className="h-9 text-sm"
                  aria-label={`Base price for ${label} complexity`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing rules */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Pricing Logic Rules
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Describe any additional pricing factors the AI should consider —
            feature add-ons, rush fees, discount conditions, and so on.
          </p>
        </div>

        <Textarea
          value={pricing.rules}
          onChange={(e) =>
            onChange({ ...pricing, rules: e.target.value })
          }
          placeholder={`Additional pricing rules:\n- Add $200–$500 for payment gateway integration\n- Add $300–$800 for custom animations\n- Rush delivery (< 1 week): add 30%\n- Non-profit discount: subtract 15%\n- Multi-language site: add $400 per language\n- Maintenance package: +$99/month optional add-on`}
          className="min-h-[200px] font-mono text-xs leading-relaxed"
          aria-label="Pricing logic rules"
        />
      </div>

      <div className="flex justify-end pt-2">
        <SaveButton
          isPending={isPending}
          onClick={onSave}
          label="Save Pricing Config"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root client component
// ---------------------------------------------------------------------------

export default function AdminAiClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: siteConfig, isLoading } = useSiteConfig();

  // ---- Local state derived from siteConfig.ai ----

  const [questions, setQuestions] = React.useState<LocalQuestion[]>([]);
  const [chatbotPrompt, setChatbotPrompt] = React.useState('');
  const [recommenderPrompt, setRecommenderPrompt] = React.useState('');
  const [pricing, setPricing] = React.useState<PricingRules>({
    rules: '',
    basePrice: { simple: 299, medium: 699, complex: 1499, enterprise: 2999 },
  });

  // Seed local state from siteConfig once loaded
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!isLoading && !seeded.current) {
      const ai = siteConfig.ai;

      setQuestions(
        ai.orderFlowQuestions?.length
          ? toLocalQuestions(ai.orderFlowQuestions as readonly OrderFlowQuestion[])
          : [{ id: genId(), text: '', type: 'text', sortOrder: 0 }]
      );

      setChatbotPrompt(ai.chatbotKnowledgeBase ?? '');
      setRecommenderPrompt(ai.recommenderPrompt ?? '');
      setPricing({
        rules: (ai as unknown as { pricingRules?: string }).pricingRules ?? '',
        basePrice: (ai as unknown as { basePrices?: PricingRules['basePrice'] }).basePrices ?? {
          simple: 299,
          medium: 699,
          complex: 1499,
          enterprise: 2999,
        },
      });

      seeded.current = true;
    }
  }, [isLoading, siteConfig]);

  // ---- Mutation ----

  const { mutate, isPending } = useMutation({
    mutationFn: patchAiConfig,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Saved', description: 'AI configuration updated.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // ---- Per-tab save helpers (each merges its section into the full AI config) ----

  function buildCurrentAiConfig(): SiteConfigAI {
    return {
      orderFlowQuestions: fromLocalQuestions(questions),
      chatbotKnowledgeBase: chatbotPrompt,
      recommenderPrompt: recommenderPrompt,
      pricingLogic: pricing.rules,
      // Store base prices as an extension field
      ...(({ basePrices: pricing.basePrice }) as unknown as object),
    } as SiteConfigAI;
  }

  function saveQuestions() {
    mutate(buildCurrentAiConfig());
  }

  function saveChatbot() {
    mutate(buildCurrentAiConfig());
  }

  function saveRecommender() {
    mutate(buildCurrentAiConfig());
  }

  function savePricing() {
    mutate(buildCurrentAiConfig());
  }

  // ---- Render ----

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-[--zymbiq-radius] bg-muted/10 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="order-flow" className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="order-flow">Order Flow</TabsTrigger>
        <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
        <TabsTrigger value="recommender">Recommender</TabsTrigger>
        <TabsTrigger value="pricing">Price Estimation</TabsTrigger>
      </TabsList>

      <TabsContent value="order-flow">
        <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-6">
          <OrderFlowTab
            questions={questions}
            onChange={setQuestions}
            onSave={saveQuestions}
            isPending={isPending}
          />
        </div>
      </TabsContent>

      <TabsContent value="chatbot">
        <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-6">
          <ChatbotTab
            systemPrompt={chatbotPrompt}
            onChange={setChatbotPrompt}
            onSave={saveChatbot}
            isPending={isPending}
          />
        </div>
      </TabsContent>

      <TabsContent value="recommender">
        <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-6">
          <RecommenderTab
            prompt={recommenderPrompt}
            onChange={setRecommenderPrompt}
            onSave={saveRecommender}
            isPending={isPending}
          />
        </div>
      </TabsContent>

      <TabsContent value="pricing">
        <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-6">
          <PriceEstimationTab
            pricing={pricing}
            onChange={setPricing}
            onSave={savePricing}
            isPending={isPending}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}