"""Normalize modelled US AQI without calling it official CPCB AQI."""

import math

from app.integrations.open_meteo import ProviderUnavailable


def valid_number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value) if math.isfinite(value) and value >= 0 else None


def classify_us_aqi(value: float | None) -> dict[str, str]:
    if value is None:
        return {"level": "Unavailable", "advice": "Check an official local alert."}
    if value <= 50:
        return {"level": "Good", "advice": "Normal outdoor activities are generally fine."}
    if value <= 100:
        return {"level": "Moderate", "advice": "Sensitive people may need to limit prolonged exertion."}
    if value <= 150:
        return {
            "level": "Unhealthy for sensitive groups",
            "advice": "Children, older adults and people with respiratory conditions should reduce outdoor exertion.",
        }
    if value <= 200:
        return {"level": "Unhealthy", "advice": "Limit prolonged outdoor activity and monitor official alerts."}
    if value <= 300:
        return {"level": "Very unhealthy", "advice": "Avoid strenuous outdoor activity; follow local alerts."}
    return {"level": "Hazardous", "advice": "Avoid outdoor exertion and follow official emergency guidance."}


def normalize_air(payload: dict) -> dict:
    current = payload.get("current")
    if not isinstance(current, dict):
        raise ProviderUnavailable("Current air readings missing")
    aqi = valid_number(current.get("us_aqi"))
    if aqi is None:
        raise ProviderUnavailable("Current AQI reading unavailable")
    hourly = payload.get("hourly", {})
    if not isinstance(hourly, dict):
        hourly = {}
    times = hourly.get("time", [])
    values = hourly.get("us_aqi", [])
    pm_values = hourly.get("pm2_5", [])
    forecasts = []
    if isinstance(times, list) and isinstance(values, list):
        for index, timestamp in enumerate(times[:48]):
            estimate = valid_number(values[index]) if index < len(values) else None
            if estimate is None or not isinstance(timestamp, str):
                continue
            forecasts.append(
                {
                    "time": timestamp,
                    "us_aqi": estimate,
                    "pm25_ug_m3": (
                        valid_number(pm_values[index])
                        if isinstance(pm_values, list) and index < len(pm_values)
                        else None
                    ),
                }
            )
    return {
        "source": "Open-Meteo / CAMS",
        "source_url": "https://open-meteo.com/en/docs/air-quality-api",
        "aqi_scale": "US_AQI",
        "modelled": True,
        "official_cpcb_aqi": False,
        "observed_at": current.get("time"),
        "timezone": payload.get("timezone", "UTC"),
        "current": {
            "us_aqi": aqi,
            "pm25_ug_m3": valid_number(current.get("pm2_5")),
            "pm10_ug_m3": valid_number(current.get("pm10")),
            "no2_ug_m3": valid_number(current.get("nitrogen_dioxide")),
            "ozone_ug_m3": valid_number(current.get("ozone")),
        },
        "category": classify_us_aqi(aqi),
        "forecast": forecasts,
        "disclaimer": (
            "Broad-area model estimate, not an official CPCB AQI or medical advice. "
            "No outdoor period is necessarily safe during severe pollution."
        ),
    }


def normalize_weather(payload: dict) -> dict:
    current = payload.get("current")
    if not isinstance(current, dict) or not isinstance(current.get("time"), str):
        raise ProviderUnavailable("Current weather readings unavailable")
    return {
        "source": "Open-Meteo",
        "source_url": "https://open-meteo.com/en/docs",
        "modelled": True,
        "observed_at": current["time"],
        "timezone": payload.get("timezone", "UTC"),
        "temperature_c": valid_number(current.get("temperature_2m"))
        if current.get("temperature_2m") is not None
        else None,
        "relative_humidity_percent": valid_number(current.get("relative_humidity_2m")),
        "wind_speed_kmh": valid_number(current.get("wind_speed_10m")),
    }
