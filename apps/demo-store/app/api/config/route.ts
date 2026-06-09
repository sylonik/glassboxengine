import { NextResponse } from "next/server";

/**
 * Runtime config endpoint. Read at RUNTIME (never baked at build time) so a
 * deployed Cloud Run service can set the tracker key/endpoint via env without
 * a rebuild. Never throws — returns an empty apiKey if unset (tracking is then
 * disabled gracefully on the client).
 */
export const dynamic = "force-dynamic";

export function GET() {
  const apiKey =
    process.env.GLASSBOX_API_KEY ??
    process.env.NEXT_PUBLIC_GLASSBOX_API_KEY ??
    "";

  const endpoint =
    process.env.GLASSBOX_ENDPOINT ??
    process.env.NEXT_PUBLIC_GLASSBOX_ENDPOINT ??
    "http://localhost:3000";

  return NextResponse.json({ apiKey, endpoint });
}
