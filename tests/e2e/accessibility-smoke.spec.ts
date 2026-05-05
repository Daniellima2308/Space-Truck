import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function clearAuthState(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.context().clearCookies();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe("Space Truck accessibility smoke", () => {
  test("has no serious or critical accessibility violations on the public landing screen", async ({ page }) => {
    await clearAuthState(page);
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck/i);
    await expect(page.locator("body")).toContainText(/a rota do lucro real|acesso antecipado|quero acesso antecipado/i);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blockingViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    const blockingViolationSummary = blockingViolations
      .map((violation) => `- ${violation.id}: ${violation.help}`)
      .join("\n");

    expect(
      blockingViolations,
      `Violações sérias ou críticas de acessibilidade encontradas:\n${blockingViolationSummary}`,
    ).toEqual([]);
  });
});
