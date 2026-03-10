import type { ImageLoaderProps } from "next/image";

export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? "good";
  const base = src.startsWith("http") ? src : src;

  const uploadSegment = "/image/upload/";
  const idx = base.indexOf(uploadSegment);

  if (idx !== -1) {
    const before = base.slice(0, idx + uploadSegment.length);
    const after = base.slice(idx + uploadSegment.length);
    return `${before}f_auto,q_auto:${q},w_${width}/${after}`;
  }

  return `${base}?w=${width}&q=${q}`;
}