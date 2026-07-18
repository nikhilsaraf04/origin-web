// Bag-photo storage. Images are written as files on the Fly volume (next to
// the SQLite DB) and referenced from coffee_logs.bag_photo_url as
// "/api/images/<id>". Keeping bytes out of the DB keeps the logs table (and
// every sync pull) small.
//
//   POST /api/images/<id>   body = image bytes  -> { url }   (auth required)
//   GET  /api/images/<id>                        -> image/*   (auth required)
//
// Auth mirrors /api/logs: bearer token (iOS) or origin_token cookie (web).
// The cookie is what makes <img src="/api/images/…"> work — the browser sends
// it same-origin automatically.

import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { authUserId } from "@/lib/auth";
import { ensureImagesDir } from "@/lib/db";

export const runtime = "nodejs";

// Filenames come straight from log ids (UUIDs). Guard against path traversal
// by allowing only the UUID charset.
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/;

// ~8 MB ceiling — bag photos are downscaled client-side well below this.
const MAX_BYTES = 8 * 1024 * 1024;

function filePathFor(id: string): string {
  return join(ensureImagesDir(), `${id}.jpg`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authUserId(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }

  await writeFile(filePathFor(id), buf);
  return NextResponse.json({ url: `/api/images/${id}` });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authUserId(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  try {
    const buf = await readFile(filePathFor(id));
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Immutable per id — a coffee's photo doesn't change once saved.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
