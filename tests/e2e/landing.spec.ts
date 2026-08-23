import { test, expect } from '@playwright/test';

test.describe('Landing', () => {
  test('renders the hero and CTAs at /', async ({ page }) => {
    await page.goto('/');
    // Title is set in index.html
    await expect(page).toHaveTitle(/VERTEX/);
    // Hero headline is rendered from the EN locale
    await expect(
      page.getByRole('heading', { level: 1, name: /contract submission/i })
    ).toBeVisible();
    // Primary CTA
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
  });

  test('has skip link, semantic landmarks and a manifest link', async ({ page }) => {
    await page.goto('/');
    // Landing + index.html both carry a skip link; either satisfies WCAG.
    await expect(page.locator('a.skip-link').first()).toBeAttached();
    await expect(page.locator('header[role="banner"]').first()).toBeVisible();
    await expect(page.locator('main#main').first()).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', /manifest\.webmanifest/);
  });

  test('language toggle flips direction to RTL', async ({ page }) => {
    await page.goto('/');
    // Landing header carries the EN and AR chips via the LanguageSwitcher.
    await page.getByRole('button', { name: /switch to arabic|العربية/i }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });
});
