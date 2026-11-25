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

  test("redirects a signed-out trip link to login and opens password recovery", async ({ page }) => {
    await resetBrowserState(page);
    await page.goto("/trip/ativa");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("button", { name: "Enviar link de recuperação" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
  });
});
