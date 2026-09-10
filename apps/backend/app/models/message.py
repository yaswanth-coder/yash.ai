import uuid
from datetime import datetime, timezone


def new_message(conversation_id: str, role: str, content: str, file_path: str = None) -> dict:
    """Create a new message document for MongoDB insertion."""
    return {
        "_id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": role,           # "user" or "assistant"
        "content": content,
        "file_path": file_path,
        "created_at": datetime.now(timezone.utc),
    }
