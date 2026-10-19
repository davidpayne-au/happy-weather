export type WeatherMood = "clear-day" | "clear-night" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export type WeatherCondition = {
  label: string;
  emoji: string;
  mood: WeatherMood;
};

export function getWeatherCondition(code?: number, isDay?: number): WeatherCondition {
  const night = isDay === 0;

  if (code === 0) {
    return night
      ? { label: "Clear sky", emoji: "🌙", mood: "clear-night" }
      : { label: "Clear sky", emoji: "☀️", mood: "clear-day" };
  }

  if (code === 1 || code === 2 || code === 3) {
    return { label: "Partly cloudy", emoji: "⛅", mood: night ? "clear-night" : "cloudy" };
  }

  if (code === 45 || code === 48) {
    return { label: "Foggy", emoji: "🌫️", mood: "fog" };
  }

  if ((code ?? -1) >= 51 && (code ?? -1) <= 67) {
    return { label: "Rain", emoji: "🌧️", mood: "rain" };
  }

  if ((code ?? -1) >= 71 && (code ?? -1) <= 77) {
    return { label: "Snow", emoji: "❄️", mood: "snow" };
  }

  if (code === 80 || code === 81 || code === 82) {
    return { label: "Rain showers", emoji: "🌦️", mood: "rain" };
  }

  if (code === 85 || code === 86) {
    return { label: "Snow showers", emoji: "🌨️", mood: "snow" };
  }

  if (code === 95 || code === 96 || code === 99) {
    return { label: "Thunderstorm", emoji: "⛈️", mood: "storm" };
  }

  return { label: "Unknown conditions", emoji: "🌤️", mood: night ? "clear-night" : "clear-day" };
}

export type UvLevel = { label: string; description: string };

/** WHO UV index exposure categories. */
export function getUvLevel(uv: number): UvLevel {
  if (uv < 3) return { label: "Low", description: "No protection needed" };
  if (uv < 6) return { label: "Moderate", description: "Seek shade at midday" };
  if (uv < 8) return { label: "High", description: "Sun protection required" };
  if (uv < 11) return { label: "Very high", description: "Extra protection needed" };
  return { label: "Extreme", description: "Avoid the sun at midday" };
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function getCompassDirection(degrees: number): string {
  const normalised = ((degrees % 360) + 360) % 360;
  return COMPASS[Math.round(normalised / 45) % 8];
}
