"""Async adapters for Open-Meteo's modelled air quality and weather feeds."""

import httpx


class ProviderUnavailable(Exception):
    """Upstream environmental readings cannot currently be retrieved."""


class OpenMeteoAdapter:
    AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
    WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
    GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _get(self, url: str, params: dict[str, object]) -> dict:
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or payload.get("error"):
                raise ProviderUnavailable("Invalid provider response")
            return payload
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise ProviderUnavailable("Environmental provider unavailable") from exc

    async def air(self, latitude: float, longitude: float) -> dict:
        return await self._get(
            self.AIR_URL,
            {
                "latitude": latitude,
                "longitude": longitude,
                "current": (
                    "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone"
                ),
                "hourly": "us_aqi,pm2_5",
                "forecast_days": 2,
                "timezone": "auto",
            },
        )

    async def weather(self, latitude: float, longitude: float) -> dict:
        return await self._get(
            self.WEATHER_URL,
            {
                "latitude": latitude,
                "longitude": longitude,
                "current": (
                    "temperature_2m,relative_humidity_2m,wind_speed_10m"
                ),
                "timezone": "auto",
            },
        )

    async def places(self, query: str) -> dict:
        return await self._get(
            self.GEOCODE_URL,
            {"name": query, "count": 5, "language": "en", "format": "json"},
        )
