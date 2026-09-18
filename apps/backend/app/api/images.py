import os
import io
import base64
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.database import get_db, get_database
from app.core.deps import get_optional_user
from app.services.storage.factory import get_storage_provider
from app.models.asset import new_asset
from app.services.image.base import (
    ImageGenerationTask, ImageEditTask, ImageVariationTask, ImageUpscaleTask
)
from app.services.image.capabilities import ImageCapability
from app.services.image.router import image_router
from app.services.image.prompt_engine import PromptIntelligenceEngine, PromptEnhanceResult
from app.services.image.editor import ImageEditorService

logger = logging.getLogger("yash_ai.api.images")

router = APIRouter(
    prefix="/images",
    tags=["AI Image Studio"]
)


def _decode_b64(raw: str) -> bytes:
    if "," in raw:
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw)


class ImageGenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    aspect_ratio: str = "1:1"
    style: Optional[str] = "Photorealistic"
    seed: Optional[int] = None
    num_images: int = Field(default=1, ge=1, le=4)
    model: Optional[str] = None
    project_id: Optional[str] = None
    reference_image: Optional[str] = None
    reference_strength: Optional[float] = 0.5


class ImageEditRequest(BaseModel):
    image: str
    mask: Optional[str] = None
    prompt: str
    negative_prompt: Optional[str] = None
    action_type: str = "inpaint"
    model: Optional[str] = None
    project_id: Optional[str] = None


class ImageOutpaintRequest(BaseModel):
    image: str
    direction: str = "right"
    prompt: str
    project_id: Optional[str] = None


class ImageVariationRequest(BaseModel):
    image: str
    prompt: Optional[str] = None
    num_variations: int = Field(default=4, ge=1, le=4)
    project_id: Optional[str] = None


class ImageUpscaleRequest(BaseModel):
    image: str
    scale_factor: int = Field(default=2, ge=2, le=4)
    project_id: Optional[str] = None


class EnhancePromptRequest(BaseModel):
    prompt: str
    style: Optional[str] = "Photorealistic"
    aspect_ratio: Optional[str] = "1:1"
    negative_prompt: Optional[str] = None


class ExportFormatRequest(BaseModel):
    image: str
    format: str = "PNG"  # PNG, JPEG, WEBP
    quality: int = 95


async def _persist_and_format(
    image_bytes: bytes,
    mime_type: str,
    width: int,
    height: int,
    provider: str,
    model: str,
    prompt: str,
    user_id: str,
    project_id: Optional[str],
    metadata: Dict[str, Any],
    db: Optional[AsyncIOMotorDatabase] = None
) -> Dict[str, Any]:
    storage = get_storage_provider()
    target_project = project_id or "default"

    ext = "png" if "png" in mime_type else "jpg"
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    filename = f"gen_{timestamp_str}_{width}x{height}.{ext}"
    storage_key = f"projects/{target_project}/assets/{filename}"

    file_obj = io.BytesIO(image_bytes)
    download_url = await storage.upload(
        file_obj=file_obj,
        storage_key=storage_key,
        content_type=mime_type
    )

    asset_id = f"ast_{timestamp_str}"
    db_inst = db if db is not None else get_database()

    if db_inst is not None:
        try:
            title_summary = prompt[:45] + ("..." if len(prompt) > 45 else "")
            doc = new_asset(
                user_id=user_id,
                project_id=target_project,
                asset_type="IMAGE",
                name=f"Studio: {title_summary}",
                storage_key=storage_key,
                url=download_url,
                mime_type=mime_type,
                size_bytes=len(image_bytes),
                provider=provider,
                model=model,
                prompt=prompt,
                metadata={
                    "width": width,
                    "height": height,
                    "provider": provider,
                    "model": model,
                    **metadata
                }
            )
            await db_inst["assets"].insert_one(doc)
            asset_id = doc["_id"]
        except Exception as e:
            logger.warning(f"Could not persist asset to mongo: {e}")

    # Generate fresh download URL if needed
    try:
        fresh_url = await storage.get_download_url(storage_key)
    except Exception:
        fresh_url = download_url

    return {
        "asset_id": asset_id,
        "url": fresh_url,
        "width": width,
        "height": height,
        "provider": provider,
        "model": model,
        "prompt": prompt,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata
    }


@router.get("/models", response_model=List[ImageCapability])
async def get_available_models():
    """
    Returns verified capabilities for all registered AI image models.
    Frontend dynamically adjusts available controls based on these capabilities.
    """
    return image_router.get_all_capabilities()


@router.post("/enhance-prompt", response_model=PromptEnhanceResult)
async def enhance_prompt(req: EnhancePromptRequest):
    """
    Deconstructs and semantically enriches the user's prompt
    without keyword stuffing or altering the core subject.
    """
    return await PromptIntelligenceEngine.enhance(
        raw_prompt=req.prompt,
        style=req.style,
        aspect_ratio=req.aspect_ratio,
        negative_prompt=req.negative_prompt
    )


@router.post("/generate")
async def generate_images(
    req: ImageGenerateRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Synthesize one or more high-fidelity images with automatic provider fallback.
    """
    user_id = current_user["_id"] if current_user else "anonymous"

    # Decode reference image if provided
    ref_bytes = None
    if req.reference_image:
        try:
            ref_bytes = _decode_b64(req.reference_image)
        except Exception as e:
            logger.warning(f"Failed to decode reference image: {e}")

    task = ImageGenerationTask(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        aspect_ratio=req.aspect_ratio,
        style=req.style,
        seed=req.seed,
        num_images=req.num_images,
        model=req.model,
        reference_image_bytes=ref_bytes,
        reference_strength=req.reference_strength or 0.5
    )

    try:
        generated = await image_router.generate(task)
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image generation failed: {str(e)}"
        )

    saved_items = []
    for img in generated:
        item = await _persist_and_format(
            image_bytes=img.image_bytes,
            mime_type=img.mime_type,
            width=img.width,
            height=img.height,
            provider=img.provider,
            model=img.model,
            prompt=req.prompt,
            user_id=user_id,
            project_id=req.project_id,
            metadata={
                "seed": img.seed,
                "style": req.style,
                "aspect_ratio": req.aspect_ratio,
                "negative_prompt": req.negative_prompt,
                **img.metadata
            },
            db=db
        )
        saved_items.append(item)

    return {"images": saved_items, "count": len(saved_items)}


@router.post("/edit")
async def edit_image(
    req: ImageEditRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Inpainting, object removal, or object replacement using a drawn mask.
    """
    user_id = current_user["_id"] if current_user else "anonymous"

    try:
        img_bytes = _decode_b64(req.image)
        mask_bytes = _decode_b64(req.mask) if req.mask else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {e}")

    task = ImageEditTask(
        image_bytes=img_bytes,
        mask_bytes=mask_bytes,
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        action_type=req.action_type,
        model=req.model
    )

    try:
        result = await image_router.edit(task)
    except Exception as e:
        logger.error(f"Image edit failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image inpainting failed: {str(e)}"
        )

    saved = await _persist_and_format(
        image_bytes=result.image_bytes,
        mime_type=result.mime_type,
        width=result.width,
        height=result.height,
        provider=result.provider,
        model=result.model,
        prompt=req.prompt,
        user_id=user_id,
        project_id=req.project_id,
        metadata={"action_type": req.action_type, **result.metadata},
        db=db
    )
    return saved


@router.post("/outpaint")
async def outpaint_image(
    req: ImageOutpaintRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Expands the canvas in the specified direction and synthesizes new surroundings.
    """
    user_id = current_user["_id"] if current_user else "anonymous"

    try:
        img_bytes = _decode_b64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    try:
        result = await image_router.outpaint(
            image_bytes=img_bytes,
            prompt=req.prompt,
            direction=req.direction
        )
    except Exception as e:
        logger.error(f"Outpaint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Outpainting failed: {str(e)}")

    saved = await _persist_and_format(
        image_bytes=result.image_bytes,
        mime_type=result.mime_type,
        width=result.width,
        height=result.height,
        provider=result.provider,
        model=result.model,
        prompt=req.prompt,
        user_id=user_id,
        project_id=req.project_id,
        metadata={"direction": req.direction, **result.metadata},
        db=db
    )
    return saved


@router.post("/variation")
async def create_variations(
    req: ImageVariationRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Synthesizes stylistic and compositional variations of an existing image.
    """
    user_id = current_user["_id"] if current_user else "anonymous"

    try:
        img_bytes = _decode_b64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    task = ImageVariationTask(
        image_bytes=img_bytes,
        prompt=req.prompt,
        num_variations=req.num_variations
    )

    try:
        results = await image_router.variation(task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Variation creation failed: {str(e)}")

    saved_items = []
    for res in results:
        item = await _persist_and_format(
            image_bytes=res.image_bytes,
            mime_type=res.mime_type,
            width=res.width,
            height=res.height,
            provider=res.provider,
            model=res.model,
            prompt=req.prompt or "Image Variation",
            user_id=user_id,
            project_id=req.project_id,
            metadata={"variation": True, **res.metadata},
            db=db
        )
        saved_items.append(item)

    return {"images": saved_items, "count": len(saved_items)}


@router.post("/upscale")
async def upscale_image(
    req: ImageUpscaleRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Super-resolution upscale (2x or 4x) with edge and texture restoration.
    """
    user_id = current_user["_id"] if current_user else "anonymous"

    try:
        img_bytes = _decode_b64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    task = ImageUpscaleTask(image_bytes=img_bytes, scale_factor=req.scale_factor)

    try:
        res = await image_router.upscale(task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upscale failed: {str(e)}")

    saved = await _persist_and_format(
        image_bytes=res.image_bytes,
        mime_type=res.mime_type,
        width=res.width,
        height=res.height,
        provider=res.provider,
        model=res.model,
        prompt="Super Resolution Upscale",
        user_id=user_id,
        project_id=req.project_id,
        metadata={"upscale_factor": req.scale_factor, **res.metadata},
        db=db
    )
    return saved


@router.post("/export-format")
async def export_image_format(req: ExportFormatRequest):
    """
    Converts and downloads image bytes in PNG, JPEG, or WebP.
    """
    try:
        img_bytes = _decode_b64(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    converted, mime = ImageEditorService.convert_format(
        image_bytes=img_bytes,
        target_format=req.format,
        quality=req.quality
    )

    return Response(
        content=converted,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="studio_export.{req.format.lower()}"'
        }
    )


@router.get("/history")
async def get_image_history(
    project_id: Optional[str] = None,
    limit: int = Query(default=30, le=100),
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieves history of generated images for the current user and/or project.
    """
    if db is None:
        return {"history": []}

    query: Dict[str, Any] = {"type": "IMAGE"}
    if current_user:
        query["user_id"] = current_user["_id"]
    if project_id:
        query["project_id"] = project_id

    cursor = db["assets"].find(query).sort("created_at", -1).limit(limit)
    assets = await cursor.to_list(length=limit)

    storage = get_storage_provider()
    results = []
    for a in assets:
        try:
            fresh_url = await storage.get_download_url(a["storage_key"])
        except Exception:
            fresh_url = a.get("url")

        results.append({
            "asset_id": a["_id"],
            "name": a["name"],
            "url": fresh_url,
            "width": a.get("metadata", {}).get("width", 1024),
            "height": a.get("metadata", {}).get("height", 1024),
            "provider": a.get("provider", "pollinations"),
            "model": a.get("model", "flux"),
            "prompt": a.get("prompt", ""),
            "created_at": a.get("created_at", ""),
            "metadata": a.get("metadata", {})
        })

    return {"history": results, "count": len(results)}
