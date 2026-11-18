import { Activity, Award, CalendarCheck, Leaf, ShieldCheck, TrendingUp, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { impactSummary } from "./metrics";
import { readRoutineProgress, ROUTINE_STORAGE_KEY } from "../routines/storage";
import type { RoutineProgress } from "../routines/storage";

export function ImpactDashboard() {
  const [progress, setProgress] = useState<RoutineProgress>(readRoutineProgress);
  useEffect(() => {
    const refresh = () => setProgress(readRoutineProgress());
    const storage = (event: StorageEvent) => {
      if (event.key === ROUTINE_STORAGE_KEY) refresh();
    };
    window.addEventListener("winter-smog:routines-updated", refresh);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("winter-smog:routines-updated", refresh);
      window.removeEventListener("storage", storage);
    };
  }, []);
  const data = impactSummary(progress);
  const earned = data.badges.filter((badge) => badge.unlocked).length;
  return (
    <section id="impact" className="impact-section" aria-labelledby="impact-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">06 / YOUR REPORTED PROGRESS</p>
          <h2 id="impact-title">Small actions, visible progress.</h2>
          <p>Track the activities you mark complete. Badges celebrate consistency, not measured pollution reduction.</p>
        </div>
        <span className="plan-badge"><Activity size={16} aria-hidden="true"/> Browser-local log</span>
      </div>
      <div className="impact-summary-grid">
        <article className="impact-stat"><CalendarCheck size={21} aria-hidden="true"/>
          <strong>{data.completed}</strong><span>Activities completed</span>
        </article>
        <article className="impact-stat"><TrendingUp size={21} aria-hidden="true"/>
          <strong>{data.streak}</strong><span>Current activity-day streak</span>
        </article>
        <article className="impact-stat"><Leaf size={21} aria-hidden="true"/>
          <strong>{data.emissions}</strong><span>Travel/emissions habits logged</span>
        </article>
        <article className="impact-stat"><Wind size={21} aria-hidden="true"/>
          <strong>{data.indoor}</strong><span>Indoor-air habits logged</span>
        </article>
      </div>

      <div className="impact-panels">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div><p className="card-kicker">THE LAST SEVEN DAYS</p>
              <h3>Your completed activities</h3></div>
            <span>Self-reported</span>
          </div>
          <div className="impact-chart" role="img" aria-label={"Completed routines over the last week: " + data.recent.map((day) => day.label + " " + day.completed).join(", ")}>
            {data.recent.map((day) => (
              <div className="impact-day" key={day.date}>
                <strong>{day.completed}</strong>
                <div className="impact-day-track"><div style={{height: (day.completed / 3 * 100) + "%"}}/></div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
          <p className="small-muted">Counts are taken from tasks marked complete in this browser. Skipped: {data.skipped}.</p>
        </article>
        <article className="impact-panel impact-check">
          <div><p className="card-kicker">A MORE USEFUL MEASURE</p>
            <h3>Actions are not carbon estimates.</h3>
            <p>We show what you&apos;ve chosen to record, not unverified kilograms of CO₂ saved, pollution reductions, or prevented illness.</p>
          </div>
          <div className="impact-check-list">
            <span><ShieldCheck size={17} aria-hidden="true"/> Transparent, task-based counts</span>
            <span><ShieldCheck size={17} aria-hidden="true"/> No invented climate or health percentages</span>
            <span><ShieldCheck size={17} aria-hidden="true"/> You can undo completions at any time</span>
          </div>
        </article>
      </div>

      <div className="impact-badges-heading">
        <div><p className="card-kicker">YOUR MILESTONES</p>
          <h3>Habit badges</h3></div>
        <span>{earned} of {data.badges.length} unlocked</span>
      </div>
      <div className="impact-badge-grid">
        {data.badges.map((badge) => (
          <article key={badge.id} className={"impact-badge" + (badge.unlocked ? " unlocked" : "")}>
            <div className="impact-badge-icon"><Award size={24} aria-hidden="true"/></div>
            <div><h4>{badge.name}</h4><p>{badge.description}</p>
              <span>{badge.unlocked ? "Unlocked" : badge.progress + " / " + badge.target + " activities/days"}</span></div>
          </article>
        ))}
      </div>
      <p className="planner-privacy"><ShieldCheck size={15} aria-hidden="true"/>
        Badges are based on activities you report completing, not independently verified behaviour.
        Data stays in this browser (up to about 90 days) and is not synchronized to an account.
      </p>
    </section>
  );
}
