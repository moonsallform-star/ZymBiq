// =============================================================================
// Zymbiq — src/app/api/devforge/status/route.ts
// Public proxy: reads DevForge config from DB and returns cached build status.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { fetchDevforgeStatus } from "@/lib/devforge";
import type { DevforgeStatus } from "@/lib/devforge";
import type { ApiResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevforgeConfig {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
}

// ---------------------------------------------------------------------------
// GET /api/devforge/status
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  // Fetch DevForge config from SiteConfig table
  let configRecord: { value: string } | null = null;

  try {
    configRecord = await prisma.siteConfig.findUnique({
      where: { key: "devforge" },
      select: { value: true },
    });
  } catch {
    // DB error — return null silently
    return Response.json({ data: null } satisfies ApiResponse<DevforgeStatus | null>);
  }

  // No config record in DB
  if (!configRecord) {
    return Response.json({ data: null } satisfies ApiResponse<DevforgeStatus | null>);
  }

  // Parse config JSON
  let devforgeConfig: DevforgeConfig;

  try {
    devforgeConfig = JSON.parse(configRecord.value) as DevforgeConfig;
  } catch {
    return Response.json({ data: null } satisfies ApiResponse<DevforgeStatus | null>);
  }

  // DevForge integration disabled in admin settings
  if (!devforgeConfig.enabled) {
    return Response.json({ data: null } satisfies ApiResponse<DevforgeStatus | null>);
  }

  // Required credentials missing
  if (!devforgeConfig.apiKey || !devforgeConfig.apiUrl) {
    return Response.json({ data: null } satisfies ApiResponse<DevforgeStatus | null>);
  }

  // Fetch live status — never throws, returns null fallback on any failure
  const url = projectId
    ? `${devforgeConfig.apiUrl}?projectId=${projectId}`
    : devforgeConfig.apiUrl;

  const status = await fetchDevforgeStatus(
    devforgeConfig.apiKey,
    url
  );

  // Return with server-side cache headers (55s matches fetchDevforgeStatus revalidate)
  return Response.json(
    { data: status } satisfies ApiResponse<DevforgeStatus>,
    {
      headers: {
        "Cache-Control": "public, s-maxage=55, stale-while-revalidate=5",
      },
    }
  );
}