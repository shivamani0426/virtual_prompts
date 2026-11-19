import { ArrowUpRight, Check, CheckCircle2, Clock3, Leaf, ShieldCheck, Wind } from "lucide-react";
import { useState } from "react";
import type { AirSnapshot, HouseholdPreferences, WeatherSnapshot } from "../../lib/types";
import { buildBriefing, findLowerWindow, formatLocalHour } from "../daily-briefing/briefing";
import { buildRoutines, dateKey } from "../routines/planner";
import { impactSummary } from "../impact/metrics";
import { readRoutineProgress, saveRoutineProgress, setRoutineStatus } from "../routines/storage";
import type { RoutineProgress } from "../routines/storage";

type AirProps={air:AirSnapshot;weather:WeatherSnapshot|null;weatherError:string};
function displayReading(value:number|null|undefined, unit:string){
  return value==null || !Number.isFinite(value) ? "Unavailable" : value.toFixed(1)+" "+unit;
}

/** Essential environmental context only: one AQI, concise weather/pollutants, source and caveats. */
export function CompactAirOverview({air,weather,weatherError}:AirProps){
  const lower=findLowerWindow(air);
  return <section className="focus-air" id="air" aria-labelledby="focus-air-heading">
    <div className="focus-heading"><div>
      <p className="eyebrow">01 / THE AIR AROUND YOU</p>
      <h2 id="focus-air-heading">Your air today</h2>
    </div><a href={air.source_url} target="_blank" rel="noopener noreferrer" className="focus-source">
      Data source <ArrowUpRight size={14} aria-hidden="true"/></a></div>
    {air.freshness==="stale"&&<p className="inline-warning" role="status">
      This is an older modelled reading. Check current official local advisories.
    </p>}
    <div className="focus-air-card">
      <div className="focus-air-primary">
        <div className="focus-aqi" role="img" aria-label={"US AQI "+Math.round(air.current.us_aqi)}>
          <strong>{Math.round(air.current.us_aqi)}</strong><span>US AQI</span>
        </div>
        <div className="focus-aqi-copy">
          <span className="focus-meta">Modelled estimate · {air.freshness==="stale"?"Older data":"Current available data"}</span>
          <h3>{air.category.level}</h3>
          <p>{air.category.advice}</p>
        </div>
      </div>
      <div className="focus-air-details">
        <div><span>PM2.5</span><strong>{displayReading(air.current.pm25_ug_m3,"µg/m³")}</strong></div>
        <div><span>PM10</span><strong>{displayReading(air.current.pm10_ug_m3,"µg/m³")}</strong></div>
        <div><span>Temperature</span>
          <strong>{weather?displayReading(weather.temperature_c,"°C"):"Unavailable"}</strong></div>
      </div>
    </div>
    {weather===null && <p className="focus-weather-note">{weatherError?
      "Live readings are unavailable right now.": "Weather is loading or unavailable."}</p>}
    <div className="focus-air-foot">
      <span>{lower?"Lower forecast: "+formatLocalHour(lower.time)+" — not necessarily safe":
        "No reliable lower-pollution period available"}</span>
      <strong>Modelled US AQI, not official CPCB AQI.</strong>
    </div>
  </section>;
}

export function CompactTodayPlan({preferences,aqi,air}:{
  preferences:HouseholdPreferences;aqi:number|null;air:AirSnapshot|null;
}){
  const [now]=useState(()=>new Date());
  const [progress,setProgress]=useState<RoutineProgress>(readRoutineProgress);
  const [saveFailed,setSaveFailed]=useState(false);
  const todays=buildRoutines(now,preferences,aqi,progress.rescheduled)
    .filter(item=>item.date===dateKey(now)).slice(0,3);
  const done=todays.filter(item=>progress.statuses[item.id]==="done").length;
  const impact=impactSummary(progress,now);
  const tips=air?buildBriefing(air,preferences):[];
  function toggle(id:string) {
    const next=setRoutineStatus(progress,id,progress.statuses[id]==="done"?"planned":"done");
    setProgress(next);
    setSaveFailed(!saveRoutineProgress(next));
  }
  return <section className="focus-plan" id="planner" aria-labelledby="focus-plan-heading">
    <div className="focus-heading">
      <div><p className="eyebrow">03 / YOUR PRACTICAL PLAN</p>
        <h2 id="focus-plan-heading">Three small actions for today</h2>
      </div>
      <span className="focus-progress">{done} / {todays.length} done</span>
    </div>
    <p className="focus-plan-subtitle">
      {aqi===null?"Live AQI unavailable — precautions are conservative, not a safety guarantee.":
        "Based on modelled US AQI "+Math.round(aqi)+". General guidance, not medical advice."}
    </p>
    {tips.length>1&&<p className="focus-household-tip"><ShieldCheck size={16} aria-hidden="true"/>
      <span>{tips.filter(item=>["For children","For older adults","For sensitive breathing"].includes(item.label))
        .map(item=>item.message).join(" ")}</span>
    </p>}
    <div className="focus-task-list">
      {todays.map(item=><article className="focus-task" key={item.id}>
        <div className="focus-task-icon">{item.category==="exposure"?<ShieldCheck size={18}/>:
          item.category==="indoor"?<Wind size={18}/>:<Leaf size={18}/>}</div>
        <div className="focus-task-description">
          <span>{item.category==="exposure"?"Outdoor precaution":item.category==="indoor"?"Inside your home":"Lower-emission choice"}</span>
          <h3>{item.title}</h3><p>{item.detail}</p>
        </div>
        <button className={"focus-task-action"+(progress.statuses[item.id]==="done"?" done":"")}
          type="button" aria-pressed={progress.statuses[item.id]==="done"}
          onClick={()=>toggle(item.id)}>
          {progress.statuses[item.id]==="done"?<><CheckCircle2 size={16}/> Done</>:
            <><Check size={16}/> Mark done</>}
        </button>
      </article>)}
    </div>
    <div className="focus-impact-line">
      <Clock3 size={16} aria-hidden="true"/>
      <span>{impact.completed} self-reported activities in the last 90 days · {impact.streak}-day streak.
        Counts are not measured pollution or CO₂ reduction.</span>
    </div>
    {saveFailed&&<p className="inline-warning" role="alert">
      Your browser blocked routine storage. Changes may not survive refresh.</p>}
  </section>;
}
