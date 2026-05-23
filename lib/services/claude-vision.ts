// Server-only helper that mirrors Origin/Services/ClaudeVisionService.swift.
// Uses the same model (claude-opus-4-7), same JSON contract, same prompt.

import "server-only";
import {
  CoffeeProcess,
  CoffeeProcessAll,
  RoastLevel,
  RoastLevelAll,
  type ScanResult,
  emptyScanResult,
} from "@/lib/types/models";
import { FlavorTagsAll } from "@/lib/flavor-taxonomy";

export const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_MODEL = "claude-opus-4-7";
export const ANTHROPIC_VERSION = "2023-06-01";

const MODEL = ANTHROPIC_MODEL;

function buildPrompt(): string {
  return `Analyze this specialty coffee bag label and return ONLY a JSON object — no explanation, no markdown, no code fences.

Required JSON shape:
{
  "roaster": "string",
  "coffeeName": "string",
  "originCountry": "string",
  "originRegion": "string (empty string if not visible)",
  "farmEstate": "string (empty string if not visible)",
  "altitudeMASL": "string number e.g. '1900', empty string if not visible",
  "roastDateStr": "string — the roast date printed on bag e.g. '2026-04-10', empty string if not visible",
  "variety": "string (empty string if not visible)",
  "process": "Washed" or "Natural" or "Honey" or "Anaerobic" or "Carbonic Maceration" or "Wet Hulled" or "Other",
  "roastLevel": "Light" or "Medium-Light" or "Medium" or "Medium-Dark" or "Dark",
  "roasterFlavorTags": ["tag1", "tag2"],
  "confidence": {
    "roaster": 0.0,
    "coffee": 0.0,
    "country": 0.0,
    "process": 0.0,
    "roast": 0.0
  }
}

For roasterFlavorTags use ONLY terms from this canonical list (pick the closest match):
${FlavorTagsAll.join(", ")}

Return ONLY the JSON object.`;
}

export function extractJSON(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return text;
  return text.slice(start, end + 1);
}

export function buildScanResult(json: Record<string, unknown>): ScanResult {
  const processStr = (json.process as string | undefined) ?? "Other";
  const roastStr = (json.roastLevel as string | undefined) ?? "Medium";

  const process =
    CoffeeProcessAll.find(
      (p) => p.toLowerCase() === processStr.toLowerCase(),
    ) ?? CoffeeProcess.Other;
  const roastLevel =
    RoastLevelAll.find(
      (r) => r.toLowerCase() === roastStr.toLowerCase(),
    ) ?? RoastLevel.Medium;

  const result: ScanResult = emptyScanResult();
  result.roaster = (json.roaster as string) ?? "";
  result.coffeeName = (json.coffeeName as string) ?? "";
  result.originCountry = (json.originCountry as string) ?? "";
  result.originRegion = (json.originRegion as string) ?? "";
  result.farmEstate = (json.farmEstate as string) ?? "";
  result.altitudeMASL = (json.altitudeMASL as string) ?? "";
  result.roastDateStr = (json.roastDateStr as string) ?? "";
  result.variety = (json.variety as string) ?? "";
  result.process = process;
  result.roastLevel = roastLevel;
  result.roasterFlavorTags = Array.isArray(json.roasterFlavorTags)
    ? (json.roasterFlavorTags as string[])
    : [];
  result.confidence = (json.confidence as Record<string, number>) ?? {};
  return result;
}

export interface ScanRequest {
  /** base64-encoded image bytes (no data: prefix) */
  base64: string;
  /** e.g. "image/jpeg" */
  mediaType: string;
}

export async function scanBagImage(req: ScanRequest): Promise<ScanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the server environment");
  }

  const body = {
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: req.mediaType || "image/jpeg",
              data: req.base64,
            },
          },
          { type: "text", text: buildPrompt() },
        ],
      },
    ],
  };

  const resp = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${text.slice(0, 300)}`);
  }

  const envelope = (await resp.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text = envelope.content?.[0]?.text;
  if (!text) {
    throw new Error("Anthropic response missing text content");
  }
  const json = extractJSON(text);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to parse inner JSON from Claude response: ${(err as Error).message}`,
    );
  }

  return buildScanResult(parsed);
}
