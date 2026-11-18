import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

const air = {
  source: "Open-Meteo / CAMS",
  source_url: "https://open-meteo.com/en/docs/air-quality-api",
  aqi_scale: "US_AQI",
  modelled: true,
  official_cpcb_aqi: false,
  observed_at: "2026-11-18T09:00",
  timezone: "Asia/Kolkata",
  current: { us_aqi: 135, pm25_ug_m3: 65, pm10_ug_m3: 90, no2_ug_m3: 31, ozone_ug_m3: 35 },
  category: {
    level: "Unhealthy for sensitive groups",
    advice: "Sensitive groups should reduce outdoor exertion.",
  },
  forecast: [
    { time: "2026-11-18T09:00", us_aqi: 135, pm25_ug_m3: 65 },
    { time: "2026-11-18T10:00", us_aqi: 130, pm25_ug_m3: 64 },
  ],
  disclaimer: "Not an official CPCB AQI or medical advice.",
  freshness: "live",
  fetched_at: "2026-11-18T03:30:00+00:00",
};
const weather = {
  source: "Open-Meteo",
  source_url: "https://open-meteo.com/en/docs",
  observed_at: "2026-11-18T09:00",
  timezone: "Asia/Kolkata",
  temperature_c: 19.5,
  relative_humidity_percent: 53,
  wind_speed_kmh: 6.5,
  freshness: "live",
  fetched_at: "2026-11-18T03:30:00+00:00",
};

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

function fakeFetch(mode: "normal" | "offline" | "weather-outage" = "normal") {
  const fn = vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url);
    if (mode === "offline") throw new Error("Network unavailable");
    if (path.includes("/air-quality")) return json(air);
    if (path.includes("/weather")) {
      return mode === "weather-outage" ? json({ detail: "unavailable" }, 503) : json(weather);
    }
    if (path.includes("/places")) {
      return json({
        source: "Open-Meteo Geocoding",
        freshness: "live",
        results: [
          {
            name: "Delhi",
            admin1: "Delhi",
            country: "India",
            latitude: 28.61,
            longitude: 77.2,
            timezone: "Asia/Kolkata",
          },
        ],
      });
    }
    return json({ detail: "Not found" }, 404);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Dashboard API integration", () => {
  it("loads live AQI, weather, forecast and a child briefing", async () => {
    fakeFetch();
    render(<App />);
    expect(screen.getByRole("status", { name: "Loading air quality" })).toBeInTheDocument();
    await screen.findByText("Unhealthy for sensitive groups");
    expect(screen.getByRole("img", { name: "US AQI 135" })).toBeInTheDocument();
    expect(screen.getByText("19.5 °C")).toBeInTheDocument();
    expect(screen.getByText(/not official CPCB AQI/i)).toBeInTheDocument();
    expect(screen.queryByText(/Shorten or reschedule strenuous outdoor play/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Children/i }));
    expect(screen.getByText(/Shorten or reschedule strenuous outdoor play/i)).toBeInTheDocument();
  });

  it("lets the user search and select a real city result", async () => {
    const fetchMock = fakeFetch();
    render(<App />);
    await screen.findByText("Unhealthy for sensitive groups");
    fireEvent.change(screen.getByRole("textbox", { name: /search for a city/i }), {
      target: { value: "Delhi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find city/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Delhi, Delhi, India/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("lat=28.61"))).toBe(true);
    });
    expect(screen.getAllByText(/Your selected location/i).length).toBeGreaterThan(0);
  });

  it("updates household advice on user input without sending preferences to the API", async () => {
    const fetchMock = fakeFetch();
    render(<App />);
    await screen.findByText("Unhealthy for sensitive groups");
    fireEvent.click(screen.getByRole("checkbox", { name: /Older adults/i }));
    expect(screen.getByText(/Prefer indoor activities and limit strenuous outdoor walks/i)).toBeInTheDocument();
    const saved = localStorage.getItem("winter-smog:household-v1");
    expect(saved).toContain('"olderAdults":true');
    expect(fetchMock.mock.calls.every((call) => !String(call[0]).includes("olderAdults"))).toBe(true);
  });

  it("shows genuine unavailable state without fake readings when offline", async () => {
    fakeFetch("offline");
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No estimate has been invented");
    expect(screen.queryByRole("img", { name: /^US AQI / })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeEnabled();
  });

  it("keeps air data visible when weather provider fails", async () => {
    fakeFetch("weather-outage");
    render(<App />);
    await screen.findByText("Unhealthy for sensitive groups");
    await screen.findByText("Live readings are unavailable right now.");
    expect(screen.getByRole("img", { name: "US AQI 135" })).toBeInTheDocument();
  });
});
