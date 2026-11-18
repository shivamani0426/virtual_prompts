import { describe, expect, it } from "vitest";
import { buildRoutines, completionCounts, dateKey, mondayOfWeek, weekDates } from "./planner";
import { defaultPreferences } from "../../lib/preferences";

const today = new Date(2026, 10, 18, 12, 0);

describe("Seven-day planner: stable, reproducible and safety-first", () => {
  it("builds Monday-to-Sunday local dates even across year boundaries", () => {
    expect(dateKey(mondayOfWeek(today))).toBe("2026-11-16");
    expect(weekDates(today)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19",
      "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    expect(weekDates(new Date(2027, 0, 1, 12))[0]).toBe("2026-12-28");
  });

  it("creates three specific routines per day, exactly 21 for the week", () => {
    const tasks = buildRoutines(today, defaultPreferences, 80);
    expect(tasks).toHaveLength(21);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(21);
    expect(tasks.filter((task) => task.category === "exposure")).toHaveLength(7);
    expect(tasks.filter((task) => task.category === "indoor")).toHaveLength(7);
    expect(tasks.filter((task) => task.category === "emissions")).toHaveLength(7);
    expect(tasks[0]?.date).toBe("2026-11-16");
    expect(tasks[20]?.date).toBe("2026-11-22");
  });

  it("keeps task IDs stable when AQI or household settings change", () => {
    const low = buildRoutines(today, defaultPreferences, 45);
    const high = buildRoutines(today, { ...defaultPreferences, children: true }, 320);
    expect(high.map((task) => task.id)).toEqual(low.map((task) => task.id));
    expect(high[0]?.title).toMatch(/indoors/i);
    expect(high[0]?.detail).toMatch(/avoid strenuous/i);
    expect(low[0]?.title).not.toMatch(/indoors/i);
  });

  it("never treats missing AQI as a safe reading", () => {
    const tasks = buildRoutines(today, defaultPreferences, null);
    const air = tasks.find((task) => task.category === "exposure");
    expect(air?.title).toContain("official air alerts");
    expect(air?.detail).toContain("unavailable");
    expect(air?.reason).toContain("do not guess");
  });

  it("adapts guidance to budget, commute and home type", () => {
    const sensitive = buildRoutines(today, {
      ...defaultPreferences,
      breathingSensitive: true,
      home: "shared",
      commute: "walk",
      budget: "low",
    }, 140);
    expect(sensitive[0]?.detail).toMatch(/sensitive household/i);
    expect(sensitive[1]?.detail).toMatch(/strenuous outdoor travel/i);
    expect(sensitive[2]?.detail).toMatch(/smoke-free shared space/i);
    expect(sensitive[2]?.detail).toMatch(/Avoid burning/i);
  });

  it("reschedules only the requested stable task and counts completion", () => {
    const moved = { "2026-11-16:indoor": "2026-11-19" };
    const tasks = buildRoutines(today, defaultPreferences, 90, moved);
    expect(tasks.find((task) => task.id === "2026-11-16:indoor")?.date).toBe("2026-11-19");
    expect(tasks.find((task) => task.id === "2026-11-16:emissions")?.date).toBe("2026-11-16");
    const result = completionCounts(tasks, {
      "2026-11-16:exposure": "done",
      "2026-11-16:emissions": "skipped",
    });
    expect(result).toEqual({ done: 1, skipped: 1, total: 21, percent: 5 });
  });

  it("ignores rescheduling outside the seven-day week", () => {
    const tasks = buildRoutines(today, defaultPreferences, 50, {
      "2026-11-16:indoor": "2027-01-01",
    });
    expect(tasks.find((task) => task.id === "2026-11-16:indoor")?.date).toBe("2026-11-16");
  });
});
