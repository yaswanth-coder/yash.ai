import os
import uuid
import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from google import genai
from google.genai import types
from app.core.config import settings


def get_gemini_client() -> genai.Client:
    from dotenv import dotenv_values
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    env_vals = dotenv_values(env_path)
    api_key = env_vals.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    return genai.Client(api_key=api_key)


async def get_user_memories(user_id: str, db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """Retrieve all memories stored for a specific user."""
    cursor = db["memories"].find({"user_id": user_id}).sort("created_at", -1)
    memories = await cursor.to_list(None)
    return [
        {
            "id": m["_id"],
            "fact": m["fact"],
            "category": m.get("category", "preference"),
            "source": m.get("source", "chat"),
            "created_at": m["created_at"],
        }
        for m in memories
    ]


async def add_user_memory(
    user_id: str,
    fact: str,
    category: str = "custom",
    source: str = "manual",
    db: AsyncIOMotorDatabase = None
) -> Dict[str, Any]:
    """Store a new memory item for the user."""
    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "fact": fact.strip(),
        "category": category,
        "source": source,
        "created_at": datetime.now(timezone.utc),
    }
    await db["memories"].insert_one(doc)
    return {
        "id": doc["_id"],
        "fact": doc["fact"],
        "category": doc["category"],
        "source": doc["source"],
        "created_at": doc["created_at"],
    }


async def delete_user_memory(user_id: str, memory_id: str, db: AsyncIOMotorDatabase) -> bool:
    """Delete a specific memory by ID."""
    result = await db["memories"].delete_one({"_id": memory_id, "user_id": user_id})
    return result.deleted_count > 0


async def clear_user_memories(user_id: str, db: AsyncIOMotorDatabase) -> int:
    """Clear all memories for a user."""
    result = await db["memories"].delete_many({"user_id": user_id})
    return result.deleted_count


async def get_memory_context_string(user_id: Optional[str], db: AsyncIOMotorDatabase) -> str:
    """Format active user memories to be injected into Gemini system instructions."""
    if not user_id:
        return ""

    # Check if user has memory enabled (default True)
    user_settings = await db["user_settings"].find_one({"user_id": user_id})
    if user_settings and not user_settings.get("learning_enabled", True):
        return ""

    memories = await get_user_memories(user_id, db)
    if not memories:
        return ""

    context_lines = [
        "\n### User Personal Context & Learned Preferences:",
        "The following facts, habits, and preferences have been learned about this user. Respect and adapt to them in your responses:"
    ]
    for m in memories[:15]:  # limit to top 15 most relevant
        context_lines.append(f"- [{m['category'].upper()}] {m['fact']}")
    
    return "\n".join(context_lines) + "\n"


async def auto_extract_memory_from_turn(
    user_id: str,
    user_message: str,
    assistant_reply: str,
    db: AsyncIOMotorDatabase
):
    """
    Asynchronously analyze a conversation turn to extract new persistent facts or preferences.
    Runs in background without delaying the main chat response.
    """
    if len(user_message.strip()) < 10:
        return

    # Check if user opted into memory learning
    user_settings = await db["user_settings"].find_one({"user_id": user_id})
    if user_settings and not user_settings.get("learning_enabled", True):
        return

    prompt = f"""Analyze the following user message to determine if the user explicitly shared any persistent personal preference, tech stack, job role, project info, or style constraint.
User message: "{user_message}"

Rules:
1. If the message contains general questions or commands without personal information, return empty JSON array: []
2. If personal facts/preferences are present, extract them as short, clear bullet points in JSON format.
3. Categories allowed: "preference", "skill", "project", "style".

Output JSON format ONLY:
[
  {{"fact": "Prefers Next.js and Python for web projects", "category": "skill"}},
  {{"fact": "Prefers code without long conversational intros", "category": "style"}}
]"""

    try:
        client = get_gemini_client()
        
        def _call_gemini_extract():
            response = client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                ),
            )
            return response.text

        raw_json = await asyncio.to_thread(_call_gemini_extract)
        if not raw_json:
            return

        extracted = json.loads(raw_json)
        if isinstance(extracted, list):
            for item in extracted:
                fact = item.get("fact", "").strip()
                category = item.get("category", "preference")
                if fact and len(fact) > 5:
                    # Check for duplicates
                    existing = await db["memories"].find_one({"user_id": user_id, "fact": fact})
                    if not existing:
                        await add_user_memory(user_id=user_id, fact=fact, category=category, source="chat", db=db)
    except Exception as e:
        print(f"Background memory extraction error: {e}")


async def train_on_user_history(user_id: str, db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """
    Scan all historical conversations & messages for this user,
    extract a comprehensive profile of learned knowledge and preferences,
    and save them into the user's memory store.
    """
    # 1. Fetch conversations and all messages
    conversations = await db["conversations"].find({"user_id": user_id}).to_list(50)
    if not conversations:
        return []

    conv_ids = [c["_id"] for c in conversations]
    messages = await (
        db["messages"]
        .find({"conversation_id": {"$in": conv_ids}})
        .sort("created_at", 1)
        .to_list(300)
    )

    if not messages:
        return []

    # Compile user text history
    user_turns = [f"- {m['role'].upper()}: {m['content'][:300]}" for m in messages if m.get("content")]
    history_sample = "\n".join(user_turns[:80])

    prompt = f"""You are an advanced AI Training & Profiling Engine.
Analyze the user's historical chat messages below to extract all key persistent facts, preferences, tech stacks, projects, coding styles, and instructions.

Chat History Sample:
{history_sample}

Instructions:
1. Extract 3 to 10 distinct, high-value insights about this user.
2. Group them into categories: "skill", "preference", "project", "style", or "knowledge".
3. Write concise, direct statements (e.g., "Uses Next.js and FastAPI", "Prefers TypeScript with strict types", "Building an AI assistant called Yash.AI").
4. Do not include transient requests (e.g. "asked for a poem"). Only include persistent preferences.

Return ONLY a JSON array of objects:
[
  {{"fact": "...", "category": "..."}}
]"""

    client = get_gemini_client()

    def _call_gemini_train():
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            ),
        )
        return response.text

    raw_json = await asyncio.to_thread(_call_gemini_train)
    if not raw_json:
        return await get_user_memories(user_id, db)

    try:
        items = json.loads(raw_json)
        if isinstance(items, list):
            for item in items:
                fact = item.get("fact", "").strip()
                category = item.get("category", "preference")
                if fact and len(fact) > 5:
                    existing = await db["memories"].find_one({"user_id": user_id, "fact": fact})
                    if not existing:
                        await add_user_memory(user_id=user_id, fact=fact, category=category, source="training", db=db)
    except Exception as e:
        print(f"Error parsing training output: {e}")

    return await get_user_memories(user_id, db)
