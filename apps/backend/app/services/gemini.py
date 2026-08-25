import os
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from app.core.config import settings

SYSTEM_INSTRUCTION = """You are Yash.AI, a highly capable, articulate, and intelligent personal AI assistant built to help users with coding, research, writing, problem-solving, and general inquiries. 
Provide clear, well-formatted Markdown responses. When writing code, always format it in clean fenced code blocks with the language tag specified."""

def get_gemini_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY", "")
    return genai.Client(api_key=api_key)

async def generate_response(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    file_info: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate response from Gemini 2.5 Flash using google.genai SDK.
    Supports chat history and optional file attachments.
    """
    client = get_gemini_client()
    
    contents = []
    
    # Process file attachment if present
    file_prompt_prefix = ""
    if file_info:
        if file_info.get("type") == "text":
            file_prompt_prefix = file_info.get("content", "")
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
            # Gemini SDK uses 'user' and 'model'
            gemini_role = "user" if role == "user" else "model"
            contents.append(types.Content(
                role=gemini_role,
                parts=[types.Part.from_text(text=content)]
            ))
            
    # Add current user prompt
    final_user_text = f"{file_prompt_prefix}{message}" if file_prompt_prefix else message
    contents.append(types.Part.from_text(text=final_user_text))
    
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.7,
    )
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=config,
    )
    
    return response.text or "I apologize, but I could not generate a response."
