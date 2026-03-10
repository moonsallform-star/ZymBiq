// src/lib/cloudinary.ts

import { v2 as cloudinary } from "cloudinary";
import type { ImageLoaderProps } from "next/image";
import { CLOUDINARY_FOLDERS } from "@/lib/constants";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  blurDataURL: string;
}

type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

const ALLOWED_FOLDERS: readonly string[] = Object.values(CLOUDINARY_FOLDERS);

// ---------------------------------------------------------------------------
// uploadToCloudinary
// ---------------------------------------------------------------------------

export function uploadToCloudinary(
  file: Buffer,
  folder: string,
  publicId?: string
): Promise<CloudinaryUploadResult> {
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return Promise.reject(
      new Error(
        `Invalid folder "${folder}". Must be one of: ${ALLOWED_FOLDERS.join(", ")}`
      )
    );
  }

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: Record<string, any> = {
      resource_type: "auto",
      folder,
      ...(publicId ? { public_id: publicId } : {}),
      eager: [
        {
          width: 10,
          effect: "blur:1000",
          crop: "scale",
          fetch_format: "auto",
        },
      ],
      eager_async: false,
    };

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload returned no result"));
        return;
      }

      const eagerUrl: string | undefined = result.eager?.[0]?.secure_url;

      // Build blurDataURL — either from the eager low-res transformation URL
      // (fetched and base64-encoded) or fall back to a minimal inline SVG.
      const buildBlurDataURL = async (): Promise<string> => {
        if (!eagerUrl) return buildSvgPlaceholder(result.width, result.height);

        try {
          const response = await fetch(eagerUrl);
          if (!response.ok) throw new Error("Failed to fetch blur image");
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = response.headers.get("content-type") ?? "image/jpeg";
          return `data:${contentType};base64,${base64}`;
        } catch {
          return buildSvgPlaceholder(result.width, result.height);
        }
      };

      buildBlurDataURL().then((blurDataURL) => {
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          blurDataURL,
        });
      });
    });

    stream.end(file);
  });
}

// ---------------------------------------------------------------------------
// getCloudinaryUrl
// ---------------------------------------------------------------------------

export function getCloudinaryUrl(
  publicId: string,
  transformations?: string
): string {
  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true,
    fetch_format: "auto",
    quality: "auto:good",
  });
}

// ---------------------------------------------------------------------------
// deleteFromCloudinary
// ---------------------------------------------------------------------------

export async function deleteFromCloudinary(
  publicId: string
): Promise<{ result: "ok" }> {
  await cloudinary.uploader.destroy(publicId);
  return { result: "ok" };
}

// cloudinaryLoader has been moved to @/lib/cloudinary-loader (client-safe, no fs dependency)
export { cloudinaryLoader } from "@/lib/cloudinary-loader";


// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildSvgPlaceholder(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#E5E7EB"/></svg>`;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}