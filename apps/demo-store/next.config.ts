import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["@glassbox/tracker"],
};

export default nextConfig;
