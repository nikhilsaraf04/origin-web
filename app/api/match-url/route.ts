// Server-only route — holds the Anthropic API key and turns a roastery
// product-page URL into a ScanResult. The browser must NEVER call
// api.anthropic.com or the upstream roastery directly through here.

import { NextResponse } from "next/server";
import {
  MatchUrlBadRequestError,
  MatchUrlExtractionError,
  matchUrl,
} from "@/lib/services/match-url";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  let payload: { url?: unknown };
  try {
    payload = (await request.json()) as { url?: unknown };
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse JSON body: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' string in JSON body" },
      { status: 400 },
    );
  }

  try {
    const result = await matchUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MatchUrlBadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof MatchUrlExtractionError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
