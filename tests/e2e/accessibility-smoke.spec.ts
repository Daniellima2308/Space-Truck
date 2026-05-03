import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Space Truck accessibility smoke", () => {
  test("has no critical accessibility violations on the auth entry screen", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck/i);
    await expect(page.locator("#root")).toContainText(/continuar com google|acessar minha conta|criar conta gratuita/i);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
