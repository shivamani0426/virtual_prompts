import { describe, expect, it } from "vitest";
import { defaultPreferences } from "../../lib/preferences";
import { indoorGuidance } from "./advice";
import { lowEmissionOptions } from "../low-emission/options";

describe("Air advice safety and budget constraints", () => {
  it("does not present outdoor AQI as an indoor air measurement", () => {
    const tips = indoorGuidance(defaultPreferences, 180);
    expect(tips.find((item) => item.id === "ventilation")?.description).toMatch(/ventilation/i);
    expect(tips.every((item) => !/% reduction|guaranteed/i.test(item.description))).toBe(true);
  });

  it("adapts to shared housing and low-budget habits", () => {
    const tips = indoorGuidance({ ...defaultPreferences, home: "shared" }, 200);
    expect(tips.find((item) => item.id === "sources")?.description).toContain("housemates");
    expect(tips.find((item) => item.id === "filtration")?.budget).toBe("No purchase needed");
  });

  it("mentions filtration and sensitive groups only when relevant", () => {
    const tips = indoorGuidance({
      ...defaultPreferences,
      budget: "medium",
      olderAdults: true,
    }, null);
    expect(tips.find((item) => item.id === "filtration")?.description).toContain("HEPA");
    expect(tips.some((item) => item.id === "sensitive")).toBe(true);
    expect(tips.some((item) => item.id === "cooking-fuel")).toBe(true);
  });

  it("distinguishes emissions benefits from exposure precautions", () => {
    const options = lowEmissionOptions({ ...defaultPreferences, commute: "walk" }, 180);
    expect(options.find((option) => option.id === "exposure")?.benefit).toBe(
      "Personal exposure precaution",
    );
    expect(options.find((option) => option.id === "combine")?.benefit).toBe(
      "Potential emissions reduction",
    );
    expect(options.every((option) => !/%|kg CO₂/i.test(option.explanation))).toBe(true);
  });
});
