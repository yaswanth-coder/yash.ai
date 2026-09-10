import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def new_scheduled_task(
    user_id: str,
    title: str,
    prompt: str,
    schedule: str = "daily",  # "hourly", "daily", "weekly"
    enabled: bool = True
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "prompt": prompt,
        "schedule": schedule,
        "enabled": enabled,
        "last_run_at": None,
        "created_at": now,
        "updated_at": now,
    }
