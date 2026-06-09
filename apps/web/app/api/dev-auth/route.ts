import { NextRequest, NextResponse } from "next/server";
import { makeSignature } from "better-auth/crypto";

const isDevAuthEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_TEST_AUTH === "true";

export async function GET(request: NextRequest) {
  if (!isDevAuthEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  const redirectTo =
    request.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "BETTER_AUTH_SECRET is not configured" },
      { status: 500 }
    );
  }

  // better-auth signs the session cookie as `${token}.${HMAC-SHA256(token, secret)}`
  // and rejects a bare token. Emit the signed value so the session validates on
  // every request, not just the proxy's cookie-presence check.
  const signedToken = `${token}.${await makeSignature(token, secret)}`;

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set("better-auth.session_token", signedToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
