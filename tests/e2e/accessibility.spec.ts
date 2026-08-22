// E2E: Automated WCAG 2.1 AA accessibility audit via axe-core.
// Runs on the three most-used pages in demo mode (no Supabase required).
// A failing axe violation is a release blocker — fix before merging to main.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
  nodes: Array<{ html: string; failureSummary: string }>;
};

// Helper: run axe on the current page and return only critical/serious violations
async function auditPage(page: Parameters<typeof AxeBuilder>[0]) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude(".recharts-wrapper") // chart library internals — tracked separately
    .analyze();

  const blocking = (results.violations as AxeViolation[]).filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  return { violations: results.violations as AxeViolation[], blocking };
}

test.describe("Accessibility — WCAG 2.1 AA", () => {
  test("dashboard (/) has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    // Wait for the page to fully render
    await page.waitForLoadState("networkidle");

    const { blocking, violations } = await auditPage(page);

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  → ${v.nodes[0]?.html ?? ""}`)
        .join("\n");
      throw new Error(`${blocking.length} critical/serious axe violations on /:\n${summary}`);
    }

    // Report moderate/minor violations as informational (non-blocking)
    const moderate = violations.filter((v) => v.impact === "moderate" || v.impact === "minor");
    if (moderate.length > 0) {
      console.warn(
        `[a11y] ${moderate.length} moderate/minor violations on / (non-blocking):`,
        moderate.map((v) => v.id).join(", ")
      );
    }
    expect(blocking).toHaveLength(0);
  });

  test("intake page (/intake) has no critical or serious violations", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("networkidle");

    const { blocking } = await auditPage(page);

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  → ${v.nodes[0]?.html ?? ""}`)
        .join("\n");
      throw new Error(`${blocking.length} critical/serious axe violations on /intake:\n${summary}`);
    }
    expect(blocking).toHaveLength(0);
  });

  test("login page (/login) has no critical or serious violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const { blocking } = await auditPage(page);

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  → ${v.nodes[0]?.html ?? ""}`)
        .join("\n");
      throw new Error(`${blocking.length} critical/serious axe violations on /login:\n${summary}`);
    }
    expect(blocking).toHaveLength(0);
  });

  test("skip-nav link exists and targets #main-content", async ({ page }) => {
    await page.goto("/");

    // Skip-nav should be the first link / focusable element
    const skipNav = page.locator('a[href="#main-content"]').first();
    await expect(skipNav).toBeAttached();

    // #main-content should exist in the DOM
    await expect(page.locator("#main-content")).toBeAttached();
  });

  test("login form inputs are labeled (WCAG 1.3.1)", async ({ page }) => {
    await page.goto("/login");

    // Verify email input is properly associated with its label
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeAttached();

    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeAttached();

    // Verify password input is labeled
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeAttached();

    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeAttached();
  });
});
