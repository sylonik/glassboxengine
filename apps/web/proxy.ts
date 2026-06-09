import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// `/api/t` is the public event-ingestion endpoint for the tracker SDK: external
// sites POST here with an API key (Bearer header or ?key=) and carry no session
// cookie, so it must bypass the session gate. The route handler does its own
// API-key authentication.
const publicPaths = [
  "/sign-in",
  "/sign-up",
  "/api/auth",
  "/api/trpc",
  "/api/health",
  "/api/t",
];

if (process.env.ENABLE_TEST_AUTH === "true") {
  publicPaths.push("/api/dev-auth");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie && pathname !== "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
