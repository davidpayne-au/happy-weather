import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import WeatherBanner from "./WeatherBanner";

describe("WeatherBanner", () => {
	afterEach(() => {
		cleanup();
	});

	it("is decorative and hidden from assistive technology", () => {
		const { container } = render(<WeatherBanner theme="light" />);
		const banner = container.querySelector(".weather-banner");
		expect(banner).toHaveAttribute("aria-hidden", "true");
	});

	it("does not throw when WebGL is unavailable (jsdom)", () => {
		expect(() => render(<WeatherBanner theme="dark" />)).not.toThrow();
	});
});
