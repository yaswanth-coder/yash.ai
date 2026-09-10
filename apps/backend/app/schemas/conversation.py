from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    file_path: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: str
    title: str
    pinned: bool = False
    archived: bool = False
    project_id: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None
    project_id: Optional[str] = None
