import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CalendarDays,
  BookOpenCheck,
  Award,
  Bus,
  House,
  Cloud,
  CloudFog,
  Compass,
  Heart,
  Info,
  Leaf,
  LocateFixed,
  MapPin,
  Menu,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AirOverview } from "../features/air-quality/AirOverview";
import { DailyBriefing } from "../features/daily-briefing/DailyBriefing";
import { HouseholdSettings } from "../features/household/HouseholdSettings";
import { WeeklyPlanner } from "../features/routines/WeeklyPlanner";
import { IndoorAirAssistant } from "../features/indoor-air/IndoorAirAssistant";
import { LowEmissionAlternatives } from "../features/low-emission/LowEmissionAlternatives";
import { TrustedAssistant } from "../features/assistant/TrustedAssistant";
import { ImpactDashboard } from "../features/impact/ImpactDashboard";
import { getAir, getWeather, searchCities } from "../lib/api";
import { readPreferences, savePreferences } from "../lib/preferences";
import type {
  AirSnapshot,
  HouseholdPreferences,
  Place,
  WeatherSnapshot,
} from "../lib/types";

const EXAMPLE_CITY: Place = {
  name: "Bengaluru",
  country: "India",
  admin1: "Karnataka",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
};

function placeLabel(place: Place): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load the requested data.";
}

export function App() {
  const [city, setCity] = useState<Place>(EXAMPLE_CITY);
  const [exampleCity, setExampleCity] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMatches, setSearchMatches] = useState<Place[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [air, setAir] = useState<AirSnapshot | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [airError, setAirError] = useState("");
  const [weatherError, setWeatherError] = useState("");
  const [loadingAir, setLoadingAir] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [prefs, setPrefs] = useState<HouseholdPreferences>(readPreferences);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const searchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!savePreferences(prefs)) setStorageWarning(true);
  }, [prefs]);

  useEffect(() => {
    const controller = new AbortController();
    setAir(null);
    setWeather(null);
    setAirError("");
    setWeatherError("");
    setLoadingAir(true);

    void getAir(city, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAir(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setAirError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAir(false);
      });

    void getWeather(city, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setWeather(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setWeatherError(errorMessage(error));
      });

    return () => controller.abort();
  }, [city, refresh]);

  useEffect(() => () => searchRef.current?.abort(), []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (query.length < 2) {
      setSearchError("Enter at least two letters to find a city.");
      return;
    }
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    setSearchError("");
    setSearchMatches(null);
    setSearching(true);
    try {
      const result = await searchCities(query, controller.signal);
      if (!controller.signal.aborted) setSearchMatches(result.results);
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  function selectCity(next: Place) {
    searchRef.current?.abort();
    setCity(next);
    setSearch("");
    setSearchMatches(null);
    setExampleCity(false);
    setSearchError("");
    setLocationMessage("");
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Your browser does not support location access. Search for a city instead.");
      return;
    }
    setLocationMessage("Requesting approximate location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectCity({
          name: "Approximate location",
          country: null,
          admin1: null,
          latitude: Number(position.coords.latitude.toFixed(2)),
          longitude: Number(position.coords.longitude.toFixed(2)),
          timezone: null,
        });
        setLocationMessage("Using an approximate location, rounded for privacy.");
      },
      () => {
        setLocationMessage("Location unavailable or not permitted. Search for a city instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  function navClick() {
    setMobileMenuOpen(false);
  }

  const cityTitle = placeLabel(city);
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className={"sidebar" + (mobileMenuOpen ? " sidebar-open" : "")} aria-label="Main navigation">
        <a className="brand" href="#main" onClick={navClick} aria-label="Winter Smog Assistant home">
          <span className="brand-icon"><Wind size={23} strokeWidth={2.2} aria-hidden="true" /></span>
          <span><strong>winter<span>smog.</span></strong><small>YOUR AIR COMPANION</small></span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="sidebar-nav" aria-label="Page sections">
          <a className="nav-active" href="#main" onClick={navClick}><Compass size={19} aria-hidden="true" /> Today</a>
          <a href="#air" onClick={navClick}><CloudFog size={19} aria-hidden="true" /> Air outlook</a>
          <a href="#briefing" onClick={navClick}><Sparkles size={19} aria-hidden="true" /> Daily briefing</a>
          <a href="#assistant" onClick={navClick}><BookOpenCheck size={19} aria-hidden="true" /> Evidence AI assistant</a>
          <a href="#planner" onClick={navClick}><CalendarDays size={19} aria-hidden="true" /> Weekly plan</a>
          <a href="#low-emission" onClick={navClick}><Bus size={19} aria-hidden="true" /> Low-emission choices</a>
          <a href="#indoor-air" onClick={navClick}><House size={19} aria-hidden="true" /> Indoor air</a>
          <a href="#impact" onClick={navClick}><Award size={19} aria-hidden="true" /> Impact &amp; badges</a>
          <a href="#household" onClick={navClick}><Heart size={19} aria-hidden="true" /> Your household</a>
          <a href="#about" onClick={navClick}><Info size={19} aria-hidden="true" /> Our approach</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Leaf size={20} aria-hidden="true" /></span>
            <h3>Better air, little by little.</h3>
            <p>Good decisions start with good information.</p>
          </div>
          <p className="sidebar-copyright">Winter Smog Assistant · Phases 6–7</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="topbar-trail">
            <span>YOUR DAILY DASHBOARD</span>
            <span className="trail-dot" aria-hidden="true">·</span>
            <span>Air-aware living</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-model"><span className="status-dot" /> Modelled air data</span>
            <button type="button" className="refresh-button" onClick={() => setRefresh((n) => n + 1)} disabled={loadingAir}>
              <RefreshCcw size={16} aria-hidden="true" /> Refresh data
            </button>
          </div>
        </header>

        <main id="main" className="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-background-circle hero-circle-one" aria-hidden="true" />
            <div className="hero-background-circle hero-circle-two" aria-hidden="true" />
            <div className="hero-content">
              <p className="hero-kicker"><span className="hero-sparkle">✳</span> A LITTLE MORE BREATHING ROOM</p>
              <h1 id="hero-title">A clearer day<br />starts <em>right here.</em></h1>
              <p className="hero-description">
                Know your city&apos;s air. Make thoughtful plans. Find simple ways
                to protect the people who matter.
              </p>
              <div className="hero-features">
                <span><CheckCircle2 size={15} aria-hidden="true" /> Location-aware</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> Household-focused</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> Practical guidance</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <span className="orbit orbit-a" />
              <span className="orbit orbit-b" />
              <span className="floating-orb orb-one" />
              <span className="floating-orb orb-two" />
              <span className="floating-orb orb-three" />
              <span className="hero-sun"><Cloud size={72} strokeWidth={1.25} /></span>
              <div className="hero-art-caption">AIR AWARENESS<br /><strong>FOR EVERY DAY</strong></div>
            </div>
          </section>

          <section className="location-panel" aria-labelledby="location-title">
            <div className="location-current">
              <span className="location-pin"><MapPin size={23} aria-hidden="true" /></span>
              <div>
                <p className="location-kicker" id="location-title">YOUR AIR LOCATION</p>
                <h2>{cityTitle}</h2>
                <p>{exampleCity ? "Example city — choose yours below" : "Your selected location"} · approximate area</p>
              </div>
            </div>
            <div className="location-controls">
              <form onSubmit={(event) => void handleSearch(event)} className="city-form" role="search">
                <label className="visually-hidden" htmlFor="city-search">Search for a city</label>
                <Search size={18} aria-hidden="true" />
                <input
                  id="city-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchMatches(null);
                    setSearchError("");
                  }}
                  placeholder="Search another city"
                  autoComplete="off"
                  maxLength={80}
                />
                <button type="submit" disabled={searching || search.trim().length < 2}>
                  {searching ? "Finding…" : "Find city"}
                </button>
              </form>
              <button type="button" className="locate-button" onClick={useMyLocation} aria-label="Use approximate current location" title="Use approximate location">
                <LocateFixed size={19} aria-hidden="true" />
              </button>
            </div>
            {(searchError || locationMessage) && (
              <p role="status" className={searchError ? "search-error" : "search-note"}>
                {searchError || locationMessage}
              </p>
            )}
            {searchMatches !== null && (
              <div className="search-results" aria-label="City search results">
                <h3>Select a city</h3>
                {searchMatches.length ? (
                  <ul>
                    {searchMatches.map((place, index) => (
                      <li key={placeLabel(place) + index}>
                        <button type="button" onClick={() => selectCity(place)}>
                          <MapPin size={16} aria-hidden="true" />
                          <span>{placeLabel(place)}</span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No matching cities found. Check the spelling and try again.</p>
                )}
              </div>
            )}
          </section>

          <div className="main-sections" aria-live="polite">
            {loadingAir ? (
              <section className="loading-panel" role="status" aria-label="Loading air quality">
                <div className="loading-mark"><Wind size={27} aria-hidden="true" /></div>
                <h2>Checking the air around you…</h2>
                <p>Connecting to the latest modelled air-quality data for {city.name}.</p>
                <div className="loading-skeleton" aria-hidden="true" />
              </section>
            ) : air ? (
              <>
                <AirOverview air={air} weather={weather} weatherError={weatherError} />
                <DailyBriefing air={air} preferences={prefs} />
              </>
            ) : (
              <section className="error-panel" role="alert">
                <span className="error-icon"><CloudFog size={28} aria-hidden="true" /></span>
                <h2>We couldn&apos;t load the air right now.</h2>
                <p>{airError || "This location has no usable current AQI reading."} No estimate has been invented.</p>
                <button type="button" className="primary-button" onClick={() => setRefresh((n) => n + 1)}>
                  <RefreshCcw size={17} aria-hidden="true" /> Try again
                </button>
                <p className="small-muted">For urgent decisions, consult official local air-quality alerts.</p>
              </section>
            )}
          </div>
          <TrustedAssistant />
          <WeeklyPlanner preferences={prefs} aqi={air?.current.us_aqi ?? null} />
          <LowEmissionAlternatives preferences={prefs} aqi={air?.current.us_aqi ?? null} />
          <IndoorAirAssistant preferences={prefs} aqi={air?.current.us_aqi ?? null} />
          <ImpactDashboard />
          <HouseholdSettings value={prefs} onChange={setPrefs} />
          {storageWarning && (
            <p className="inline-warning" role="alert">
              Your browser blocked local storage. Preferences may not persist after refresh.
            </p>
          )}
          <section className="about-section" id="about" aria-labelledby="about-title">
            <div className="about-highlight">
              <span><ShieldCheck size={21} aria-hidden="true" /></span>
              <div>
                <p className="eyebrow">THE SCIENCE, MADE CLEAR</p>
                <h2 id="about-title">Useful guidance. No made-up certainty.</h2>
                <p>
                  We distinguish model estimates from official measurements, flag older readings,
                  and never promise a risk-free outdoor hour. Indoor advice and transport choices
                  are not the same as measured exposure or CO₂ savings.
                </p>
              </div>
            </div>
            <div className="about-links">
              <a href="https://www.who.int/publications/i/item/9789240034228/" target="_blank" rel="noopener noreferrer">
                WHO air-quality guidelines <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer">
                About our modelled data <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </section>
        </main>
        <footer className="site-footer">
          <span><Wind size={16} aria-hidden="true" /> Winter Smog Assistant</span>
          <span>Designed for clearer choices, not medical diagnosis.</span>
        </footer>
      </div>
    </div>
  );
}
