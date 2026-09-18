import os
import io
import logging
from typing import List, Optional
from PIL import Image

from app.core.config import settings
from app.services.image.base import BaseImageProvider, ImageGenerationTask, GeneratedImage
from app.services.image.capabilities import ImageCapability

logger = logging.getLogger("yash_ai.image.gemini_imagen")


class GeminiImagenProvider(BaseImageProvider):
    """
    Adapter for Google Gemini Imagen 3 via official google-genai SDK.
    """
    provider_id = "gemini"
    name = "Google Gemini Imagen"

    def __init__(self):
        self._api_key: Optional[str] = None

    def _get_api_key(self) -> Optional[str]:
        from dotenv import dotenv_values
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), ".env")
        env_vals = dotenv_values(env_path) if os.path.exists(env_path) else {}
        return env_vals.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "") or None

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and key.strip())

    def get_capabilities(self) -> List[ImageCapability]:
        configured = self.is_configured()
        return [
            ImageCapability(
                model_id="imagen-3.0-generate-002",
                name="Google Imagen 3",
                provider="gemini",
                description="Google's highest-quality image generation model with exceptional detail and photorealism.",
                is_available=configured,
                text_to_image=True,
                image_to_image=False,
                inpainting=False,
                outpainting=False,
                variations=False,
                upscale=False,
                negative_prompt=True,
                seed=False,
                multiple_images=True,
                reference_images=False,
                supported_aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4"],
                max_resolution=1024,
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
        target_model = task.model or "imagen-3.0-generate-002"

        # Map aspect ratios accepted by Imagen 3
        aspect_ratio_map = {
            "1:1": "1:1",
            "16:9": "16:9",
            "9:16": "9:16",
            "4:3": "4:3",
            "3:4": "3:4"
        }
        ar = aspect_ratio_map.get(task.aspect_ratio, "1:1")
        count = max(1, min(task.num_images, 4))

        prompt = task.prompt
        if task.style and task.style != "None":
            prompt = f"{prompt}, {task.style} style, ultra high resolution, masterpieces"

        config_params = {
            "number_of_images": count,
            "output_mime_type": "image/png",
            "aspect_ratio": ar,
        }
        if task.negative_prompt:
            config_params["negative_prompt"] = task.negative_prompt

        config = types.GenerateImagesConfig(**config_params)

        try:
            # Generate in thread pool to not block asyncio event loop
            import asyncio
            response = await asyncio.to_thread(
                client.models.generate_images,
                model=target_model,
                prompt=prompt,
                config=config
            )
        except Exception as e:
            logger.error(f"Gemini Imagen generation error: {e}")
            raise RuntimeError(f"Gemini Imagen API error: {str(e)}")

        results: List[GeneratedImage] = []
        for img_obj in response.generated_images:
            raw_bytes = img_obj.image.image_bytes
            with Image.open(io.BytesIO(raw_bytes)) as pil_img:
                w, h = pil_img.size

            results.append(GeneratedImage(
                image_bytes=raw_bytes,
                mime_type="image/png",
                width=w,
                height=h,
                provider="gemini",
                model=target_model,
                metadata={
                    "aspect_ratio": ar,
                    "prompt": task.prompt,
                    "style": task.style
                }
            ))

        return results
