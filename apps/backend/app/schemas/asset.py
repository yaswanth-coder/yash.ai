from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class AssetResponse(BaseModel):
    id: str
    user_id: str
    project_id: str
    type: str
    name: str
    storage_key: str
    url: str
    thumbnail_url: Optional[str] = None
    size_bytes: int = 0
    mime_type: str = "application/octet-stream"
    provider: str = "local"
    model: str = "default"
    prompt: Optional[str] = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class AssetUpdateRequest(BaseModel):
    name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PresignedUploadRequest(BaseModel):
    project_id: str
    name: str
    asset_type: str
    content_type: str = "application/octet-stream"


class PresignedUploadResponse(BaseModel):
    upload_url: str
    storage_key: str
    method: str = "PUT"
