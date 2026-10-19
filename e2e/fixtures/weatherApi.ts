import { Page } from "@playwright/test";

type MockSuccessOptions = {
	delayMs?: number;
	body?: unknown;
};

const DEFAULT_GEOCODING_BODY = {
	results: [
		{
			id: 1,
			name: "Test Location",
			country: "AU",
			admin1: "Queensland",
			latitude: 10.5,
			longitude: 120.25,
		},
	],
};

const DEFAULT_WEATHER_BODY = {
	latitude: 10.5,
	longitude: 120.25,
	current_weather: {
		temperature: 26.3,
		windspeed: 9.8,
		winddirection: 180,
		weathercode: 2,
		time: "2026-04-12T10:00",
	},
} as const;

export async function mockGeocodingSuccess(page: Page, body = DEFAULT_GEOCODING_BODY) {
	await page.route("**/v1/search**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(body),
		});
	});
}

export async function mockWeatherSuccess(page: Page, options: MockSuccessOptions = {}) {
	const responseBody = options.body ?? DEFAULT_WEATHER_BODY;

	await mockGeocodingSuccess(page);

	await page.route("**/v1/forecast**", async (route) => {
		if (options.delayMs) {
			await new Promise((resolve) => setTimeout(resolve, options.delayMs));
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(responseBody),
		});
	});
}

export async function mockWeatherError(page: Page, status = 500) {
	await mockGeocodingSuccess(page);

	await page.route("**/v1/forecast**", async (route) => {
		await route.fulfill({
			status,
			contentType: "application/json",
			body: JSON.stringify({ error: `Mocked HTTP ${status}` }),
		});
	});
}
