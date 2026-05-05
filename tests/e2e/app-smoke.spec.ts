import { expect, test } from "@playwright/test";
import { resetBrowserState } from "./helpers/browserState";

test.describe("Space Truck app smoke", () => {
  test("loads the public landing shell without crashing", async ({ page }) => {
    await resetBrowserState(page);
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck/i);
    await expect(page.locator("body")).toBeVisible();

    const appRoot = page.locator("#root");
    await expect(appRoot).toBeVisible();
    await expect(appRoot).toContainText(/a rota do lucro real|acesso antecipado|quero acesso antecipado/i);
  });
});
