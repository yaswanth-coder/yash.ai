import json
import asyncio
from typing import Optional, AsyncGenerator
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.conversation import new_conversation
from app.models.message import new_message
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.file_service import process_file_content
from app.services.providers.router import get_router, ProviderRouter
from app.agents.orchestrator import get_orchestrator, AgentOrchestrator
from app.memory.memory_service import (
    get_memory_context_string,
    auto_extract_memory_from_turn,
)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

BASE_SYSTEM_INSTRUCTION = """You are **Yash.AI**, an advanced, articulate, and intelligent AI personal assistant and pair programmer.
Your goal is to provide exceptionally clear, thoughtful, accurate, and structured answers tailored to the user's needs.

### Output Formatting & Style Guidelines:
1. **Direct & Uncompromising**:
   - Never begin responses with polite conversational filler or preambles (e.g. do NOT say "Sure!", "Certainly!", "Here are the updates", "I'd be happy to help", or "Below is the information").
   - Jump directly into the substantive content immediately.
2. **Scannable & Structured**:
   - Use bold topic lead-ins for key points, news, and summaries (e.g. `**Topic / Event Headline:** Detailed explanation...`).
   - Group information into clean, logical sections using markdown headers (`### Topic`) and bulleted lists.
   - Separate distinct ideas with clean paragraph breaks so the text is comfortable to read.
3. **Code Excellence**:
   - Always write clean, production-grade code in properly tagged fenced code blocks (e.g. ```python, ```typescript, ```sql).
   - Avoid redundant boilerplate and include concise inline comments.
4. **Context & Continuity**: Seamlessly incorporate past context and learned preferences to provide deeply personalized responses."""


@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    router_service: ProviderRouter = Depends(get_router),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
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
        conversation = await db["conversations"].find_one({"_id": request.conversation_id})
        if conversation:
            past_messages = await (
                db["messages"]
                .find({"conversation_id": conversation["_id"]})
                .sort("created_at", 1)
                .to_list(None)
            )
            for m in past_messages:
                history.append({"role": m["role"], "content": m["content"]})

    elif current_user:
        title_summary = (request.message[:30] + "...") if len(request.message) > 30 else request.message
        doc = new_conversation(
            user_id=current_user["_id"],
            title=title_summary or "New Chat",
            project_id=request.project_id
        )
        await db["conversations"].insert_one(doc)
        conversation = doc

    # 2. Process file attachment if present
    file_info = None
    if request.file_path:
        file_info = process_file_content(request.file_path)

    # 3. Save user message to database
    if conversation:
        user_msg = new_message(
            conversation_id=conversation["_id"],
            role="user",
            content=request.message,
            file_path=request.file_path
        )
        await db["messages"].insert_one(user_msg)

    # 4. Safe Tool & Web Search & Python Sandbox Execution
    tool_context, sources, chart_images = await orchestrator.execute_pre_chat_tools(
        message=request.message,
        web_search_enabled=request.web_search and not request.local_only,
        python_exec_enabled=True,
        rag_enabled=True,
    )

    # 5. Retrieve learned user memory context
    memory_context = ""
    if current_user and not request.local_only:
        memory_context = await get_memory_context_string(current_user["_id"], db)

    # 6. Compose system prompt
    full_system_prompt = BASE_SYSTEM_INSTRUCTION
    if memory_context:
        full_system_prompt += f"\n\n{memory_context}"
    if tool_context:
        full_system_prompt += f"\n\n{tool_context}"

    # 7. Route request through AI Gateway
    try:
        route_res = await router_service.generate_response(
            message=request.message,
            history=history,
            system_prompt=full_system_prompt,
            file_info=file_info,
            requested_model=request.model,
            local_only=request.local_only,
        )
        ai_reply = route_res["response"]
        provider_used = route_res.get("provider")
        model_used = route_res.get("model")
        fallback_used = route_res.get("fallback_used", False)
        original_provider = route_res.get("original_provider")
    except Exception as e:
        ai_reply = f"I apologize, but I encountered an error: {str(e)}"
        provider_used = "error"
        model_used = "none"
        fallback_used = False
        original_provider = None

    # 8. Save assistant message and update conversation
    if conversation:
        assistant_msg = new_message(
            conversation_id=conversation["_id"],
            role="assistant",
            content=ai_reply
        )
        assistant_msg["provider"] = provider_used
        assistant_msg["model"] = model_used
        await db["messages"].insert_one(assistant_msg)
        await db["conversations"].update_one(
            {"_id": conversation["_id"]},
            {"$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    # 9. Asynchronous memory extraction
    if current_user and request.message and not request.local_only:
        asyncio.create_task(
            auto_extract_memory_from_turn(
                user_id=current_user["_id"],
                user_message=request.message,
                assistant_reply=ai_reply,
                db=db
            )
        )

    return ChatResponse(
        response=ai_reply,
        conversation_id=conversation["_id"] if conversation else None,
        provider=provider_used,
        model=model_used,
        fallback_used=fallback_used,
        original_provider=original_provider,
        sources=sources if sources else None,
        chart_images=chart_images if chart_images else None,
    )


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    router_service: ProviderRouter = Depends(get_router),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator)
):
    """
    Server-Sent Events (SSE) Streaming endpoint for progressive token delivery.
    """
    if not request.message and not request.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message or file attachment is required"
        )

    conversation = None
    history = []

    if request.conversation_id:
        conversation = await db["conversations"].find_one({"_id": request.conversation_id})
        if conversation:
            past_messages = await (
                db["messages"]
                .find({"conversation_id": conversation["_id"]})
                .sort("created_at", 1)
                .to_list(None)
            )
            for m in past_messages:
                history.append({"role": m["role"], "content": m["content"]})
    elif current_user:
        title_summary = (request.message[:30] + "...") if len(request.message) > 30 else request.message
        doc = new_conversation(
            user_id=current_user["_id"],
            title=title_summary or "New Chat",
            project_id=request.project_id
        )
        await db["conversations"].insert_one(doc)
        conversation = doc

    file_info = None
    if request.file_path:
        file_info = process_file_content(request.file_path)

    if conversation:
        user_msg = new_message(
            conversation_id=conversation["_id"],
            role="user",
            content=request.message,
            file_path=request.file_path
        )
        await db["messages"].insert_one(user_msg)

    tool_context, sources, chart_images = "", [], []
    try:
        tool_context, sources, chart_images = await orchestrator.execute_pre_chat_tools(
            message=request.message,
            web_search_enabled=request.web_search and not request.local_only
        )
    except Exception as tool_err:
        pass

    memory_context = ""
    if current_user and not request.local_only:
        try:
            memory_context = await get_memory_context_string(current_user["_id"], db)
        except Exception:
            pass

    full_system_prompt = BASE_SYSTEM_INSTRUCTION
    if memory_context:
        full_system_prompt += f"\n\n{memory_context}"
    if tool_context:
        full_system_prompt += f"\n\n{tool_context}"

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        full_response_text = []

        # Send initial conversation meta and sources
        init_payload = {
            "type": "init",
            "conversation_id": conversation["_id"] if conversation else None,
            "sources": sources,
        }
        yield f"data: {json.dumps(init_payload)}\n\n"

        stream_gen = router_service.stream_response(
            message=request.message,
            history=history,
            system_prompt=full_system_prompt,
            file_info=file_info,
            requested_model=request.model,
            local_only=request.local_only,
        )

        try:
            async for chunk in stream_gen:
                if chunk.get("type") == "token":
                    token = chunk.get("token", "")
                    full_response_text.append(token)
                    yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
                elif chunk.get("type") == "meta":
                    yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as stream_err:
            # Network drop (e.g. wsarecv forcibly closed) — try non-streaming fallback
            err_str = str(stream_err)
            if full_response_text:
                # Already got partial content — just finish what we have
                pass
            else:
                try:
                    fallback_result = await router_service.generate_response(
                        message=request.message,
                        history=history,
                        system_prompt=full_system_prompt,
                        file_info=file_info,
                        requested_model=request.model,
                        local_only=request.local_only,
                    )
                    fallback_text = fallback_result.get("response", "")
                    if fallback_text:
                        full_response_text.append(fallback_text)
                        yield f"data: {json.dumps({'type': 'token', 'token': fallback_text})}\n\n"
                except Exception as fallback_err:
                    error_msg = f"Connection error while streaming. Please try again. ({type(stream_err).__name__})"
                    full_response_text.append(error_msg)
                    yield f"data: {json.dumps({'type': 'token', 'token': error_msg})}\n\n"

        complete_text = "".join(full_response_text)

        # Save assistant message
        if conversation and complete_text:
            assistant_msg = new_message(
                conversation_id=conversation["_id"],
                role="assistant",
                content=complete_text
            )
            await db["messages"].insert_one(assistant_msg)
            await db["conversations"].update_one(
                {"_id": conversation["_id"]},
                {"$set": {"updated_at": datetime.now(timezone.utc)}}
            )

        if current_user and request.message and not request.local_only and complete_text:
            asyncio.create_task(
                auto_extract_memory_from_turn(
                    user_id=current_user["_id"],
                    user_message=request.message,
                    assistant_reply=complete_text,
                    db=db
                )
            )

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )