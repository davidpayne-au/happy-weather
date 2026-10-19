import { defineConfig, devices } from "@playwright/test";

const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: deployedBaseUrl ?? "http://127.0.0.1:4173",
		trace: "on-first-retry",
		screenshot: "only-on-failure"
	},
	webServer: deployedBaseUrl
		? undefined
		: {
				command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
				url: "http://127.0.0.1:4173",
				reuseExistingServer: !process.env.CI
			},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] }
		}
	]
});
