import os
import mimetypes
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.schemas.asset import (
    AssetResponse,
    AssetUpdateRequest,
    PresignedUploadRequest,
    PresignedUploadResponse
)
from app.models.asset import new_asset
from app.services.storage.factory import get_storage_provider
from app.services.storage.s3_storage import S3StorageProvider
from pathlib import Path

router = APIRouter(
    prefix="/assets",
    tags=["Universal Assets"]
)


def _to_asset_response(doc: dict, fresh_url: Optional[str] = None) -> AssetResponse:
    return AssetResponse(
        id=doc["_id"],
        user_id=doc["user_id"],
        project_id=doc["project_id"],
        type=doc["type"],
        name=doc["name"],
        storage_key=doc["storage_key"],
        url=fresh_url or doc["url"],
        thumbnail_url=doc.get("thumbnail_url"),
        size_bytes=doc.get("size_bytes", 0),
        mime_type=doc.get("mime_type", "application/octet-stream"),
        provider=doc.get("provider", "local"),
        model=doc.get("model", "default"),
        prompt=doc.get("prompt", ""),
        metadata=doc.get("metadata", {}),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/upload", response_model=AssetResponse)
async def upload_asset(
    project_id: str = Form(...),
    name: str = Form(...),
    asset_type: str = Form("IMAGE"),
    prompt: Optional[str] = Form(None),
    provider_name: Optional[str] = Form("local"),
    model_name: Optional[str] = Form("default"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Upload an asset directly through the API and persist it to the Universal Asset Engine.
    """
    # Verify project exists and belongs to current user
    project = await db["projects"].find_one({
        "_id": project_id,
        "user_id": current_user["_id"]
    })
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized access"
        )

    storage = get_storage_provider()
    ext = os.path.splitext(file.filename or "")[1]
    safe_name = "".join(c for c in (name or "asset") if c.isalnum() or c in "._- ")
    storage_key = f"projects/{project_id}/assets/{safe_name}{ext}"

    # Determine content type
    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

    # Upload using storage provider
    url = await storage.upload(file.file, storage_key, content_type=content_type)
    size_bytes = file.size or 0

    doc = new_asset(
        user_id=current_user["_id"],
        project_id=project_id,
        asset_type=asset_type,
        name=name.strip(),
        storage_key=storage_key,
        url=url,
        size_bytes=size_bytes,
        mime_type=content_type,
        provider=provider_name or "local",
        model=model_name or "default",
        prompt=prompt,
        metadata={"filename": file.filename, "content_type": content_type}
    )

    await db["assets"].insert_one(doc)

    # Update project timestamp
    await db["projects"].update_one(
        {"_id": project_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )

    return _to_asset_response(doc, fresh_url=url)


@router.post("/presign-upload", response_model=PresignedUploadResponse)
async def presign_upload(
    req: PresignedUploadRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Generate an S3 presigned PUT URL for direct browser-to-S3 asset uploads.
    Fallback returns a direct upload target if local storage is active.
    """
    project = await db["projects"].find_one({
        "_id": req.project_id,
        "user_id": current_user["_id"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    storage = get_storage_provider()
    storage_key = f"projects/{req.project_id}/assets/{req.name}"

    if isinstance(storage, S3StorageProvider):
        res = await storage.generate_presigned_upload_url(storage_key, req.content_type)
        return PresignedUploadResponse(
            upload_url=res["upload_url"],
            storage_key=res["storage_key"],
            method="PUT"
        )
    else:
        # Local fallback route
        return PresignedUploadResponse(
            upload_url=f"/assets/upload",
            storage_key=storage_key,
            method="POST"
        )


@router.get("/project/{project_id}", response_model=List[AssetResponse])
async def list_project_assets(
    project_id: str,
    asset_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all assets belonging to a given project for the authenticated user.
    """
    project = await db["projects"].find_one({
        "_id": project_id,
        "user_id": current_user["_id"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = {"project_id": project_id, "user_id": current_user["_id"]}
    if asset_type:
        query["type"] = asset_type.upper()

    assets = await db["assets"].find(query).sort("created_at", -1).to_list(None)
    storage = get_storage_provider()

    results = []
    for a in assets:
        # Refresh download url dynamically
        try:
            fresh_url = await storage.get_download_url(a["storage_key"])
        except Exception:
            fresh_url = a.get("url")
        results.append(_to_asset_response(a, fresh_url=fresh_url))

    return results


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get detailed asset metadata and freshly resolved download URL.
    """
    asset = await db["assets"].find_one({
        "_id": asset_id,
        "user_id": current_user["_id"]
    })
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    storage = get_storage_provider()
    try:
        fresh_url = await storage.get_download_url(asset["storage_key"])
    except Exception:
        fresh_url = asset.get("url")

    return _to_asset_response(asset, fresh_url=fresh_url)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Permanently delete an asset and purge its data from storage.
    """
    asset = await db["assets"].find_one({
        "_id": asset_id,
        "user_id": current_user["_id"]
    })
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    storage = get_storage_provider()
    await storage.delete(asset["storage_key"])
    await db["assets"].delete_one({"_id": asset_id})

    return {"message": "Asset successfully deleted", "id": asset_id}


@router.get("/raw/{path:path}")
async def serve_raw_asset(path: str):
    """
    Streaming endpoint for locally stored assets.
    """
    base_dir = Path("uploads/assets")
    clean_path = path.lstrip("/\\").replace("..", "_")
    target_path = base_dir / clean_path

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Asset file not found")

    content_type = mimetypes.guess_type(target_path.name)[0] or "application/octet-stream"
    return FileResponse(target_path, media_type=content_type)
