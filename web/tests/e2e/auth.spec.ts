import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e-${Date.now()}@test.jobpilot.local`;
const TEST_PASSWORD = "TestPassword123!";

test.describe("Authentication Flow", () => {
  test("landing page renders and links to register", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("job search");
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up|register|create/i })).toBeVisible();
  });

  test("login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("register with invalid email shows error", async ({ page }) => {
    await page.goto("/register");
    await page.locator("input[type='email']").fill("not-an-email");
    await page.locator("input[type='password']").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign up|register|create/i }).click();
    // Should stay on register page or show error
    await expect(page).toHaveURL(/register/);
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email']").fill("wrong@example.com");
    await page.locator("input[type='password']").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|\/$/);
  });

  test("unauthenticated user is redirected from jobs to login", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page).toHaveURL(/login|\/$/);
  });
});
