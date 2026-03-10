// =============================================================================
// Zymbiq — src/app/api/devforge/projects/route.ts
// Proxy: fetches project list from DevForge for admin order linking.
// =============================================================================

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface DevforgeConfig {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
}

export async function GET(): Promise<Response> {
  // Admin only
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load DevForge config from DB
  let configRecord: { value: string } | null = null;
  try {
    configRecord = await prisma.siteConfig.findUnique({
      where: { key: 'devforge' },
      select: { value: true },
    });
  } catch {
    return Response.json({ projects: [] });
  }

  if (!configRecord) return Response.json({ projects: [] });

  let devforgeConfig: DevforgeConfig;
  try {
    devforgeConfig = JSON.parse(configRecord.value) as DevforgeConfig;
  } catch {
    return Response.json({ projects: [] });
  }

  if (!devforgeConfig.enabled || !devforgeConfig.apiKey || !devforgeConfig.apiUrl) {
    return Response.json({ projects: [] });
  }

  // Build projects list URL from the configured apiUrl
  // apiUrl is like https://devforge-nine-ochre.vercel.app/api/public/devforge-status
  // We need https://devforge-nine-ochre.vercel.app/api/public/devforge-projects
  const projectsUrl = devforgeConfig.apiUrl.replace('devforge-status', 'devforge-projects');

  try {
    const res = await fetch(projectsUrl, {
      headers: {
        Authorization: `Bearer ${devforgeConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) return Response.json({ projects: [] });

    const data = await res.json() as { projects: unknown[] };
    return Response.json({ projects: data.projects ?? [] });
  } catch {
    return Response.json({ projects: [] });
  }
}