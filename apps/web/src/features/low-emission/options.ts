import type { HouseholdPreferences } from "../../lib/types";

export type Alternative = {
  id: string;
  title: string;
  explanation: string;
  benefit: "Potential emissions reduction" | "Personal exposure precaution";
  cost: "No-cost" | "Low-cost" | "Situation-dependent";
};

export function lowEmissionOptions(
  prefs: HouseholdPreferences,
  aqi: number | null,
): Alternative[] {
  const exposed = aqi === null || aqi > 100;
  const options: Alternative[] = [
    {
      id: "combine",
      title: "Combine necessary errands",
      explanation: "If you drive, group nearby errands into fewer trips and avoid unnecessary engine idling. Benefits vary by actual trip distances.",
      benefit: "Potential emissions reduction",
      cost: "No-cost",
    },
    {
      id: "remote",
      title: "Skip one avoidable journey",
      explanation: "Use a call or digital service instead of travelling when practical, without skipping essential health or safety needs.",
      benefit: "Potential emissions reduction",
      cost: "No-cost",
    },
    {
      id: "shared",
      title: prefs.commute === "public" ? "Continue shared transport where suitable" : "Consider shared transport",
      explanation: "Bus, metro and carpooling can reduce per-person travel emissions compared with solo driving when routes and occupancy make sense.",
      benefit: "Potential emissions reduction",
      cost: "Situation-dependent",
    },
  ];
  if (prefs.commute === "walk" || prefs.commute === "two-wheeler") {
    options.unshift({
      id: "exposure",
      title: exposed ? "Avoid adding exertion on polluted days" : "Choose a lower-traffic route",
      explanation: exposed
        ? "When modelled AQI is elevated or unavailable, avoid extra strenuous outdoor travel. For necessary trips, consider lower-exposure routes or modes."
        : "Walking and cycling can avoid tailpipe emissions, but check real conditions before choosing an outdoor route.",
      benefit: "Personal exposure precaution",
      cost: "No-cost",
    });
  }
  if (prefs.budget !== "low") {
    options.push({
      id: "fuel",
      title: "Evaluate cleaner energy at home",
      explanation: "If suitable for your home and power supply, induction cooking can avoid indoor gas combustion. Compare total cost and installation safety.",
      benefit: "Potential emissions reduction",
      cost: "Situation-dependent",
    });
  }
  return options;
}
