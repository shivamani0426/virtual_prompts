import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  HeartPulse,
  Leaf,
  RotateCcw,
  Shield,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import type { HouseholdPreferences } from "../../lib/types";
import {
  buildRoutines,
  completionCounts,
  dateKey,
  weekDates,
  weekDays,
} from "./planner";
import type { Routine, RoutineStatus } from "./planner";
import {
  readRoutineProgress,
  rescheduleRoutine,
  resetWeek,
  saveRoutineProgress,
  setRoutineStatus,
} from "./storage";
import type { RoutineProgress } from "./storage";

type Props = {
  preferences: HouseholdPreferences;
  aqi: number | null;
};

function categoryName(category: Routine["category"]): string {
  if (category === "exposure") return "Exposure precaution";
  if (category === "emissions") return "Lower-emission choice";
  return "Indoor air habit";
}

export function WeeklyPlanner({ preferences, aqi }: Props) {
  const [today] = useState(() => new Date());
  const days = weekDays(today);
  const dates = weekDates(today);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const [progress, setProgress] = useState<RoutineProgress>(readRoutineProgress);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const routines = buildRoutines(today, preferences, aqi, progress.rescheduled);
  const totals = completionCounts(routines, progress.statuses);
  const currentRoutines = routines.filter((routine) => routine.date === selectedDate);

  function persist(next: RoutineProgress) {
    setProgress(next);
    const saved = saveRoutineProgress(next);
    setSaveFailed(!saved);
    setConfirmReset(false);
  }

  function changeStatus(task: Routine, status: RoutineStatus) {
    const next = progress.statuses[task.id] === status ? "planned" : status;
    persist(setRoutineStatus(progress, task.id, next));
  }

  function moveTask(task: Routine, date: string) {
    persist(rescheduleRoutine(progress, task.id, date, dates));
    setSelectedDate(date);
  }

  function resetProgress() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    persist(resetWeek(progress, dates));
  }

  return (
    <section id="planner" className="weekly-section" aria-labelledby="weekly-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">03 / YOUR SEVEN-DAY PLAN</p>
          <h2 id="weekly-title">Small habits. A clearer week.</h2>
          <p>Three practical activities a day, matched to your household and the modelled AQI.</p>
        </div>
        <span className="plan-badge"><CalendarDays size={16} aria-hidden="true" /> Current week</span>
      </div>

      <div className="weekly-frame">
        <div className="weekly-overview">
          <div className="progress-title">
            <span className="weekly-kicker"><Leaf size={17} aria-hidden="true" /> THIS WEEK&apos;S PROGRESS</span>
            <strong><span>{totals.done}</span> / {totals.total} activities</strong>
          </div>
          <div
            className="progress-rail"
            role="progressbar"
            aria-label="Weekly routine completion"
            aria-valuenow={totals.done}
            aria-valuemin={0}
            aria-valuemax={totals.total}
          >
            <div style={{ width: totals.percent + "%" }} />
          </div>
          <div className="progress-footer">
            <span>{totals.percent}% completed · {totals.skipped} skipped</span>
            <button type="button" className="text-button" onClick={resetProgress}>
              <RotateCcw size={14} aria-hidden="true" />
              {confirmReset ? "Confirm reset this week" : "Reset week"}
            </button>
          </div>
        </div>

        <div className="week-tabs" role="group" aria-label="Choose day of the week">
          {days.map((day) => {
            const count = routines.filter(
              (routine) =>
                routine.date === day.date && progress.statuses[routine.id] === "done",
            ).length;
            return (
              <button
                key={day.date}
                type="button"
                className={"week-tab" + (selectedDate === day.date ? " selected" : "")}
                aria-pressed={selectedDate === day.date}
                onClick={() => {
                  setSelectedDate(day.date);
                  setConfirmReset(false);
                }}
              >
                <span>{day.shortLabel}</span>
                <strong>{Number(day.date.slice(-2))}</strong>
                <small>{day.isToday ? "Today" : count > 0 ? count + " done" : "·"}</small>
              </button>
            );
          })}
        </div>

        <div className="day-heading">
          <div>
            <h3>{days.find((day) => day.date === selectedDate)?.label}</h3>
            <p>
              {aqi === null
                ? "Live AQI unavailable — precautions are conservative, not a safety guarantee."
                : "Based on modelled US AQI " + Math.round(aqi) + " at your selected location."}
            </p>
          </div>
          <span>{currentRoutines.length} activities</span>
        </div>

        {currentRoutines.length === 0 ? (
          <p className="empty-day" role="status">
            No activities are assigned here. You can reschedule one from another day.
          </p>
        ) : (
          <div className="routine-list">
            {currentRoutines.map((routine) => {
              const status = progress.statuses[routine.id] ?? "planned";
              return (
                <article
                  className={"routine-item" + (status === "done" ? " routine-done" : "")}
                  key={routine.id}
                >
                  <div className={"routine-symbol symbol-" + routine.category}>
                    {routine.category === "exposure" ? (
                      <Shield size={19} aria-hidden="true" />
                    ) : routine.category === "emissions" ? (
                      <Leaf size={19} aria-hidden="true" />
                    ) : (
                      <HeartPulse size={19} aria-hidden="true" />
                    )}
                  </div>
                  <div className="routine-description">
                    <span className="routine-category">{categoryName(routine.category)}</span>
                    <h4>{routine.title}</h4>
                    <p>{routine.detail}</p>
                    <span className="routine-reason"><Clock3 size={13} aria-hidden="true" /> {routine.reason}</span>
                    <div className="routine-actions">
                      <button
                        type="button"
                        className={"routine-action" + (status === "done" ? " routine-action-done" : "")}
                        aria-pressed={status === "done"}
                        onClick={() => changeStatus(routine, "done")}
                      >
                        {status === "done" ? <CheckCircle2 size={15} /> : <Check size={15} />}
                        {status === "done" ? "Completed" : "Mark done"}
                      </button>
                      <button
                        type="button"
                        className={"routine-action minor" + (status === "skipped" ? " routine-action-skipped" : "")}
                        aria-pressed={status === "skipped"}
                        onClick={() => changeStatus(routine, "skipped")}
                      >
                        {status === "skipped" ? <Circle size={15} /> : <SkipForward size={15} />}
                        {status === "skipped" ? "Skipped" : "Skip"}
                      </button>
                      <label className="routine-reschedule">
                        Move to
                        <select
                          aria-label={"Reschedule " + routine.title}
                          value={routine.date}
                          onChange={(event) => moveTask(routine, event.target.value)}
                        >
                          {days.map((day) => (
                            <option key={day.date} value={day.date}>
                              {day.shortLabel} {day.date.slice(-2)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {saveFailed && (
          <p className="inline-warning" role="alert">
            Your browser blocked routine storage. Changes will be lost after refresh.
          </p>
        )}
        <p className="planner-privacy">
          <Shield size={15} aria-hidden="true" />
          Completion and rescheduling stay in this browser, with no account or cloud synchronization.
          Your location, AQI readings and health selections are not saved to the planner.
        </p>
      </div>
    </section>
  );
}
