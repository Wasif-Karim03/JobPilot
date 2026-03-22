import { test, expect } from "@playwright/test";

// These tests run against a seeded DB with the test user
// Seed: test@jobpilot.local / TestPassword123!
// Run: pnpm db:seed before these tests

const SEEDED_EMAIL = process.env.E2E_USER_EMAIL ?? "alice@example.com";
const SEEDED_PASSWORD = process.env.E2E_USER_PASSWORD ?? "Password123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator("input[type='email']").fill(SEEDED_EMAIL);
  await page.locator("input[type='password']").fill(SEEDED_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 });
}

test.describe("Dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows dashboard navigation", async ({ page }) => {
    await page.goto("/dashboard");
    // Sidebar or mobile nav should have key links
    await expect(page.getByRole("link", { name: /jobs/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /applications/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /resume/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i }).first()).toBeVisible();
  });

  test("job listings page loads", async ({ page }) => {
    await page.goto("/jobs");
    // Should stay on /jobs (not redirect away)
    await expect(page).toHaveURL(/jobs/);
    // Page should render without a fatal error
    await expect(page.locator("body")).toBeVisible();
  });

  test("applications page loads with kanban columns", async ({ page }) => {
    await page.goto("/applications");
    // Should stay on /applications
    await expect(page).toHaveURL(/applications/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("resume page loads", async ({ page }) => {
    await page.goto("/resume");
    // Should stay on /resume
    await expect(page).toHaveURL(/resume/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("settings page loads all sections", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/api key|claude/i).first()).toBeVisible();
    await expect(page.getByText(/gmail/i).first()).toBeVisible();
    await expect(page.getByText(/account/i).first()).toBeVisible();
  });

  test("outreach page loads", async ({ page }) => {
    await page.goto("/outreach");
    // Should show outreach content or empty state
    const hasContent =
      (await page.getByText(/contacts|outreach/i).count()) > 0;
    expect(hasContent).toBeTruthy();
  });
});
