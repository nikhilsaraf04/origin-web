// Server-only helper that turns a roastery product-page URL into a ScanResult.
// Fetches the page, strips HTML to text, then asks Claude (claude-opus-4-7) to
// extract coffee attributes into the same JSON schema /api/scan returns.

import "server-only";
import {
  ANTHROPIC_ENDPOINT,
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION,
  buildScanResult,
  extractJSON,
} from "@/lib/services/claude-vision";
import { FlavorTagsAll } from "@/lib/flavor-taxonomy";
import type { ScanResult } from "@/lib/types/models";

const USER_AGENT =
  "Mozilla/5.0 OriginCoffee/0.2 (+https://origin-coffee.fly.dev)";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_TEXT_CHARS = 60_000; // cap text sent to Claude

/** Thrown when input validation fails (HTTP 400 to client). */
export class MatchUrlBadRequestError extends Error {}

/** Thrown when extraction is technically possible but Claude returns no
 *  meaningful coffee data (HTTP 500 with a friendly message). */
export class MatchUrlExtractionError extends Error {
  constructor() {
    super(
      "Couldn't extract coffee info — try uploading a photo of the bag instead",
    );
  }
}

export function validateUrl(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new MatchUrlBadRequestError("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new MatchUrlBadRequestError("URL must use http or https");
  }
  return parsed;
}

/** Fetches a URL with a real User-Agent, a 10s timeout, and a 2MB cap on the
 *  response. Returns the raw HTML body. */
async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Upstream returned ${resp.status}`);
    }
    const ctype = resp.headers.get("content-type") ?? "";
    if (
      ctype &&
      !ctype.includes("text/html") &&
      !ctype.includes("application/xhtml+xml") &&
      !ctype.includes("text/plain")
    ) {
      throw new Error(`Unsupported content-type: ${ctype}`);
    }

    // Stream + cap at MAX_BYTES so we don't OOM on a multi-GB page.
    if (!resp.body) {
      const txt = await resp.text();
      return txt.slice(0, MAX_BYTES);
    }
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      if (total >= MAX_BYTES) break;
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
    const merged = new Uint8Array(Math.min(total, MAX_BYTES));
    let offset = 0;
    for (const c of chunks) {
      const take = Math.min(c.byteLength, MAX_BYTES - offset);
      merged.set(c.subarray(0, take), offset);
      offset += take;
      if (offset >= MAX_BYTES) break;
    }
    return new TextDecoder("utf-8").decode(merged);
  } finally {
    clearTimeout(timer);
  }
}

/** Strips HTML to readable text. Removes script/style/noscript blocks, drops
 *  all remaining tags, decodes a small set of common entities, and collapses
 *  whitespace. Kept dependency-free on purpose. */
export function htmlToText(html: string): string {
  let s = html;
  // Strip <script>, <style>, <noscript>, <template>, <svg>, <head>, comments.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<template[\s\S]*?<\/template>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<head[\s\S]*?<\/head>/gi, " ");

  // Try to keep <meta name="description"> + og:description etc. before tag-strip.
  // (Just leave them — the extractor sees them as bare text after stripping.)
  s = s.replace(/<[^>]+>/g, " ");

  // Decode a few common entities.
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) =>
      String.fromCharCode(parseInt(d, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    );

  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, MAX_TEXT_CHARS);
}

function buildPrompt(text: string, sourceUrl: string): string {
  return `You are reading the HTML-stripped text of a specialty-coffee product page from a roastery website. Extract the bag's attributes and return ONLY a JSON object — no explanation, no markdown, no code fences.

Required JSON shape:
{
  "roaster": "string",
  "coffeeName": "string",
  "originCountry": "string",
  "originRegion": "string (empty string if not mentioned)",
  "farmEstate": "string (empty string if not mentioned)",
  "altitudeMASL": "string number e.g. '1900', empty string if not mentioned",
  "roastDateStr": "string — empty string if not mentioned",
  "variety": "string (empty string if not mentioned)",
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

If the page is clearly not about a single coffee bag (e.g. it's a homepage, cart, login, generic blog post, 404), return EXACTLY this empty shape:
{"roaster":"","coffeeName":"","originCountry":"","originRegion":"","farmEstate":"","altitudeMASL":"","roastDateStr":"","variety":"","process":"Other","roastLevel":"Medium","roasterFlavorTags":[],"confidence":{"roaster":0,"coffee":0,"country":0,"process":0,"roast":0}}

Source URL: ${sourceUrl}

Page text:
"""
${text}
"""

Return ONLY the JSON object.`;
}

/** True when the parsed ScanResult contains no useful coffee data. */
function isEmptyResult(r: ScanResult): boolean {
  return (
    !r.roaster.trim() &&
    !r.coffeeName.trim() &&
    !r.originCountry.trim() &&
    r.roasterFlavorTags.length === 0
  );
}

export async function matchUrl(rawUrl: string): Promise<ScanResult> {
  const url = validateUrl(rawUrl);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the server environment");
  }

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if ((err as Error).name === "AbortError") {
      throw new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw new Error(`Could not fetch URL: ${msg}`);
  }

  const text = htmlToText(html);
  if (!text || text.length < 40) {
    throw new MatchUrlExtractionError();
  }

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: buildPrompt(text, url.toString()) }],
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
    const t = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${t.slice(0, 300)}`);
  }

  const envelope = (await resp.json()) as {
    content?: Array<{ text?: string }>;
  };
  const respText = envelope.content?.[0]?.text;
  if (!respText) {
    throw new Error("Anthropic response missing text content");
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJSON(respText)) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to parse inner JSON from Claude response: ${(err as Error).message}`,
    );
  }

  const result = buildScanResult(parsed);
  if (isEmptyResult(result)) {
    throw new MatchUrlExtractionError();
  }
  return result;
}
