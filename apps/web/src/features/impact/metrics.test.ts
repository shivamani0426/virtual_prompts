import { describe, expect, it } from "vitest";
import { impactSummary } from "./metrics";
import type { RoutineProgress } from "../routines/storage";

const now = new Date(2026, 10, 18, 12);
const progress = (statuses: RoutineProgress["statuses"]): RoutineProgress => ({
  statuses, rescheduled: {},
});

describe("Transparent, reversible self-reported impact analytics", () => {
  it("starts at zero without inventing CO₂, money or health statistics", () => {
    const summary = impactSummary(progress({}), now);
    expect(summary.completed).toBe(0);
    expect(summary.emissions).toBe(0);
    expect(summary.streak).toBe(0);
    expect(summary.badges.every((badge) => !badge.unlocked)).toBe(true);
    expect(Object.keys(summary).every((name) => !/co2|saved|healthBenefit/i.test(name))).toBe(true);
  });

  it("counts by category and awards badges using deterministic completion", () => {
    const statuses: RoutineProgress["statuses"] = {
      "2026-11-18:exposure": "done",
      "2026-11-18:emissions": "done",
      "2026-11-18:indoor": "done",
      "2026-11-17:indoor": "done",
      "2026-11-17:emissions": "done",
      "2026-11-16:indoor": "done",
      "2026-11-16:emissions": "done",
      "2026-11-16:exposure": "skipped",
    };
    const result = impactSummary(progress(statuses), now);
    expect(result.completed).toBe(7);
    expect(result.indoor).toBe(3);
    expect(result.emissions).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.streak).toBe(3);
    expect(result.activeDays).toBe(3);
    for (const id of ["first", "steady", "indoor", "travel", "streak"]) {
      expect(result.badges.find((item) => item.id === id)?.unlocked).toBe(true);
    }
    expect(result.badges.find((item) => item.id === "week")?.unlocked).toBe(false);
  });

  it("honors yesterday's completed day until a new day is logged", () => {
    const summary = impactSummary(progress({
      "2026-11-17:exposure": "done",
      "2026-11-16:indoor": "done",
    }), now);
    expect(summary.streak).toBe(2);
  });

  it("does not count future, skipped or 90-day-old events as completed impact", () => {
    const statuses: RoutineProgress["statuses"] = {
      "2026-11-18:exposure": "done",
      "2026-11-19:emissions": "done",
      "2026-01-01:indoor": "done",
      "2026-11-18:emissions": "skipped",
    };
    const summary = impactSummary(progress(statuses), now);
    expect(summary.completed).toBe(1);
    expect(summary.streak).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  it("revokes badges when the underlying local completion is undone", () => {
    const earned = impactSummary(progress({ "2026-11-18:indoor": "done" }), now);
    const undone = impactSummary(progress({}), now);
    expect(earned.badges.find((badge) => badge.id === "first")?.unlocked).toBe(true);
    expect(undone.badges.find((badge) => badge.id === "first")?.unlocked).toBe(false);
  });
});
