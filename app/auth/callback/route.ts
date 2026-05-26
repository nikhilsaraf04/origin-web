// Supabase magic-link callback. The email link redirects here with
// `?code=...`; we exchange it for a session, set the auth cookies, and
// bounce the user to `/` (or `?next=...` if provided).

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Behind a proxy/load balancer (Fly), `request.url` reflects the internal
  // bind host (e.g. [::]:3000), so redirecting to `origin` sends the browser
  // to an unreachable address. Build the public base URL from the forwarded
  // headers when present; fall back to `origin` for local dev (next dev).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin;

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
    // Fall through to sign-in on error.
    return NextResponse.redirect(
      `${baseUrl}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${baseUrl}/sign-in?error=missing_code`);
}
