from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.services.providers.router import get_router, ProviderRouter
from app.services.providers.base import ProviderModel, ProviderHealth
from app.services.custom_model_service import (
    add_custom_model,
    get_custom_models,
    delete_custom_model,
)

router = APIRouter(
    prefix="/ai/providers",
    tags=["AI Providers & Gateway"]
)


class AddCustomModelRequest(BaseModel):
    model_id: str = Field(..., description="Unique model identifier, e.g. xkiro-v1 or meta-llama/Llama-3")
    name: str = Field(..., description="Display name, e.g. xKiro Intelligence")
    base_url: str = Field("https://api.openai.com/v1", description="OpenAI-compatible API base URL")
    api_key: str = Field(..., description="Provider API key")
    context_window: Optional[int] = Field(128000, description="Max token context window")
    description: Optional[str] = Field("", description="Short model description")


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


@router.get("/custom-models", response_model=List[Dict[str, Any]])
@router.get("/custom-models/", response_model=List[Dict[str, Any]])
async def list_custom_models():
    """List all user-registered custom AI models."""
    return await get_custom_models(mask_keys=True)


@router.post("/custom-models", response_model=Dict[str, Any])
@router.post("/custom-models/", response_model=Dict[str, Any])
async def create_custom_model(payload: AddCustomModelRequest):
    """Register a new custom AI model with its model ID and API key."""
    if not payload.model_id.strip():
        raise HTTPException(status_code=400, detail="Model ID cannot be empty")
    if not payload.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    return await add_custom_model(
        model_id=payload.model_id,
        name=payload.name or payload.model_id,
        base_url=payload.base_url,
        api_key=payload.api_key,
        context_window=payload.context_window or 128000,
        description=payload.description or "",
    )


@router.delete("/custom-models/{model_id:path}")
async def remove_custom_model(model_id: str):
    """Delete a registered custom model."""
    success = await delete_custom_model(model_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Custom model '{model_id}' not found")
    return {"message": f"Custom model '{model_id}' deleted successfully", "success": True}
