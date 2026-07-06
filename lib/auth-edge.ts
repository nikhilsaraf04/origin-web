// Edge-runtime token verification for middleware. Next.js compiles
// middleware to the Edge runtime (even when self-hosted), so it can't use
// `node:crypto` — we verify the HMAC with Web Crypto instead. Must produce
// the exact same signature as lib/auth.ts (HMAC-SHA256, base64url).

export const COOKIE_NAME = "origin_token";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True if the token's signature is valid for ORIGIN_TOKEN_SECRET. */
export async function verifyTokenEdge(
  token: string | undefined | null,
): Promise<boolean> {
  const secret = process.env.ORIGIN_TOKEN_SECRET;
  if (!token || !secret) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expected = b64url(new Uint8Array(mac));
  return safeEqual(sig, expected);
}
