import { NextResponse } from "next/server";

/**
 * Liveness probe for the demo storefront. The store has no backing services of
 * its own; "configured" reports whether the engine credentials are present so
 * an uptime check can also catch a missing secret after a redeploy.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "glassbox-demo-store",
    engine: {
      endpoint:
        process.env.GLASSBOX_ENDPOINT ??
        process.env.NEXT_PUBLIC_GLASSBOX_ENDPOINT ??
        null,
      configured: Boolean(
        process.env.GLASSBOX_API_KEY ?? process.env.NEXT_PUBLIC_GLASSBOX_API_KEY
      ),
    },
  });
}
