// Ported from Origin/Services/RoasterInfoService.swift
// Server-side helper that asks Claude Haiku for a quick blurb about a roaster.

import "server-only";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export interface RoasterInfo {
  location: string;
  founded: string;
  about: string;
  notable: string;
}

export async function fetchRoasterInfo(
  roaster: string,
): Promise<RoasterInfo | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !roaster.trim()) return null;

  const prompt = `Tell me about the specialty coffee roaster "${roaster}".
Return ONLY a JSON object — no markdown, no explanation:
{
  "location": "City, Country",
  "founded": "YYYY or 'Unknown'",
  "about": "2-sentence description of their roasting philosophy and style",
  "notable": "One notable thing they are known for"
}
If you don't recognise this roaster, return: {"location":"","founded":"","about":"","notable":""}`;

  const body = {
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  };

  try {
    const resp = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return null;
    const envelope = (await resp.json()) as {
      content?: Array<{ text?: string }>;
    };
    const text = envelope.content?.[0]?.text ?? "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<RoasterInfo>;
    const info: RoasterInfo = {
      location: parsed.location ?? "",
      founded: parsed.founded ?? "",
      about: parsed.about ?? "",
      notable: parsed.notable ?? "",
    };
    if (!info.location && !info.about) return null;
    return info;
  } catch {
    return null;
  }
}
