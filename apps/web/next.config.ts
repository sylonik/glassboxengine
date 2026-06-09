import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "0" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Type and lint checking are enforced by the dedicated `pnpm typecheck` and
  // `pnpm lint` gates (and in CI). `next build` re-runs its own type-check in a
  // project-references *fallback* mode that resolves cross-package drizzle
  // generics differently (degrading some inferred row types to `{}`), producing
  // false positives the authoritative `tsc` build does not. Skipping the
  // redundant in-build check keeps production builds deterministic.
  typescript: { ignoreBuildErrors: true },
  transpilePackages: [
    "@glassbox/database",
    "@glassbox/api",
    "@glassbox/agents",
    "@glassbox/telemetry",
    "@glassbox/event-pipeline",
  ],
  serverExternalPackages: ["ioredis", "bullmq", "@clickhouse/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
