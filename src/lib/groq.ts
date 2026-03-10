// src/lib/groq.ts

import Groq from "groq-sdk";
import { type ZodSchema } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// ---------------------------------------------------------------------------
// Groq Client — singleton, server-only
// ---------------------------------------------------------------------------

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1000;

// ---------------------------------------------------------------------------
// streamGroqChat
// ---------------------------------------------------------------------------

/**
 * Returns an async iterable stream from Groq.
 * Errors are propagated to the caller — handle at call site.
 */
export async function streamGroqChat(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>> {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    stream: true,
  });

  return stream;
}

// ---------------------------------------------------------------------------
// callGroqStructured
// ---------------------------------------------------------------------------

/**
 * Calls Groq with a JSON-only instruction appended to the system prompt,
 * parses the response through the provided Zod schema, and returns typed T.
 * Retries once on parse failure. Falls back to schema.parse({}) if the API
 * key is missing or all attempts fail.
 */
export async function callGroqStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  systemPrompt: string
): Promise<T> {
  // Graceful fallback when API key is absent
  if (!process.env.GROQ_API_KEY) {
    console.warn("[groq] GROQ_API_KEY is not set — returning schema defaults");
    try {
      return schema.parse({});
    } catch {
      return {} as T;
    }
  }

  const jsonSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No explanation, no markdown, no code fences — raw JSON only.`;

  async function attempt(): Promise<T | null> {
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: jsonSystemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
      });

      const raw = response.choices[0]?.message?.content ?? "";

      // Strip accidental markdown fences just in case
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed: unknown = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (err) {
      console.error("[groq] callGroqStructured parse attempt failed:", err);
      return null;
    }
  }

  // First attempt
  const first = await attempt();
  if (first !== null) return first;

  // Single retry
  console.warn("[groq] Retrying callGroqStructured after parse failure…");
  const second = await attempt();
  if (second !== null) return second;

  // Final fallback
  console.error("[groq] Both attempts failed — returning schema defaults");
  try {
    return schema.parse({});
  } catch {
    return {} as T;
  }
}