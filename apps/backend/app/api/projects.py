from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.project import new_project

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = "general"
    workspace: Optional[str] = "all"


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    category: str = "general"
    workspace: str = "all"
    files: List[str] = []
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=List[ProjectResponse])
@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    projects = await (
        db["projects"]
        .find({"user_id": current_user["_id"]})
        .sort("updated_at", -1)
        .to_list(None)
    )
    return [
        ProjectResponse(
            id=p["_id"],
            name=p["name"],
            description=p.get("description", ""),
            tags=p.get("tags", []),
            category=p.get("category", "general"),
            workspace=p.get("workspace", "all"),
            files=p.get("files", []),
            created_at=p["created_at"],
            updated_at=p["updated_at"]
        )
        for p in projects
    ]


@router.post("", response_model=ProjectResponse)
@router.post("/", response_model=ProjectResponse)
async def create_project(
    body: ProjectCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not body.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name is required"
        )
    doc = new_project(
        user_id=current_user["_id"],
        name=body.name.strip(),
        description=body.description,
        tags=body.tags,
        category=body.category or "general",
        workspace=body.workspace or "all"
    )
    await db["projects"].insert_one(doc)
    return ProjectResponse(
        id=doc["_id"],
        name=doc["name"],
        description=doc["description"],
        tags=doc["tags"],
        category=doc["category"],
        workspace=doc["workspace"],
        files=doc["files"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"]
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    project = await db["projects"].find_one({
        "_id": project_id,
        "user_id": current_user["_id"]
    })
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return ProjectResponse(
        id=project["_id"],
        name=project["name"],
        description=project.get("description", ""),
        tags=project.get("tags", []),
        category=project.get("category", "general"),
        workspace=project.get("workspace", "all"),
        files=project.get("files", []),
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    res = await db["projects"].delete_one({
        "_id": project_id,
        "user_id": current_user["_id"]
    })
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return {"message": "Project deleted successfully"}
