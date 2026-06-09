import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? "3000");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  // `next dev` compiles each route on first hit (cold /-compile was ~10s in CI),
  // so give assertions generous headroom to avoid timeout-only flakes.
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "./scripts/run-e2e-web.sh",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Surface the Next/better-auth server logs in CI output for debugging.
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
