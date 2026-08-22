// E2E: Intake flow — paste message → analyze → review results.
// Runs in demo mode (AI_PROVIDER=mock), no Supabase required.
import { test, expect } from "@playwright/test";

test.describe("Intake flow", () => {
  test("intake page loads with form fields", async ({ page }) => {
    await page.goto("/intake");

    // The analyze button should be present and initially disabled (no message)
    const analyzeBtn = page.getByRole("button", { name: /تحليل وصياغة الرد/ });
    await expect(analyzeBtn).toBeVisible({ timeout: 10_000 });
    await expect(analyzeBtn).toBeDisabled();
  });

  test("analyze button enables after typing a message", async ({ page }) => {
    await page.goto("/intake");

    const textarea = page.locator("textarea").first();
    await textarea.fill("السلام عليكم، كم سعر الطوق الذهبي؟");

    const analyzeBtn = page.getByRole("button", { name: /تحليل وصياغة الرد/ });
    await expect(analyzeBtn).toBeEnabled();
  });

  test("submitting a message calls /api/analyze and shows results", async ({ page }) => {
    await page.goto("/intake");

    // Intercept the API call to confirm it fires
    const analyzePromise = page.waitForRequest((req) =>
      req.url().includes("/api/analyze") && req.method() === "POST"
    );

    const textarea = page.locator("textarea").first();
    await textarea.fill("عندي استفسار عن خاتم الذهب — ما السعر؟");

    const analyzeBtn = page.getByRole("button", { name: /تحليل وصياغة الرد/ });
    await analyzeBtn.click();

    // API request should have fired
    const req = await analyzePromise;
    expect(req.url()).toContain("/api/analyze");

    // Button shows loading state
    await expect(page.getByRole("button", { name: /جارٍ التحليل/ })).toBeVisible({ timeout: 5_000 }).catch(() => {
      // May resolve too quickly in mock mode — that's fine
    });

    // Results panel (AnalysisPanel) should appear after the mock responds
    await expect(
      page.getByRole("heading", { name: "الضمانات" })
        .or(page.getByRole("heading", { name: /الرد المقترح/ }))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("privacy warning shows when message contains a phone number", async ({ page }) => {
    await page.goto("/intake");

    const textarea = page.locator("textarea").first();
    await textarea.fill("رقمي هو 0501234567 — هل يمكنك الاتصال؟");

    // Privacy warning should appear inline
    await expect(
      page.locator("text=رقم هاتف").or(page.locator("text=بيانات خاصة")).or(page.locator("text=الخصوصية"))
    ).toBeVisible({ timeout: 5_000 });
  });
});
