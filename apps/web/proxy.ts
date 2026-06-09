import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The dashboard is the only session-gated surface. Everything else is public:
// the marketing/SEO pages, auth pages, metadata routes (sitemap, robots, icons,
// opengraph-image), and the public APIs — which authenticate themselves
// (`/api/t` and `/api/glassbox.*` use API keys; tRPC uses protectedProcedure).
// Gating an allowlist-of-public broke every time a public page was added, so we
// gate the private prefix instead.
const PROTECTED_PREFIXES = ["/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
