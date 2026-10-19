import React from "react";
import type { LocationCandidate, WeatherResponse } from "../api/weather";
import { getCompassDirection, getUvLevel, getWeatherCondition } from "../weatherConditions";

type Unit = "celsius" | "fahrenheit";

type StatProps = {
	icon: string;
	label: string;
	children: React.ReactNode;
	note?: string;
};

const Stat = ({ icon, label, children, note }: StatProps) => (
	<div className="stat-tile">
		<dt className="stat-label">
			<span aria-hidden="true">{icon}</span> {label}
		</dt>
		<dd className="stat-value">{children}</dd>
		{note && <dd className="stat-note">{note}</dd>}
	</div>
);

const Weather = ({
	data,
	location,
	unit = "celsius",
}: {
	data: WeatherResponse;
	location: LocationCandidate;
	unit?: Unit;
}) => {
	const temperature = data.current?.temperature_2m ?? data.current_weather?.temperature;
	const humidity = data.current?.relative_humidity_2m;
	const windSpeed = data.current?.wind_speed_10m ?? data.current_weather?.wind_speed;
	const windDirection = data.current?.wind_direction_10m ?? data.current_weather?.wind_direction;
	const weatherCode = data.current?.weather_code ?? data.current_weather?.weathercode;
	const isDay = data.current?.is_day ?? data.current_weather?.is_day;
	const uvIndex = data.daily?.uv_index_max?.[0];
	const condition = getWeatherCondition(weatherCode, isDay);
	const uv = typeof uvIndex === "number" ? getUvLevel(uvIndex) : null;
	const unitSymbol = unit === "fahrenheit" ? "F" : "C";

	return (
		<section aria-label="Weather data" className="weather-card" data-mood={condition.mood}>
			<h2 className="sr-only">Current weather</h2>
			<p className="eyebrow">Location</p>
			<p className="weather-location">
				{location.name}
				{location.admin1 ? `, ${location.admin1}` : ""}
				{location.country ? `, ${location.country}` : ""}
			</p>

			<div className="weather-hero">
				<div className="weather-emoji" role="img" aria-label={condition.label}>
					{condition.emoji}
				</div>
				<div>
					<p className="eyebrow">Temperature</p>
					<p className="weather-temp">
						{typeof temperature === "number" ? `${temperature.toFixed(1)}°${unitSymbol}` : "N/A"}
					</p>
				</div>
			</div>

			<dl className="stat-grid">
				<Stat icon="🌈" label="Condition">
					{condition.label}
				</Stat>
				{typeof humidity === "number" && (
					<Stat icon="💧" label="Humidity">
						{humidity}%
					</Stat>
				)}
				{typeof windSpeed === "number" && (
					<Stat
						icon="💨"
						label="Wind Speed"
						note={typeof windDirection === "number" ? `from the ${getCompassDirection(windDirection)}` : undefined}
					>
						{windSpeed.toFixed(1)} km/h
					</Stat>
				)}
				{typeof uvIndex === "number" && uv && (
					<Stat icon="🕶️" label="UV Index" note={`${uv.label} · ${uv.description}`}>
						{uvIndex.toFixed(1)}
					</Stat>
				)}
			</dl>
		</section>
	);
};

export default Weather;
