from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.memory import (
    MemoryItem,
    CreateMemoryRequest,
    MemorySettingsRequest,
    MemorySettingsResponse,
    TrainHistoryResponse,
)
from app.memory.memory_service import (
    get_user_memories,
    add_user_memory,
    delete_user_memory,
    clear_user_memories,
    train_on_user_history,
)

router = APIRouter(
    prefix="/memory",
    tags=["Memory & Continuous Learning"]
)


@router.get("", response_model=List[MemoryItem])
@router.get("/", response_model=List[MemoryItem])
async def list_memories(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all memories and learned facts for the authenticated user."""
    memories = await get_user_memories(current_user["_id"], db)
    return [
        MemoryItem(
            id=m["id"],
            fact=m["fact"],
            category=m["category"],
            source=m["source"],
            created_at=m["created_at"],
        )
        for m in memories
    ]


@router.post("", response_model=MemoryItem)
@router.post("/", response_model=MemoryItem)
async def create_memory(
    body: CreateMemoryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add a custom personal memory or instruction."""
    if not body.fact.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory fact cannot be empty"
        )
    
    memory = await add_user_memory(
        user_id=current_user["_id"],
        fact=body.fact,
        category=body.category or "custom",
        source="manual",
        db=db
    )
    return MemoryItem(
        id=memory["id"],
        fact=memory["fact"],
        category=memory["category"],
        source=memory["source"],
        created_at=memory["created_at"],
    )


@router.post("/train", response_model=TrainHistoryResponse)
async def train_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Analyze the user's historical chat messages to extract personalized memories,
    tech preferences, and instructions to train future AI responses.
    Marks the user's one-time training status as completed.
    """
    memories = await train_on_user_history(current_user["_id"], db)
    now = datetime.now(timezone.utc)
    await db["user_settings"].update_one(
        {"user_id": current_user["_id"]},
        {"$set": {"has_trained": True, "last_trained_at": now}},
        upsert=True
    )
    memory_items = [
        MemoryItem(
            id=m["id"],
            fact=m["fact"],
            category=m["category"],
            source=m["source"],
            created_at=m["created_at"],
        )
        for m in memories
    ]
    return TrainHistoryResponse(
        extracted_count=len(memory_items),
        memories=memory_items,
        message=f"Successfully analyzed conversation history. AI is now personalized with {len(memory_items)} learned memories."
    )


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a specific memory item."""
    success = await delete_user_memory(current_user["_id"], memory_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory item not found"
        )
    return {"message": "Memory deleted successfully"}


@router.delete("/clear/all")
async def clear_all_memories(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Clear all memories for the authenticated user."""
    count = await clear_user_memories(current_user["_id"], db)
    return {"message": f"Cleared {count} memories successfully"}


@router.get("/settings", response_model=MemorySettingsResponse)
async def get_memory_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get the user's current memory and learning preferences, including training status."""
    settings_doc = await db["user_settings"].find_one({"user_id": current_user["_id"]})
    enabled = settings_doc.get("learning_enabled", True) if settings_doc else True
    has_trained = settings_doc.get("has_trained", False) if settings_doc else False
    last_trained = settings_doc.get("last_trained_at") if settings_doc else None
    memories = await get_user_memories(current_user["_id"], db)
    return MemorySettingsResponse(
        learning_enabled=enabled,
        total_memories=len(memories),
        has_trained=has_trained,
        last_trained_at=last_trained,
    )


@router.put("/settings", response_model=MemorySettingsResponse)
async def update_memory_settings(
    body: MemorySettingsRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Toggle continuous learning and memory on/off."""
    await db["user_settings"].update_one(
        {"user_id": current_user["_id"]},
        {"$set": {"learning_enabled": body.learning_enabled}},
        upsert=True
    )
    settings_doc = await db["user_settings"].find_one({"user_id": current_user["_id"]})
    has_trained = settings_doc.get("has_trained", False) if settings_doc else False
    last_trained = settings_doc.get("last_trained_at") if settings_doc else None
    memories = await get_user_memories(current_user["_id"], db)
    return MemorySettingsResponse(
        learning_enabled=body.learning_enabled,
        total_memories=len(memories),
        has_trained=has_trained,
        last_trained_at=last_trained,
    )
