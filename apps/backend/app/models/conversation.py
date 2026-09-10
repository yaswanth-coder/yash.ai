import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def new_conversation(
    user_id: str,
    title: str = "New Chat",
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "project_id": project_id,
        "pinned": False,
        "archived": False,
        "summary": None,
        "created_at": now,
        "updated_at": now,
    }
