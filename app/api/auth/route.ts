// POST /api/auth  { passcode } -> { token }
//
// Verifies the shared passcode and returns a signed bearer token. On web we
// also set it as an httpOnly cookie so middleware can gate pages; iOS reads
// the token from the JSON body and stores it in the Keychain.

import { NextResponse } from "next/server";
import { checkPasscode, issueToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let passcode = "";
  try {
    const body = await req.json();
    passcode = typeof body?.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!passcode) {
    return NextResponse.json({ error: "Passcode required" }, { status: 400 });
  }

  let ok = false;
  try {
    ok = checkPasscode(passcode);
  } catch {
    return NextResponse.json(
      { error: "Server auth not configured" },
      { status: 500 },
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const token = issueToken();
  const res = NextResponse.json({ token });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // ~1 year — personal app, long-lived sessions.
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

// POST /api/auth with { signOut: true } style not needed; sign-out clears
// the cookie via DELETE for symmetry.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
