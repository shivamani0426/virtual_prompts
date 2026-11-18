import type { HouseholdPreferences } from "../../lib/types";

export type RoutineCategory = "exposure" | "emissions" | "indoor";
export type RoutineStatus = "planned" | "done" | "skipped";

export type Routine = {
  id: string;
  originalDate: string;
  date: string;
  category: RoutineCategory;
  title: string;
  detail: string;
  reason: string;
};

export type WeekDay = { date: string; label: string; shortLabel: string; isToday: boolean };

export function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function mondayOfWeek(day: Date): Date {
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function weekDates(day: Date): string[] {
  const monday = mondayOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return dateKey(date);
  });
}

export function weekDays(day: Date): WeekDay[] {
  const dates = weekDates(day);
  return dates.map((date, i) => {
    const dayDate = new Date(mondayOfWeek(day));
    dayDate.setDate(dayDate.getDate() + i);
    return {
      date,
      label: dayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }),
      shortLabel: dayDate.toLocaleDateString("en-IN", { weekday: "short" }),
      isToday: date === dateKey(day),
    };
  });
}

function airActivity(aqi: number | null, prefs: HouseholdPreferences): {
  title: string;
  detail: string;
  reason: string;
} {
  if (aqi === null) {
    return {
      title: "Check official air alerts first",
      detail: "Live AQI is unavailable. Check an official local advisory before deciding about outdoor exercise or play.",
      reason: "Without an AQI reading, we do not guess whether outdoor air is suitable.",
    };
  }
  if (aqi > 200) {
    return {
      title: "Move strenuous activities indoors",
      detail: "Avoid strenuous outdoor exercise. If you must go out, reduce time outside and follow local official advisories.",
      reason: "The current modelled US AQI is very unhealthy or worse. No outdoor hour is confirmed safe.",
    };
  }
  if (aqi > 100) {
    return {
      title: "Shorten outdoor exertion",
      detail: prefs.children || prefs.olderAdults || prefs.breathingSensitive
        ? "Plan essential outings carefully. Reduce intense outdoor play and exercise for sensitive household members."
        : "Consider moving vigorous exercise indoors and check local alerts before necessary trips.",
      reason: "The current modelled US AQI indicates elevated risk. Forecasts do not guarantee a safe hour.",
    };
  }
  return {
    title: "Plan essential trips around changing air",
    detail: "Check current and forecast conditions before going out. Even lower modelled AQI is not a guarantee of safe air.",
    reason: "Pollution varies with time and location; local official alerts remain important.",
  };
}

const transportThemes = [
  "Combine necessary errands",
  "Avoid engine idling",
  "Try a shared journey",
  "Plan one remote errand",
  "Check a lower-traffic route",
  "Review your travel options",
  "Choose a practical low-emission trip",
];

const homeThemes = [
  "Keep indoor smoke sources low",
  "Check cooking ventilation",
  "Keep living areas smoke-free",
  "Review your air-filter care",
  "Consider smoke from outdoors",
  "Clean without raising dust",
  "Plan a cleaner-air habit",
];

export function buildRoutines(
  today: Date,
  prefs: HouseholdPreferences,
  aqi: number | null,
  rescheduled: Readonly<Record<string, string>> = {},
): Routine[] {
  const days = weekDates(today);
  const air = airActivity(aqi, prefs);
  const commute = prefs.commute;
  const highPollution = aqi === null || aqi > 100;

  return days.flatMap((originalDate, i): Routine[] => {
    const travelText =
      commute === "car" || commute === "two-wheeler"
        ? "Combine nearby errands, avoid engine idling and consider a shared ride when practical."
        : commute === "walk"
          ? highPollution
            ? "Do not add strenuous outdoor travel when air is poor or unknown. Consider lower-exposure alternatives for essential trips."
            : "Where feasible, choose a lower-traffic walking or cycling route and check conditions first."
          : commute === "home"
            ? "Look for one errand or meeting you can do remotely to avoid a travel trip."
            : "Consider public or shared transport for essential trips rather than driving solo, where appropriate.";
    const indoorText = prefs.budget === "low"
      ? "Avoid burning incense, candles or waste inside. Keep occupied rooms smoke-free."
      : "If you have a correctly sized HEPA purifier, check filter maintenance and avoid creating indoor smoke.";
    const homeText = prefs.home === "shared"
      ? " Coordinate a smoke-free shared space."
      : prefs.home === "apartment"
        ? " Maintain kitchen extraction when cooking."
        : " Keep combustion exhaust away from doors and windows.";
    const make = (
      kind: RoutineCategory,
      title: string,
      detail: string,
      reason: string,
    ): Routine => {
      const id = originalDate + ":" + kind;
      const candidateDate = rescheduled[id];
      return {
        id,
        originalDate,
        date: candidateDate && days.includes(candidateDate) ? candidateDate : originalDate,
        category: kind,
        title,
        detail,
        reason,
      };
    };
    return [
      make("exposure", air.title, air.detail, air.reason),
      make(
        "emissions",
        transportThemes[i] ?? "Choose a practical low-emission trip",
        travelText,
        "Changing travel habits may reduce emissions, but savings depend on the actual trip and vehicle.",
      ),
      make(
        "indoor",
        homeThemes[i] ?? "Plan a cleaner-air habit",
        indoorText + homeText,
        "Outdoor measurements do not measure your home's indoor-air concentration.",
      ),
    ];
  });
}

export function completionCounts(
  routines: Routine[],
  states: Readonly<Record<string, RoutineStatus>>,
): { done: number; skipped: number; total: number; percent: number } {
  const done = routines.filter((routine) => states[routine.id] === "done").length;
  const skipped = routines.filter((routine) => states[routine.id] === "skipped").length;
  return {
    done,
    skipped,
    total: routines.length,
    percent: routines.length ? Math.round((done / routines.length) * 100) : 0,
  };
}
