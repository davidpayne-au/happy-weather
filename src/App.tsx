import React, { useEffect, useState, useCallback } from "react";
import { getWeather, searchLocations, type LocationCandidate, type WeatherResponse } from "./api/weather";
import Weather from "./components/Weather";
import { getWeatherCondition } from "./weatherConditions";

function getInitialTheme(): "dark" | "light" {
	if (typeof window === "undefined") return "light";
	const stored = localStorage.getItem("theme");
	if (stored === "dark" || stored === "light") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialUnit(): "celsius" | "fahrenheit" {
	if (typeof window === "undefined") return "celsius";
	const stored = localStorage.getItem("temperatureUnit");
	if (stored === "celsius" || stored === "fahrenheit") return stored;
	return "celsius";
}

function getRecentSearches(): LocationCandidate[] {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("recentSearches");
	if (!stored) return [];
	try {
		return JSON.parse(stored);
	} catch {
		return [];
	}
}

function saveRecentSearch(location: LocationCandidate): void {
	if (typeof window === "undefined") return;
	const recent = getRecentSearches();
	const filtered = recent.filter((l) => l.id !== location.id);
	const updated = [location, ...filtered].slice(0, 5);
	localStorage.setItem("recentSearches", JSON.stringify(updated));
}

export default function App() {
	const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
	const [unit, setUnit] = useState<"celsius" | "fahrenheit">(getInitialUnit);
	const [locationQuery, setLocationQuery] = useState("brisbane");
	const [candidates, setCandidates] = useState<LocationCandidate[]>([]);
	const [selectedLocation, setSelectedLocation] = useState<LocationCandidate | null>(null);
	const [data, setData] = useState<WeatherResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [recentSearches, setRecentSearches] = useState<LocationCandidate[]>(getRecentSearches);
	const [geolocationError, setGeolocationError] = useState<string | null>(null);

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", theme);
	}, [theme]);

	useEffect(() => {
		localStorage.setItem("temperatureUnit", unit);
	}, [unit]);

	const toggleTheme = () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));

	const toggleUnit = () => setUnit((currentUnit) => (currentUnit === "celsius" ? "fahrenheit" : "celsius"));

	const useGeolocation = useCallback(() => {
		if (!navigator.geolocation) {
			setGeolocationError("Geolocation is not supported by your browser");
			return;
		}

		setLoading(true);
		setLoadingLabel("Getting your location");
		setGeolocationError(null);

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude } = position.coords;
				try {
					const res = await getWeather(latitude, longitude, unit);
					setData(res);
					setSelectedLocation({
						id: `${latitude}-${longitude}`,
						name: "Your Location",
						latitude,
						longitude,
					});
					setCandidates([]);
					setError(null);
				} catch (e: any) {
					setError(e.message || "Failed to fetch weather for your location");
				} finally {
					setLoadingLabel(null);
					setLoading(false);
				}
			},
			() => {
				setGeolocationError("Unable to access your location. Please enable location access.");
				setLoadingLabel(null);
				setLoading(false);
			}
		);
	}, [unit]);

	const fetchWeatherForLocation = async (location: LocationCandidate) => {
		setLoading(true);
		setLoadingLabel("Fetching weather");
		setError(null);
		setCandidates([]);
		setSelectedLocation(location);
		try {
			const res = await getWeather(location.latitude, location.longitude, unit);
			setData(res);
			saveRecentSearch(location);
			const updated = getRecentSearches();
			setRecentSearches(updated);
		} catch (e: any) {
			setError(e.message || "Failed to fetch weather data");
		} finally {
			setLoadingLabel(null);
			setLoading(false);
		}
	};

	const searchAndLoadWeather = async () => {
		if (!locationQuery.trim()) {
			setError("Enter a location name to search.");
			return;
		}

		setLoading(true);
		setLoadingLabel("Finding matching locations");
		setError(null);
		setData(null);
		setCandidates([]);
		setSelectedLocation(null);

		try {
			const matches = await searchLocations(locationQuery.trim());
			if (matches.length === 0) {
				setError("No matching locations were found. Try a more specific name.");
				return;
			}

			if (matches.length === 1) {
				await fetchWeatherForLocation(matches[0]);
				return;
			}

			setCandidates(matches);
		} catch (e: any) {
			setError(e.message || "Failed to search for locations");
		} finally {
			setLoadingLabel(null);
			setLoading(false);
		}
	};

	const mood = data && !loading && selectedLocation ? getWeatherCondition(
		data.current?.weather_code ?? data.current_weather?.weathercode,
		data.current?.is_day ?? data.current_weather?.is_day,
	).mood : undefined;

	return (
		<div className="app-shell" data-mood={mood ?? "idle"}>
			<div aria-hidden="true" className="sky">
				<span className="sky-orb sky-orb-a" />
				<span className="sky-orb sky-orb-b" />
				<span className="sky-orb sky-orb-c" />
			</div>

			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>

			<header className="px-4 py-4 sm:px-6">
				<div className="glass mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full px-5 py-2">
					<h1 className="brand">
						<span aria-hidden="true" className="brand-mark">
							🌤️
						</span>
						Weather
						<span className="brand-sub">via Open-Meteo</span>
					</h1>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={toggleUnit}
							aria-label={unit === "celsius" ? "Switch to Fahrenheit" : "Switch to Celsius"}
							className="icon-btn"
							title={unit === "celsius" ? "°C" : "°F"}
						>
							<span aria-hidden="true">{unit === "celsius" ? "°C" : "°F"}</span>
						</button>
						<button
							type="button"
							onClick={toggleTheme}
							aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
							className="icon-btn"
						>
							<span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
						</button>
					</div>
				</div>
			</header>

			<main id="main-content" className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
				<section aria-labelledby="location-heading" className="glass rounded-3xl p-5 sm:p-7">
					<h2 id="location-heading" className="hero-title">
						Enter a location name
					</h2>
					<div className="mt-4 flex flex-wrap items-end gap-3">
						<div className="flex min-w-60 flex-1 flex-col gap-1.5">
							<label htmlFor="location-input" className="field-label">
								Location name
							</label>
							<input
								id="location-input"
								type="text"
								value={locationQuery}
								onChange={(e) => setLocationQuery(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										void searchAndLoadWeather();
									}
								}}
								aria-describedby="location-hint"
								placeholder="e.g. brisbane"
								autoComplete="off"
								className="field"
							/>
							<span id="location-hint" className="sr-only">
								Enter a city or place name, then press Enter or Search
							</span>
						</div>

						<button
							type="button"
							onClick={searchAndLoadWeather}
							disabled={loading}
							aria-busy={loading}
							className="btn btn-primary"
						>
							{loading ? "Loading…" : "Search"}
						</button>

						<button
							type="button"
							onClick={useGeolocation}
							disabled={loading}
							aria-busy={loading}
							className="btn btn-secondary"
						>
							<span aria-hidden="true">📍</span> Use my location
						</button>
					</div>

					{geolocationError && (
						<p role="status" className="mt-3 text-sm text-muted">
							{geolocationError}
						</p>
					)}

					{candidates.length > 1 && !loading && (
						<div className="panel mt-5">
							<h3 className="panel-title">Choose a matching location</h3>
							<ul className="grid gap-2" aria-label="Matching locations">
								{candidates.map((candidate) => (
									<li key={candidate.id}>
										<button type="button" onClick={() => void fetchWeatherForLocation(candidate)} className="candidate">
											{candidate.name}
											{candidate.admin1 ? `, ${candidate.admin1}` : ""}
											{candidate.country ? `, ${candidate.country}` : ""}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}

					{recentSearches.length > 0 && !data && candidates.length <= 1 && (
						<div className="panel mt-5">
							<h3 className="panel-title">Recent searches</h3>
							<ul className="flex flex-wrap gap-2" aria-label="Recent searches">
								{recentSearches.map((location) => (
									<li key={location.id}>
										<button type="button" onClick={() => void fetchWeatherForLocation(location)} className="chip">
											{location.name}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</section>

				<div aria-live="polite" aria-atomic="true" className="mt-6 space-y-4">
					{error && (
						<div role="alert" className="alert">
							<span aria-hidden="true">⚠️</span>
							<span>{error}</span>
						</div>
					)}

					{loading && (
						<div role="status" className="loading-panel">
							<span className="sr-only">{loadingLabel || "Loading weather data"}, please wait.</span>
							<div aria-hidden="true" className="loading-orbit" />
							<span aria-hidden="true" className="loading-emoji">
								🌤️
							</span>
							<span aria-hidden="true" className="font-medium">
								{loadingLabel || "Loading"}…
							</span>
						</div>
					)}

					{data && !loading && selectedLocation && <Weather data={data} location={selectedLocation} unit={unit} />}
				</div>
			</main>
		</div>
	);
}
