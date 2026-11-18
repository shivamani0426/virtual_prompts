import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImpactDashboard } from "./ImpactDashboard";
import { WeeklyPlanner } from "../routines/WeeklyPlanner";
import { defaultPreferences } from "../../lib/preferences";
import { ROUTINE_STORAGE_KEY } from "../routines/storage";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Impact and planner stay in sync", () => {
  it("shows completion and grants/revokes badges after a real UI action", () => {
    render(
      <>
        <WeeklyPlanner preferences={defaultPreferences} aqi={80}/>
        <ImpactDashboard/>
      </>,
    );
    expect(screen.getByText("0 of 6 unlocked")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Mark done" })[0]!);
    expect(screen.getByText("1 of 6 unlocked")).toBeInTheDocument();
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(screen.getByText("0 of 6 unlocked")).toBeInTheDocument();
    expect(localStorage.getItem(ROUTINE_STORAGE_KEY)).not.toContain("US AQI");
  });

  it("does not show fake carbon reduction numbers", () => {
    render(<ImpactDashboard/>);
    expect(screen.getByText(/Actions are not carbon estimates/i)).toBeInTheDocument();
    expect(screen.queryByText(/kg CO2 saved/i)).not.toBeInTheDocument();
  });
});
