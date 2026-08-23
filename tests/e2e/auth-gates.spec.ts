import { test, expect } from '@playwright/test';

test.describe('Auth gates', () => {
  test('unauthenticated /dashboard renders the login page', async ({ page }) => {
    await page.goto('/dashboard');
    // ProtectedRoute redirects to /login.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('the login form validates the email format', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.locator('#password').fill('Password9');
    await page.getByRole('button', { name: /^log in$/i }).click();
    // Local validation should surface an inline error before hitting Supabase.
    await expect(page.getByRole('alert')).toContainText(/valid email/i);
  });

  test('the login form validates the password policy', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('reviewer@vertex.ae');
    await page.locator('#password').fill('short');
    await page.getByRole('button', { name: /^log in$/i }).click();
    // "Password must be at least 8 characters." - errors.passwordTooShort
    await expect(page.getByRole('alert')).toContainText(/at least 8/i);
  });
});
