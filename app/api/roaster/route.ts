// Server-only route — proxies the Anthropic Haiku call for roaster blurbs.

import { NextResponse } from "next/server";
import { fetchRoasterInfo } from "@/lib/services/roaster-info";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { error: "Missing 'name' query param" },
      { status: 400 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(null, { status: 200 });
  }
  const info = await fetchRoasterInfo(name);
  return NextResponse.json(info);
}
