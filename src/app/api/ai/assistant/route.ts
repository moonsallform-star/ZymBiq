// =============================================================================
// Zymbiq — src/app/api/ai/assistant/route.ts
// AI custom order assistant — manages multi-step conversation and generates
// price estimates via Groq structured output.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { callGroqStructured } from "@/lib/groq";
import type { ChatMessage } from "@/lib/groq";
import { DEFAULT_SITE_CONFIG } from "@/lib/constants";
import type { AiAssistantResponse, AiEstimateResponse } from "@/types/api";

// =============================================================================
// Zod schemas
// =============================================================================

const RequestBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .max(40),
  currentStep: z.number().int().min(0).max(100),
});

const AssistantReplySchema = z.union([
  z.object({
    isComplete: z.literal(false),
    message: z.string().min(1),
  }),
  z.object({
    isComplete: z.literal(true),
    message: z.string().min(1),
    estimate: z
      .object({
        estimatedMinPrice: z.number().min(29),
        estimatedMaxPrice: z.number().min(50),
        timeline: z.string().min(1),
        complexity: z.enum(["simple", "medium", "complex", "enterprise"]),
        breakdown: z.string(),
      })
      .optional(),
  }),
]);

const EstimateOnlySchema = z.object({
  estimatedMinPrice: z.number().min(29),
  estimatedMaxPrice: z.number().min(50),
  timeline: z.string().min(1),
  complexity: z.enum(["simple", "medium", "complex", "enterprise"]),
  breakdown: z.string(),
});

// =============================================================================
// Types
// =============================================================================

interface OrderFlowQuestion {
  id: string;
  text: string;
  sortOrder: number;
}

interface AiConfig {
  orderFlowQuestions: OrderFlowQuestion[];
  chatbotKnowledgeBase?: string;
  pricingLogic?: string;
  recommenderPrompt?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Fetches and parses the AI SiteConfig from DB.
 * Falls back to DEFAULT_SITE_CONFIG.ai on any failure.
 */
async function getAiConfig(): Promise<AiConfig> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: "ai" },
    });

    if (!record?.value) return DEFAULT_SITE_CONFIG.ai as unknown as AiConfig;

    const parsed = JSON.parse(record.value) as Partial<AiConfig>;

    return {
      orderFlowQuestions:
        Array.isArray(parsed.orderFlowQuestions) && parsed.orderFlowQuestions.length > 0
          ? parsed.orderFlowQuestions
          : (DEFAULT_SITE_CONFIG.ai.orderFlowQuestions as unknown as OrderFlowQuestion[]),
      chatbotKnowledgeBase: parsed.chatbotKnowledgeBase ?? "",
      pricingLogic: parsed.pricingLogic ?? "",
      recommenderPrompt: parsed.recommenderPrompt ?? "",
    };
  } catch {
    return DEFAULT_SITE_CONFIG.ai as unknown as AiConfig;
  }
}

/**
 * Builds the system prompt for the order assistant.
 */
function buildSystemPrompt(config: AiConfig, forceComplete: boolean): string {
  const questionList = config.orderFlowQuestions
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join("\n");

  const pricingSection = `\n\nPRICING GUIDELINES:\n${
    config.pricingLogic ||
    `PRICING TIERS (all prices in USD):

STARTER ($29 – $79): Landing page, portfolio, 1–2 pages, no backend. Timeline: 1–3 days.
BASIC ($79 – $199): 3–5 page business site, contact form, gallery, SEO. Timeline: 3–7 days.
STANDARD ($199 – $499): 5–10 pages, blog/CMS, booking form, social integration. Timeline: 1–2 weeks.
PROFESSIONAL ($499 – $999): Auth, booking system, payment, admin panel, dashboard. Timeline: 2–3 weeks.
ADVANCED ($999 – $1,999): E-commerce, order management, API integrations, analytics. Timeline: 3–5 weeks.
ENTERPRISE ($1,999 – $4,999): Marketplace, SaaS platform, real-time, complex logic. Timeline: 1–3 months.

RULES: Give tight specific ranges. Very competitive prices — emphasize value. Factor pages + features + integrations.`
  }`;

  const forceSection = forceComplete
    ? "\n\nIMPORTANT: The conversation has reached its maximum length. You MUST respond with isComplete: true and include your best estimate based on all information gathered so far."
    : "";

  return `You are a professional custom web development order assistant for a premium freelance developer. Your role is to gather project requirements through a natural, friendly conversation.

QUESTIONS TO COVER (one at a time, in order, adapt phrasing naturally):
${questionList}

INSTRUCTIONS:
- Ask one question at a time — never multiple questions in a single message
- Be conversational and professional, not robotic
- If the client's answer implies information for a future question, skip that question
- Once you have covered all key questions (or have sufficient information), set isComplete to true
- When setting isComplete to true, include a warm closing message summarising what you've understood
- Always include the estimate object when isComplete is true${pricingSection}${forceSection}

RESPONSE FORMAT — you must ALWAYS respond with valid JSON in one of these two shapes:

When still collecting information:
{"isComplete": false, "message": "Your conversational question or response here"}

When all information is collected:
{"isComplete": true, "message": "Your closing summary here", "estimate": {"estimatedMinPrice": 1200, "estimatedMaxPrice": 2000, "timeline": "2–3 weeks", "complexity": "medium", "breakdown": "Homepage, about, contact, simple booking form, mobile-optimised, SEO basics."}}

complexity must be one of: simple, medium, complex, enterprise
estimatedMinPrice and estimatedMaxPrice must be positive numbers in USD`;
}

/**
 * Flattens the conversation into a single user prompt for callGroqStructured.
 */
function buildConversationPrompt(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "Begin the conversation by greeting the client warmly and asking the first question.";
  }

  const history = messages
    .map((m) => `${m.role === "user" ? "CLIENT" : "ASSISTANT"}: ${m.content}`)
    .join("\n");

  return `Conversation so far:\n\n${history}\n\nContinue as ASSISTANT — respond with valid JSON only.`;
}

/**
 * Requests a standalone estimate when the assistant reply didn't include one.
 */
async function requestEstimate(
  messages: ChatMessage[],
  config: AiConfig
): Promise<AiEstimateResponse | null> {
  const pricingContext = config.pricingLogic
    ? `Pricing guidelines:\n${config.pricingLogic}`
    : "Pricing guidelines:\n- Simple: $300–$800\n- Medium: $800–$2000\n- Complex: $2000–$5000\n- Enterprise: $5000+";

  const systemPrompt = `You are a web development project estimator. Based on the conversation provided, generate a realistic price and timeline estimate.

${pricingContext}

Respond ONLY with valid JSON — no markdown, no explanation.`;

  const conversationSummary = messages
    .map((m) => `${m.role === "user" ? "CLIENT" : "ASSISTANT"}: ${m.content}`)
    .join("\n");

  const prompt = `Based on this conversation, provide a cost and timeline estimate:\n\n${conversationSummary}`;

  const result = await callGroqStructured(prompt, EstimateOnlySchema, systemPrompt);

  // callGroqStructured returns {} as fallback — validate the result has required fields
  if (
    typeof result.estimatedMinPrice !== "number" ||
    typeof result.estimatedMaxPrice !== "number" ||
    !result.timeline
  ) {
    return null;
  }

  return result;
}

// =============================================================================
// POST /api/ai/assistant
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Parse and validate body ──────────────────────────────────────────────

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { messages, currentStep } = parsed.data;

  // ── Force completion after 20 exchanges ─────────────────────────────────
  // Each exchange = 1 user + 1 assistant message → 20 user turns = 40 messages

  const forceComplete = messages.length > 20 || currentStep > 20;

  // ── Load AI config from DB ───────────────────────────────────────────────

  const aiConfig = await getAiConfig();

  // ── Build prompts ────────────────────────────────────────────────────────

  const systemPrompt = buildSystemPrompt(aiConfig, forceComplete);
  const conversationPrompt = buildConversationPrompt(messages as ChatMessage[]);

  // ── Call Groq structured output ──────────────────────────────────────────

  const assistantReply = await callGroqStructured(
    conversationPrompt,
    AssistantReplySchema,
    systemPrompt
  );

  // ── Validate reply has a message ─────────────────────────────────────────
  // callGroqStructured can return {} on total failure — guard against it

  if (!assistantReply.message) {
    // Return a graceful fallback message rather than exposing internal errors
    const fallbackResponse: AiAssistantResponse = {
      message:
        "I'm having a little trouble right now. Could you tell me more about what kind of website you're looking for?",
      isComplete: false,
    };
    return NextResponse.json({ data: fallbackResponse });
  }

  // ── Handle completion + estimate ─────────────────────────────────────────

  let estimate: AiEstimateResponse | undefined;

  if (assistantReply.isComplete) {
    if (assistantReply.estimate) {
      // Estimate included in the assistant reply — use it directly
      estimate = assistantReply.estimate;
    } else {
      // Request a separate estimate based on conversation context
      const separateEstimate = await requestEstimate(
        messages as ChatMessage[],
        aiConfig
      );
      estimate = separateEstimate ?? undefined;
    }
  }

  // ── Build and return response ─────────────────────────────────────────────

  const response: AiAssistantResponse = {
    message: assistantReply.message,
    isComplete: assistantReply.isComplete,
    ...(estimate !== undefined && { estimate }),
  };

  return NextResponse.json({ data: response });
}