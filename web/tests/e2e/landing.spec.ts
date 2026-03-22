import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();
  });

  test("has links to register and login", async ({ page }) => {
    await page.goto("/");
    const registerLink = page.getByRole("link", { name: /get started|register/i });
    const loginLink = page.getByRole("link", { name: /sign in|log in/i });
    await expect(registerLink.first()).toBeVisible();
    await expect(loginLink.first()).toBeVisible();
  });

  test("feature cards are visible", async ({ page }) => {
    await page.goto("/");
    // There should be several feature cards
    const cards = page.locator("section").filter({ hasText: /search|analysis|gmail|resume/i });
    await expect(cards.first()).toBeVisible();
  });

  test("how it works section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/how it works/i)).toBeVisible();
  });

  test("footer is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("clicking get started navigates to register", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/register/);
  });
});
