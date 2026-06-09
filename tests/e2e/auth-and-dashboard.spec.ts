import { expect, test } from "@playwright/test";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

test("redirects unauthenticated users to sign in, preserving the destination", async ({ page }) => {
  await page.goto("/dashboard");
  // The proxy preserves the intended destination as ?redirectTo so the user
  // lands where they were going after signing in.
  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("allows a new user to sign up and create a project", async ({ page }) => {
  await page.goto("/sign-up");

  await page.getByLabel("Full Name").fill("E2E Test User");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Start a project" })).toBeVisible();

  await page.getByPlaceholder("Project name").first().fill("E2E Project");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("E2E Project at a glance")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Connect Catalog Upload CSV\/JSON/i })
  ).toBeVisible();
});
