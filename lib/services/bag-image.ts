// Uploads a bag photo (captured/uploaded as a base64 data URL) to the backend,
// which stores it on the Fly volume and returns a stable "/api/images/<id>"
// URL to persist on the log and sync across devices.
"use client";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** POST the image bytes to /api/images/<id>; returns the stored URL.
 *  Throws on non-2xx so callers can fall back to the local data URL. */
export async function uploadBagImage(
  id: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const res = await fetch(`/api/images/${id}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!res.ok) throw new Error(`image upload failed (${res.status})`);
  const json = (await res.json()) as { url: string };
  return json.url;
}
