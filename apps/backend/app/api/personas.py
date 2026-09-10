from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.agent_persona import new_agent_persona, PRESET_PERSONAS

router = APIRouter(prefix="/personas", tags=["AI Personas & Custom Agents"])


class CreatePersonaRequest(BaseModel):
    name: str
    description: str
    system_prompt: str
    avatar_icon: Optional[str] = "Bot"
    starter_prompts: Optional[List[str]] = []
    tools_enabled: Optional[List[str]] = ["web_search", "calculator", "python_sandbox"]


class PersonaResponse(BaseModel):
    id: str
    name: str
    description: str
    system_prompt: str
    avatar_icon: str
    is_preset: bool
    starter_prompts: List[str]
    tools_enabled: List[str]


@router.get("/", response_model=List[PersonaResponse])
async def list_personas(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    presets = [
        PersonaResponse(
            id=p["_id"],
            name=p["name"],
            description=p["description"],
            system_prompt=p["system_prompt"],
            avatar_icon=p.get("avatar_icon", "Bot"),
            is_preset=True,
            starter_prompts=p.get("starter_prompts", []),
            tools_enabled=p.get("tools_enabled", ["web_search", "calculator"]),
        )
        for p in PRESET_PERSONAS
    ]

    custom_cursor = db["personas"].find({"user_id": current_user["_id"]}).sort("created_at", -1)
    custom_docs = await custom_cursor.to_list(100)
    custom = [
        PersonaResponse(
            id=d["_id"],
            name=d["name"],
            description=d["description"],
            system_prompt=d["system_prompt"],
            avatar_icon=d.get("avatar_icon", "Bot"),
            is_preset=False,
            starter_prompts=d.get("starter_prompts", []),
            tools_enabled=d.get("tools_enabled", ["web_search", "calculator"]),
        )
        for d in custom_docs
    ]

    return presets + custom


@router.post("/", response_model=PersonaResponse)
async def create_custom_persona(
    req: CreatePersonaRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if not req.name.strip() or not req.system_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Persona name and system prompt are required.",
        )

    doc = new_agent_persona(
        name=req.name.strip(),
        description=req.description.strip(),
        system_prompt=req.system_prompt.strip(),
        avatar_icon=req.avatar_icon or "Bot",
        user_id=current_user["_id"],
        is_preset=False,
        starter_prompts=req.starter_prompts or [],
        tools_enabled=req.tools_enabled or ["web_search", "calculator", "python_sandbox"],
    )

    await db["personas"].insert_one(doc)

    return PersonaResponse(
        id=doc["_id"],
        name=doc["name"],
        description=doc["description"],
        system_prompt=doc["system_prompt"],
        avatar_icon=doc["avatar_icon"],
        is_preset=False,
        starter_prompts=doc["starter_prompts"],
        tools_enabled=doc["tools_enabled"],
    )


@router.delete("/{persona_id}")
async def delete_custom_persona(
    persona_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    res = await db["personas"].delete_one({"_id": persona_id, "user_id": current_user["_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Persona not found or cannot delete preset.")
    return {"message": "Persona deleted successfully"}
