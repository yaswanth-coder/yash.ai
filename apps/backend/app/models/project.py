import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def new_project(
    user_id: str,
    name: str,
    description: Optional[str] = None,
    tags: Optional[list] = None,
    category: str = "general",
    workspace: Optional[str] = None
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "description": description or "",
        "tags": tags or [],
        "category": category,
        "workspace": workspace or "all",
        "files": [],
        "created_at": now,
        "updated_at": now,
    }

