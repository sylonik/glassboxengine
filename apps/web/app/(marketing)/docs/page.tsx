import type { Metadata } from "next";
import { pageMetadata } from "~/lib/seo";
import { openApiSpec } from "~/lib/openapi-spec";
import { ApiReference } from "~/components/marketing/api-reference";

export const metadata: Metadata = pageMetadata({
  title: "API Reference",
  description:
    "GlassBox Engine REST API reference — personalized feed, reasoning chains, and event tracking. Bearer-authenticated, with a faithful decision trace on every recommendation.",
  path: "docs",
  keywords: [
    "GlassBox API",
    "recommendation API",
    "explainable recommendation API",
    "API reference",
  ],
});

export default function DocsPage() {
  return <ApiReference spec={openApiSpec} />;
}
