import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional


def new_feedback(
    user_id: str,
    message_id: str,
    feedback_type: str,  # "positive", "negative"
    comment: Optional[str] = None
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "message_id": message_id,
        "feedback_type": feedback_type,
        "comment": comment or "",
        "created_at": now,
    }
