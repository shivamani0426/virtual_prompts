"""FastAPI application factory with no personal-data endpoints enabled yet."""

from collections import deque
from contextlib import asynccontextmanager
import asyncio
import os
import time

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.routes import router
from app.core.config import Settings
from app.integrations.open_meteo import OpenMeteoAdapter, ProviderUnavailable
from app.services.data import DataService


class ProcessRateLimiter:
    """A dev-scale per-IP quota; replace with shared Redis in production."""

    def __init__(self, max_requests: int, clock=time.monotonic):
        self.max_requests = max_requests
        self.clock = clock
        self.events: dict[str, deque[float]] = {}
        self.lock = asyncio.Lock()

    async def allow(self, address: str) -> bool:
        now = self.clock()
        async with self.lock:
            if len(self.events) > 5000:
                self.events = {
                    key: value
                    for key, value in self.events.items()
                    if value and value[-1] > now - 60
                }
            history = self.events.setdefault(address, deque())
            while history and history[0] <= now - 60:
                history.popleft()
            if len(history) >= self.max_requests:
                return False
            history.append(now)
            return True


def create_app(
    service: DataService | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if service is None:
            async with httpx.AsyncClient(
                timeout=settings.request_timeout_seconds,
                follow_redirects=False,
            ) as client:
                app.state.data_service = DataService(
                    OpenMeteoAdapter(client), settings
                )
                yield
        else:
            app.state.data_service = service
            yield

    production = os.getenv("APP_ENV", "development") == "production"
    app = FastAPI(
        title="Winter Smog Assistant API",
        version="0.3.0",
        description="Read-only public environmental endpoints; not official CPCB AQI.",
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        lifespan=lifespan,
        debug=False,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )
    app.include_router(router)
    limiter = ProcessRateLimiter(settings.public_rate_limit_per_minute)

    @app.middleware("http")
    async def secure_public_api(request: Request, call_next):
        if (
            request.url.path.startswith("/api/v1/")
            and not request.url.path.endswith("/health")
            and request.method != "OPTIONS"
            and not await limiter.allow(
                request.client.host if request.client else "unknown"
            )
        ):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit reached. Try again later."},
                headers={"Retry-After": "60"},
            )
        else:
            response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        if request.url.path.startswith("/api/v1/"):
            response.headers["Content-Security-Policy"] = "default-src 'none'"
        return response

    @app.exception_handler(ProviderUnavailable)
    async def unavailable(_request: Request, _exc: ProviderUnavailable):
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Live environmental data is unavailable. Try again later.",
                "freshness": "unavailable",
            },
            headers={"Retry-After": "60"},
        )

    return app


app = create_app()
