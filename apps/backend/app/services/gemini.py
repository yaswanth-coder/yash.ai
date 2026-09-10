import os
import asyncio
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings

BASE_SYSTEM_INSTRUCTION = """You are **Yash.AI**, an advanced, articulate, and intelligent AI personal assistant and pair programmer.
Your goal is to provide exceptionally clear, thoughtful, accurate, and structured answers tailored to the user's needs.

### Guidelines for High-Quality Responses:
1. **Clarity & Structure**: Organize complex answers with clear markdown headers (`###`), bullet points, and concise explanations.
2. **Code Excellence**:
   - Always write clean, production-grade code in properly tagged fenced code blocks (e.g. ````python`, ````typescript`, ````sql`).
   - Include helpful inline comments and avoid redundant boilerplate.
3. **Adaptive Tone**: Maintain a professional, encouraging, and collaborative tone. Be concise when asked direct questions and detailed when asked for comprehensive explanations.
4. **Context & Continuity**: Seamlessly incorporate past context and user preferences to provide deeply personalized responses."""


def get_gemini_client() -> genai.Client:
    from dotenv import dotenv_values
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    env_vals = dotenv_values(env_path)
    api_key = env_vals.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    return genai.Client(api_key=api_key)


async def generate_response(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    file_info: Optional[Dict[str, Any]] = None,
    memory_context: Optional[str] = None
) -> str:
    """
    Generate response from Gemini 3.6 Flash with dynamic user memory injection
    and conversation history support.
    """
    client = get_gemini_client()

    contents = []

    # Process file attachment if present
    file_prompt_prefix = ""
    if file_info:
        if file_info.get("type") == "text":
            file_prompt_prefix = f"### File Attachment Context:\n```\n{file_info.get('content', '')}\n```\n\n"
        elif file_info.get("type") == "image":
            image_path = file_info.get("path")
            mime_type = file_info.get("mime_type", "image/jpeg")
            if os.path.exists(image_path):
                with open(image_path, "rb") as img_file:
                    img_bytes = img_file.read()
                    contents.append(types.Part.from_bytes(data=img_bytes, mime_type=mime_type))

    # Format conversation history
    if history:
        for turn in history:
            role = turn.get("role")
            content = turn.get("content", "")
            gemini_role = "user" if role == "user" else "model"
            contents.append(types.Content(
                role=gemini_role,
                parts=[types.Part.from_text(text=content)]
            ))

    # Add current user prompt
    final_user_text = f"{file_prompt_prefix}{message}" if file_prompt_prefix else message
    contents.append(types.Part.from_text(text=final_user_text))

    # Combine Base System Instruction with Dynamic User Memories
    system_prompt = BASE_SYSTEM_INSTRUCTION
    if memory_context:
        system_prompt += f"\n\n{memory_context}"

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.7,
    )

    def _call_gemini():
        models_to_try = [
            os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-1.5-flash"
        ]
        last_err = None
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                return response.text or "I apologize, but I could not generate a response."
            except Exception as ex:
                last_err = ex
                err_str = str(ex)
                if "leaked" in err_str.lower() or "permission_denied" in err_str.lower() or "api_key_invalid" in err_str.lower():
                    return f"⚠️ **Gemini API Error**: {err_str}\n\nPlease verify your `GEMINI_API_KEY` in `apps/backend/.env`."
                continue
        raise last_err

    return await asyncio.to_thread(_call_gemini)
