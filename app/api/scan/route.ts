// Server-only route — holds the Anthropic API key and proxies the image upload
// to Claude Vision. The browser must NEVER call api.anthropic.com directly.

import { NextResponse } from "next/server";
import { scanBagImage } from "@/lib/services/claude-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse multipart form data: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing image file in form data (field 'image')." },
      { status: 400 },
    );
  }
  const mediaType = file.type || "image/jpeg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const result = await scanBagImage({ base64, mediaType });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
