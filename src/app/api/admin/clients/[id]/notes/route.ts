// src/app/api/admin/clients/[id]/notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Notes are stored as a SiteConfig-style record keyed by client id,
  // or we can use a simple JSON metadata field. Since the User model has
  // no notes field in the schema, we store them in a namespaced SiteConfig key.
  const record = await prisma.siteConfig.findUnique({
    where: { key: `client_notes_${id}` },
    select: { value: true },
  });

  return NextResponse.json({ notes: record?.value ?? "" });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }

  await prisma.siteConfig.upsert({
    where: { key: `client_notes_${id}` },
    update: { value: body.notes, category: "client_notes" },
    create: {
      key: `client_notes_${id}`,
      value: body.notes,
      category: "client_notes",
    },
  });

  return NextResponse.json({ data: { updated: true } });
}