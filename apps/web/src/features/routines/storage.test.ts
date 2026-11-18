import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyProgress, readRoutineProgress, resetWeek, rescheduleRoutine,
  ROUTINE_STORAGE_KEY, saveRoutineProgress, setRoutineStatus,
} from "./storage";
import { dateKey, weekDates } from "./planner";

const week = weekDates(new Date());
const id = week[0] + ":exposure";
const secondDate = week[1]!;

beforeEach(() => {
  localStorage.clear();
});

describe("Browser-only routine persistence", () => {
  it("preserves done, skipped, and moved tasks across reloads", () => {
    const marked = setRoutineStatus(emptyProgress(), id, "done");
    const moved = rescheduleRoutine(marked, id, secondDate, week);
    const skipped = setRoutineStatus(moved, week[0] + ":indoor", "skipped");
    expect(saveRoutineProgress(skipped)).toBe(true);
    expect(readRoutineProgress()).toEqual(skipped);
    expect(localStorage.getItem(ROUTINE_STORAGE_KEY)).not.toContain("AQI");
  });

  it("reverses completed status and restores the original date", () => {
    let data = setRoutineStatus(emptyProgress(), id, "done");
    data = setRoutineStatus(data, id, "planned");
    expect(data.statuses).toEqual({});
    data = rescheduleRoutine(data, id, secondDate, week);
    data = rescheduleRoutine(data, id, week[0]!, week);
    expect(data.rescheduled).toEqual({});
  });

  it("cannot move a routine beyond its week or modify an invalid key", () => {
    const current = emptyProgress();
    expect(rescheduleRoutine(current, id, "2028-01-01", week)).toBe(current);
    expect(setRoutineStatus(current, "../../private", "done")).toBe(current);
    expect(rescheduleRoutine(current, "invalid:indoor", secondDate, week)).toBe(current);
    expect(rescheduleRoutine(current, id, "2026-02-30", week)).toBe(current);
  });

  it("clears the current week without clearing older history", () => {
    const older = "2026-10-05:indoor";
    const progress = {
      statuses: { [id]: "done" as const, [older]: "skipped" as const },
      rescheduled: { [id]: secondDate, [older]: "2026-10-07" },
    };
    const next = resetWeek(progress, week);
    expect(next.statuses[id]).toBeUndefined();
    expect(next.statuses[older]).toBe("skipped");
    expect(next.rescheduled[id]).toBeUndefined();
    expect(next.rescheduled[older]).toBe("2026-10-07");
  });

  it("drops corrupted and cross-domain storage content instead of crashing", () => {
    localStorage.setItem(ROUTINE_STORAGE_KEY, "{not json");
    expect(readRoutineProgress()).toEqual(emptyProgress());
    localStorage.setItem(
      ROUTINE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        statuses: { [id]: "done", "bad-key": "done", [week[2] + ":indoor"]: "admin" },
        rescheduled: { [id]: "2026-14-01" },
      }),
    );
    const next = readRoutineProgress();
    expect(next.statuses).toEqual({ [id]: "done" });
    expect(next.rescheduled).toEqual({});
  });

  it("handles unavailable browser storage explicitly", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(saveRoutineProgress(emptyProgress())).toBe(false);
    spy.mockRestore();
  });

  it("uses valid local dates for stored task IDs", () => {
    expect(dateKey(new Date()).length).toBe(10);
    expect(week).toHaveLength(7);
  });
});
