from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.scheduled_task import new_scheduled_task

router = APIRouter(
    prefix="/scheduled",
    tags=["Scheduled Tasks"]
)


class TaskCreateRequest(BaseModel):
    title: str
    prompt: str
    schedule: str = "daily"


class TaskResponse(BaseModel):
    id: str
    title: str
    prompt: str
    schedule: str
    enabled: bool
    last_run_at: Optional[datetime] = None
    created_at: datetime


@router.get("", response_model=List[TaskResponse])
@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    tasks = await (
        db["scheduled_tasks"]
        .find({"user_id": current_user["_id"]})
        .sort("created_at", -1)
        .to_list(None)
    )
    return [
        TaskResponse(
            id=t["_id"],
            title=t["title"],
            prompt=t["prompt"],
            schedule=t.get("schedule", "daily"),
            enabled=t.get("enabled", True),
            last_run_at=t.get("last_run_at"),
            created_at=t["created_at"]
        )
        for t in tasks
    ]


@router.post("", response_model=TaskResponse)
@router.post("/", response_model=TaskResponse)
async def create_task(
    body: TaskCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not body.title.strip() or not body.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title and prompt are required"
        )

    doc = new_scheduled_task(
        user_id=current_user["_id"],
        title=body.title.strip(),
        prompt=body.prompt.strip(),
        schedule=body.schedule,
        enabled=True
    )
    await db["scheduled_tasks"].insert_one(doc)
    return TaskResponse(
        id=doc["_id"],
        title=doc["title"],
        prompt=doc["prompt"],
        schedule=doc["schedule"],
        enabled=doc["enabled"],
        last_run_at=doc["last_run_at"],
        created_at=doc["created_at"]
    )


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    res = await db["scheduled_tasks"].delete_one({
        "_id": task_id,
        "user_id": current_user["_id"]
    })
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduled task not found"
        )
    return {"message": "Scheduled task deleted"}
