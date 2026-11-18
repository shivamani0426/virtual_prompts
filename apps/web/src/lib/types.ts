export type Coordinate = { latitude: number; longitude: number };

export type Place = Coordinate & {
  name: string;
  country: string | null;
  admin1: string | null;
  timezone: string | null;
};

export type CitySearch = {
  source: string;
  results: Place[];
  freshness: "live" | "cached" | "stale";
};

export type ForecastPoint = {
  time: string;
  us_aqi: number;
  pm25_ug_m3: number | null;
};

export type AirSnapshot = {
  source: string;
  source_url: string;
  aqi_scale: "US_AQI";
  modelled: boolean;
  official_cpcb_aqi: false;
  observed_at: string | null;
  timezone: string;
  current: {
    us_aqi: number;
    pm25_ug_m3: number | null;
    pm10_ug_m3: number | null;
    no2_ug_m3: number | null;
    ozone_ug_m3: number | null;
  };
  category: { level: string; advice: string };
  forecast: ForecastPoint[];
  disclaimer: string;
  freshness: "live" | "cached" | "stale";
  fetched_at: string;
};

export type WeatherSnapshot = {
  source: string;
  source_url: string;
  temperature_c: number | null;
  relative_humidity_percent: number | null;
  wind_speed_kmh: number | null;
  observed_at: string;
  timezone: string;
  freshness: "live" | "cached" | "stale";
  fetched_at: string;
};

export type HouseholdPreferences = {
  children: boolean;
  olderAdults: boolean;
  breathingSensitive: boolean;
  commute: "public" | "car" | "two-wheeler" | "walk" | "home";
  home: "apartment" | "independent" | "shared";
  budget: "low" | "medium" | "high";
};
