import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Space Truck accessibility smoke", () => {
  test("has no critical accessibility violations on the public landing screen", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck/i);
    await expect(page.locator("body")).toContainText(/a rota do lucro real|acesso antecipado|quero acesso antecipado/i);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    const criticalViolationSummary = criticalViolations
      .map((violation) => `- ${violation.id}: ${violation.help}`)
      .join("\n");

    expect(
      criticalViolations,
      `Violações críticas de acessibilidade encontradas:\n${criticalViolationSummary}`,
    ).toEqual([]);
  });
});
