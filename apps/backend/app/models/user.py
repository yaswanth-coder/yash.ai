import uuid
from datetime import datetime, timezone


def new_user(email: str, password_hash: str, full_name: str = None) -> dict:
    """Create a new user document for MongoDB insertion."""
    return {
        "_id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "full_name": full_name,
        "created_at": datetime.now(timezone.utc),
    }