import os
import io
import base64
import logging
from typing import List, Optional
import httpx
from PIL import Image

from app.core.config import settings
from app.services.image.base import (
    BaseImageProvider, ImageGenerationTask, ImageEditTask, ImageUpscaleTask, GeneratedImage
)
from app.services.image.capabilities import ImageCapability

logger = logging.getLogger("yash_ai.image.stability")

STABILITY_API_BASE = "https://api.stability.ai"


class StabilityAIProvider(BaseImageProvider):
    """
    Adapter for Stability AI SDXL and Stable Diffusion models.
    Supports text-to-image, inpainting/mask editing, and upscaling.
    """
    provider_id = "stability"
    name = "Stability AI (SDXL)"

    def _get_api_key(self) -> Optional[str]:
        from dotenv import dotenv_values
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), ".env")
        env_vals = dotenv_values(env_path) if os.path.exists(env_path) else {}
        return env_vals.get("STABILITY_API_KEY") or os.getenv("STABILITY_API_KEY") or getattr(settings, "STABILITY_API_KEY", "") or None

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and key.strip())

    def get_capabilities(self) -> List[ImageCapability]:
        configured = self.is_configured()
        return [
            ImageCapability(
                model_id="stable-diffusion-xl-1024-v1-0",
                name="SDXL 1.0 (Stability AI)",
                provider="stability",
                description="High-fidelity Stable Diffusion XL model with native inpainting, prompt weighting, and seed precision.",
                is_available=configured,
                text_to_image=True,
                image_to_image=True,
                inpainting=True,
                outpainting=False,
                variations=True,
                upscale=True,
                negative_prompt=True,
                seed=True,
                multiple_images=True,
                reference_images=True,
                supported_aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
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
            raise ValueError("STABILITY_API_KEY is not configured or invalid.")

        model = task.model or "stable-diffusion-xl-1024-v1-0"
        url = f"{STABILITY_API_BASE}/v1/generation/{model}/text-to-image"

        # Aspect ratio to resolution mapping (SDXL requires dimension pairs that multiply to ~1024x1024)
        dim_map = {
            "1:1": (1024, 1024),
            "16:9": (1344, 768),
            "9:16": (768, 1344),
            "4:3": (1152, 864),
            "3:4": (864, 1152),
            "21:9": (1536, 640),
            "2:3": (832, 1216),
            "3:2": (1216, 832)
        }
        w, h = dim_map.get(task.aspect_ratio, (1024, 1024))

        prompts = [{"text": task.prompt, "weight": 1.0}]
        if task.negative_prompt:
            prompts.append({"text": task.negative_prompt, "weight": -1.0})

        body = {
            "text_prompts": prompts,
            "cfg_scale": 7.0,
            "height": h,
            "width": w,
            "samples": max(1, min(task.num_images, 4)),
            "steps": 30,
        }
        if task.seed is not None:
            body["seed"] = task.seed

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                logger.error(f"Stability API error [{resp.status_code}]: {resp.text}")
                raise RuntimeError(f"Stability AI error: {resp.text}")

            data = resp.json()

        results: List[GeneratedImage] = []
        for artifact in data.get("artifacts", []):
            if artifact.get("finishReason") == "CONTENT_FILTERED":
                logger.warning("Stability image content filtered by safety system")
                continue
            raw_bytes = base64.b64decode(artifact["base64"])
            seed = artifact.get("seed")
            results.append(GeneratedImage(
                image_bytes=raw_bytes,
                mime_type="image/png",
                width=w,
                height=h,
                seed=seed,
                provider="stability",
                model=model,
                metadata={
                    "aspect_ratio": task.aspect_ratio,
                    "prompt": task.prompt,
                    "seed": seed
                }
            ))

        return results

    async def edit(self, task: ImageEditTask) -> GeneratedImage:
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("STABILITY_API_KEY is not configured or invalid.")

        model = task.model or "stable-diffusion-xl-1024-v1-0"
        url = f"{STABILITY_API_BASE}/v1/generation/{model}/image-to-image/masking"

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        files = {
            "init_image": ("init.png", task.image_bytes, "image/png"),
            "mask_image": ("mask.png", task.mask_bytes, "image/png")
        }
        data = {
            "mask_source": "MASK_IMAGE_WHITE",
            "text_prompts[0][text]": task.prompt,
            "text_prompts[0][weight]": "1.0",
            "samples": "1",
            "steps": "30"
        }
        if task.negative_prompt:
            data["text_prompts[1][text]"] = task.negative_prompt
            data["text_prompts[1][weight]"] = "-1.0"

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, headers=headers, data=data, files=files)
            if resp.status_code != 200:
                raise RuntimeError(f"Stability inpainting error: {resp.text}")
            resp_data = resp.json()

        artifacts = resp_data.get("artifacts", [])
        if not artifacts:
            raise RuntimeError("Stability returned no artifacts for inpainting.")

        raw_bytes = base64.b64decode(artifacts[0]["base64"])
        with Image.open(io.BytesIO(raw_bytes)) as pil_img:
            w, h = pil_img.size

        return GeneratedImage(
            image_bytes=raw_bytes,
            mime_type="image/png",
            width=w,
            height=h,
            seed=artifacts[0].get("seed"),
            provider="stability",
            model=model,
            metadata={"action_type": task.action_type, "prompt": task.prompt}
        )
