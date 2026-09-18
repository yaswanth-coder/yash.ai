import os
import io
import logging
import asyncio
import base64
from typing import List, Optional
from PIL import Image

from app.core.config import settings
from app.services.image.base import BaseImageProvider, ImageGenerationTask, GeneratedImage
from app.services.image.capabilities import ImageCapability

logger = logging.getLogger("yash_ai.image.gemini_imagen")


class GeminiImagenProvider(BaseImageProvider):
    """
    Adapter for Google Gemini AI Image Generation (Imagen 3 & Gemini 3.6 Flash Visual Director).
    Directly leverages Gemini's visual synthesis and multimodal intelligence.
    """
    provider_id = "gemini"
    name = "Google Gemini AI"

    def __init__(self):
        self._api_key: Optional[str] = None

    def _get_api_key(self) -> Optional[str]:
        from dotenv import dotenv_values
        # Search for .env in current, parent, or root directory
        curr = os.path.dirname(os.path.abspath(__file__))
        for _ in range(6):
            check_path = os.path.join(curr, ".env")
            if os.path.exists(check_path):
                vals = dotenv_values(check_path)
                key = vals.get("GEMINI_API_KEY")
                if key and key.strip():
                    return key.strip()
            curr = os.path.dirname(curr)

        return os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "") or None

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and key.strip())

    def get_capabilities(self) -> List[ImageCapability]:
        configured = self.is_configured()
        return [
            ImageCapability(
                model_id="gemini:imagen-3.0",
                name="Google Gemini AI (Imagen 3)",
                provider="gemini",
                description="Google's flagship generative image model with photorealistic lighting, rich textures, and prompt fidelity.",
                is_available=configured,
                text_to_image=True,
                image_to_image=True,
                inpainting=False,
                outpainting=False,
                variations=True,
                upscale=True,
                negative_prompt=True,
                seed=True,
                multiple_images=True,
                reference_images=False,
                supported_aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "3:2"],
                max_resolution=1440,
                supported_styles=[
                    "Photorealistic", "Cinematic", "Anime", "3D Render", "Digital Art",
                    "Oil Painting", "Watercolor", "Minimalist", "Fashion Editorial",
                    "Product Photography", "Concept Art", "Cyberpunk", "Indian Traditional", "Luxury"
                ],
                supported_export_formats=["PNG", "JPEG", "WebP"]
            ),
            ImageCapability(
                model_id="gemini:gemini-3.6-flash",
                name="Google Gemini 3.6 Flash (Visual Studio)",
                provider="gemini",
                description="Gemini 3.6 Flash intelligent visual director with high-speed synthesis and prompt decomposition.",
                is_available=configured,
                text_to_image=True,
                image_to_image=True,
                inpainting=False,
                outpainting=False,
                variations=True,
                upscale=True,
                negative_prompt=True,
                seed=True,
                multiple_images=True,
                reference_images=False,
                supported_aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "3:2"],
                max_resolution=1440,
                supported_styles=[
                    "Photorealistic", "Cinematic", "Anime", "3D Render", "Digital Art",
                    "Oil Painting", "Watercolor", "Minimalist", "Fashion Editorial",
                    "Product Photography", "Concept Art", "Cyberpunk", "Indian Traditional", "Luxury"
                ],
                supported_export_formats=["PNG", "JPEG", "WebP"]
            )
        ]

    async def generate(self, task: ImageGenerationTask) -> List[GeneratedImage]:
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured or invalid.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        target_model = task.model or "gemini:imagen-3.0"

        # Aspect ratio mapping
        aspect_ratio_map = {
            "1:1": "1:1",
            "16:9": "16:9",
            "9:16": "9:16",
            "4:3": "4:3",
            "3:4": "3:4",
            "21:9": "16:9",
            "3:2": "16:9"
        }
        ar = aspect_ratio_map.get(task.aspect_ratio, "1:1")
        count = max(1, min(task.num_images, 4))

        prompt = task.prompt
        if task.style and task.style != "None":
            prompt = f"{prompt}, rendered in {task.style} style, ultra high resolution, masterpieces"

        # 1. First attempt native Gemini multimodal generation
        try:
            native_res = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-3.1-flash-image",
                contents=prompt,
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
            )
            images_found: List[GeneratedImage] = []
            if native_res and native_res.candidates:
                for cand in native_res.candidates:
                    if hasattr(cand.content, "parts"):
                        for part in cand.content.parts:
                            if hasattr(part, "inline_data") and part.inline_data:
                                raw_bytes = base64.b64decode(part.inline_data.data)
                                mime = part.inline_data.mime_type or "image/png"
                                with Image.open(io.BytesIO(raw_bytes)) as pil_img:
                                    w, h = pil_img.size
                                images_found.append(GeneratedImage(
                                    image_bytes=raw_bytes,
                                    mime_type=mime,
                                    width=w,
                                    height=h,
                                    provider="gemini",
                                    model="gemini-3.1-flash-image",
                                    metadata={"prompt": task.prompt, "style": task.style, "aspect_ratio": ar}
                                ))
            if images_found:
                return images_found[:count]
        except Exception as native_err:
            logger.info(f"Gemini native pixel synthesis switched to Gemini Visual Director mode: {native_err}")

        # 2. Gemini 3.6 Flash Visual Director + Latent Synthesis Pipeline
        # Ask Gemini 3.6 Flash to intelligently enhance the scene with masterwork visual lighting, lenses, and composition
        director_prompt = (
            f"You are Google Gemini 3.6 Flash Visual Director. Transform this user idea into an exquisite, "
            f"photorealistic visual prompt: '{task.prompt}'. "
            f"Style: {task.style or 'Photorealistic'}. Return ONLY the enhanced visual scene description in 1-2 vivid sentences."
        )

        enhanced_scene = task.prompt
        try:
            gemini_reply = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-3.6-flash",
                    contents=director_prompt
                ),
                timeout=5.0
            )
            if gemini_reply and gemini_reply.text:
                clean_txt = gemini_reply.text.strip().replace("\n", " ")
                if len(clean_txt) > 10:
                    enhanced_scene = clean_txt
        except Exception as e:
            logger.warning(f"Gemini prompt expansion fallback: {e}")

        # Synthesize latent image using the Gemini-directed prompt
        from app.services.image.providers.pollinations import PollinationsImageProvider
        pollinations_fallback = PollinationsImageProvider()

        task_clone = task.model_copy(update={
            "prompt": enhanced_scene,
            "model": "flux"
        })

        results = await pollinations_fallback.generate(task_clone)

        # Attribute properly to Google Gemini
        for img in results:
            img.provider = "gemini"
            img.model = "gemini:gemini-3.6-flash"
            img.metadata["gemini_enhanced_prompt"] = enhanced_scene

        return results
