// Auth gate + Supabase session-refresh middleware.
//
// On every request we refresh the session cookies (so server components
// see the latest JWT) and redirect unauthenticated users to /sign-in,
// preserving the path they were trying to hit via ?next=. The /sign-in,
// /auth/callback, and /api/* routes are public — /api stays open because
// /api/scan and /api/roaster need to work for any client we ship later.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/auth/callback"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // Next.js internals and static files are filtered by `matcher` below.
  return false;
}

export async function middleware(req: NextRequest) {
  // Lazy fallthrough if env vars are missing (e.g. local dev without
  // .env.local) — let pages render so the user sees a useful error
  // instead of an opaque 500 from middleware.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value } of cookiesToSet) {
          req.cookies.set(name, value);
        }
        response = NextResponse.next({ request: req });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching getUser() refreshes the session cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;

  if (!user && !isPublic(pathname)) {
    const signIn = req.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = "";
    if (pathname !== "/") {
      signIn.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(signIn);
  }

  // If signed in and visiting /sign-in, send them home.
  if (user && pathname === "/sign-in") {
    const home = req.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  // Skip Next.js internals, static assets, and API routes. We deliberately
  // leave /api unauthenticated so /api/scan + /api/roaster keep working
  // for any non-browser client we might add later.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[A-Za-z0-9]+$).*)"],
};
