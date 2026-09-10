from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class GenerationJobCreateRequest(BaseModel):
    project_id: str
    workspace: str
    provider: Optional[str] = "pollinations"
    model: Optional[str] = "flux"
    input_params: Dict[str, Any] = Field(default_factory=dict)


class GenerationJobResponse(BaseModel):
    id: str
    job_id: str
    user_id: str
    project_id: str
    workspace: str
    provider: str
    model: str
    status: str
    progress: int
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output_asset_ids: List[str] = Field(default_factory=list)
    output_urls: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
