// =============================================================================
// Zymbiq — src/app/api/admin/appearance/route.ts
// Admin appearance update: validate, upsert SiteConfig, revalidate all routes.
// =============================================================================

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppearanceSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // ---------------------------------------------------------------------------
  // Auth guard — admin only
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ---------------------------------------------------------------------------
  // Parse and validate request body
  // ---------------------------------------------------------------------------
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parseResult = AppearanceSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const validatedAppearance = parseResult.data;

  // ---------------------------------------------------------------------------
  // Serialize and upsert into SiteConfig
  // ---------------------------------------------------------------------------
  let valueStr: string;

  try {
    valueStr = JSON.stringify(validatedAppearance);
  } catch {
    return NextResponse.json(
      { error: "Failed to serialize appearance config" },
      { status: 500 }
    );
  }

  try {
    await prisma.siteConfig.upsert({
      where: { key: "appearance" },
      update: { value: valueStr },
      create: {
        key: "appearance",
        value: valueStr,
        category: "appearance",
      },
    });
  } catch (err) {
    console.error("[appearance/route] DB upsert failed:", err);
    return NextResponse.json(
      { error: "Failed to save appearance config" },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------------------------
  // Trigger ISR revalidation of the root layout so every page inherits the new
  // CSS custom properties on the next request.
  // ---------------------------------------------------------------------------
  revalidatePath("/", "layout");

  return NextResponse.json({ data: { updated: true } });
}