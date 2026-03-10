// =============================================================================
// Zymbiq — src/app/api/auth/register/route.ts
// Public POST endpoint for new client registration.
// Validates with RegisterSchema, hashes password with bcryptjs, creates User.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ServerRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // -------------------------------------------------------------------------
    // Parse request body
    // -------------------------------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Validate with RegisterSchema
    // -------------------------------------------------------------------------
    const parsed = ServerRegisterSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // -------------------------------------------------------------------------
    // Check if email already exists
    // -------------------------------------------------------------------------
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // -------------------------------------------------------------------------
    // Hash password and create user
    // -------------------------------------------------------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: false,
      },
    });

    // -------------------------------------------------------------------------
    // Link any existing guest orders with matching email to the new account
    // -------------------------------------------------------------------------
    await prisma.order.updateMany({
      where: {
        guestEmail: email,
        userId: null,
      },
      data: {
        userId: newUser.id,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}