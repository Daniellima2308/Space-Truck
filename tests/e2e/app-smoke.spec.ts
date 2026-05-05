import { expect, test } from "@playwright/test";

async function clearAuthState(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.context().clearCookies();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

test.describe("Space Truck app smoke", () => {
  test("loads the public landing shell without crashing", async ({ page }) => {
    await clearAuthState(page);
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck/i);
    await expect(page.locator("body")).toBeVisible();

    const appRoot = page.locator("#root");
    await expect(appRoot).toBeVisible();
    await expect(appRoot).toContainText(/a rota do lucro real|acesso antecipado|quero acesso antecipado/i);
  });
});
