import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard for the authenticated (app) segment.
 *
 * Uses the lightweight, non-sensitive `dlv_auth=1` flag cookie
 * (src/lib/auth-cookie.ts). It carries no credentials — real enforcement is
 * API-side via the bearer token and the httpOnly `dlv_rt` refresh cookie.
 * This middleware only spares unauthenticated visitors a client-side bounce.
 */
const AUTH_COOKIE = "dlv_auth";
const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const authenticated = request.cookies.get(AUTH_COOKIE)?.value === "1";

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in visitors skip the auth entry pages (not /login/two-factor —
  // that step runs mid-challenge, before the flag cookie is set).
  if (authenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/register"],
};
