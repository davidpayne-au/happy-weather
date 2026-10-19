import { describe, expect, it } from "vitest";
import { getCompassDirection, getUvLevel, getWeatherCondition } from "./weatherConditions";

describe("getWeatherCondition", () => {
	it.each([
		[0, 1, "Clear sky", "clear-day"],
		[0, 0, "Clear sky", "clear-night"],
		[2, 1, "Partly cloudy", "cloudy"],
		[2, 0, "Partly cloudy", "clear-night"],
		[45, 1, "Foggy", "fog"],
		[61, 1, "Rain", "rain"],
		[81, 1, "Rain showers", "rain"],
		[73, 1, "Snow", "snow"],
		[86, 1, "Snow showers", "snow"],
		[95, 1, "Thunderstorm", "storm"],
	])("maps code %s (is_day=%s) to %s / %s", (code, isDay, label, mood) => {
		expect(getWeatherCondition(code, isDay)).toMatchObject({ label, mood });
	});

	it("always provides a text label so emoji are never the only signal", () => {
		for (let code = 0; code <= 99; code++) {
			const { label, emoji } = getWeatherCondition(code, 1);
			expect(label.length).toBeGreaterThan(0);
			expect(emoji.length).toBeGreaterThan(0);
		}
	});

	it("falls back gracefully for unknown codes", () => {
		expect(getWeatherCondition(undefined, 1)).toMatchObject({ label: "Unknown conditions", mood: "clear-day" });
		expect(getWeatherCondition(1234, 0).mood).toBe("clear-night");
	});
});

describe("getUvLevel", () => {
	it.each([
		[0, "Low"],
		[2.9, "Low"],
		[3, "Moderate"],
		[6, "High"],
		[8, "Very high"],
		[11, "Extreme"],
	])("classifies UV %s as %s", (uv, label) => {
		expect(getUvLevel(uv).label).toBe(label);
	});
});

describe("getCompassDirection", () => {
	it.each([
		[0, "N"],
		[90, "E"],
		[180, "S"],
		[270, "W"],
		[350, "N"],
		[-90, "W"],
		[360, "N"],
	])("converts %s° to %s", (deg, dir) => {
		expect(getCompassDirection(deg)).toBe(dir);
	});
});
