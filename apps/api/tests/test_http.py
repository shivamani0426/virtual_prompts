"""Phase 3 public API contract, security and outage tests."""

import asyncio

from fastapi.testclient import TestClient
import httpx
import pytest

from app.core.config import Settings
from app.integrations.open_meteo import OpenMeteoAdapter
from app.main import create_app
from app.services.aqi import classify_us_aqi
from app.services.cache import TTLCache
from app.services.data import DataService


def air_payload(aqi=127):
    return {
        "timezone": "Asia/Kolkata",
        "current": {
            "time": "2026-11-18T19:00",
            "us_aqi": aqi,
            "pm2_5": 48.2,
            "pm10": 66.0,
            "nitrogen_dioxide": 23.0,
            "ozone": 44.0,
        },
        "hourly": {
            "time": ["2026-11-18T19:00", "2026-11-18T20:00"],
            "us_aqi": [aqi, aqi + 5],
            "pm2_5": [48.2, 49.7],
        },
    }


def make_client(handler, settings=None):
    settings = settings or Settings()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = DataService(OpenMeteoAdapter(client), settings)
    return TestClient(create_app(service, settings)), service


def test_live_air_and_forecast_shared_cache():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, json=air_payload())

    client, _ = make_client(handler)
    with client:
        first = client.get("/api/v1/air-quality?lat=12.97&lon=77.59")
        second = client.get("/api/v1/forecast?lat=12.97&lon=77.59")
    assert first.status_code == second.status_code == 200
    assert first.json()["aqi_scale"] == "US_AQI"
    assert first.json()["official_cpcb_aqi"] is False
    assert first.json()["category"]["level"] == "Unhealthy for sensitive groups"
    assert first.json()["freshness"] == "live"
    assert second.json()["freshness"] == "cached"
    assert len(second.json()["forecast"]) == 2
    assert calls == ["/v1/air-quality"]
    assert first.headers["x-content-type-options"] == "nosniff"
    assert first.headers["x-frame-options"] == "DENY"


def test_invalid_input_rejected_before_provider_call():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, json=air_payload())

    client, _ = make_client(handler)
    with client:
        for url in (
            "/api/v1/air-quality?lat=100&lon=77",
            "/api/v1/air-quality?lat=12&lon=-190",
            "/api/v1/air-quality?lat=nan&lon=77",
            "/api/v1/places?q=%3Cscript%3E",
            "/api/v1/places?q=x",
        ):
            assert client.get(url).status_code == 422
    assert calls == []


def test_upstream_outage_is_generic_503():
    def handler(_request):
        return httpx.Response(502, json={"internal": "private error"})

    client, _ = make_client(handler)
    with client:
        result = client.get("/api/v1/air-quality?lat=28.61&lon=77.20")
    assert result.status_code == 503
    assert result.json()["freshness"] == "unavailable"
    assert "private error" not in result.text
    assert "Traceback" not in result.text


def test_cached_air_survives_short_provider_outage():
    is_down = [False]
    now = [0.0]
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return (
            httpx.Response(503)
            if is_down[0]
            else httpx.Response(200, json=air_payload())
        )

    client, service = make_client(handler)
    service.cache = TTLCache(ttl_seconds=2, stale_max_seconds=10, clock=lambda: now[0])
    with client:
        fresh = client.get("/api/v1/air-quality?lat=28.61&lon=77.20")
        now[0] = 3.0
        is_down[0] = True
        stale = client.get("/api/v1/air-quality?lat=28.61&lon=77.20")
        now[0] = 11.0
        unavailable = client.get("/api/v1/air-quality?lat=28.61&lon=77.20")
    assert fresh.json()["freshness"] == "live"
    assert stale.json()["freshness"] == "stale"
    assert stale.json()["current"]["us_aqi"] == 127
    assert unavailable.status_code == 503
    assert len(calls) == 3


def test_hazardous_high_aqi_and_missing_reading():
    assert classify_us_aqi(500)["level"] == "Hazardous"
    assert classify_us_aqi(None)["level"] == "Unavailable"

    def handler(_request):
        return httpx.Response(200, json=air_payload(aqi=None))

    client, _ = make_client(handler)
    with client:
        result = client.get("/api/v1/air-quality?lat=12&lon=77")
    assert result.status_code == 503
    assert "current" not in result.json()


def test_weather_and_place_search_and_cors():
    def handler(request):
        if request.url.path == "/v1/search":
            return httpx.Response(200, json={
                "results": [{"name": "Bengaluru", "latitude": 12.9719,
                             "longitude": 77.5936, "country": "India"}]
            })
        return httpx.Response(200, json={
            "timezone": "Asia/Kolkata",
            "current": {"time": "2026-11-18T19:00", "temperature_2m": -2.5,
                        "relative_humidity_2m": 52, "wind_speed_10m": 9.2},
        })

    client, _ = make_client(handler)
    with client:
        weather = client.get("/api/v1/weather?lat=12.97&lon=77.59")
        places = client.get("/api/v1/places?q=Bengaluru")
        cors = client.get(
            "/api/v1/health", headers={"Origin": "https://untrusted.example"}
        )
    assert weather.status_code == 200
    assert weather.json()["temperature_c"] == -2.5
    assert places.json()["results"][0]["name"] == "Bengaluru"
    assert places.json()["results"][0]["latitude"] == 12.97
    assert "access-control-allow-origin" not in cors.headers


def test_rate_limit_and_health():
    def handler(_request):
        return httpx.Response(200, json=air_payload())

    client, _ = make_client(handler, Settings(public_rate_limit_per_minute=2))
    with client:
        assert client.get("/api/v1/air-quality?lat=12&lon=77").status_code == 200
        assert client.get("/api/v1/forecast?lat=12&lon=77").status_code == 200
        rate_limited = client.get("/api/v1/weather?lat=12&lon=77")
        health = client.get("/api/v1/health")
    assert rate_limited.status_code == 429
    assert health.status_code == 200
    assert health.json()["ok"] is True


@pytest.mark.asyncio
async def test_deduplicates_concurrent_requests():
    count = [0]
    cache = TTLCache()

    async def loader():
        count[0] += 1
        await asyncio.sleep(0.01)
        return {"success": True}

    results = await asyncio.gather(
        *[cache.get_or_fetch("same-location", loader) for _ in range(8)]
    )
    assert count[0] == 1
    assert sum(result.freshness == "cached" for result in results) == 7


@pytest.mark.asyncio
async def test_cache_respects_twelve_minute_ttl():
    now = [0.0]
    loads = [0]
    cache = TTLCache(
        ttl_seconds=720, stale_max_seconds=3600, clock=lambda: now[0]
    )

    async def loader():
        loads[0] += 1
        return {"seq": loads[0]}

    first = await cache.get_or_fetch("bengaluru", loader)
    now[0] = 719.0
    cached = await cache.get_or_fetch("bengaluru", loader)
    now[0] = 720.0
    refreshed = await cache.get_or_fetch("bengaluru", loader)
    assert [first.freshness, cached.freshness, refreshed.freshness] == [
        "live", "cached", "live"
    ]
    assert [first.data["seq"], cached.data["seq"], refreshed.data["seq"]] == [
        1, 1, 2
    ]
    assert loads[0] == 2


def test_settings_enforce_cache_and_cors(monkeypatch):
    monkeypatch.setenv("CACHE_TTL_SECONDS", "600")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(ValueError):
        Settings.from_env()
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://example.org")
    settings = Settings.from_env()
    assert settings.cache_ttl_seconds == 600
    assert settings.allowed_origins == ("https://example.org",)
