import { openApiSpec } from "~/lib/openapi-spec";

export const dynamic = "force-static";

export function GET() {
  return Response.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
