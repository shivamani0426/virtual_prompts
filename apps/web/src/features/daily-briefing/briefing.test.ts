import { describe, expect, it } from "vitest";
import { buildBriefing, findLowerWindow, formatLocalHour } from "./briefing";
import { defaultPreferences } from "../../lib/preferences";
import type { AirSnapshot } from "../../lib/types";

function airWithAqi(aqi: number, forecasts = [aqi, aqi - 3, aqi + 4]): AirSnapshot {
  return {
    source: "Open-Meteo / CAMS",
    source_url: "https://open-meteo.com/en/docs/air-quality-api",
    aqi_scale: "US_AQI",
    modelled: true,
    official_cpcb_aqi: false,
    observed_at: "2026-11-18T09:00",
    timezone: "Asia/Kolkata",
    current: {
      us_aqi: aqi,
      pm25_ug_m3: 48,
      pm10_ug_m3: 70,
      no2_ug_m3: 32,
      ozone_ug_m3: 28,
    },
    category: { level: "Sample", advice: "This is test data" },
    forecast: forecasts.map((item, index) => ({
      time: "2026-11-18T" + String(index + 9).padStart(2, "0") + ":00",
      us_aqi: item,
      pm25_ug_m3: 48,
    })),
    disclaimer: "This is sample data",
    freshness: "live",
    fetched_at: "2026-11-18T03:30:00+00:00",
  };
}

describe("Deterministic, safety-first briefing", () => {
  it("never labels a high-pollution hour safe", () => {
    const window = findLowerWindow(airWithAqi(320));
    expect(window?.label).toContain("not necessarily safe");
    expect(window?.caution).toContain("no confirmed safe");
    expect(window?.aqi).toBe(317);
  });

  it("does not invent an outdoor time when forecast is absent", () => {
    expect(findLowerWindow(airWithAqi(160, []))).toBeNull();
  });

  it("generates child, older adult and sensitive breathing advice", () => {
    const result = buildBriefing(airWithAqi(260), {
      ...defaultPreferences,
      children: true,
      olderAdults: true,
      breathingSensitive: true,
    });
    expect(result.map((item) => item.label)).toContain("For children");
    expect(result.map((item) => item.label)).toContain("For older adults");
    expect(result.map((item) => item.label)).toContain("For sensitive breathing");
    expect(result[0]?.message).toMatch(/outdoor activity to a minimum/i);
    expect(result.some((item) => item.message.includes("your existing care plan"))).toBe(true);
  });

  it("keeps lower-budget guidance affordable", () => {
    const result = buildBriefing(airWithAqi(80), defaultPreferences);
    expect(result.find((item) => item.label === "Inside your home")?.message).toContain(
      "Avoid burning candles",
    );
  });

  it("adapts home guidance for shared housing without claiming indoor sensor data", () => {
    const shared = buildBriefing(airWithAqi(90), { ...defaultPreferences, home: "shared" });
    expect(shared.find((item) => item.label === "Inside your home")?.message).toContain(
      "smoke-free common areas",
    );
  });

  it("formats forecast labels without assuming the browser timezone", () => {
    expect(formatLocalHour("2026-11-18T00:30")).toBe("12:30 AM");
    expect(formatLocalHour("2026-11-18T18:00")).toBe("6:00 PM");
  });
});
