from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from app.services.providers.router import get_router, ProviderRouter
from app.services.providers.base import ProviderModel, ProviderHealth

router = APIRouter(
    prefix="/ai/providers",
    tags=["AI Providers & Gateway"]
)


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
async def list_providers(
    provider_router: ProviderRouter = Depends(get_router)
):
    """List all registered AI providers, their configured status, and priority order."""
    health_map = await provider_router.get_all_health()
    priority = provider_router._get_priority_list()
    return {
        "priority": priority,
        "providers": {
            name: {
                "name": name,
                "is_local": p.is_local,
                "is_configured": p.is_configured(),
                "status": health_map.get(name, ProviderHealth(status="UNKNOWN", last_checked="")).status,
                "latency_ms": health_map.get(name, ProviderHealth(status="UNKNOWN", last_checked="")).latency_ms,
            }
            for name, p in provider_router.providers.items()
        }
    }


@router.get("/models", response_model=List[ProviderModel])
@router.get("/models/", response_model=List[ProviderModel])
async def list_models(
    provider_router: ProviderRouter = Depends(get_router)
):
    """List all available models across all configured AI providers."""
    return await provider_router.get_all_models()


@router.get("/health", response_model=Dict[str, ProviderHealth])
@router.get("/health/", response_model=Dict[str, ProviderHealth])
async def check_health(
    provider_router: ProviderRouter = Depends(get_router)
):
    """Probe all AI providers and return real-time health metrics."""
    return await provider_router.get_all_health()
