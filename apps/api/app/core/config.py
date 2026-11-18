"""Settings are loaded at runtime; never commit provider credentials."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cache_ttl_seconds: int = 720
    stale_max_seconds: int = 3600
    request_timeout_seconds: float = 8.0
    public_rate_limit_per_minute: int = 60
    allowed_origins: tuple[str, ...] = ("http://localhost:5173",)

    @classmethod
    def from_env(cls) -> "Settings":
        def positive_int(name: str, default: int) -> int:
            value = int(os.getenv(name, str(default)))
            if value < 1:
                raise ValueError(f"{name} must be positive")
            return value

        origins = tuple(
            origin.strip()
            for origin in os.getenv(
                "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
            ).split(",")
            if origin.strip()
        )
        if "*" in origins:
            raise ValueError("Wildcard CORS is disabled for this service")
        ttl = positive_int("CACHE_TTL_SECONDS", 720)
        if not 600 <= ttl <= 900:
            raise ValueError("AQI/weather cache TTL must be 10 to 15 minutes")
        stale = positive_int("STALE_MAX_SECONDS", 3600)
        if stale < ttl:
            raise ValueError("Stale grace must be at least the cache TTL")
        return cls(
            cache_ttl_seconds=ttl,
            stale_max_seconds=stale,
            public_rate_limit_per_minute=positive_int(
                "PUBLIC_RATE_LIMIT_PER_MINUTE", 60
            ),
            allowed_origins=origins,
        )
