import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import App from "./App";

function mockFetch(geo: unknown, weather: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			const body = url.includes("/search") ? geo : weather;
			return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
		}),
	);
}

const place = (id: number, name: string) => ({ id, name, country: "AU", admin1: "QLD", latitude: 1, longitude: 2 });
const weather = {
	latitude: 1,
	longitude: 2,
	current: { temperature_2m: 30, weather_code: 95, is_day: 0, relative_humidity_2m: 80, wind_speed_10m: 5 },
};

describe("App", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("has a skip link targeting the main landmark", () => {
		render(<App />);
		expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
		expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
	});

	it("has exactly one h1 and a labelled search field", () => {
		render(<App />);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("textbox", { name: "Location name" })).toHaveAccessibleDescription(/press Enter or Search/);
	});

	it("keeps visible text inside accessible names (WCAG 2.5.3)", () => {
		render(<App />);
		expect(screen.getByRole("button", { name: /Use my location/ })).toBeInTheDocument();
	});

	it("toggles theme and keeps the accessible name in sync", async () => {
		const user = userEvent.setup();
		render(<App />);
		await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));
		expect(document.documentElement).toHaveClass("dark");
		expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
	});

	it("passes the chosen unit through to the weather card", async () => {
		const user = userEvent.setup();
		mockFetch({ results: [place(1, "Cairns")] }, weather);
		render(<App />);
		await user.click(screen.getByRole("button", { name: "Switch to Fahrenheit" }));
		await user.click(screen.getByRole("button", { name: "Search" }));
		expect(await screen.findByText("30.0°F")).toBeInTheDocument();
	});

	it("themes the page to the current weather", async () => {
		const user = userEvent.setup();
		mockFetch({ results: [place(1, "Cairns")] }, weather);
		const { container } = render(<App />);
		expect(container.querySelector(".app-shell")).toHaveAttribute("data-mood", "idle");
		await user.click(screen.getByRole("button", { name: "Search" }));
		await waitFor(() => expect(container.querySelector(".app-shell")).toHaveAttribute("data-mood", "storm"));
	});

	it("lists ambiguous matches as a plain list of buttons (no misused listbox role)", async () => {
		const user = userEvent.setup();
		mockFetch({ results: [place(1, "Springfield"), place(2, "Springfield East")] }, weather);
		render(<App />);
		await user.click(screen.getByRole("button", { name: "Search" }));
		const list = await screen.findByRole("list", { name: "Matching locations" });
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(list.querySelectorAll("button")).toHaveLength(2);
	});

	it("announces errors with role=alert", async () => {
		const user = userEvent.setup();
		mockFetch({ results: [] }, weather);
		render(<App />);
		await user.click(screen.getByRole("button", { name: "Search" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/No matching locations/);
	});

	it("decorative backdrop is hidden from assistive tech", () => {
		const { container } = render(<App />);
		expect(container.querySelector(".sky")).toHaveAttribute("aria-hidden", "true");
	});
});
