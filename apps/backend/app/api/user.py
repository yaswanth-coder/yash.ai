from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Account & Privacy"]
)


@router.get("/export")
async def export_user_data(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Export complete user data including conversations, messages, memories, projects."""
    user_id = current_user["_id"]

    conversations = await db["conversations"].find({"user_id": user_id}).to_list(None)
    conv_ids = [c["_id"] for c in conversations]
    messages = await db["messages"].find({"conversation_id": {"$in": conv_ids}}).to_list(None)
    memories = await db["memories"].find({"user_id": user_id}).to_list(None)
    projects = await db["projects"].find({"user_id": user_id}).to_list(None)
    tasks = await db["scheduled_tasks"].find({"user_id": user_id}).to_list(None)

    def clean_docs(docs):
        res = []
        for d in docs:
            copy = dict(d)
            if "_id" in copy:
                copy["id"] = copy.pop("_id")
            for k, v in copy.items():
                if hasattr(v, "isoformat"):
                    copy[k] = v.isoformat()
            res.append(copy)
        return res

    return {
        "user": {
            "id": current_user["_id"],
            "email": current_user["email"],
            "full_name": current_user.get("full_name", ""),
            "created_at": current_user["created_at"].isoformat() if hasattr(current_user["created_at"], "isoformat") else str(current_user["created_at"]),
        },
        "conversations": clean_docs(conversations),
        "messages": clean_docs(messages),
        "memories": clean_docs(memories),
        "projects": clean_docs(projects),
        "scheduled_tasks": clean_docs(tasks),
    }


@router.delete("/account")
async def delete_user_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Permanently delete user account and all associated resources."""
    user_id = current_user["_id"]

    conversations = await db["conversations"].find({"user_id": user_id}).to_list(None)
    conv_ids = [c["_id"] for c in conversations]

    await db["messages"].delete_many({"conversation_id": {"$in": conv_ids}})
    await db["conversations"].delete_many({"user_id": user_id})
    await db["memories"].delete_many({"user_id": user_id})
    await db["projects"].delete_many({"user_id": user_id})
    await db["scheduled_tasks"].delete_many({"user_id": user_id})
    await db["user_settings"].delete_many({"user_id": user_id})
    await db["feedbacks"].delete_many({"user_id": user_id})
    await db["users"].delete_one({"_id": user_id})

    return {"message": "Account and all associated data permanently deleted."}
