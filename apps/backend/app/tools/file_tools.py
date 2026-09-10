import os
from typing import Dict, Any, List, Optional
from app.core.database import get_database


async def list_user_files(user_id: str, limit: int = 20) -> Dict[str, Any]:
    """
    List files and project assets belonging exclusively to the authenticated user.
    """
    db = get_database()
    assets = await (
        db["assets"]
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(None)
    )
    return {
        "count": len(assets),
        "files": [
            {
                "id": a["_id"],
                "name": a["name"],
                "type": a["type"],
                "size_bytes": a.get("size_bytes", 0),
                "url": a.get("url"),
                "project_id": a.get("project_id"),
                "created_at": str(a.get("created_at")),
            }
            for a in assets
        ]
    }


async def read_user_file_metadata(user_id: str, file_id: str) -> Dict[str, Any]:
    """
    Retrieve metadata and preview details for an asset belonging to the user.
    """
    db = get_database()
    asset = await db["assets"].find_one({"_id": file_id, "user_id": user_id})
    if not asset:
        return {"error": "File not found or unauthorized"}
    return {
        "id": asset["_id"],
        "name": asset["name"],
        "type": asset["type"],
        "url": asset.get("url"),
        "mime_type": asset.get("mime_type"),
        "size_bytes": asset.get("size_bytes", 0),
        "prompt": asset.get("prompt"),
        "metadata": asset.get("metadata", {}),
    }


async def delete_user_file(user_id: str, file_id: str) -> Dict[str, Any]:
    """
    Delete a user asset. Requires explicit human confirmation.
    """
    db = get_database()
    asset = await db["assets"].find_one({"_id": file_id, "user_id": user_id})
    if not asset:
        return {"error": "File not found or unauthorized"}

    # Delete asset doc
    await db["assets"].delete_one({"_id": file_id, "user_id": user_id})
    return {"success": True, "deleted_id": file_id, "name": asset["name"]}
