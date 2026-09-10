from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class MemoryItem(BaseModel):
    id: str
    fact: str
    category: Optional[str] = "preference"  # preference, skill, project, custom
    source: Optional[str] = "chat"  # chat, training, manual
    created_at: datetime


class CreateMemoryRequest(BaseModel):
    fact: str
    category: Optional[str] = "custom"


class MemorySettingsRequest(BaseModel):
    learning_enabled: bool


class MemorySettingsResponse(BaseModel):
    learning_enabled: bool
    total_memories: int


class TrainHistoryResponse(BaseModel):
    extracted_count: int
    memories: List[MemoryItem]
    message: str
