"""Public, read-only environmental endpoints for the new React frontend."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from fastapi.responses import JSONResponse

from app.services.data import DataService
from app.services.cache import CacheResult
from app.services.rag import RAGAssistant
from app.knowledge.retrieval import citation, registry

router = APIRouter(prefix="/api/v1", tags=["environment"])

Latitude = Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)]


def get_data_service(request: Request) -> DataService:
    return request.app.state.data_service


def render(result: CacheResult, data: dict | None = None) -> JSONResponse:
    body = dict(result.data if data is None else data)
    body["freshness"] = result.freshness
    body["fetched_at"] = result.fetched_at.isoformat()
    return JSONResponse(
        content=body,
        headers={
            "X-Data-Freshness": result.freshness,
            "Cache-Control": "public, max-age=60",
        },
    )


@router.get("/health", tags=["system"])
async def health() -> dict:
    return {"ok": True, "service": "Winter Smog Assistant API", "version": "v1"}


@router.get("/air-quality")
async def air_quality(
    lat: Latitude,
    lon: Longitude,
    service: Annotated[DataService, Depends(get_data_service)],
) -> JSONResponse:
    result = await service.air(lat, lon)
    return render(result)


@router.get("/forecast")
async def forecast(
    lat: Latitude,
    lon: Longitude,
    service: Annotated[DataService, Depends(get_data_service)],
) -> JSONResponse:
    result = await service.air(lat, lon)
    return render(
        result,
        {
            "source": result.data["source"],
            "aqi_scale": result.data["aqi_scale"],
            "modelled": True,
            "timezone": result.data["timezone"],
            "forecast": result.data["forecast"],
            "disclaimer": result.data["disclaimer"],
        },
    )


@router.get("/weather")
async def weather(
    lat: Latitude,
    lon: Longitude,
    service: Annotated[DataService, Depends(get_data_service)],
) -> JSONResponse:
    return render(await service.weather(lat, lon))


@router.get("/places")
async def places(
    q: Annotated[str, Query(min_length=2, max_length=80, pattern=r"^[^<>]+$")],
    service: Annotated[DataService, Depends(get_data_service)],
) -> JSONResponse:
    return render(await service.places(q.strip()))


class AssistantQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=5, max_length=400)


def get_rag_assistant(request: Request) -> RAGAssistant:
    return request.app.state.rag_assistant


@router.get("/assistant/sources", tags=["assistant"])
async def assistant_sources() -> JSONResponse:
    data = registry()
    return JSONResponse(
        content={
            "registry_version": data["registry_version"],
            "policy": data["editorial_policy"],
            "sources": [citation(s) for s in data["sources"]],
            "disclaimer": "Reviewed, versioned source summaries; not live government data.",
        },
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("/assistant", tags=["assistant"])
async def assistant(
    body: AssistantQuestion,
    service: Annotated[RAGAssistant, Depends(get_rag_assistant)],
) -> JSONResponse:
    return JSONResponse(
        content=await service.answer(body.question),
        headers={"Cache-Control": "no-store"},
    )
