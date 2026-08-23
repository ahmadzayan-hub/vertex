import { test, expect } from '@playwright/test';

const CASES: Array<{ path: string; contentType?: RegExp }> = [
  { path: '/manifest.webmanifest' },
  { path: '/robots.txt', contentType: /text\/plain/ },
  { path: '/sitemap.xml', contentType: /xml/ },
  { path: '/llms.txt', contentType: /text\/plain/ },
  { path: '/icon.svg', contentType: /svg/ },
  { path: '/apple-touch-icon.svg', contentType: /svg/ },
  { path: '/og-image.svg', contentType: /svg/ },
  { path: '/service-worker.js', contentType: /javascript/ },
];

test.describe('Public discoverability files', () => {
  for (const c of CASES) {
    test(`${c.path} returns 200`, async ({ request }) => {
      const res = await request.get(c.path);
      expect(res.status(), await res.text().catch(() => '')).toBe(200);
      if (c.contentType) {
        const ct = res.headers()['content-type'] ?? '';
        expect(ct).toMatch(c.contentType);
      }
    });
  }
});

test('landing HTML carries the JSON-LD graph and hreflang alternates', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('application/ld+json');
  expect(body).toMatch(/hreflang="en"/);
  expect(body).toMatch(/hreflang="ar"/);
  expect(body).toContain('og:image');
});
