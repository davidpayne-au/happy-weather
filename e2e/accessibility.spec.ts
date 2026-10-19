import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockWeatherError, mockWeatherSuccess } from "./fixtures/weatherApi";

async function expectNoA11yViolations(page: Page) {
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
}

test.describe("Accessibility", () => {
	test("has no axe violations on initial render", async ({ page }) => {
		await page.goto("");
		await expectNoA11yViolations(page);
	});

	test("has no axe violations for success state", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.goto("");
		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("region", { name: "Weather data" })).toBeVisible();
		await expectNoA11yViolations(page);
	});

	test("has no axe violations for error state", async ({ page }) => {
		await mockWeatherError(page, 500);
		await page.goto("");
		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("alert")).toBeVisible();
		await expectNoA11yViolations(page);
	});

	test("supports keyboard navigation to core controls", async ({ page }) => {
		await page.goto("");

		await page.keyboard.press("Tab");
		await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/#main-content$/);

		await page.keyboard.press("Tab");
		await expect(page.getByRole("textbox", { name: "Location name" })).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(page.getByRole("button", { name: "Search" })).toBeFocused();
	});

	test("has no axe violations in dark mode (incl. WCAG AA contrast)", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.goto("");
		await page.getByRole("button", { name: "Switch to dark mode" }).click();
		await expectNoA11yViolations(page);
		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("region", { name: "Weather data" })).toBeVisible();
		await expectNoA11yViolations(page);
	});

	test("has no axe violations when choosing between multiple matches", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.route("**/v1/search**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					results: [
						{ id: 1, name: "Springfield", country: "AU", admin1: "Queensland", latitude: 1, longitude: 2 },
						{ id: 2, name: "Springfield", country: "US", admin1: "Illinois", latitude: 3, longitude: 4 },
					],
				}),
			}),
		);
		await page.goto("");
		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("list", { name: "Matching locations" })).toBeVisible();
		await expectNoA11yViolations(page);
	});

	test("has no axe violations for every weather mood in both themes", async ({ page }) => {
		const moods = [
			{ code: 0, is_day: 1 },
			{ code: 0, is_day: 0 },
			{ code: 61, is_day: 1 },
			{ code: 73, is_day: 1 },
			{ code: 95, is_day: 1 },
			{ code: 45, is_day: 1 },
		];
		for (const theme of ["light", "dark"]) {
			for (const m of moods) {
				await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
				await mockWeatherSuccess(page, {
					body: {
						latitude: 1,
						longitude: 2,
						current: { temperature_2m: 21, relative_humidity_2m: 50, wind_speed_10m: 8, wind_direction_10m: 200, weather_code: m.code, is_day: m.is_day },
						daily: { uv_index_max: [m.is_day ? 7 : 0] },
					},
				});
				await page.goto("");
				await page.getByRole("button", { name: "Search" }).click();
				await expect(page.getByRole("region", { name: "Weather data" })).toBeVisible();
				await expectNoA11yViolations(page);
			}
		}
	});

	test("shows a clearly visible focus indicator on interactive controls", async ({ page }) => {
		await page.goto("");
		for (const name of ["Location name"]) {
			await page.getByRole("textbox", { name }).focus();
		}
		const outline = async (locator: ReturnType<Page["getByRole"]>) => {
			await locator.focus();
			return locator.evaluate((el) => {
				const cs = getComputedStyle(el);
				return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
			});
		};
		for (const loc of [
			page.getByRole("textbox", { name: "Location name" }),
			page.getByRole("button", { name: "Search" }),
			page.getByRole("button", { name: /Use my location/ }),
			page.getByRole("button", { name: "Switch to Fahrenheit" }),
			page.getByRole("button", { name: "Switch to dark mode" }),
		]) {
			await page.keyboard.press("Tab");
			const o = await outline(loc);
			expect(o.style).not.toBe("none");
			expect(o.width).toBeGreaterThanOrEqual(2);
		}
	});

	test("interactive targets are at least 44x44 CSS px (WCAG 2.5.5)", async ({ page }) => {
		await page.goto("");
		const targets = page.locator("button, input");
		const count = await targets.count();
		expect(count).toBeGreaterThan(3);
		for (let i = 0; i < count; i++) {
			const box = await targets.nth(i).boundingBox();
			expect(box, `target ${i}`).not.toBeNull();
			expect(box!.height).toBeGreaterThanOrEqual(44);
			expect(box!.width).toBeGreaterThanOrEqual(44);
		}
	});

	test("reflows at 320px wide without horizontal scrolling (WCAG 1.4.10)", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.setViewportSize({ width: 320, height: 640 });
		await page.goto("");
		await page.getByRole("button", { name: "Search" }).click();
		await expect(page.getByRole("region", { name: "Weather data" })).toBeVisible();
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow).toBeLessThanOrEqual(0);
		await expectNoA11yViolations(page);
	});

	test("respects prefers-reduced-motion", async ({ page }) => {
		await mockWeatherSuccess(page);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("");
		await page.getByRole("button", { name: "Search" }).click();
		const emoji = page.getByRole("img", { name: "Partly cloudy" });
		await expect(emoji).toBeVisible();
		const duration = await emoji.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
		expect(duration).toBeLessThan(0.01);
		const orbDuration = await page.locator(".sky-orb-a").evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
		expect(orbDuration).toBeLessThan(0.01);
	});

	test("remains usable with text zoomed to 200%", async ({ page }) => {
		await page.goto("");
		await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
		await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test("decorative backdrop and emoji icons are hidden from the accessibility tree", async ({ page }) => {
		await page.goto("");
		await expect(page.locator(".sky")).toHaveAttribute("aria-hidden", "true");
		await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
	});
});
