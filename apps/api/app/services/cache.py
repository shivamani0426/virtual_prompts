"""Per-process deduplicated TTL cache with bounded stale fallback.

Redis or another shared cache is required before horizontally scaling production.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
import time
from collections.abc import Awaitable, Callable


@dataclass(frozen=True)
class CacheResult:
    data: dict
    freshness: str
    fetched_at: datetime


@dataclass
class CacheEntry:
    data: dict
    fetched_at: datetime
    expires_at: float
    stale_until: float


class TTLCache:
    def __init__(
        self,
        ttl_seconds: int = 720,
        stale_max_seconds: int = 3600,
        clock: Callable[[], float] = time.monotonic,
    ):
        if ttl_seconds <= 0 or stale_max_seconds < ttl_seconds:
            raise ValueError("Invalid cache lifetimes")
        self.ttl_seconds = ttl_seconds
        self.stale_max_seconds = stale_max_seconds
        self.clock = clock
        self.entries: dict[str, CacheEntry] = {}
        self.locks: dict[str, asyncio.Lock] = {}

    async def get_or_fetch(
        self, key: str, loader: Callable[[], Awaitable[dict]]
    ) -> CacheResult:
        now = self.clock()
        entry = self.entries.get(key)
        if entry is not None and now < entry.expires_at:
            return CacheResult(entry.data, "cached", entry.fetched_at)
        lock = self.locks.setdefault(key, asyncio.Lock())
        async with lock:
            now = self.clock()
            entry = self.entries.get(key)
            if entry is not None and now < entry.expires_at:
                return CacheResult(entry.data, "cached", entry.fetched_at)
            try:
                data = await loader()
            except Exception:
                if entry is not None and now < entry.stale_until:
                    return CacheResult(entry.data, "stale", entry.fetched_at)
                raise
            fetched_at = datetime.now(timezone.utc)
            self.entries[key] = CacheEntry(
                data=data,
                fetched_at=fetched_at,
                expires_at=now + self.ttl_seconds,
                stale_until=now + self.stale_max_seconds,
            )
            # Avoid retaining unbounded location/search keys in memory.
            if len(self.entries) > 1000:
                expired = [
                    k for k, v in self.entries.items()
                    if v.stale_until <= now
                ]
                for old_key in expired:
                    self.entries.pop(old_key, None)
                    self.locks.pop(old_key, None)
                if len(self.entries) > 1000:
                    oldest = min(
                        self.entries, key=lambda k: self.entries[k].stale_until
                    )
                    self.entries.pop(oldest, None)
                    self.locks.pop(oldest, None)
            return CacheResult(data, "live", fetched_at)
