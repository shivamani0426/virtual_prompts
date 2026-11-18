import type { HouseholdPreferences } from "./types";

const STORAGE_KEY = "winter-smog:household-v1";

export const defaultPreferences: HouseholdPreferences = {
  children: true,
  olderAdults: false,
  breathingSensitive: false,
  commute: "public",
  home: "apartment",
  budget: "low",
};

export function readPreferences(): HouseholdPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPreferences;
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== "object") return defaultPreferences;
    const next = value as Partial<HouseholdPreferences>;
    return {
      children: typeof next.children === "boolean" ? next.children : defaultPreferences.children,
      olderAdults:
        typeof next.olderAdults === "boolean" ? next.olderAdults : defaultPreferences.olderAdults,
      breathingSensitive:
        typeof next.breathingSensitive === "boolean"
          ? next.breathingSensitive
          : defaultPreferences.breathingSensitive,
      commute: ["public", "car", "two-wheeler", "walk", "home"].includes(next.commute || "")
        ? (next.commute as HouseholdPreferences["commute"])
        : defaultPreferences.commute,
      home: ["apartment", "independent", "shared"].includes(next.home || "")
        ? (next.home as HouseholdPreferences["home"])
        : defaultPreferences.home,
      budget: ["low", "medium", "high"].includes(next.budget || "")
        ? (next.budget as HouseholdPreferences["budget"])
        : defaultPreferences.budget,
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(value: HouseholdPreferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
