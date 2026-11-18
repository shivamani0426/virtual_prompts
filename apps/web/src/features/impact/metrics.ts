import { dateKey } from "../routines/planner";
import type { RoutineProgress } from "../routines/storage";

export type ImpactDay = { date: string; label: string; completed: number };
export type ImpactBadge = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};
export type ImpactSummary = {
  completed: number;
  skipped: number;
  exposure: number;
  emissions: number;
  indoor: number;
  activeDays: number;
  streak: number;
  recent: ImpactDay[];
  badges: ImpactBadge[];
};

const STATUS_ID = /^\d{4}-\d{2}-\d{2}:(exposure|indoor|emissions)$/;

function localDateDaysAgo(today: Date, offset: number): Date {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  day.setDate(day.getDate() - offset);
  return day;
}

export function impactSummary(progress: RoutineProgress, now = new Date()): ImpactSummary {
  const today = dateKey(now);
  const earliest = dateKey(localDateDaysAgo(now, 89));
  const completedIds = Object.entries(progress.statuses)
    .filter(([id, status]) => status === "done" && STATUS_ID.test(id))
    .map(([id]) => id)
    .filter((id) => id.slice(0, 10) >= earliest && id.slice(0, 10) <= today);
  const skipped = Object.entries(progress.statuses).filter(
    ([id, status]) =>
      status === "skipped" && STATUS_ID.test(id) &&
      id.slice(0, 10) >= earliest && id.slice(0, 10) <= today,
  ).length;
  const activityDays = new Set(completedIds.map((id) => id.slice(0, 10)));
  const recent = Array.from({ length: 7 }, (_, index) => {
    const day = localDateDaysAgo(now, 6 - index);
    const date = dateKey(day);
    return {
      date,
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
      completed: completedIds.filter((id) => id.startsWith(date + ":")).length,
    };
  });
  // A streak stays active until the end of the next day. Do not include future tasks.
  let offset = activityDays.has(today) ? 0 : 1;
  let streak = 0;
  while (activityDays.has(dateKey(localDateDaysAgo(now, offset)))) {
    streak++;
    offset++;
    if (streak >= 90) break;
  }
  const exposure = completedIds.filter((id) => id.endsWith(":exposure")).length;
  const emissions = completedIds.filter((id) => id.endsWith(":emissions")).length;
  const indoor = completedIds.filter((id) => id.endsWith(":indoor")).length;
  const completed = completedIds.length;
  const badge = (id: string, name: string, description: string, count: number, target: number) => ({
    id, name, description, unlocked: count >= target,
    progress: Math.min(count, target), target,
  });
  return {
    completed,
    skipped,
    exposure,
    emissions,
    indoor,
    activeDays: activityDays.size,
    streak,
    recent,
    badges: [
      badge("first", "First Step", "Log one completed routine activity.", completed, 1),
      badge("steady", "Five Small Steps", "Log five routine completions.", completed, 5),
      badge("indoor", "Indoor Air Care", "Complete three indoor-air activities.", indoor, 3),
      badge("travel", "Thoughtful Travel", "Complete three lower-emission activity prompts.", emissions, 3),
      badge("streak", "Three-Day Rhythm", "Have completed activities on three consecutive days.", streak, 3),
      badge("week", "Seven-Day Rhythm", "Have completed activities on seven consecutive days.", streak, 7),
    ],
  };
}
