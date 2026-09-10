from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models.conversation import new_conversation
from app.schemas.conversation import (
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    UpdateConversationRequest,
)

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"]
)


@router.get("", response_model=List[ConversationResponse])
@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    archived: bool = False,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not current_user:
        return []
    query = {"user_id": current_user["_id"], "archived": archived}
    conversations = await (
        db["conversations"]
        .find(query)
        .sort([("pinned", -1), ("updated_at", -1)])
        .to_list(None)
    )
    return [
        ConversationResponse(
            id=c["_id"],
            title=c["title"],
            pinned=c.get("pinned", False),
            archived=c.get("archived", False),
            project_id=c.get("project_id"),
            summary=c.get("summary"),
            created_at=c["created_at"],
            updated_at=c["updated_at"]
        )
        for c in conversations
    ]


@router.post("", response_model=ConversationResponse)
@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    title: Optional[str] = "New Chat",
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    doc = new_conversation(
        user_id=current_user["_id"],
        title=title or "New Chat",
        project_id=project_id
    )
    await db["conversations"].insert_one(doc)
    return ConversationResponse(
        id=doc["_id"],
        title=doc["title"],
        pinned=doc.get("pinned", False),
        archived=doc.get("archived", False),
        project_id=doc.get("project_id"),
        summary=doc.get("summary"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"]
    )


@router.get("/search", response_model=List[ConversationResponse])
@router.get("/search/", response_model=List[ConversationResponse])
async def search_conversations(
    q: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search conversations and message content for the user."""
    if not q or not q.strip():
        return []

    regex_pattern = f".*{q.strip()}.*"

    # 1. Search conversation titles
    matched_convs = await (
        db["conversations"]
        .find({
            "user_id": current_user["_id"],
            "title": {"$regex": regex_pattern, "$options": "i"}
        })
        .to_list(20)
    )

    # 2. Search message contents
    matched_msgs = await (
        db["messages"]
        .find({"content": {"$regex": regex_pattern, "$options": "i"}})
        .to_list(50)
    )
    matched_conv_ids = set([c["_id"] for c in matched_convs] + [m["conversation_id"] for m in matched_msgs])

    final_convs = await (
        db["conversations"]
        .find({
            "_id": {"$in": list(matched_conv_ids)},
            "user_id": current_user["_id"]
        })
        .sort("updated_at", -1)
        .to_list(20)
    )

    return [
        ConversationResponse(
            id=c["_id"],
            title=c["title"],
            pinned=c.get("pinned", False),
            archived=c.get("archived", False),
            project_id=c.get("project_id"),
            summary=c.get("summary"),
            created_at=c["created_at"],
            updated_at=c["updated_at"]
        )
        for c in final_convs
    ]


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    conversation = await db["conversations"].find_one({"_id": conversation_id})
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if current_user and conversation["user_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )

    messages_raw = await (
        db["messages"]
        .find({"conversation_id": conversation_id})
        .sort("created_at", 1)
        .to_list(None)
    )
    messages = [
        MessageResponse(
            id=m["_id"],
            role=m["role"],
            content=m["content"],
            file_path=m.get("file_path"),
            provider=m.get("provider"),
            model=m.get("model"),
            created_at=m["created_at"]
        )
        for m in messages_raw
    ]

    return ConversationDetailResponse(
        id=conversation["_id"],
        title=conversation["title"],
        pinned=conversation.get("pinned", False),
        archived=conversation.get("archived", False),
        project_id=conversation.get("project_id"),
        summary=conversation.get("summary"),
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        messages=messages
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    body: UpdateConversationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    conv = await db["conversations"].find_one({
        "_id": conversation_id,
        "user_id": current_user["_id"]
    })
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    updates = {}
    if body.title is not None:
        updates["title"] = body.title.strip()
    if body.pinned is not None:
        updates["pinned"] = body.pinned
    if body.archived is not None:
        updates["archived"] = body.archived
    if body.project_id is not None:
        updates["project_id"] = body.project_id
    updates["updated_at"] = datetime.now(timezone.utc)

    await db["conversations"].update_one(
        {"_id": conversation_id},
        {"$set": updates}
    )

    updated_conv = await db["conversations"].find_one({"_id": conversation_id})
    return ConversationResponse(
        id=updated_conv["_id"],
        title=updated_conv["title"],
        pinned=updated_conv.get("pinned", False),
        archived=updated_conv.get("archived", False),
        project_id=updated_conv.get("project_id"),
        summary=updated_conv.get("summary"),
        created_at=updated_conv["created_at"],
        updated_at=updated_conv["updated_at"]
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db["conversations"].find_one(
        {"_id": conversation_id, "user_id": current_user["_id"]}
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    await db["conversations"].delete_one({"_id": conversation_id})
    await db["messages"].delete_many({"conversation_id": conversation_id})
    return {"message": "Conversation deleted successfully"}
