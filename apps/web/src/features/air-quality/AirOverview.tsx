import { AlertTriangle, ArrowDownRight, ArrowUpRight, CloudSun, Droplets, Wind } from "lucide-react";
import type { AirSnapshot, WeatherSnapshot } from "../../lib/types";
import { aqiTone, findLowerWindow, formatLocalHour } from "../daily-briefing/briefing";

function reading(value: number | null, unit: string): string {
  return value === null || !Number.isFinite(value) ? "Unavailable" : value.toFixed(1) + " " + unit;
}

export function AirOverview({
  air,
  weather,
  weatherError,
}: {
  air: AirSnapshot;
  weather: WeatherSnapshot | null;
  weatherError: string;
}) {
  const aqi = air.current.us_aqi;
  const tone = aqiTone(aqi);
  const lowerWindow = findLowerWindow(air);
  const forecast = air.forecast
    .filter((entry) => !air.observed_at || entry.time >= air.observed_at)
    .slice(0, 12);
  const max = Math.max(120, ...forecast.map((entry) => entry.us_aqi));

  return (
    <section className="dashboard-air" id="air" aria-labelledby="air-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">01 / YOUR AIR RIGHT NOW</p>
          <h2 id="air-title">How&apos;s the air outside?</h2>
          <p>Broad-area modelled estimates to help you plan, never a substitute for a local sensor.</p>
        </div>
        <a
          href={air.source_url}
          className="source-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Data source <ArrowUpRight aria-hidden="true" size={15} />
        </a>
      </div>

      {air.freshness === "stale" && (
        <div className="inline-warning" role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          The provider is unavailable. Showing an older reading from{" "}
          {Number.isFinite(Date.parse(air.fetched_at))
            ? new Date(air.fetched_at).toLocaleString()
            : "the last successful update"}
          . Please check official local alerts.
        </div>
      )}

      <div className="air-summary">
        <article className={"aqi-card tone-" + tone}>
          <div className="card-topline">
            <span className="pill pill-translucent">
              <span className="live-dot" aria-hidden="true" />
              {air.freshness === "stale" ? "Older reading" : "Model estimate"}
            </span>
            <span>US AQI</span>
          </div>
          <div className="gauge-layout">
            <div
              className="gauge"
              style={{
                background:
                  "conic-gradient(var(--gauge-color) " +
                  Math.min(100, (aqi / 300) * 100) +
                  "%, rgba(255,255,255,.19) 0)",
              }}
              role="img"
              aria-label={"US AQI " + Math.round(aqi)}
            >
              <div className="gauge-center">
                <strong>{Math.round(aqi)}</strong>
                <span>US AQI</span>
              </div>
            </div>
            <div className="gauge-caption">
              <p>Current air quality</p>
              <h3>{air.category.level}</h3>
              <span>{air.category.advice}</span>
            </div>
          </div>
          <div className="aqi-card-footer">
            <span>{air.source} · not official CPCB AQI</span>
            <span>
              {air.observed_at && air.observed_at.includes("T")
                ? "Observed " + formatLocalHour(air.observed_at)
                : "Observation time unavailable"}
            </span>
          </div>
        </article>

        <div className="air-side">
          <article className="surface-card lower-window">
            <div className="card-icon soft-leaf">
              <CloudSun size={21} aria-hidden="true" />
            </div>
            <p className="card-kicker">OUTDOOR PLANNING</p>
            <h3>{lowerWindow ? formatLocalHour(lowerWindow.time) : "Not available"}</h3>
            <p className="window-label">
              {lowerWindow ? lowerWindow.label : "Not enough forecast data to identify a period."}
            </p>
            <p className="small-muted">
              {lowerWindow
                ? lowerWindow.caution
                : "Check official alerts before outdoor activities."}
            </p>
          </article>
          <article className="surface-card weather-card">
            <div className="weather-heading">
              <span className="card-kicker">LOCAL WEATHER</span>
              <Wind size={19} aria-hidden="true" />
            </div>
            {weather ? (
              <>
                {weather.freshness === "stale" && (
                  <p className="weather-warning">Older weather data</p>
                )}
                <div className="weather-metrics">
                  <div>
                    <span>Temperature</span>
                    <strong>{reading(weather.temperature_c, "°C")}</strong>
                  </div>
                  <div>
                    <span>Humidity</span>
                    <strong>{reading(weather.relative_humidity_percent, "%")}</strong>
                  </div>
                  <div>
                    <span>Wind</span>
                    <strong>{reading(weather.wind_speed_kmh, "km/h")}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className="small-muted">{weatherError || "Loading local weather…"}</p>
            )}
          </article>
        </div>
      </div>

      <div className="metrics-grid" aria-label="Pollutant estimates">
        <Metric title="Fine particles" unit="PM2.5" value={air.current.pm25_ug_m3} icon="particles" />
        <Metric title="Coarse particles" unit="PM10" value={air.current.pm10_ug_m3} icon="particles" />
        <Metric title="Nitrogen dioxide" unit="NO₂" value={air.current.no2_ug_m3} icon="wind" />
        <Metric title="Ozone" unit="O₃" value={air.current.ozone_ug_m3} icon="drop" />
      </div>

      <article className="surface-card forecast-panel" id="forecast">
        <div className="forecast-head">
          <div>
            <p className="card-kicker">LOOKING AHEAD</p>
            <h3>Your next 12 hours</h3>
            <p className="small-muted">Modelled US AQI · lower estimates are generally preferable, not necessarily safe.</p>
          </div>
          <div className="forecast-note">
            {forecast.length > 0 ? "Estimated conditions" : "Forecast unavailable"}
          </div>
        </div>
        {forecast.length ? (
          <div className="forecast-scroll" role="region" tabIndex={0} aria-label="Hourly AQI forecast, scroll horizontally if needed">
            <div className="forecast-bars">
              {forecast.map((point, index) => {
                const min = lowerWindow?.time === point.time;
                const bar = Math.max(8, Math.round((point.us_aqi / max) * 124));
                return (
                  <div className="forecast-column" key={point.time + "-" + index}>
                    <span className="forecast-value">{Math.round(point.us_aqi)}</span>
                    <div className="forecast-bar-track">
                      <div
                        className={"forecast-bar tone-" + aqiTone(point.us_aqi) + (min ? " is-lowest" : "")}
                        style={{ height: bar + "px" }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="forecast-hour">{formatLocalHour(point.time)}</span>
                    {min && <span className="forecast-marker" aria-label="Lowest forecast AQI">•</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="small-muted">No usable hourly forecast is available. Try again later.</p>
        )}
      </article>
      <div className="data-clarity">
        <ArrowDownRight size={16} aria-hidden="true" />
        <p>
          <strong>Important:</strong> This dashboard uses <strong>US AQI</strong> model estimates
          from Open-Meteo. India&apos;s official CPCB AQI is a different scale; never compare
          the numbers directly. Readings can vary at street level.
        </p>
      </div>
    </section>
  );
}

function Metric({
  title,
  unit,
  value,
  icon,
}: {
  title: string;
  unit: string;
  value: number | null;
  icon: "particles" | "wind" | "drop";
}) {
  return (
    <div className="surface-card metric-card">
      <div className="metric-card-top">
        <span>{title}</span>
        {icon === "wind" ? (
          <Wind size={18} aria-hidden="true" />
        ) : icon === "drop" ? (
          <Droplets size={18} aria-hidden="true" />
        ) : (
          <span className="particle-icon" aria-hidden="true">•••</span>
        )}
      </div>
      <p className="metric-value">
        {value === null || !Number.isFinite(value) ? "—" : value.toFixed(1)}
        <span>µg/m³</span>
      </p>
      <p className="metric-label">{unit}</p>
    </div>
  );
}
