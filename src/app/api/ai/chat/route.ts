// =============================================================================
// Zymbiq — src/app/api/ai/chat/route.ts
// AI chatbot streaming endpoint for the communication hub chat widget.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { groq } from "@/lib/groq";
import type { ChatMessage } from "@/lib/groq";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // ── 1. Parse and validate body ──────────────────────────────────────────
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { messages } = body;

  if (!Array.isArray(messages)) {
    return Response.json(
      { error: "messages must be an array." },
      { status: 400 }
    );
  }

  // ── 2. Load AI config + platform name from SiteConfig ───────────────────
  let chatbotKnowledgeBase = "";
  let platformName = "Zymbiq";

  try {
    const [aiConfig, platformConfig] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { key: "ai" } }),
      prisma.siteConfig.findUnique({ where: { key: "platform" } }),
    ]);

    if (aiConfig?.value) {
      try {
        const parsed = JSON.parse(aiConfig.value) as {
          chatbotKnowledgeBase?: string;
        };
        chatbotKnowledgeBase = parsed.chatbotKnowledgeBase ?? "";
      } catch {
        // Malformed JSON — proceed with empty knowledge base
      }
    }

    if (platformConfig?.value) {
      try {
        const parsed = JSON.parse(platformConfig.value) as {
          name?: string;
        };
        platformName = parsed.name ?? "Zymbiq";
      } catch {
        // Malformed JSON — proceed with default name
      }
    }
  } catch (err) {
    console.error("[chat] Failed to load SiteConfig:", err);
    // Non-fatal — proceed with defaults
  }

  // ── 3. Build system prompt ───────────────────────────────────────────────
  const systemPrompt = [
    `You are a helpful assistant for ${platformName}, a premium web development platform where a solo developer builds and sells production-ready websites.`,
    chatbotKnowledgeBase ? chatbotKnowledgeBase : null,
    "Be concise and helpful. Keep responses under 150 words unless detail is truly necessary.",
    "If you cannot answer a question or the topic is outside your knowledge, direct the visitor to use the WhatsApp or email contact options.",
    "Never make up pricing, timelines, or technical details you are not certain of.",
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── 4. Call Groq with streaming ──────────────────────────────────────────
  try {
    const stream = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    // ── 5. Build ReadableStream from Groq async iterable ──────────────────
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
        } catch (err) {
          console.error("[chat] Stream read error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    // ── 6. Return streaming response ──────────────────────────────────────
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[chat] Groq API error:", err);

    return Response.json(
      {
        error:
          "I'm having trouble right now. Please use the WhatsApp or email options to reach me directly.",
      },
      { status: 500 }
    );
  }
}