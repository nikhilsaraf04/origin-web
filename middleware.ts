// Auth gate. Redirects unauthenticated users to /sign-in, preserving the
// path they were trying to hit via ?next=. Auth is a signed token stored in
// the `origin_token` cookie (set by /api/auth). /sign-in and /api/* are
// public at this layer — /api routes verify their own token so iOS (bearer
// header) and web (cookie) both work.

import { NextResponse, type NextRequest } from "next/server";
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/sign-in"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await verifyTokenEdge(token);
  const { pathname, search } = req.nextUrl;

  if (!authed && !isPublic(pathname)) {
    const signIn = req.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = "";
    if (pathname !== "/") {
      signIn.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(signIn);
  }

  if (authed && pathname === "/sign-in") {
    const home = req.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals, static assets, and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[A-Za-z0-9]+$).*)"],
};
