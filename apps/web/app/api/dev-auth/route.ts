import { NextRequest, NextResponse } from "next/server";

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

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set("better-auth.session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
