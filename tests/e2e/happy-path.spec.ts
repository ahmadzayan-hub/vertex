import { test, expect } from '@playwright/test';

// Authenticated happy-path e2e. Skipped unless the test project is
// wired up via env variables (see docs/FOLLOWUPS.md for the setup):
//
//   E2E_SUPABASE_URL              https://<test-project>.supabase.co
//   E2E_SUPABASE_ANON_KEY         <anon key from Supabase>
//   E2E_TEST_EMAIL                reviewer@vertex-e2e.local
//   E2E_TEST_PASSWORD             <password from tests/fixtures/seed.sql>
//   E2E_TEST_PROJECT_NAME         E2E Test Project
//
// Locally, load them into .env.local before `npm run e2e`.
// In CI, add them as GitHub Actions secrets on the `e2e` job.

const HAVE_SECRETS =
  !!process.env.E2E_SUPABASE_URL &&
  !!process.env.E2E_SUPABASE_ANON_KEY &&
  !!process.env.E2E_TEST_EMAIL &&
  !!process.env.E2E_TEST_PASSWORD;

test.describe('Authenticated happy path', () => {
  test.skip(!HAVE_SECRETS, 'Test-project secrets not present; see tests/fixtures/seed.sql');

  test('reviewer logs in, sees dashboard, uploads, reviews, approves', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;
    const projectName = process.env.E2E_TEST_PROJECT_NAME ?? 'E2E Test Project';

    // 1. Log in.
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

    // 2. Dashboard shows the seeded project's row via activity or via
    //    the projects link. We do not assert on chart contents (empty
    //    at the start of each test run).
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // 3. Walk the upload wizard.
    await page.goto('/upload');
    // Step 1: project picker.
    await page.getByLabel(/project/i).selectOption({ label: new RegExp(projectName, 'i') });
    await page.getByRole('button', { name: /^next$/i }).click();
    // Step 2: type picker; keep default invoice.
    await page.getByRole('button', { name: /^next$/i }).click();
    // Step 3: file drop. Use a small CSV so the analyzer has something to grip.
    await page.setInputFiles('input[type=file]', {
      name: 'e2e-invoice.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Item,AED\nCatering,1500\n', 'utf-8'),
    });
    await page.getByRole('button', { name: /^next$/i }).click();
    // Step 4: confirm.
    await page.getByRole('button', { name: /upload and analyze/i }).click();

    // 4. Wait for the submission detail page to show the traffic-light
    //    chip after the mock or edge analyzer completes. Debounced
    //    realtime reload should surface it inside a few seconds.
    await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]+/);
    await expect(page.getByText(/good|caution|alert/i)).toBeVisible({ timeout: 15_000 });

    // 5. Approve.
    await page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /^approve$/i }).click();
    await expect(page.getByText(/^approved$/i)).toBeVisible({ timeout: 5_000 });
  });
});
