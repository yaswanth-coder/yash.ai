from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    file_path: Optional[str] = None
    model: Optional[str] = "auto"
    local_only: bool = False
    web_search: bool = True
    persona_id: Optional[str] = None
    project_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    fallback_used: bool = False
    original_provider: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None
    chart_images: Optional[List[str]] = None