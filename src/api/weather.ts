export type WeatherResponse = {
  latitude: number;
  longitude: number;
  timezone?: string;
  current_weather?: {
    temperature: number;
    weathercode: number;
    is_day?: 0 | 1;
    time?: string;
    wind_speed?: number;
    wind_direction?: number;
  };
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    is_day?: 0 | 1;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
  daily?: {
    uv_index_max?: number[];
  };
};

type GeocodingApiResponse = {
  results?: Array<{
    id?: number;
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
};

export type LocationCandidate = {
  id: string;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

function appendKey(url: string): string {
  const key = (import.meta.env.VITE_WEATHER_API_KEY as string) || "";
  return key ? `${url}&key=${encodeURIComponent(key)}` : url;
}

export async function searchLocations(name: string): Promise<LocationCandidate[]> {
  const base =
    (import.meta.env.VITE_GEOCODING_API_BASE as string) ||
    "https://geocoding-api.open-meteo.com";
  const url = appendKey(
    `${base}/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as GeocodingApiResponse;
  return (json.results || []).map((result) => ({
    id: String(result.id ?? `${result.name}-${result.latitude}-${result.longitude}`),
    name: result.name,
    country: result.country,
    admin1: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

export async function getWeather(lat: number, lon: number, unit: "celsius" | "fahrenheit" = "celsius"): Promise<WeatherResponse> {
  const base =
    (import.meta.env.VITE_WEATHER_API_BASE as string) ||
    "https://api.open-meteo.com";
  const url = appendKey(
    `${base}/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m&daily=uv_index_max&temperature_unit=${unit}&wind_speed_unit=kmh`
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as WeatherResponse;
}
