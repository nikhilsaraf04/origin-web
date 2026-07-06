// Single-user passcode auth. No email, no SMTP, no sessions table.
//
// Flow: the client posts the passcode to /api/auth; if it matches
// ORIGIN_PASSCODE we return an HMAC-signed bearer token. Every data route
// verifies the token (from the `origin_token` cookie on web, or the
// `Authorization: Bearer` header on iOS). Tokens are long-lived — this is a
// personal app for one person across his own devices.

import { createHmac, timingSafeEqual } from "node:crypto";

/** The single logical user. Kept stable so rows line up across web + iOS and
 *  match the historical Supabase `user_id` column. */
export const USER_ID = "00000000-0000-0000-0000-000000000001";

const COOKIE_NAME = "origin_token";
export { COOKIE_NAME };

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function tokenSecret(): string {
  const s = process.env.ORIGIN_TOKEN_SECRET;
  if (!s) throw new Error("ORIGIN_TOKEN_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", tokenSecret()).update(payload).digest());
}

/** Verify the passcode against ORIGIN_PASSCODE in constant time. */
export function checkPasscode(input: string): boolean {
  const expected = process.env.ORIGIN_PASSCODE;
  if (!expected) throw new Error("ORIGIN_PASSCODE is not set");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Mint a signed token for the single user. Format: <payload>.<sig>. */
export function issueToken(): string {
  const payload = b64url(JSON.stringify({ sub: USER_ID, iat: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id if the token is valid, else null. */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  // Constant-time compare of the signatures.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString());
    return typeof parsed?.sub === "string" ? parsed.sub : null;
  } catch {
    return null;
  }
}

/** Pull a token from a request: Authorization header first (iOS), then the
 *  cookie (web). Returns the user id or null. */
export function authUserId(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const uid = verifyToken(header.slice(7).trim());
    if (uid) return uid;
  }
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (match) return verifyToken(decodeURIComponent(match[1]));
  }
  return null;
}
