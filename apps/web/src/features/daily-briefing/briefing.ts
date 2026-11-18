import type { AirSnapshot, HouseholdPreferences } from "../../lib/types";

export type BriefingItem = { label: string; message: string; emphasis?: boolean };
export type ActivityWindow = {
  time: string;
  aqi: number;
  label: string;
  caution: string;
};

export function aqiTone(value: number): "good" | "caution" | "poor" | "severe" {
  if (value <= 50) return "good";
  if (value <= 100) return "caution";
  if (value <= 150) return "poor";
  return "severe";
}

export function buildBriefing(
  air: AirSnapshot,
  preferences: HouseholdPreferences,
): BriefingItem[] {
  const aqi = air.current.us_aqi;
  const elevated = aqi > 100;
  const severe = aqi > 200;
  const items: BriefingItem[] = [
    {
      label: "Your household",
      message: severe
        ? "Keep outdoor activity to a minimum. Follow local health and air-quality advisories."
        : elevated
          ? "Reduce prolonged outdoor exertion and plan essential trips with care."
          : "Check the forecast again before longer outdoor activities.",
      emphasis: severe,
    },
  ];

  if (preferences.children) {
    items.push({
      label: "For children",
      message: severe
        ? "Keep vigorous play indoors today. Check school notices and local official guidance."
        : elevated
          ? "Shorten or reschedule strenuous outdoor play, especially during pollution peaks."
          : "Choose lower-pollution hours for outdoor play, when possible.",
    });
  }
  if (preferences.olderAdults) {
    items.push({
      label: "For older adults",
      message: elevated
        ? "Prefer indoor activities and limit strenuous outdoor walks."
        : "Keep an eye on changing conditions during outdoor walks.",
    });
  }
  if (preferences.breathingSensitive) {
    items.push({
      label: "For sensitive breathing",
      message:
        "Follow your existing care plan and local health alerts. Seek medical care for worsening symptoms.",
      emphasis: true,
    });
  }

  const commute = preferences.commute;
  items.push({
    label: "For your commute",
    message:
      commute === "car" || commute === "two-wheeler"
        ? "Avoid unnecessary idling; consider combining essential trips or sharing a ride."
        : commute === "walk"
          ? elevated
            ? "Consider a less exposed mode or route for necessary trips. Reduce strenuous exertion."
            : "Choose lower-traffic routes where practical."
          : commute === "home"
            ? "Working from home can avoid a commuting trip and its transport emissions."
            : "Shared public transport may reduce emissions per passenger compared with solo driving.",
  });

  const indoorBudgetTip =
    preferences.budget === "low"
      ? "Avoid burning candles, incense or waste indoors; close windows during nearby smoke events."
      : preferences.budget === "medium"
        ? "Consider a correctly sized HEPA purifier if affordable and avoid indoor smoke."
        : "If using a correctly sized HEPA purifier, follow filter maintenance instructions and avoid indoor smoke.";
  const indoorHomeTip =
    preferences.home === "shared"
      ? "Agree on smoke-free common areas with housemates."
      : preferences.home === "apartment"
        ? "Keep kitchen extraction and ventilation equipment maintained."
        : "Keep outdoor burning or generator exhaust away from doors and windows.";
  items.push({
    label: "Inside your home",
    message: indoorBudgetTip + " " + indoorHomeTip,
  });
  return items;
}

export function findLowerWindow(air: AirSnapshot): ActivityWindow | null {
  // Forecast is modelled, so the lowest reading is never presented as proof of safety.
  const readings = air.forecast
    .filter(
      (hour) =>
        Number.isFinite(hour.us_aqi) &&
        hour.us_aqi >= 0 &&
        typeof hour.time === "string" &&
        (!air.observed_at || hour.time >= air.observed_at),
    )
    .slice(0, 12);
  if (readings.length === 0) return null;
  const best = readings.reduce((candidate, hour) =>
    hour.us_aqi < candidate.us_aqi ? hour : candidate,
  );
  const tooRisky = best.us_aqi > 100;
  return {
    time: best.time,
    aqi: best.us_aqi,
    label: tooRisky ? "Lowest forecast reading — not necessarily safe" : "Lower forecast period",
    caution: tooRisky
      ? "There is no confirmed safe outdoor window. Especially avoid strenuous activity for sensitive people."
      : "Model estimates vary by street and hour. Check official local alerts before going out.",
  };
}

export function formatLocalHour(timestamp: string): string {
  const match = timestamp.match(/T(\d{2}):(\d{2})/);
  if (!match) return timestamp;
  const hour = Number(match[1]);
  const minute = match[2];
  return String(hour % 12 || 12) + ":" + minute + (hour < 12 ? " AM" : " PM");
}
