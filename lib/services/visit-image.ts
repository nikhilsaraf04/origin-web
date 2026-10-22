// Visit photos: pick from camera/library, downscale client-side, upload next
// to the bag photos on the Fly volume.
//
// A visit's photos are stored as /api/images/<visitId>-<index>, reusing the
// existing image endpoint unchanged. Bytes never go through the visit row;
// the row only carries the URLs, exactly as bag photos do.

"use client";

import { uploadBagImage } from "@/lib/services/bag-image";

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

/** Read a picked image file and downscale it to a JPEG data URL small enough
 *  for the 8 MB server ceiling and quick syncs. */
export async function fileToDownscaledDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("not an image"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Upload one visit photo at its display position; returns the stored URL. */
export async function uploadVisitPhoto(
  visitId: string,
  index: number,
  dataUrl: string,
): Promise<string> {
  return uploadBagImage(`${visitId}-${index}`, dataUrl);
}
