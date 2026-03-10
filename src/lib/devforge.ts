// src/lib/devforge.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevforgeStatus {
  activeProject: {
    name: string;
    currentPhase: string;
    completedFiles: number;
    totalFiles: number;
    percentComplete: number;
    estimatedCompletion: string;
  } | null;
  lastCompletedProject: {
    name: string;
    completedAt: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const DevforgeStatusSchema = z.object({
  activeProject: z
    .object({
      name: z.string(),
      currentPhase: z.string(),
      completedFiles: z.number(),
      totalFiles: z.number(),
      percentComplete: z.number(),
      estimatedCompletion: z.string(),
    })
    .nullable(),
  lastCompletedProject: z
    .object({
      name: z.string(),
      completedAt: z.string(),
    })
    .nullable(),
});

// ---------------------------------------------------------------------------
// Null fallback — returned on any error path
// ---------------------------------------------------------------------------

const NULL_STATUS: DevforgeStatus = {
  activeProject: null,
  lastCompletedProject: null,
};

// ---------------------------------------------------------------------------
// fetchDevforgeStatus
// ---------------------------------------------------------------------------

/**
 * Fetches live build status from the DevForge external API.
 * Never throws — returns null-valued fallback on any failure.
 * Server-only (uses Next.js fetch cache options).
 */
export async function fetchDevforgeStatus(
  apiKey: string,
  apiUrl: string
): Promise<DevforgeStatus> {
  if (!apiKey || !apiUrl) {
    return NULL_STATUS;
  }

  let response: Response;

  try {
    response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Cache for 55 seconds — synced with the 60-second client poll interval
            // Cast required: Next.js fetch extensions are not in the standard Request type
      next: { revalidate: 55 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Network error, DNS failure, timeout, etc.
    return NULL_STATUS;
  }

  if (!response.ok) {
    return NULL_STATUS;
  }

  let rawText: string;

  try {
    rawText = await response.text();
  } catch {
    return NULL_STATUS;
  }

  if (!rawText || rawText.trim() === "") {
    return NULL_STATUS;
  }

  let json: unknown;

  try {
    json = JSON.parse(rawText);
  } catch {
    return NULL_STATUS;
  }

  const parsed = DevforgeStatusSchema.safeParse(json);

  if (!parsed.success) {
    return NULL_STATUS;
  }

  return parsed.data;
}