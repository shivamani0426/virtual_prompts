import type { HouseholdPreferences } from "../../lib/types";

export type Guidance = {
  id: string;
  headline: string;
  description: string;
  benefit: "Indoor source reduction" | "Exposure precaution" | "Cleaner energy";
  budget: string;
};

export function indoorGuidance(
  preferences: HouseholdPreferences,
  aqi: number | null,
): Guidance[] {
  const outdoorHigh = aqi === null || aqi > 100;
  const homeContext = preferences.home === "shared"
    ? "Ask housemates to keep shared rooms smoke-free."
    : preferences.home === "apartment"
      ? "Keep kitchen extractors working where possible."
      : "Keep generator and fuel-burning exhaust away from occupied windows.";

  const tips: Guidance[] = [
    {
      id: "sources",
      headline: "Reduce smoke at the source",
      description: "Avoid indoor smoking, candles, incense and burning waste. " + homeContext,
      benefit: "Indoor source reduction",
      budget: "Free or low cost",
    },
    {
      id: "cooking",
      headline: "Make cooking air cleaner",
      description: "Use an extractor that vents outdoors when safe and possible. Avoid prolonged smoke-producing cooking; do not block essential ventilation or carbon monoxide alarms.",
      benefit: "Indoor source reduction",
      budget: "Low cost first",
    },
    {
      id: "ventilation",
      headline: outdoorHigh ? "Be careful about outdoor smoke entering" : "Balance fresh air and indoor sources",
      description: outdoorHigh
        ? "During outdoor smoke peaks, limit unnecessary window opening if indoor air remains safe. Ventilate when local outdoor conditions improve, and never obstruct required gas-appliance ventilation."
        : "Ventilate when outdoor conditions permit and use local exhaust for cooking and other indoor pollution sources.",
      benefit: "Exposure precaution",
      budget: "Free or low cost",
    },
    {
      id: "filtration",
      headline: preferences.budget === "low" ? "Start without expensive equipment" : "Use filtration appropriately",
      description: preferences.budget === "low"
        ? "Focus on a smoke-free space, surface cleaning, and well-maintained ventilation. Do not rely on houseplants or DIY devices as proven substitutes for adequate filtration."
        : "Consider a genuine HEPA purifier sized using its clean air delivery rate (CADR) and the room area. Maintain filters per the maker's instructions.",
      benefit: "Exposure precaution",
      budget: preferences.budget === "low" ? "No purchase needed" : "Optional purchase",
    },
  ];

  if (preferences.children || preferences.olderAdults || preferences.breathingSensitive) {
    tips.push({
      id: "sensitive",
      headline: "Consider sensitive household members",
      description: "Prioritize smoke-free occupied rooms. Follow individual clinical advice for respiratory symptoms; consult healthcare professionals about mask suitability or medical equipment.",
      benefit: "Exposure precaution",
      budget: "Free planning",
    });
  }
  if (preferences.budget !== "low") {
    tips.push({
      id: "cooking-fuel",
      headline: "Explore lower-combustion cooking",
      description: "Where electricity, affordability and building safety permit, electric or induction cooking can avoid combustion pollutants from gas at the cooking point.",
      benefit: "Cleaner energy",
      budget: "Optional upgrade",
    });
  }

  return tips;
}
