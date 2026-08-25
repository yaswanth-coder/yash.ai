from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.gemini import generate_response
from app.services.file_service import process_file_content

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not request.message and not request.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message or file attachment is required"
        )
        
    conversation = None
    history = []
    
    # 1. Fetch or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
        if conversation:
            # Build conversation history for Gemini
            past_messages = (
                db.query(Message)
                .filter(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.asc())
                .all()
            )
            for m in past_messages:
                history.append({
                    "role": m.role,
                    "content": m.content
                })
    elif current_user:
        # Generate initial title from first message
        title_summary = request.message[:30] + "..." if len(request.message) > 30 else request.message
        conversation = Conversation(
            user_id=current_user.id,
            title=title_summary or "New Chat"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Process file attachment if present
    file_info = None
    if request.file_path:
        file_info = process_file_content(request.file_path)

    # 3. Save user message to database if conversation exists
    if conversation:
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.message,
            file_path=request.file_path
        )
        db.add(user_msg)
        db.commit()

    # 4. Generate AI response from Gemini using google.genai SDK
    try:
        ai_reply = await generate_response(
            message=request.message,
            history=history,
            file_info=file_info
        )
    except Exception as e:
        print(f"Gemini API Error: {e}")
        ai_reply = "I apologize, but I encountered an error reaching Gemini. Please verify your connection or try again."

    # 5. Save assistant message to database if conversation exists
    if conversation:
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=ai_reply
        )
        db.add(assistant_msg)
        db.commit()

    return ChatResponse(
        response=ai_reply,
        conversation_id=conversation.id if conversation else None
    )