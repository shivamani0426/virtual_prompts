import {
  ArrowRight, BookOpenCheck, Compass, Languages, LocateFixed, MapPin, Menu,
  RefreshCcw, Search, Settings2, UsersRound, Wind, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CompactAirOverview, CompactTodayPlan } from "../features/focused/TodayDashboard";
import { TrustedAssistant } from "../features/assistant/TrustedAssistant";
import { HouseholdSettings } from "../features/household/HouseholdSettings";
import { CommunityHub } from "../features/community/CommunityHub";
import { LANGUAGES, selectLocale, t } from "../features/language/locale";
import type { Locale } from "../features/language/locale";
import { getAir, getWeather, searchCities } from "../lib/api";
import { readPreferences, savePreferences } from "../lib/preferences";
import type { AirSnapshot, HouseholdPreferences, Place, WeatherSnapshot } from "../lib/types";

const DEFAULT_CITY: Place = {
  name:"Bengaluru",country:"India",admin1:"Karnataka",
  latitude:12.97,longitude:77.59,timezone:"Asia/Kolkata",
};
function label(place:Place){
  return [place.name,place.admin1,place.country].filter(Boolean).join(", ");
}
function message(error:unknown){
  return error instanceof Error?error.message:"Unable to load the requested data.";
}
type View = "dashboard" | "community";
function routeView():View {
  return typeof window!=="undefined" && (
    window.location.hash==="#community" ||
    window.location.hash==="#challenges" || window.location.hash==="#alerts"
  )?"community":"dashboard";
}
export function App(){
  const [locale,setLocale]=useState<Locale>(()=>{
    try{return selectLocale(localStorage.getItem("winter-smog:locale")||
      navigator.language.split("-")[0]||"en");}catch{return "en";}
  });
  const [view,setView]=useState<View>(routeView);
  const [city,setCity]=useState<Place>(DEFAULT_CITY);
  const [exampleCity,setExampleCity]=useState(true);
  const [search,setSearch]=useState("");
  const [searching,setSearching]=useState(false);
  const [searchMatches,setSearchMatches]=useState<Place[]|null>(null);
  const [searchError,setSearchError]=useState("");
  const [locationMessage,setLocationMessage]=useState("");
  const [air,setAir]=useState<AirSnapshot|null>(null);
  const [weather,setWeather]=useState<WeatherSnapshot|null>(null);
  const [airError,setAirError]=useState("");
  const [weatherError,setWeatherError]=useState("");
  const [loadingAir,setLoadingAir]=useState(true);
  const [refresh,setRefresh]=useState(0);
  const [prefs,setPrefs]=useState<HouseholdPreferences>(readPreferences);
  const [storageWarning,setStorageWarning]=useState(false);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const searchRef=useRef<AbortController|null>(null);

  useEffect(()=>{
    document.documentElement.lang=locale;
    try{localStorage.setItem("winter-smog:locale",locale);}catch{/*storage unavailable*/}
  },[locale]);
  useEffect(()=>{if(!savePreferences(prefs))setStorageWarning(true);},[prefs]);
  useEffect(()=>{
    const handler=()=>setView(routeView());
    window.addEventListener("hashchange",handler);
    window.addEventListener("popstate",handler);
    return ()=>{
      window.removeEventListener("hashchange",handler);
      window.removeEventListener("popstate",handler);
    };
  },[]);
  useEffect(()=>{
    if(view!=="dashboard")return;
    const controller=new AbortController();
    setAir(null);setWeather(null);setAirError("");setWeatherError("");setLoadingAir(true);
    void getAir(city,controller.signal)
      .then(data=>{if(!controller.signal.aborted)setAir(data);})
      .catch(err=>{if(!controller.signal.aborted)setAirError(message(err));})
      .finally(()=>{if(!controller.signal.aborted)setLoadingAir(false);});
    void getWeather(city,controller.signal)
      .then(data=>{if(!controller.signal.aborted)setWeather(data);})
      .catch(err=>{if(!controller.signal.aborted)setWeatherError(message(err));});
    return ()=>controller.abort();
  },[city,refresh,view]);
  useEffect(()=>()=>searchRef.current?.abort(),[]);

  async function handleSearch(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(search.trim().length<2){setSearchError("Enter at least two letters to find a city.");return;}
    searchRef.current?.abort();
    const controller=new AbortController();searchRef.current=controller;
    setSearchError("");setSearchMatches(null);setSearching(true);
    try{
      const result=await searchCities(search.trim(),controller.signal);
      if(!controller.signal.aborted)setSearchMatches(result.results);
    }catch(err){if(!controller.signal.aborted)setSearchError(message(err));}
    finally{if(!controller.signal.aborted)setSearching(false);}
  }
  function chooseCity(next:Place){
    searchRef.current?.abort();
    setCity(next);setSearch("");setSearchMatches(null);
    setSearchError("");setLocationMessage("");setExampleCity(false);
  }
  function myLocation(){
    if(!("geolocation" in navigator)){
      setLocationMessage("Location is not available. Search for your city instead.");return;
    }
    setLocationMessage("Requesting approximate location…");
    navigator.geolocation.getCurrentPosition(position=>{
      chooseCity({
        name:"Approximate location",admin1:null,country:null,
        latitude:Number(position.coords.latitude.toFixed(2)),
        longitude:Number(position.coords.longitude.toFixed(2)),timezone:null,
      });
      setLocationMessage("Using an approximate area, rounded for privacy.");
    },()=>setLocationMessage("Location permission denied or unavailable. Search for a city instead."),
    {enableHighAccuracy:false,timeout:10000,maximumAge:600000});
  }
  function navigate(next:View,destination:"#main"|"#community"){
    window.history.pushState({}, "", destination);
    setView(next);setMobileMenuOpen(false);
  }
  return <div className="app-layout focus-layout">
    <a className="skip-link" href="#main">Skip to main content</a>
    <aside className={"sidebar focus-sidebar"+(mobileMenuOpen?" sidebar-open":"")}
      aria-label="Main navigation">
      <a className="brand" href="#main" onClick={event=>{event.preventDefault();navigate("dashboard","#main");}}
        aria-label="Winter Smog Assistant home">
        <span className="brand-icon"><Wind size={23} aria-hidden="true"/></span>
        <span><strong>winter<span>smog.</span></strong><small>YOUR AIR COMPANION</small></span>
      </a>
      <nav className="sidebar-nav" aria-label="Page sections">
        <a href="#main" className={view==="dashboard"?"nav-active":""}
          onClick={event=>{event.preventDefault();navigate("dashboard","#main");}}><Compass size={19}/> Today</a>
        {view==="dashboard"&&<>
          <a href="#assistant" onClick={()=>setMobileMenuOpen(false)}>
            <BookOpenCheck size={19}/> Ask the AI</a>
          <a href="#planner" onClick={()=>setMobileMenuOpen(false)}>
            <ArrowRight size={19}/> Today's actions</a>
        </>}
        <a href="#community" className={view==="community"?"nav-active":""}
          onClick={event=>{event.preventDefault();navigate("community","#community");}}><UsersRound size={19}/> Community tools</a>
      </nav>
      <div className="sidebar-bottom"><p className="sidebar-copyright">
        General guidance. Not an official CPCB warning.</p></div>
    </aside>
    <div className="content-shell">
      <header className="topbar focus-topbar">
        <button type="button" className="mobile-menu-button"
          aria-label={mobileMenuOpen?"Close navigation":"Open navigation"}
          aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(v=>!v)}>
          {mobileMenuOpen?<X size={22}/>:<Menu size={22}/>}
        </button>
        <div className="topbar-trail">WINTER SMOG ASSISTANT</div>
        <div className="topbar-actions">
          <label className="language-control">
            <Languages size={16} aria-hidden="true"/>
            <span className="visually-hidden">{t(locale,"language")}</span>
            <select aria-label="Interface language" value={locale}
              onChange={event=>setLocale(selectLocale(event.target.value))}>
              {Object.entries(LANGUAGES).map(([code,option])=>
                <option value={code} key={code}>{option.native}</option>)}
            </select>
          </label>
          {view==="dashboard"&&<button type="button" className="refresh-button"
            aria-label="Refresh air quality data"
            onClick={()=>setRefresh(v=>v+1)} disabled={loadingAir}>
            <RefreshCcw size={16} aria-hidden="true"/> Refresh
          </button>}
        </div>
      </header>
      <main id="main" className="main-content focus-content">
        {view==="community"?<>
          <div className="focus-page-intro">
            <div><p className="eyebrow">OPTIONAL COMMUNITY TOOLS</p>
              <h1>Community, when you need it.</h1>
              <p>Reports, challenges and alerts live here—not on your daily dashboard.</p>
            </div>
            <button type="button" className="focus-back" onClick={()=>{
              navigate("dashboard","#main");
            }}>Back to today</button>
          </div>
          <CommunityHub selectedCity={city.name} locale={locale}/>
        </>:<>
          <div className="focus-page-intro">
            <div>
              <p className="eyebrow">YOUR SIMPLE AIR GUIDE</p>
              <h1>Know your air. Make a better plan.</h1>
              <p>Check the conditions, ask the AI, and choose three useful actions.</p>
            </div>
          </div>
          <section className="location-panel focus-location" aria-label="Select location">
            <div className="location-current">
              <span className="location-pin"><MapPin size={20} aria-hidden="true"/></span>
              <div><p className="location-kicker">YOUR LOCATION</p>
                <h2>{label(city)}</h2>
                <p>{exampleCity?"Example city — search yours":"Your selected location"} · approximate area</p>
              </div>
            </div>
            <div className="location-controls">
              <form onSubmit={event=>void handleSearch(event)} className="city-form" role="search">
                <label className="visually-hidden" htmlFor="city-search">Search for a city</label>
                <Search size={17} aria-hidden="true"/>
                <input id="city-search" value={search}
                  onChange={event=>{setSearch(event.target.value);setSearchMatches(null);setSearchError("");}}
                  placeholder="Search your city" autoComplete="off" maxLength={80}/>
                <button type="submit" disabled={searching||search.trim().length<2}>
                  {searching?"Finding…":"Find city"}
                </button>
              </form>
              <button type="button" className="locate-button" onClick={myLocation}
                aria-label="Use approximate current location"><LocateFixed size={18}/></button>
            </div>
            {(searchError||locationMessage)&&<p role="status" className={searchError?"search-error":"search-note"}>
              {searchError||locationMessage}</p>}
            {searchMatches!==null&&<div className="search-results" aria-label="City search results">
              <h3>Select a city</h3>
              {searchMatches.length?<ul>{searchMatches.map((place,index)=><li key={label(place)+index}>
                <button type="button" onClick={()=>chooseCity(place)}>
                  <MapPin size={16}/><span>{label(place)}</span><ArrowRight size={16}/>
                </button></li>)}</ul>:<p>No matching cities found. Try another spelling.</p>}
            </div>}
          </section>
          <div className="main-sections focus-data" aria-live="polite">
            {loadingAir?<section className="loading-panel" role="status" aria-label="Loading air quality">
              <Wind size={25}/><h2>Checking your air…</h2><p>Loading modelled data for {city.name}.</p>
            </section>:air?<CompactAirOverview air={air} weather={weather} weatherError={weatherError}/>:
            <section className="error-panel" role="alert"><h2>Air data is unavailable right now.</h2>
              <p>{airError||"No usable current AQI reading."} No estimate has been invented.</p>
              <button type="button" className="primary-button" onClick={()=>setRefresh(v=>v+1)}>
                <RefreshCcw size={16}/> Try again</button>
              <p className="small-muted">Check official local advisories for urgent decisions.</p>
            </section>}
          </div>
          <TrustedAssistant locale={locale}/>
          <CompactTodayPlan preferences={prefs} aqi={air?.current.us_aqi??null} air={air}/>
          <details className="focus-settings" id="household">
            <summary><Settings2 size={17} aria-hidden="true"/> Personalize my advice
              <span>Optional · settings stay in this browser</span></summary>
            <HouseholdSettings value={prefs} onChange={setPrefs}/>
          </details>
          {storageWarning&&<p className="inline-warning" role="alert">
            Browser storage is blocked. Preferences may not persist after refresh.</p>}
        </>}
      </main>
      <footer className="site-footer focus-footer">
        <span><Wind size={15}/> Winter Smog Assistant</span>
        <span>Modelled US AQI ≠ official CPCB AQI · Educational, not medical advice.</span>
      </footer>
    </div>
  </div>;
}
