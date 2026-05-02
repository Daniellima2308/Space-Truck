import { expect, test } from "@playwright/test";

test.describe("Space Truck app smoke", () => {
  test("loads the app shell without crashing", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/space truck|vite|react/i);
    await expect(page.locator("body")).toBeVisible();

    const appRoot = page.locator("#root");
    await expect(appRoot).toBeVisible();
    await expect(appRoot).not.toBeEmpty();
  });
});
