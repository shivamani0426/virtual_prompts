import type { AirSnapshot, CitySearch, Coordinate, WeatherSnapshot } from "./types";

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const API_BASE = rawBase.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(API_BASE + "/api/v1" + path, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const message =
      response.status === 429
        ? "Too many requests. Try again shortly."
        : response.status === 503
          ? "Live readings are unavailable right now."
          : "We couldn't load that information.";
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

function coordinatesQuery(place: Coordinate): string {
  // Only coarse location is transmitted to the environmental API.
  const lat = place.latitude.toFixed(2);
  const lon = place.longitude.toFixed(2);
  return "?lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon);
}

export async function getAir(place: Coordinate, signal?: AbortSignal): Promise<AirSnapshot> {
  const value = await getJson<AirSnapshot>("/air-quality" + coordinatesQuery(place), signal);
  if (
    value.aqi_scale !== "US_AQI" ||
    value.official_cpcb_aqi !== false ||
    !Number.isFinite(value.current?.us_aqi) ||
    value.current.us_aqi < 0
  ) {
    throw new Error("Air-quality data has an unexpected scale or missing reading.");
  }
  return value;
}

export function getWeather(
  place: Coordinate,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  return getJson<WeatherSnapshot>("/weather" + coordinatesQuery(place), signal);
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearch> {
  const cleaned = query.trim();
  if (cleaned.length < 2 || cleaned.length > 80 || /[<>]/.test(cleaned)) {
    throw new Error("Enter at least two letters in a city name.");
  }
  const data = await getJson<CitySearch>("/places?q=" + encodeURIComponent(cleaned), signal);
  return {
    ...data,
    results: Array.isArray(data.results)
      ? data.results.filter(
          (place) =>
            typeof place.name === "string" &&
            Number.isFinite(place.latitude) &&
            Number.isFinite(place.longitude),
        )
      : [],
  };
}


export type AssistantCitation = {
  id: string;
  publisher: string;
  title: string;
  url: string;
  section: string;
  published: string;
  verified: string;
};

export type AssistantAnswer = {
  mode: "generated" | "evidence_only" | "abstained" | "urgent_safety";
  answer: string;
  citations: AssistantCitation[];
  limitations: string[];
  disclaimer: string;
  registry_version: string;
  live_data_used: false;
};

export async function askEvidenceAssistant(
  question: string,
  signal?: AbortSignal,
): Promise<AssistantAnswer> {
  const value = question.trim();
  if (value.length < 5 || value.length > 400) {
    throw new Error("Ask a question between 5 and 400 characters.");
  }
  const response = await fetch(API_BASE + "/api/v1/assistant", {
    method: "POST",
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ question: value }),
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.status === 429
        ? "The assistant is busy. Try again in a minute."
        : "Evidence assistant is temporarily unavailable. Please try again.",
    );
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("Assistant returned an invalid response.");
  }
  const answer = data as Partial<AssistantAnswer>;
  if (!["generated", "evidence_only", "abstained", "urgent_safety"].includes(answer.mode || "") ||
      typeof answer.answer !== "string" || answer.answer.length > 1800 ||
      !Array.isArray(answer.citations) || !Array.isArray(answer.limitations) ||
      answer.live_data_used !== false) {
    throw new Error("Assistant returned an invalid or unsupported response.");
  }
  return answer as AssistantAnswer;
}
