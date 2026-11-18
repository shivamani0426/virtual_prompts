# Winter Smog Assistant — Phase 3 public API contract

**Status:** implemented locally and tested via GitHub Actions (mocked provider HTTP, not a production deployment). **Version:** `/api/v1`. Source: `apps/api/app/api/v1/routes.py`. Generated OpenAPI available at `/openapi.json` when running the development app.

| Endpoint | Required params | Response essentials | Errors |
|---|---|---|---|
| `GET /api/v1/health` | none | `ok`, `version`, `service` | - |
| `GET /api/v1/places` | `q` (2–80 chars, no HTML angle brackets) | max 5 city matches, coarse coordinates | 422, 429, 503 |
| `GET /api/v1/air-quality` | `lat` (-90..90), `lon` (-180..180) | `current`, `category`, `forecast`, `source`, `aqi_scale`, `observed_at`, `freshness`, `fetched_at` | 422, 429, 503 |
| `GET /api/v1/forecast` | `lat`, `lon` | `forecast`, `source`, `aqi_scale`, `timezone`, `freshness` | 422, 429, 503 |
| `GET /api/v1/weather` | `lat`, `lon` | `temperature_c`, `relative_humidity_percent`, `wind_speed_kmh`, `freshness` | 422, 429, 503 |

### Sample air response (synthetic test data, **not a live reading**)

```json
{
  "source": "Open-Meteo / CAMS",
  "source_url": "https://open-meteo.com/en/docs/air-quality-api",
  "aqi_scale": "US_AQI",
  "modelled": true,
  "official_cpcb_aqi": false,
  "observed_at": "2026-11-18T19:00",
  "timezone": "Asia/Kolkata",
  "current": {"us_aqi": 127.0, "pm25_ug_m3": 48.2, "pm10_ug_m3": 66.0, "no2_ug_m3": 23.0, "ozone_ug_m3": 44.0},
  "category": {"level": "Unhealthy for sensitive groups", "advice": "Children, older adults and people with respiratory conditions should reduce outdoor exertion."},
  "forecast": [{"time": "2026-11-18T19:00", "us_aqi": 127.0, "pm25_ug_m3": 48.2}],
  "disclaimer": "Broad-area model estimate, not an official CPCB AQI or medical advice. No outdoor period is necessarily safe during severe pollution.",
  "freshness": "live",
  "fetched_at": "2026-11-18T13:30:00+00:00"
}
```

A stale response contains `freshness: "stale"`, retains the original `fetched_at`, and must be displayed with an unmistakable stale-data indicator. A missing current AQI cannot be silently replaced with zero.

### Response protection

API rate limit: process-local 60 requests/client/minute (configurable). 429 sets `Retry-After: 60`. 503 indicates upstream failure and also returns a safe `Retry-After`, with no raw provider error. The public API does not accept credentials and has no user-data write methods yet. CORS is restricted to configured origins. TLS is a deployment prerequisite.

### Source and data ethics

The Open-Meteo air-quality endpoint uses modelled CAMS/other provider information and displays US AQI. Provider documentation: https://open-meteo.com/en/docs/air-quality-api. Official Indian CPCB AQI will use a separate, clearly labeled trusted feed in a later milestone. No exposure-reduction percentages are inferred from these values.
