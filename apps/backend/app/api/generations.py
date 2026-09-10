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
