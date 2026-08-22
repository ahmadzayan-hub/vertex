// E2E: Auth and login page — demo mode bypass, login form render.
import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("login page renders with Arabic labels", async ({ page }) => {
    await page.goto("/login");

    // Title
    await expect(page.getByRole("heading", { name: /مسار/ })).toBeVisible({ timeout: 10_000 });

    // Email and password fields
    await expect(page.getByLabel(/البريد الإلكتروني/)).toBeVisible();
    await expect(page.getByLabel(/كلمة المرور/)).toBeVisible();

    // Demo mode link (rendered as <a> via Next.js Link)
    await expect(page.getByRole("link", { name: /وضع العرض التجريبي/ })).toBeVisible();
  });

  test("demo mode link navigates to dashboard", async ({ page }) => {
    await page.goto("/login");

    const demoBtn = page.getByRole("link", { name: /وضع العرض التجريبي/ });
    await demoBtn.click();

    // Should land on dashboard (no Supabase → demo bypass)
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("shows Supabase not configured message when submitting in demo mode", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/البريد الإلكتروني/).fill("test@example.com");
    await page.getByLabel(/كلمة المرور/).fill("password123");
    await page.getByRole("button", { name: /^دخول$/ }).click();

    // In demo mode (no Supabase), an error paragraph appears
    await expect(
      page.locator("p.text-red-700")
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Route protection (demo mode)", () => {
  test("dashboard is accessible without login in demo mode", async ({ page }) => {
    // No Supabase env → middleware passes through → no redirect
    const response = await page.goto("/");
    expect(response?.status()).not.toBe(302);
    await expect(page).toHaveURL("/");
  });

  test("intake is accessible without login in demo mode", async ({ page }) => {
    const response = await page.goto("/intake");
    expect(response?.status()).not.toBe(302);
    await expect(page).toHaveURL("/intake");
  });
});
