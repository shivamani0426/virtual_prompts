import type { RoutineStatus } from "./planner";

export type RoutineProgress = {
  statuses: Record<string, RoutineStatus>;
  rescheduled: Record<string, string>;
};

export const ROUTINE_STORAGE_KEY = "winter-smog:routines-v1";

export function emptyProgress(): RoutineProgress {
  return { statuses: {}, rescheduled: {} };
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00");
  return !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10));
}

function validId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}:(exposure|emissions|indoor)$/.test(value) &&
    validDate(value.split(":")[0]);
}

/** Store only completion and rescheduling. Never persist AQI, city, health flags, or identity. */
export function readRoutineProgress(): RoutineProgress {
  try {
    const raw = localStorage.getItem(ROUTINE_STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyProgress();
    const doc = parsed as Record<string, unknown>;
    if (doc.version !== 1 || !doc.statuses || !doc.rescheduled) return emptyProgress();
    if (typeof doc.statuses !== "object" || typeof doc.rescheduled !== "object") return emptyProgress();
    const statuses: Record<string, RoutineStatus> = {};
    const rescheduled: Record<string, string> = {};
    for (const [id, value] of Object.entries(doc.statuses).slice(0, 200)) {
      if (validId(id) && (value === "done" || value === "skipped")) statuses[id] = value;
    }
    for (const [id, value] of Object.entries(doc.rescheduled).slice(0, 200)) {
      if (validId(id) && validDate(value)) rescheduled[id] = value;
    }
    return { statuses, rescheduled };
  } catch {
    return emptyProgress();
  }
}

export function saveRoutineProgress(progress: RoutineProgress): boolean {
  try {
    // Keep a bounded history; old entries may be removed after ~90 days.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const minDate = [
      cutoff.getFullYear(),
      String(cutoff.getMonth() + 1).padStart(2, "0"),
      String(cutoff.getDate()).padStart(2, "0"),
    ].join("-");
    const statuses = Object.fromEntries(
      Object.entries(progress.statuses).filter(([id]) => id.slice(0, 10) >= minDate).slice(-200),
    );
    const rescheduled = Object.fromEntries(
      Object.entries(progress.rescheduled).filter(([id]) => id.slice(0, 10) >= minDate).slice(-200),
    );
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify({ version: 1, statuses, rescheduled }));
    window.dispatchEvent(new Event("winter-smog:routines-updated"));
    return true;
  } catch {
    return false;
  }
}

export function setRoutineStatus(
  current: RoutineProgress,
  id: string,
  next: RoutineStatus,
): RoutineProgress {
  if (!validId(id)) return current;
  const statuses = { ...current.statuses };
  if (next === "planned") delete statuses[id];
  else statuses[id] = next;
  return { ...current, statuses };
}

export function rescheduleRoutine(
  current: RoutineProgress,
  id: string,
  date: string,
  week: string[],
): RoutineProgress {
  if (!validId(id) || !validDate(date) || !week.includes(date) ||
    !week.includes(id.slice(0, 10))) return current;
  const rescheduled = { ...current.rescheduled };
  if (id.startsWith(date + ":")) delete rescheduled[id];
  else rescheduled[id] = date;
  return { ...current, rescheduled };
}

export function resetWeek(current: RoutineProgress, week: string[]): RoutineProgress {
  const statuses = { ...current.statuses };
  const rescheduled = { ...current.rescheduled };
  for (const date of week) {
    for (const category of ["exposure", "emissions", "indoor"]) {
      delete statuses[date + ":" + category];
      delete rescheduled[date + ":" + category];
    }
  }
  return { statuses, rescheduled };
}
