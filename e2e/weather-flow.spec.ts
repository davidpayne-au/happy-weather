import { expect, test } from "@playwright/test";
import { mockWeatherError, mockWeatherSuccess } from "./fixtures/weatherApi";

test.describe("Weather app flows", () => {
	test("renders initial screen with location search", async ({ page }) => {
		await page.goto("");

		await expect(page.getByRole("heading", { name: "Enter a location name" })).toBeVisible();
		await expect(page.getByRole("textbox", { name: "Location name" })).toHaveValue("brisbane");
		await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
	});

	test("fetches and renders weather data", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.goto("");

		await page.getByRole("textbox", { name: "Location name" }).fill("Brisbane");
		await page.getByRole("button", { name: "Search" }).click();

		const weatherSection = page.getByRole("region", { name: "Weather data" });
		await expect(weatherSection).toBeVisible();
		await expect(weatherSection).toContainText("26.3°C");
	});

	test("shows loading state while request is in flight", async ({ page }) => {
		await mockWeatherSuccess(page, { delayMs: 600 });
		await page.goto("");

		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("button", { name: /Loading/ })).toBeDisabled();
		await expect(page.getByRole("status")).toContainText("Fetching weather");
		await expect(page.getByRole("button", { name: "Search" })).toBeEnabled();
	});

	test("shows an alert when weather request fails", async ({ page }) => {
		await mockWeatherError(page, 500);
		await page.goto("");

		await page.getByRole("button", { name: "Search" }).click();
		const alert = page.getByRole("alert");
		await expect(alert).toBeVisible();
		await expect(alert).toContainText("HTTP 500");
	});

	test("persists selected theme across reload", async ({ page }) => {
		await page.goto("");
		const themeButton = page.getByRole("button", { name: "Switch to dark mode" });
		await themeButton.click();

		await expect(page.locator("html")).toHaveClass(/dark/);
		await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

		await page.reload();
		await expect(page.locator("html")).toHaveClass(/dark/);
		await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
	});
});
