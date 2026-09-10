from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.generation_job import (
    GenerationJobCreateRequest,
    GenerationJobResponse
)
from app.services.generation_queue import get_generation_queue, GenerationQueueService

router = APIRouter(
    prefix="/generations",
    tags=["Generation Jobs Queue"]
)


def _to_job_response(doc: dict) -> GenerationJobResponse:
    return GenerationJobResponse(
        id=doc["_id"],
        job_id=doc["job_id"],
        user_id=doc["user_id"],
        project_id=doc["project_id"],
        workspace=doc["workspace"],
        provider=doc["provider"],
        model=doc["model"],
        status=doc["status"],
        progress=doc.get("progress", 0),
        input_params=doc.get("input_params", {}),
        output_asset_ids=doc.get("output_asset_ids", []),
        output_urls=doc.get("output_urls", []),
        error=doc.get("error"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        completed_at=doc.get("completed_at")
    )


@router.post("/jobs", response_model=GenerationJobResponse)
async def submit_generation_job(
    body: GenerationJobCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    queue: GenerationQueueService = Depends(get_generation_queue)
):
    """
    Enqueue an expensive generation job (Image, Video, 3D, Audio).
    Returns immediately with a QUEUED status.
    """
    # Verify project exists and belongs to user
    project = await db["projects"].find_one({
        "_id": body.project_id,
        "user_id": current_user["_id"]
    })
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )

    job_doc = await queue.submit_job(
        user_id=current_user["_id"],
        project_id=body.project_id,
        workspace=body.workspace,
        provider=body.provider or "pollinations",
        model=body.model or "flux",
        input_params=body.input_params
    )

    return _to_job_response(job_doc)


@router.get("/jobs/{job_id}", response_model=GenerationJobResponse)
async def get_generation_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Poll the current status, percentage progress, and output asset links of a generation job.
    """
    job = await db["generation_jobs"].find_one({
        "_id": job_id,
        "user_id": current_user["_id"]
    })
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found"
        )

    return _to_job_response(job)


@router.post("/jobs/{job_id}/cancel")
async def cancel_generation_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    queue: GenerationQueueService = Depends(get_generation_queue)
):
    """
    Cancel an active or queued generation job.
    """
    cancelled = await queue.cancel_job(job_id=job_id, user_id=current_user["_id"])
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job cannot be cancelled (either already completed, failed, or not found)."
        )
    return {"message": "Job successfully cancelled", "job_id": job_id}


@router.get("/project/{project_id}", response_model=List[GenerationJobResponse])
async def list_project_generation_jobs(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all generation jobs created under a project.
    """
    jobs = await (
        db["generation_jobs"]
        .find({"project_id": project_id, "user_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(None)
    )
    return [_to_job_response(j) for j in jobs]


from pydantic import BaseModel

class EnhancePromptRequest(BaseModel):
    prompt: str
    style: Optional[str] = "Photorealistic"

class EnhancePromptResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str

class SyncImageGenerateRequest(BaseModel):
    project_id: str
    prompt: str
    negative_prompt: Optional[str] = None
    aspect_ratio: Optional[str] = "1:1"
    style: Optional[str] = "Photorealistic"
    seed: Optional[int] = None
    model: Optional[str] = None
    provider: Optional[str] = None


@router.post("/enhance-prompt", response_model=EnhancePromptResponse)
async def enhance_prompt(
    body: EnhancePromptRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Enriches a brief user prompt into a high-detail cinematic vision description.
    """
    p = body.prompt.strip()
    style = body.style or "Photorealistic"
    
    try:
        from app.services.providers.router import ProviderRouter
        router_svc = ProviderRouter()
        instruction = (
            f"You are Yash.AI's creative visual prompt director. Take this short prompt: '{p}'. "
            f"Style: {style}. Enhance it into a single rich, visually striking text-to-image prompt. "
            f"Describe lighting, lens, mood, textures, depth of field, and compositional details. "
            f"Output ONLY the prompt text, without quotes or intro."
        )
        response_text = ""
        async for chunk in router_svc.route_generate_stream([{"role": "user", "content": instruction}], user_id=current_user["_id"]):
            response_text += chunk
        
        enhanced = response_text.strip().strip('"')
        if not enhanced or len(enhanced) < 10:
            enhanced = f"{p}, masterpiece, hyperrealistic {style} aesthetic, cinematic lighting, volumetric atmosphere, 8k octane render detail"
    except Exception:
        enhanced = f"{p}, highly detailed, {style} visual aesthetic, soft cinematic lighting, intricate textures, 8k resolution"

    return EnhancePromptResponse(
        original_prompt=p,
        enhanced_prompt=enhanced
    )


@router.post("/generate-image-sync")
async def generate_image_sync(
    body: SyncImageGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Synchronously generate an image asset and immediately return the persistent asset and download URL.
    """
    from app.services.image_generation import get_image_generation_service
    service = get_image_generation_service()

    result = await service.generate_and_save_image(
        user_id=current_user["_id"],
        project_id=body.project_id,
        prompt=body.prompt,
        negative_prompt=body.negative_prompt,
        aspect_ratio=body.aspect_ratio or "1:1",
        style=body.style or "Photorealistic",
        seed=body.seed,
        model=body.model,
        provider=body.provider
    )
    return result



@router.get("/queue/status")
async def get_queue_status(
    current_user: dict = Depends(get_current_user),
    queue: GenerationQueueService = Depends(get_generation_queue)
):
    """
    Returns real-time worker and queue processing metrics.
    """
    return {
        "status": "healthy",
        "active_jobs": len(queue._running_tasks) if hasattr(queue, "_running_tasks") else 0,
        "queued_jobs": queue.job_queue.qsize() if hasattr(queue, "job_queue") else 0,
        "max_concurrent": getattr(queue, "max_concurrent_jobs", 3)
    }
