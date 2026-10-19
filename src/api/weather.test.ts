import { describe, it, expect, vi } from "vitest";
import { getWeather, searchLocations } from "./weather";

describe("getWeather", () => {
  it("fetches and returns json", async () => {
    const mock = {
      latitude: -27.47,
      longitude: 153.02,
      current: {
        temperature_2m: 21.7,
        weather_code: 2,
      },
    };
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => mock,
    })) as any;

    const res = await getWeather(1, 2);

    expect(res).toEqual(mock);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/forecast?latitude=1&longitude=2")
    );
  });

  it("fetches with fahrenheit unit", async () => {
    const mock = {
      latitude: -27.47,
      longitude: 153.02,
      current: {
        temperature_2m: 71,
        weather_code: 2,
      },
    };
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => mock,
    })) as any;

    const res = await getWeather(1, 2, "fahrenheit");

    expect(res).toEqual(mock);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("temperature_unit=fahrenheit")
    );
  });

  it("throws on non-ok", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as any;
    await expect(getWeather(1, 2)).rejects.toThrow();
  });
});

describe("searchLocations", () => {
  it("returns normalized location candidates", async () => {
    const mock = {
      results: [
        {
          id: 123,
          name: "Brisbane",
          country: "Australia",
          admin1: "Queensland",
          latitude: -27.4679,
          longitude: 153.0281,
        },
      ],
    };

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => mock,
    })) as any;

    const res = await searchLocations("brisbane");

    expect(res).toEqual([
      {
        id: "123",
        name: "Brisbane",
        country: "Australia",
        admin1: "Queensland",
        latitude: -27.4679,
        longitude: 153.0281,
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/search?name=brisbane")
    );
  });

  it("throws on non-ok", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 })) as any;
    await expect(searchLocations("brisbane")).rejects.toThrow();
  });
});
