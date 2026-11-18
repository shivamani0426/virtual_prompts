import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { defaultPreferences } from "../../lib/preferences";
import { dateKey, weekDates } from "./planner";
import { WeeklyPlanner } from "./WeeklyPlanner";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Interactive weekly routine planner", () => {
  it("completes a routine, persists after component remount, and allows undo", () => {
    const view = render(<WeeklyPlanner preferences={defaultPreferences} aqi={135} />);
    expect(screen.getByRole("progressbar", { name: /Weekly routine completion/i })).toHaveAttribute(
      "aria-valuenow", "0",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Mark done" })[0]!);
    expect(screen.getByRole("progressbar", { name: /Weekly routine completion/i })).toHaveAttribute(
      "aria-valuenow", "1",
    );
    view.unmount();
    render(<WeeklyPlanner preferences={defaultPreferences} aqi={135} />);
    expect(screen.getByRole("progressbar", { name: /Weekly routine completion/i })).toHaveAttribute(
      "aria-valuenow", "1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByRole("progressbar", { name: /Weekly routine completion/i })).toHaveAttribute(
      "aria-valuenow", "0",
    );
  });

  it("supports rescheduling within the week while preserving task identity", () => {
    render(<WeeklyPlanner preferences={defaultPreferences} aqi={80} />);
    const week = weekDates(new Date());
    const current = dateKey(new Date());
    const otherDate = week.find((date) => date !== current)!;
    const selectedDay = screen.getByRole("button", { name: new RegExp("Today") });
    expect(selectedDay).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getAllByRole("combobox", { name: /Reschedule /i })[0]!, {
      target: { value: otherDate },
    });
    const chosen = screen.getAllByRole("button", { pressed: true });
    expect(chosen.some((button) => button.className.includes("week-tab"))).toBe(true);
    expect(localStorage.getItem("winter-smog:routines-v1")).toContain(otherDate);
  });

  it("requires an explicit second action to reset completed routines", () => {
    render(<WeeklyPlanner preferences={defaultPreferences} aqi={120} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Mark done" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Reset week/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    fireEvent.click(screen.getByRole("button", { name: /Confirm reset/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("does not fabricate AQI when there is no environmental data", () => {
    render(<WeeklyPlanner preferences={defaultPreferences} aqi={null} />);
    expect(screen.getByText(/Live AQI unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/official air alerts/i).length).toBeGreaterThan(0);
  });
});
