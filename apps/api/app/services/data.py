"""Cache-coordinated environmental data service."""

from app.core.config import Settings
from app.integrations.open_meteo import OpenMeteoAdapter
from app.services.aqi import normalize_air, normalize_weather
from app.services.cache import CacheResult, TTLCache


class DataService:
    def __init__(self, provider: OpenMeteoAdapter, settings: Settings):
        self.provider = provider
        self.cache = TTLCache(
            settings.cache_ttl_seconds, settings.stale_max_seconds
        )

    @staticmethod
    def key(kind: str, latitude: float, longitude: float) -> str:
        # Approximate coordinates avoid recording a high-resolution home location.
        return f"{kind}:{latitude:.2f}:{longitude:.2f}"

    async def air(self, latitude: float, longitude: float) -> CacheResult:
        key = self.key("air", latitude, longitude)
        return await self.cache.get_or_fetch(
            key,
            lambda: self._air(latitude, longitude),
        )

    async def _air(self, latitude: float, longitude: float) -> dict:
        return normalize_air(await self.provider.air(latitude, longitude))

    async def weather(self, latitude: float, longitude: float) -> CacheResult:
        key = self.key("weather", latitude, longitude)
        return await self.cache.get_or_fetch(
            key,
            lambda: self._weather(latitude, longitude),
        )

    async def _weather(self, latitude: float, longitude: float) -> dict:
        return normalize_weather(await self.provider.weather(latitude, longitude))

    async def places(self, query: str) -> CacheResult:
        key = f"place:{query.strip().casefold()}"
        return await self.cache.get_or_fetch(
            key,
            lambda: self._places(query),
        )

    async def _places(self, query: str) -> dict:
        raw = await self.provider.places(query)
        results = raw.get("results", [])
        if not isinstance(results, list):
            results = []
        return {
            "source": "Open-Meteo Geocoding",
            "results": [
                {
                    "name": p["name"],
                    "country": p.get("country"),
                    "admin1": p.get("admin1"),
                    "latitude": round(p["latitude"], 2),
                    "longitude": round(p["longitude"], 2),
                    "timezone": p.get("timezone"),
                }
                for p in results[:5]
                if isinstance(p, dict)
                and isinstance(p.get("name"), str)
                and valid_coordinate(p.get("latitude"), -90, 90)
                and valid_coordinate(p.get("longitude"), -180, 180)
            ],
        }


def valid_coordinate(value: object, minimum: float, maximum: float) -> bool:
    from math import isfinite

    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and isfinite(value)
        and minimum <= value <= maximum
    )
