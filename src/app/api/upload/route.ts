// =============================================================================
// Zymbiq — src/app/api/upload/route.ts
// Admin-only image upload route that validates and proxies files to Cloudinary.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

const ALLOWED_FOLDERS = ["zymbiq/projects", "zymbiq/blog", "zymbiq/general"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------------------------------------------------------------------------
  // Auth — admin only
  // ---------------------------------------------------------------------------
  const session = await auth();

  if (!session?.user?.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ---------------------------------------------------------------------------
  // Parse multipart form data
  // ---------------------------------------------------------------------------
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const folder = formData.get("folder");

  // ---------------------------------------------------------------------------
  // Validate presence
  // ---------------------------------------------------------------------------
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (!folder || typeof folder !== "string") {
    return NextResponse.json(
      { error: "No folder specified" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // Validate folder
  // ---------------------------------------------------------------------------
  if (!ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])) {
    return NextResponse.json(
      {
        error: `Invalid folder. Must be one of: ${ALLOWED_FOLDERS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // Validate MIME type — images only
  // ---------------------------------------------------------------------------
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // Validate file size — max 5MB
  // ---------------------------------------------------------------------------
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------------------------
  // Convert File → Buffer and upload to Cloudinary
  // ---------------------------------------------------------------------------
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToCloudinary(buffer, folder);

    return NextResponse.json(
      {
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          blurDataURL: result.blurDataURL,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[upload/route] Cloudinary upload failed:", error);

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}