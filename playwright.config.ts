import { defineConfig, devices } from '@playwright/test';

const PORT = 5187;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Point at the pre-installed Chromium in this sandbox to avoid a
        // Playwright browser download. In CI the setup-chromium action or
        // `npx playwright install --with-deps chromium` is what fills this.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
        channel: process.env.PLAYWRIGHT_CHROMIUM_PATH ? undefined : 'chromium',
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: 'https://ci-placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key',
    },
  },
});
