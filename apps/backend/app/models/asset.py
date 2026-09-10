import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def new_asset(
    user_id: str,
    project_id: str,
    asset_type: str,
    name: str,
    storage_key: str,
    url: str,
    size_bytes: int = 0,
    mime_type: str = "application/octet-stream",
    thumbnail_url: Optional[str] = None,
    provider: str = "local",
    model: str = "default",
    prompt: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Creates a new universal asset document for MongoDB insertion.
    Asset types: IMAGE, VIDEO, AUDIO, MODEL_3D, DOCUMENT, CODE, CANVAS, OTHER.
    """
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "project_id": project_id,
        "type": asset_type.upper(),
        "name": name,
        "storage_key": storage_key,
        "url": url,
        "thumbnail_url": thumbnail_url,
        "size_bytes": size_bytes,
        "mime_type": mime_type,
        "provider": provider,
        "model": model,
        "prompt": prompt or "",
        "metadata": metadata or {},
        "created_at": now,
        "updated_at": now,
    }
