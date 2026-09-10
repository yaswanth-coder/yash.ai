from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.feedback import new_feedback

router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)


class FeedbackRequest(BaseModel):
    message_id: str
    feedback_type: str  # "positive" or "negative"
    comment: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    body: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if body.feedback_type not in ("positive", "negative"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="feedback_type must be 'positive' or 'negative'"
        )

    doc = new_feedback(
        user_id=current_user["_id"],
        message_id=body.message_id,
        feedback_type=body.feedback_type,
        comment=body.comment
    )
    await db["feedbacks"].insert_one(doc)
    return {"message": "Feedback recorded successfully", "id": doc["_id"]}
