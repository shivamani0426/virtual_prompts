import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Bell, HeartHandshake, RefreshCcw, ShieldCheck } from "lucide-react";
import { communityRequest } from "./client";
import { t } from "../language/locale";
import type { Locale } from "../language/locale";
import type { AlertStatus, Challenge, Report } from "./client";

const CITIES=["Bengaluru","Delhi","Mumbai","Hyderabad","Chennai","Pune","Kolkata","Chikkaballapur"];
const TYPES:Record<string,string>={garbage_burning:"Garbage burning",construction_dust:"Construction dust",traffic_smoke:"Traffic smoke",other:"Other air concern"};
type AlertPref={city:string;threshold:number;enabled:boolean};
const initial:AlertPref={city:"Bengaluru",threshold:150,enabled:false};
const errorText=(e:unknown)=>e instanceof Error?e.message:"Community unavailable.";
export function CommunityHub({selectedCity,locale="en"}:{selectedCity:string;locale?:Locale}){
  const [city,setCity]=useState(CITIES.includes(selectedCity)?selectedCity:"Bengaluru");
  const [type,setType]=useState("garbage_burning");
  const [description,setDescription]=useState("");
  const [reports,setReports]=useState<Report[]>([]);
  const [mine,setMine]=useState<Report[]>([]);
  const [challenges,setChallenges]=useState<Challenge[]>([]);
  const [progress,setProgress]=useState<Record<string,number>>({});
  const [prefs,setPrefs]=useState<AlertPref>(initial);
  const [alert,setAlert]=useState<AlertStatus|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{if(CITIES.includes(selectedCity))setCity(selectedCity);},[selectedCity]);
  async function refresh(c=city){
    try{
      const [publicReports,personal,list,joined,alertPreferences]=await Promise.all([
        communityRequest<{reports:Report[]}>("/reports?city="+encodeURIComponent(c)),
        communityRequest<{reports:Report[]}>("/my/reports"),
        communityRequest<{challenges:Challenge[]}>("/challenges"),
        communityRequest<{progress:{challenge_id:string;completed_days:number}[]}>("/my/challenges"),
        communityRequest<{preferences:AlertPref}>("/alerts/preferences")]);
      setReports(publicReports.reports);setMine(personal.reports);setChallenges(list.challenges);
      setProgress(Object.fromEntries(joined.progress.map(item=>[item.challenge_id,item.completed_days])));
      setPrefs({...initial,...alertPreferences.preferences,enabled:Boolean(alertPreferences.preferences.enabled)});
      setError("");
    }catch(e){setError(errorText(e));}
  }
  useEffect(()=>{void refresh(city);},[city]);
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setNotice("");setError("");
    try{
      await communityRequest("/reports","POST",{city,category:type,description});
      setNotice("Report received; awaiting human moderation. It will not appear publicly until approved.");
      setDescription("");await refresh();
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function deleteReport(id:string){
    setBusy(true);
    try{await communityRequest("/my/reports/"+id,"DELETE");await refresh();setNotice("Your report was removed.");}
    catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function challengeAction(id:string,joined:boolean){
    setBusy(true);setNotice("");
    try{
      const action=joined?"checkin":"join";
      await communityRequest("/challenges/"+id+"/"+action,"POST");
      await refresh();
      setNotice(joined?"Today's check-in recorded once.":"Joined challenge. Log a day only when you complete the habit.");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function saveAlerts(){
    setBusy(true);
    try{
      if(prefs.enabled&&typeof Notification!=="undefined"&&Notification.permission==="default")await Notification.requestPermission();
      await communityRequest("/alerts/preferences","POST",prefs);
      setNotice("Alert choices saved. Open the app to check conditions; background push is not yet supported.");
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function checkAlerts(){
    setBusy(true);
    try{
      const result=await communityRequest<AlertStatus>("/alerts/check");
      setAlert(result);
      if(result.triggered&&typeof Notification!=="undefined"&&Notification.permission==="granted"){
        new Notification("Winter Smog: modelled AQI advisory",{body:(result.city||"Your city")+" reached its modelled US AQI threshold. Check official alerts."});
      }
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  return <section id="community" className="community-section" aria-labelledby="community-heading">
    <div className="section-head"><div><p className="eyebrow">08 / LOCAL AIR COMMUNITY</p>
      <h2 id="community-heading">Cleaner air, together. · {t(locale,"community")}</h2>
      <p>Human-reviewed reports, self-reported challenges, and advisory air alerts.</p></div>
      <span className="plan-badge"><HeartHandshake size={16}/> Community</span></div>
    <p className="community-caution"><ShieldCheck size={19}/> Community reports are observations, not verified measurements or official complaints. Never enter names, addresses, photos or contact information.</p>
    <label className="community-label" htmlFor="community-city">Community city</label>
    <select id="community-city" value={city} onChange={e=>setCity(e.target.value)}>
      {CITIES.map(c=><option value={c} key={c}>{c}</option>)}</select>
    <button type="button" className="community-secondary" onClick={()=>void refresh()} disabled={busy}><RefreshCcw size={14}/> Refresh community</button>
    {error&&<p role="alert" className="inline-warning">{error}</p>}
    {notice&&<p role="status" className="community-notice">{notice}</p>}
    <div className="community-grid">
      <article className="surface-card community-pane"><h3>Report an air concern</h3>
        <p className="small-muted">All reports await human moderator approval.</p>
        <form className="community-form" onSubmit={e=>void submit(e)}>
          <label htmlFor="community-type">Category</label>
          <select id="community-type" value={type} onChange={e=>setType(e.target.value)}>
            {Object.entries(TYPES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select>
          <label htmlFor="community-description">Observation (25–500 characters; no personal details)</label>
          <textarea id="community-description" value={description} maxLength={500} minLength={25}
            onChange={e=>setDescription(e.target.value)} rows={4} required/>
          <button type="submit" disabled={busy||description.trim().length<25}>Submit for review</button>
        </form>
        <h4>Your submissions</h4>
        {mine.length?<ul className="community-list">{mine.filter(r=>r.status!=="deleted").map(r=>
          <li key={r.id}><strong>{TYPES[r.category]||r.category}</strong><small>{r.city} · {r.status}</small>
            <p>{r.description}</p><button disabled={busy} onClick={()=>void deleteReport(r.id)}>Remove my report</button></li>)}</ul>:
          <p className="small-muted">No submissions from this browser yet.</p>}
      </article>
      <article className="surface-card community-pane"><h3>Moderated local reports</h3>
        {reports.length?<ul className="community-list">{reports.map(r=><li key={r.id}>
          <strong>{TYPES[r.category]||r.category}</strong><small>{r.city} · {new Date(r.created_at).toLocaleDateString()}</small>
          <p>{r.description}</p></li>)}</ul>:<p className="community-empty">No approved reports for this city yet.</p>}
        <p className="small-muted">These remain unverified accounts of community observations.</p>
      </article>
    </div>
    <div className="community-section-head" id="challenges"><h3>{t(locale,"challenges")}</h3>
      <p>One self-reported completion per day; no claims of measured carbon or health savings.</p></div>
    <div className="community-challenges">{challenges.map(c=>{
      const done=progress[c.id];
      return <article className="surface-card community-challenge" key={c.id}>
        <span className="card-kicker">{c.category.toUpperCase()} · {c.target_days} days</span><h4>{c.title}</h4>
        <p>{c.description}</p><strong>{done===undefined?"Not joined":String(done)+" / "+c.target_days+" days"}</strong>
        <button type="button" disabled={busy||(done!==undefined&&done>=c.target_days)}
          onClick={()=>void challengeAction(c.id,done!==undefined)}>
          {done===undefined?"Join challenge":done>=c.target_days?"Completed":"Log today's activity"}</button>
      </article>;
    })}</div>
    <div className="community-section-head" id="alerts"><h3><Bell size={19}/> {t(locale,"alerts")}</h3>
      <p>Opt-in advisory modelled US AQI checks, not official CPCB alerts. Foreground only: no background push.</p></div>
    <div className="surface-card community-alert">
      <label><input type="checkbox" checked={prefs.enabled} onChange={e=>setPrefs(p=>({...p,enabled:e.target.checked}))}/> Enable alerts</label>
      <label>City <select value={prefs.city} onChange={e=>setPrefs(p=>({...p,city:e.target.value}))}>
        {CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      <label>Modelled US AQI threshold <select value={prefs.threshold} onChange={e=>setPrefs(p=>({...p,threshold:Number(e.target.value)}))}>
        {[100,150,200,250,300,400].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
      <div className="community-actions">
        <button type="button" disabled={busy} onClick={()=>void saveAlerts()}>Save alerts</button>
        <button type="button" disabled={busy} onClick={()=>void checkAlerts()}>Check air now</button></div>
      {alert&&<p role="status" className={alert.triggered?"community-alert-triggered":"community-notice"}>
        {alert.triggered?"The modelled US AQI threshold was reached. Follow official local advice.":
          alert.notice||"No fresh threshold alert at this check."}</p>}
    </div>
  </section>;
}